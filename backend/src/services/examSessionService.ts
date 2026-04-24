import mongoose from "mongoose";
import { AnswerModel } from "../models/answer.model";
import Exam from "../models/Exam";
import { ExamQuestionModel } from "../models/examQuestion.model";
import ExamSession from "../models/ExamSession";
import { ResultModel } from "../models/result.model";
import { buildAccessPayload } from "./examAccessService";
import SecuritySettings from "../models/SecuritySettings";
import { mergeAntiCheatPolicy } from "./antiCheatEngine";
import { SAFE_DEFAULTS } from "../types/antiCheat";

const shuffle = <T>(list: T[]) => [...list].sort(() => Math.random() - 0.5);

/**
 * Field-name helpers — the canonical Exam model uses `duration`, `startDate`,
 * `endDate`, `negativeMarking`, `negativeMarkValue`, `showRemainingTime`,
 * `answerEditLimitPerQuestion`, `resultPublishDate` while the modern API layer
 * uses `durationMinutes`, `examWindowStartUTC`, etc.  These helpers read
 * whichever field is present so the service works with both naming conventions.
 */
const examDuration = (e: any): number => Number(e.durationMinutes ?? e.duration ?? 0);
const examNegEnabled = (e: any): boolean => Boolean(e.negativeMarkingEnabled ?? e.negativeMarking);
const examNegValue = (e: any): number => Number(e.negativePerWrong ?? e.negativeMarkValue ?? 0);
const examAnswerLimit = (e: any): number | null => e.answerChangeLimit ?? e.answerEditLimitPerQuestion ?? null;
const examShowTimer = (e: any): boolean => Boolean(e.showTimer ?? e.showRemainingTime);
const examResultPublish = (e: any): any => e.resultPublishAtUTC ?? e.resultPublishDate;

export const startSession = async (examId: string, userId: string, reqMeta: { ip?: string; ua?: string }) => {
  const exam = await Exam.findById(examId) as any;
  if (!exam) throw new Error("NOT_FOUND");
  const access = await buildAccessPayload(exam, userId);
  if (access.accessStatus === "blocked") return { blocked: access };

  const attemptNo = (await ExamSession.countDocuments({ examId, userId })) + 1;
  const startedAtUTC = new Date();
  const expiresAtUTC = new Date(startedAtUTC.getTime() + examDuration(exam) * 60_000);

  const questions = await ExamQuestionModel.find({ examId }).sort({ orderIndex: 1 }).lean();
  const ordered = exam.randomizeQuestions ? shuffle(questions) : questions;
  const optionOrderMap = Object.fromEntries(
    ordered.map((q: any) => [
      String(q._id),
      exam.randomizeOptions ? shuffle((q.options || []).map((o: any) => o.key)) : (q.options || []).map((o: any) => o.key)
    ])
  );

  const session = await ExamSession.create({
    _id: new mongoose.Types.ObjectId(),
    examId,
    userId,
    attemptNo,
    status: "in_progress",
    startedAtUTC,
    expiresAtUTC,
    ip: reqMeta.ip,
    browserInfo: reqMeta.ua,
    questionOrder: ordered.map((x: any) => String(x._id)),
    optionOrderMap
  } as any);

  return { sessionId: String(session._id), startedAtUTC, expiresAtUTC, serverNowUTC: new Date().toISOString() };
};

