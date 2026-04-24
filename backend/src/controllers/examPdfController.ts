import { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import PDFDocument from "pdfkit";
import Exam from "../models/Exam";
import Question from "../models/Question";
import ExamSession from "../models/ExamSession";
import { ExamQuestionModel } from "../models/examQuestion.model";
import { AnswerModel } from "../models/answer.model";
import { getEligibilitySummary } from "./examController";
import { ResponseBuilder } from '../utils/responseBuilder';

type PdfExamContext = {
  kind: "modern" | "legacy";
  examId: string;
  rawExam: Record<string, unknown>;
  title: string;
  subject: string;
  category: string;
  durationMinutes: number;
  isPublished: boolean;
  solutionReleaseRule: string;
  solutionsEnabled: boolean;
  examWindowEndUTC: Date | null;
  resultPublishAtUTC: Date | null;
};

type PdfQuestionRow = {
  id: string;
  orderIndex: number;
  questionText: string;
  questionImageUrl: string;
  options: Array<{ key: string; text: string }>;
  correctKey: string;
  explanationText: string;
  explanationImageUrl: string;
};

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createPdf(): PDFKit.PDFDocument {
  return new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
}

function addHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc.fontSize(18).text(title, { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor("#666")
    .text(`Generated ${new Date().toISOString().slice(0, 16)}`, { align: "center" });
  doc.moveDown(1);
  doc.fillColor("#000");
}

function addQuestionBlock(
  doc: PDFKit.PDFDocument,
  question: PdfQuestionRow,
  index: number,
  opts?: { showCorrect?: boolean; showSelected?: string | null; showExplanation?: boolean },
): void {
  if (doc.y > 680) doc.addPage();
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(`Q${index + 1}. ${safeText(question.questionText) || "Question"}`);
  doc.font("Helvetica");
  if (question.questionImageUrl) {
    doc.fontSize(8).fillColor("#888").text(`[Image: ${question.questionImageUrl}]`);
    doc.fillColor("#000");
  }
  doc.moveDown(0.3);
  for (const option of question.options) {
    let suffix = "";
    if (opts?.showCorrect && option.key === question.correctKey) suffix += " (correct)";
    if (opts?.showSelected !== undefined && option.key === opts.showSelected) suffix += " (selected)";
    doc.fontSize(10).text(`  ${option.key}) ${safeText(option.text)}${suffix}`);
  }
  if (opts?.showExplanation && question.explanationText) {
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor("#555").text(`Explanation: ${question.explanationText}`);
    doc.fillColor("#000");
  }
  if (opts?.showExplanation && question.explanationImageUrl) {
    doc
      .fontSize(8)
      .fillColor("#888")
      .text(`[Explanation Image: ${question.explanationImageUrl}]`);
    doc.fillColor("#000");
  }
  doc.moveDown(0.6);
}

function toDate(value: unknown): Date | null {
  const raw = value instanceof Date ? value : new Date(String(value || ""));
  return Number.isNaN(raw.getTime()) ? null : raw;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "exam";
}

async function resolveExamContext(examId: string): Promise<PdfExamContext | null> {
  const exam = await Exam.findById(examId).lean();
  if (!exam) return null;

  return {
    kind: "legacy",
    examId,
    rawExam: exam as Record<string, unknown>,
    title: safeText(exam.title) || "Exam",
    subject: safeText(exam.subject) || "N/A",
    category: safeText((exam as any).examCategory) || "N/A",
    durationMinutes: Number((exam as any).duration || 0),
    isPublished: Boolean((exam as any).isPublished),
    solutionReleaseRule: safeText((exam as any).solutionReleaseRule) || "after_result_publish",
    solutionsEnabled: Boolean((exam as any).solutionsEnabled),
    examWindowEndUTC: toDate((exam as any).endDate),
    resultPublishAtUTC: toDate((exam as any).resultPublishDate),
  };
}

function mapLegacyQuestion(question: any, fallbackOrder = 0): PdfQuestionRow {
  const options = [
    { key: "A", text: safeText(question.optionA) },
    { key: "B", text: safeText(question.optionB) },
    { key: "C", text: safeText(question.optionC) },
    { key: "D", text: safeText(question.optionD) },
  ].filter((option) => option.text || safeText(question.correctAnswer) === option.key);

  return {
    id: String(question._id || ""),
    orderIndex: Number(question.order ?? fallbackOrder ?? 0),
    questionText:
      safeText(question.question_bn) || safeText(question.question_en) || safeText(question.question),
    questionImageUrl: safeText(question.questionImageUrl) || safeText(question.questionImage),
    options,
    correctKey: safeText(question.correctAnswer).toUpperCase(),
    explanationText:
      safeText(question.explanation_bn) ||
      safeText(question.explanation_en) ||
      safeText(question.explanation) ||
      safeText(question.solution),
    explanationImageUrl:
      safeText(question.explanationImageUrl) ||
      safeText(question.explanation_image_url) ||
      safeText(question.solutionImage),
  };
}

function mapModernQuestion(question: any, fallbackOrder = 0): PdfQuestionRow {
  const options = Array.isArray(question.options)
    ? question.options.map((option: any) => ({
      key: safeText(option.key).toUpperCase(),
      text:
        safeText(option.text_bn) ||
        safeText(option.text_en) ||
        safeText(option.text),
    }))
    : [];

  return {
    id: String(question._id || ""),
    orderIndex: Number(question.orderIndex ?? fallbackOrder ?? 0),
    questionText: safeText(question.question_bn) || safeText(question.question_en),
    questionImageUrl: safeText(question.questionImageUrl),
    options,
    correctKey: safeText(question.correctKey).toUpperCase(),
    explanationText: safeText(question.explanation_bn) || safeText(question.explanation_en),
    explanationImageUrl: safeText(question.explanationImageUrl),
  };
}

async function loadQuestionsForPdf(
  context: PdfExamContext,
  preferredQuestionIds?: string[],
): Promise<PdfQuestionRow[]> {
  if (Array.isArray(preferredQuestionIds) && preferredQuestionIds.length > 0) {
    const orderedIds = preferredQuestionIds.map((id) => String(id || "")).filter(Boolean);
    const legacyQuestions = await Question.find({ _id: { $in: orderedIds } }).lean();
    const legacyMap = new Map(legacyQuestions.map((question) => [String(question._id), question]));

    const missingIds = orderedIds.filter((id) => !legacyMap.has(id));
    const bankQuestions = missingIds.length
      ? await ExamQuestionModel.find({ _id: { $in: missingIds } }).lean()
      : [];
    const bankMap = new Map(bankQuestions.map((question) => [String(question._id), question]));

    return orderedIds
      .map((id, index) => {
        if (legacyMap.has(id)) return mapLegacyQuestion(legacyMap.get(id), index);
        if (bankMap.has(id)) return mapModernQuestion(bankMap.get(id), index);
        return null;
      })
      .filter(Boolean) as PdfQuestionRow[];
  }

  if (context.kind === "modern") {
    const questions = await ExamQuestionModel.find({ examId: context.examId })
      .sort({ orderIndex: 1 })
      .lean();
    return questions.map((question, index) => mapModernQuestion(question, index));
  }

  const legacyQuestions = await Question.find({
    exam: context.examId,
    active: { $ne: false },
  })
    .sort({ section: 1, order: 1 })
    .lean();
  const bankQuestions = await ExamQuestionModel.find({ examId: context.examId })
    .sort({ orderIndex: 1 })
    .lean();

  const rows = [
    ...legacyQuestions.map((question, index) => mapLegacyQuestion(question, index)),
    ...bankQuestions.map((question, index) =>
      mapModernQuestion(question, legacyQuestions.length + index),
    ),
  ];

  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function solutionsLocked(context: PdfExamContext, now = new Date()): boolean {
  if (context.solutionReleaseRule === "after_exam_end") {
    return Boolean(context.examWindowEndUTC && now < context.examWindowEndUTC);
  }
  if (context.solutionReleaseRule === "after_result_publish") {
    return Boolean(context.resultPublishAtUTC && now < context.resultPublishAtUTC);
  }
  if (context.solutionReleaseRule === "manual") {
    return !context.solutionsEnabled;
  }
  return false;
}

async function requireStudentExamEligibility(
  req: Request,
  res: Response,
  context: PdfExamContext,
  options: {
    requireProfileComplete?: boolean;
    requireLiveWindow?: boolean;
    requireRemainingAttempts?: boolean;
  } = {},
): Promise<Awaited<ReturnType<typeof getEligibilitySummary>> | null> {
  const authReq = req as AuthRequest;
  const studentId = String(authReq.user?._id || authReq.user?.id || "").trim();
  if (!studentId) {
    ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Authentication required'));
    return null;
  }

  const eligibility = await getEligibilitySummary(context.rawExam, studentId);
  if (!eligibility.accessAllowed) {
    ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', "You are not allowed to access this exam document.",
      eligibility,));
    return null;
  }
  if (eligibility.paymentRequired && !eligibility.paymentCleared) {
    ResponseBuilder.send(res, 402, ResponseBuilder.error('VALIDATION_ERROR', 'Payment pending. Please complete your payment to access this exam document.', {
      paymentPending: true,
      eligibility,
    }));
    return null;
  }
  if (options.requireProfileComplete && !eligibility.profileComplete) {
    ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', "Profile completion is required before accessing this exam document.",
      eligibility,));
    return null;
  }
  if (options.requireLiveWindow && !eligibility.windowOpen) {
    ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', "This exam document is not available outside the exam window.",
      eligibility,));
    return null;
  }
  if (options.requireRemainingAttempts && eligibility.attemptsLeft <= 0) {
    ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', "Maximum attempt limit reached for this exam.",
      eligibility,));
    return null;
  }

  return eligibility;
}

