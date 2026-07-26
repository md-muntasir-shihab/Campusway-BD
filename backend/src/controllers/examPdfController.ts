import { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import PDFDocument from "pdfkit";
import Exam from "../models/Exam";
import Question from "../models/Question";
import ExamSession from "../models/ExamSession";
import ExamResult from "../models/ExamResult";
import { ExamQuestionModel } from "../models/examQuestion.model";
import { AnswerModel } from "../models/answer.model";
import QuestionBankQuestion from "../models/QuestionBankQuestion";
import User from "../models/User";
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

/**
 * Render a single question inside a result-review PDF.
 * Colour-codes: green = correct selection, red = wrong selection,
 * green-italic = correct answer when student selected wrong/nothing.
 */
function addResultQuestionBlock(
  doc: PDFKit.PDFDocument,
  question: PdfQuestionRow,
  index: number,
  selectedKey: string | null,
  isCorrect: boolean,
): void {
  if (doc.y > 670) doc.addPage();

  const indicator = selectedKey === null ? '—' : isCorrect ? '✓' : '✗';
  const indicatorColor = selectedKey === null ? '#888888' : isCorrect ? '#1a7a4a' : '#b22222';

  doc.fontSize(11).font('Helvetica-Bold').fillColor(indicatorColor)
    .text(`${indicator}  Q${index + 1}. `, { continued: true });
  doc.fillColor('#000000')
    .text(safeText(question.questionText) || 'Question');
  doc.font('Helvetica');

  if (question.questionImageUrl) {
    doc.fontSize(8).fillColor('#888888').text(`[Image: ${question.questionImageUrl}]`);
    doc.fillColor('#000000');
  }
  doc.moveDown(0.25);

  for (const option of question.options) {
    const isSelected = option.key === selectedKey;
    const isCorrectOption = option.key === question.correctKey;
    let prefix = '  ';
    let suffix = '';
    let color = '#333333';
    if (isSelected && isCorrectOption) {
      prefix = '► '; suffix = '  ✓ correct'; color = '#1a7a4a';
    } else if (isSelected && !isCorrectOption) {
      prefix = '► '; suffix = '  ✗ wrong'; color = '#b22222';
    } else if (!isSelected && isCorrectOption) {
      suffix = '  ← correct answer'; color = '#1a7a4a';
    }
    doc.fontSize(10).fillColor(color)
      .text(`${prefix}${option.key}) ${safeText(option.text)}${suffix}`);
  }

  if (!selectedKey && question.correctKey) {
    doc.fontSize(9).fillColor('#555555')
      .text(`  [Not answered — correct: ${question.correctKey}]`);
  }

  if (question.explanationText) {
    doc.moveDown(0.15);
    doc.fontSize(9).fillColor('#555555')
      .text(`Explanation: ${question.explanationText}`);
  }
  doc.fillColor('#000000').moveDown(0.6);
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

/**
 * GET /exams/:examId/pdf/result-review
 *
 * Generate a per-question result review PDF for the authenticated student.
 *
 * Score summary + each MCQ question with the student's selection highlighted
 * (green = correct, red = wrong, green arrow = correct answer when missed).
 *
 * Obeys the same result-publish gate as getDetailedResult:
 *   immediate → always visible
 *   manual    → only when status === 'evaluated'
 *   scheduled → only once resultPublishDate has passed
 *
 * Requirements: 17.5, 17.6
 */
export async function generateResultReviewPdf(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const studentId = String(authReq.user?._id || authReq.user?.id || '').trim();
    if (!studentId) {
      ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Authentication required'));
      return;
    }

    const examId = String(req.params.examId || '').trim();
    if (!examId || !/^[a-fA-F0-9]{24}$/.test(examId)) {
      ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid exam ID'));
      return;
    }

    const context = await resolveExamContext(examId);
    if (!context) {
      ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Exam not found'));
      return;
    }

    // Fetch most recent result for this student
    const result = await ExamResult.findOne({ exam: examId, student: studentId })
      .sort({ attemptNo: -1, submittedAt: -1 })
      .lean();
    if (!result) {
      ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'No exam result found for this student'));
      return;
    }

    // Enforce result-publish policy (mirrors getDetailedResult)
    const rawExam = context.rawExam as any;
    const modeRaw = String(rawExam.resultPublishMode || 'scheduled');
    const mode = ['immediate', 'manual', 'scheduled'].includes(modeRaw) ? modeRaw : 'scheduled';
    const now = new Date();
    let resultPublished = false;
    if (mode === 'immediate') {
      resultPublished = true;
    } else if (mode === 'manual') {
      resultPublished = result.status === 'evaluated';
    } else {
      const pd = rawExam.resultPublishDate ? toDate(rawExam.resultPublishDate) : null;
      resultPublished = Boolean(pd && !Number.isNaN(pd.getTime()) && now >= pd);
    }

    if (!resultPublished) {
      ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Results have not been published yet'));
      return;
    }

    // Student display name
    const userDoc = await User.findById(studentId).select('full_name username').lean();
    const studentName = safeText((userDoc as any)?.full_name) || safeText((userDoc as any)?.username) || 'Student';

    // Resolve question details — snapshot first, then QuestionBankQuestion
    const answers = Array.isArray(result.answers) ? result.answers : [];
    const mcqAnswers = answers.filter(a => a.questionType !== 'written');
    const questionIds = mcqAnswers.map(a => a.question).filter(Boolean);

    const snapshotDocs = questionIds.length
      ? await ExamQuestionModel.find({ _id: { $in: questionIds } }).lean()
      : [];
    const snapshotMap = new Map(snapshotDocs.map(q => [String(q._id), q]));

    const missingIds = questionIds.filter(id => !snapshotMap.has(String(id)));
    const bankDocs = missingIds.length
      ? await QuestionBankQuestion.find({ _id: { $in: missingIds } }).lean()
      : [];
    const bankMap = new Map(bankDocs.map(q => [String(q._id), q]));

    // Score summary values
    const totalMarks = Number(result.totalMarks || 0);
    const obtainedMarks = Number(result.obtainedMarks || 0);
    const pct = Number(result.percentage || (totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0));
    const passThreshold = Number(rawExam.passPercentage || 40);
    const passed = result.passFail
      ? /pass/i.test(String(result.passFail))
      : pct >= passThreshold;

    // Build PDF
    const doc = createPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${sanitizeFilename(context.title)}_result_review.pdf"`,
    );
    doc.pipe(res);

    // ── Page header ──────────────────────────────────────────────
    addHeader(doc, `${context.title} — Result Review`);

    doc.fontSize(10).fillColor('#444444')
      .text(
        `Student: ${studentName}   |   Attempt #${result.attemptNo || 1}   |   Submitted: ${result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A'}`,
      );
    doc.moveDown(0.5);

    // ── Score summary box ────────────────────────────────────────
    const margins = doc.page.margins;
    const boxLeft = margins.left;
    const boxWidth = doc.page.width - margins.left - margins.right;
    const boxTop = doc.y;
    const BOX_H = 72;

    doc.save()
      .rect(boxLeft, boxTop, boxWidth, BOX_H)
      .fillAndStroke('#f0f4f8', '#c0ccd8')
      .restore();

    doc.fontSize(14).font('Helvetica-Bold')
      .fillColor(passed ? '#1a7a4a' : '#b22222')
      .text(passed ? 'PASS' : 'FAIL', boxLeft + 14, boxTop + 10);

    doc.fontSize(12).fillColor('#111111')
      .text(
        `Score: ${obtainedMarks} / ${totalMarks}  (${pct.toFixed(1)}%)`,
        boxLeft + 14, boxTop + 30,
      );

    doc.fontSize(9).font('Helvetica').fillColor('#444444')
      .text(
        `Correct: ${result.correctCount ?? 0}    Wrong: ${result.wrongCount ?? 0}    Unanswered: ${result.unansweredCount ?? 0}    Time: ${Math.round((result.timeTaken || 0) / 60)} min`,
        boxLeft + 14, boxTop + 52,
      );

    doc.y = boxTop + BOX_H + 10;
    doc.fillColor('#000000').font('Helvetica');

    // ── Per-question review ──────────────────────────────────────
    mcqAnswers.forEach((answer, idx) => {
      const qId = String(answer.question);
      const rawQ = (snapshotMap.get(qId) || bankMap.get(qId)) as any;

      let row: PdfQuestionRow;
      if (!rawQ) {
        row = { id: qId, orderIndex: idx, questionText: '[Question data unavailable]', questionImageUrl: '', options: [], correctKey: '', explanationText: '', explanationImageUrl: '' };
      } else if (snapshotMap.has(qId)) {
        row = mapModernQuestion(rawQ, idx);
      } else {
        // QuestionBankQuestion schema
        const opts = Array.isArray(rawQ.options)
          ? rawQ.options.map((o: any) => ({
              key: String(o.key || '').toUpperCase(),
              text: safeText(o.text_en) || safeText(o.text_bn) || safeText(o.text),
            }))
          : [];
        row = {
          id: qId,
          orderIndex: idx,
          questionText: safeText(rawQ.question_en) || safeText(rawQ.question_bn),
          questionImageUrl: safeText(rawQ.questionImageUrl),
          options: opts,
          correctKey: safeText(rawQ.correctKey || rawQ.correctAnswer || '').toUpperCase(),
          explanationText: safeText(rawQ.explanation_en) || safeText(rawQ.explanation_bn),
          explanationImageUrl: safeText(rawQ.explanationImageUrl),
        };
      }

      const selected = safeText(answer.selectedAnswer).toUpperCase() || null;
      addResultQuestionBlock(doc, row, idx, selected, Boolean(answer.isCorrect));
    });

    doc.end();
  } catch (err) {
    console.error('[PDF] ResultReview error:', err);
    if (!res.headersSent) {
      ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'PDF generation failed'));
    }
  }
}