export const getSessionQuestions = async (examId: string, sessionId: string, userId: string) => {
  const exam = await Exam.findById(examId) as any;
  const session = await ExamSession.findById(sessionId) as any;
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
      options: optionKeys.map((k: string) => optionMap.get(k)),
      marks: q.marks,
      negativeMarks: q.negativeMarks
    };
  });

  const answers = await AnswerModel.find({ sessionId, userId }).lean();

  // ── Merge anti-cheat policy (global + per-exam overrides) ────────────
  let mergedAntiCheatPolicy;
  try {
    const secSettings = await SecuritySettings.findOne({ key: 'global' }).lean();
    const globalPolicy = secSettings?.antiCheatPolicy ?? {};
    const examOverrides = exam.antiCheatOverrides ?? undefined;
    mergedAntiCheatPolicy = mergeAntiCheatPolicy(globalPolicy, examOverrides);
  } catch {
    mergedAntiCheatPolicy = { ...SAFE_DEFAULTS };
  }

  return {
    exam: {
      id: String(exam._id),
      title: exam.title,
      expiresAtUTC: session.expiresAtUTC ?? session.expiresAt,
      durationMinutes: examDuration(exam),
      resultPublishAtUTC: examResultPublish(exam),
      rules: {
        negativeMarkingEnabled: examNegEnabled(exam),
        negativePerWrong: examNegValue(exam),
        answerChangeLimit: examAnswerLimit(exam),
        showQuestionPalette: exam.showQuestionPalette,
        showTimer: examShowTimer(exam),
        allowBackNavigation: exam.allowBackNavigation,
        randomizeQuestions: exam.randomizeQuestions,
        randomizeOptions: exam.randomizeOptions,
        autoSubmitOnTimeout: exam.autoSubmitOnTimeout
      }
    },
    session: {
      sessionId: String(session._id),
      isActive: true,
      attemptRevision: Number(session.attemptRevision ?? 0),
    },
    questions,
    answers: answers.map((a: any) => ({ questionId: a.questionId, selectedKey: a.selectedKey, changeCount: a.changeCount, updatedAtUTC: a.updatedAtUTC })),
    antiCheatPolicy: mergedAntiCheatPolicy,
  };
};

export const saveSessionAnswers = async (examId: string, sessionId: string, userId: string, payload: any) => {
  const exam = await Exam.findById(examId).lean() as any;
  if (!exam) throw new Error("NOT_FOUND");
  const updated: Array<{ questionId: string; changeCount: number; updatedAtUTC: Date }> = [];

  const limit = examAnswerLimit(exam);
  for (const row of payload.answers || []) {
    const prev = await AnswerModel.findOne({ sessionId, questionId: row.questionId, userId });
    const oldSelected = prev?.selectedKey ?? null;
    const willChange = oldSelected !== null && oldSelected !== row.selectedKey;
    const nextChangeCount = (prev?.changeCount || 0) + (willChange ? 1 : 0);
    if (limit !== null && nextChangeCount > limit) continue;

    const saved = await AnswerModel.findOneAndUpdate(
      { sessionId, questionId: row.questionId, userId },
      { examId, selectedKey: row.selectedKey, changeCount: nextChangeCount, updatedAtUTC: new Date() },
      { upsert: true, new: true }
    );
    updated.push({ questionId: row.questionId, changeCount: saved.changeCount, updatedAtUTC: saved.updatedAtUTC });
  }

  await ExamSession.findByIdAndUpdate(sessionId, { lastSavedAtUTC: new Date() });
  return { ok: true as const, serverSavedAtUTC: new Date().toISOString(), updated };
};

export const submitSession = async (examId: string, sessionId: string, userId: string) => {
  const exam = await Exam.findById(examId).lean() as any;
  const session = await ExamSession.findById(sessionId) as any;
  if (!exam || !session || session.userId !== userId) throw new Error("NOT_FOUND");

  const submittedField = session.submittedAtUTC ?? session.submittedAt;
  if (submittedField) return { ok: true as const, submittedAtUTC: submittedField };
  const submittedAtUTC = new Date();
  session.submittedAtUTC = submittedAtUTC;
  session.submittedAt = submittedAtUTC;
  session.status = "submitted";
  const startTime = new Date(session.startedAtUTC ?? session.startedAt).getTime();
  session.timeTakenSeconds = Math.max(0, Math.floor((submittedAtUTC.getTime() - startTime) / 1000));
  await session.save();

  const questions = await ExamQuestionModel.find({ examId }).lean();
  const answers = await AnswerModel.find({ sessionId, userId }).lean();
  const answerMap = new Map(answers.map((a: any) => [a.questionId, a.selectedKey]));

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let obtainedMarks = 0;
  let totalMarks = 0;

  for (const q of questions) {
    totalMarks += (q as any).marks || 0;
    const chosen = answerMap.get(String(q._id));
    if (!chosen) {
      skippedCount += 1;
      continue;
    }
    if (chosen === (q as any).correctKey) {
      correctCount += 1;
      obtainedMarks += (q as any).marks || 0;
    } else {
      wrongCount += 1;
      obtainedMarks -= examNegEnabled(exam) ? ((q as any).negativeMarks ?? examNegValue(exam) ?? 0) : 0;
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