export async function generateQuestionsPdf(req: Request, res: Response): Promise<void> {
  try {
    const context = await resolveExamContext(String(req.params.examId || ""));
    if (!context) {
      ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Exam not found'));
      return;
    }
    if (!context.isPublished) {
      ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Exam not published'));
      return;
    }
    const eligibility = await requireStudentExamEligibility(req, res, context, {
      requireProfileComplete: true,
      requireLiveWindow: true,
      requireRemainingAttempts: true,
    });
    if (!eligibility) {
      return;
    }

    const questions = await loadQuestionsForPdf(context);
    const doc = createPdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${sanitizeFilename(context.title)}_questions.pdf"`,
    );
    doc.pipe(res);

    addHeader(doc, context.title || "Exam Questions");
    doc
      .fontSize(10)
      .text(
        `Subject: ${context.subject || "N/A"}  |  Category: ${context.category || "N/A"
        }  |  Duration: ${context.durationMinutes} min`,
      );
    doc.moveDown(0.8);

    questions.forEach((question, index) => addQuestionBlock(doc, question, index));
    doc.end();
  } catch (err) {
    console.error("[PDF] Questions error:", err);
    if (!res.headersSent) ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'PDF generation failed'));
  }
}

export async function generateSolutionsPdf(req: Request, res: Response): Promise<void> {
  try {
    const context = await resolveExamContext(String(req.params.examId || ""));
    if (!context) {
      ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Exam not found'));
      return;
    }
    if (!context.isPublished) {
      ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Exam not published'));
      return;
    }
    if (solutionsLocked(context)) {
      ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Solutions not released yet'));
      return;
    }
    const eligibility = await requireStudentExamEligibility(req, res, context);
    if (!eligibility) {
      return;
    }

    const questions = await loadQuestionsForPdf(context);
    const doc = createPdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${sanitizeFilename(context.title)}_solutions.pdf"`,
    );
    doc.pipe(res);

    addHeader(doc, `${context.title} - Solutions`);
    questions.forEach((question, index) =>
      addQuestionBlock(doc, question, index, { showCorrect: true, showExplanation: true }),
    );
    doc.end();
  } catch (err) {
    console.error("[PDF] Solutions error:", err);
    if (!res.headersSent) ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'PDF generation failed'));
  }
}

