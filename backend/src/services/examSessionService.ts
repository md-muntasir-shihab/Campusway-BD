import mongoose from "mongoose";
import { AnswerModel } from "../models/answer.model";
import { ExamModel } from "../models/exam.model";
import { ExamQuestionModel } from "../models/examQuestion.model";
import { ExamSessionModel } from "../models/examSession.model";
import { ResultModel } from "../models/result.model";
import { buildAccessPayload } from "./examAccessService";

const shuffle = <T>(list: T[]) => [...list].sort(() => Math.random() - 0.5);

export const startSession = async (examId: string, userId: string, reqMeta: { ip?: string; ua?: string }) => {
  const exam = await ExamModel.findById(examId);
  if (!exam) throw new Error("NOT_FOUND");
  const access = await buildAccessPayload(exam, userId);
  if (access.accessStatus === "blocked") return { blocked: access };

  const attemptNo = (await ExamSessionModel.countDocuments({ examId, userId })) + 1;
  const startedAtUTC = new Date();
  const expiresAtUTC = new Date(startedAtUTC.getTime() + exam.durationMinutes * 60_000);

  const questions = await ExamQuestionModel.find({ examId }).sort({ orderIndex: 1 }).lean();
  const ordered = exam.randomizeQuestions ? shuffle(questions) : questions;
  const optionOrderMap = Object.fromEntries(
    ordered.map((q) => [
      String(q._id),
      exam.randomizeOptions ? shuffle((q.options || []).map((o: any) => o.key)) : (q.options || []).map((o: any) => o.key)
    ])
  );

  const session = await ExamSessionModel.create({
    _id: new mongoose.Types.ObjectId(),
    examId,
    userId,
    attemptNo,
    status: "in_progress",
    startedAtUTC,
    expiresAtUTC,
    ip: reqMeta.ip,
    browserInfo: reqMeta.ua,
    questionOrder: ordered.map((x) => String(x._id)),
    optionOrderMap
  });

  return { sessionId: String(session._id), startedAtUTC, expiresAtUTC, serverNowUTC: new Date().toISOString() };
};

export const getSessionQuestions = async (examId: string, sessionId: string, userId: string) => {
  const exam = await ExamModel.findById(examId);
  const session = await ExamSessionModel.findById(sessionId);
  if (!exam || !session || session.userId !== userId) throw new Error("NOT_FOUND");

  const questionsRaw = await ExamQuestionModel.find({ _id: { $in: session.questionOrder } }).lean();
  const map = new Map(questionsRaw.map((q) => [String(q._id), q]));
  const questions = session.questionOrder.map((id: string, idx: number) => {
    const q: any = map.get(id);
    const optionKeys: string[] = session.optionOrderMap?.[id] || q.options.map((o: any) => o.key);
    const optionMap = new Map(q.options.map((o: any) => [o.key, o]));
    return {
      id,
      orderIndex: idx + 1,
      question_en: q.question_en,
      question_bn: q.question_bn,
      questionImageUrl: q.questionImageUrl,
      options: optionKeys.map((k) => optionMap.get(k)),
      marks: q.marks,
      negativeMarks: q.negativeMarks
    };
  });

  const answers = await AnswerModel.find({ sessionId, userId }).lean();
  return {
    exam: {
      id: String(exam._id),
      title: exam.title,
      expiresAtUTC: session.expiresAtUTC,
      durationMinutes: exam.durationMinutes,
      resultPublishAtUTC: exam.resultPublishAtUTC,
      rules: {
        negativeMarkingEnabled: exam.negativeMarkingEnabled,
        negativePerWrong: exam.negativePerWrong,
        answerChangeLimit: exam.answerChangeLimit,
        showQuestionPalette: exam.showQuestionPalette,
        showTimer: exam.showTimer,
        allowBackNavigation: exam.allowBackNavigation,
        randomizeQuestions: exam.randomizeQuestions,
        randomizeOptions: exam.randomizeOptions,
        autoSubmitOnTimeout: exam.autoSubmitOnTimeout
      }
    },
    questions,
    answers: answers.map((a) => ({ questionId: a.questionId, selectedKey: a.selectedKey, changeCount: a.changeCount, updatedAtUTC: a.updatedAtUTC }))
  };
};

export const saveSessionAnswers = async (examId: string, sessionId: string, userId: string, payload: any) => {
  const exam = await ExamModel.findById(examId).lean();
  if (!exam) throw new Error("NOT_FOUND");
  const updated: Array<{ questionId: string; changeCount: number; updatedAtUTC: Date }> = [];

  for (const row of payload.answers || []) {
    const prev = await AnswerModel.findOne({ sessionId, questionId: row.questionId, userId });
    const oldSelected = prev?.selectedKey ?? null;
    const willChange = oldSelected !== null && oldSelected !== row.selectedKey;
    const nextChangeCount = (prev?.changeCount || 0) + (willChange ? 1 : 0);
    if ((exam.answerChangeLimit ?? null) !== null && nextChangeCount > (exam.answerChangeLimit as number)) continue;

    const saved = await AnswerModel.findOneAndUpdate(
      { sessionId, questionId: row.questionId, userId },
      { examId, selectedKey: row.selectedKey, changeCount: nextChangeCount, updatedAtUTC: new Date() },
      { upsert: true, new: true }
    );
    updated.push({ questionId: row.questionId, changeCount: saved.changeCount, updatedAtUTC: saved.updatedAtUTC });
  }

  await ExamSessionModel.findByIdAndUpdate(sessionId, { lastSavedAtUTC: new Date() });
  return { ok: true as const, serverSavedAtUTC: new Date().toISOString(), updated };
};

export const submitSession = async (examId: string, sessionId: string, userId: string) => {
  const exam = await ExamModel.findById(examId).lean();
  const session = await ExamSessionModel.findById(sessionId);
  if (!exam || !session || session.userId !== userId) throw new Error("NOT_FOUND");

  if (session.submittedAtUTC) return { ok: true as const, submittedAtUTC: session.submittedAtUTC };
  const submittedAtUTC = new Date();
  session.submittedAtUTC = submittedAtUTC;
  session.status = "submitted";
  session.timeTakenSeconds = Math.max(0, Math.floor((submittedAtUTC.getTime() - new Date(session.startedAtUTC as unknown as string).getTime()) / 1000));
  await session.save();

  const questions = await ExamQuestionModel.find({ examId }).lean();
  const answers = await AnswerModel.find({ sessionId, userId }).lean();
  const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedKey]));

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let obtainedMarks = 0;
  let totalMarks = 0;

  for (const q of questions) {
    totalMarks += q.marks || 0;
    const chosen = answerMap.get(String(q._id));
    if (!chosen) {
      skippedCount += 1;
      continue;
    }
    if (chosen === q.correctKey) {
      correctCount += 1;
      obtainedMarks += q.marks || 0;
    } else {
      wrongCount += 1;
      obtainedMarks -= exam.negativeMarkingEnabled ? q.negativeMarks ?? exam.negativePerWrong ?? 0 : 0;
    }
  }

  const percentage = totalMarks ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
  await ResultModel.findOneAndUpdate(
    { sessionId },
    {
      sessionId,
      examId,
      userId,
      totalMarks,
      obtainedMarks,
      correctCount,
      wrongCount,
      skippedCount,
      percentage,
      evaluatedAtUTC: new Date(),
      timeTakenSeconds: session.timeTakenSeconds
    },
    { upsert: true, new: true }
  );

  return { ok: true as const, submittedAtUTC };
};