export async function generateAnswersPdf(req: Request, res: Response): Promise<void> {
  try {
    const context = await resolveExamContext(String(req.params.examId || ""));
    if (!context) {
      ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Exam not found'));
      return;
    }

    const authReq = req as AuthRequest;
    const userId = String(authReq.user?._id || authReq.user?.id || "").trim();
    const role = String(authReq.user?.role || "").trim().toLowerCase();
    const isAdmin = ["superadmin", "admin", "moderator", "chairman"].includes(role);

    if (!userId && !isAdmin) {
      ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Authentication required'));
      return;
    }

    let questions: PdfQuestionRow[] = [];
    let selectedByQuestion = new Map<string, string | null>();

    if (context.kind === "modern") {
      const answers = await AnswerModel.find({ sessionId: String(req.params.sessionId || "") }).lean();
      if (answers.length === 0) {
        ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'No answers found'));
        return;
      }
      if (!isAdmin && String(answers[0].userId || "") !== userId) {
        ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Access denied'));
        return;
      }

      questions = await loadQuestionsForPdf(context);
      selectedByQuestion = new Map(
        answers.map((answer) => [
          String(answer.questionId || ""),
          safeText(answer.selectedKey).toUpperCase() || null,
        ]),
      );
    } else {
      const sessionQuery: Record<string, unknown> = {
        _id: String(req.params.sessionId || ""),
        exam: String(req.params.examId || ""),
      };
      if (!isAdmin) sessionQuery.student = userId;

      const session = await ExamSession.findOne(sessionQuery).lean();
      if (!session) {
        ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'No answers found'));
        return;
      }

      const orderedQuestionIds = Array.isArray((session as any).answers)
        ? (session as any).answers
          .map((answer: { questionId: string }) => String(answer.questionId || ""))
          .filter(Boolean)
        : [];
      questions = await loadQuestionsForPdf(context, orderedQuestionIds);
      selectedByQuestion = new Map(
        (Array.isArray((session as any).answers) ? (session as any).answers : []).map(
          (answer: { questionId: string; selectedAnswer: string }) => [
            String(answer.questionId || ""),
            safeText(answer.selectedAnswer).toUpperCase() || null,
          ],
        ),
      );
    }

    if (questions.length === 0) {
      ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'No answers found'));
      return;
    }

    const doc = createPdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${sanitizeFilename(context.title)}_answers.pdf"`,
    );
    doc.pipe(res);

    addHeader(doc, `${context.title} - My Answers`);
    questions.forEach((question, index) => {
      const selected = selectedByQuestion.get(question.id) || null;
      addQuestionBlock(doc, question, index, {
        showSelected: selected,
        showCorrect: true,
        showExplanation: true,
      });
    });
    doc.end();
  } catch (err) {
    console.error("[PDF] Answers error:", err);
    if (!res.headersSent) ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'PDF generation failed'));
  }
}
