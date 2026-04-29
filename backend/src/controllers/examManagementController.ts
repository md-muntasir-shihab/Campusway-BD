import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as ExamBuilderService from '../services/ExamBuilderService';
import * as ExamRunnerService from '../services/ExamRunnerService';
import { computeResult } from '../services/ResultEngineService';
import { getExamLeaderboard } from '../services/LeaderboardService';
import Exam from '../models/Exam';
import ExamResult from '../models/ExamResult';

// ── Exam Management Controller ──────────────────────────────
// Thin handlers delegating to ExamBuilderService, ExamRunnerService,
// ResultEngineService, and LeaderboardService.
// Requirements: 4.1, 5.1, 7.4, 8.3, 17.3, 17.4, 17.5, 17.6

// ═══════════════════════════════════════════════════════════
// Admin Handlers
// ═══════════════════════════════════════════════════════════

// ─── Admin: Create Draft (Step 1) ───────────────────────────

/**
 * POST / — Create a new exam draft.
 */
export async function createDraft(req: AuthRequest, res: Response): Promise<void> {
    try {
        const createdBy = req.user!._id as string;
        const exam = await ExamBuilderService.createExamDraft({ ...req.body, createdBy });
        ResponseBuilder.send(res, 201, ResponseBuilder.created(exam, 'Exam draft created'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── Admin: Update Question Selection (Step 2) ──────────────

/**
 * PUT /:id/questions — Set selected questions on a draft exam.
 */
export async function updateQuestions(req: AuthRequest, res: Response): Promise<void> {
    try {
        await ExamBuilderService.updateQuestionSelection(String(req.params.id), req.body.questionIds);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Questions updated'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : message.includes('draft') ? 400 : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Auto-Pick Questions (Step 2 alternative) ────────

/**
 * POST /:id/auto-pick — Auto-select questions by difficulty distribution.
 */
export async function autoPick(req: AuthRequest, res: Response): Promise<void> {
    try {
        const questionIds = await ExamBuilderService.autoPick(String(req.params.id), req.body);
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ questionIds }, 'Questions auto-picked'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : message.includes('draft') ? 400 : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Update Settings (Step 3) ────────────────────────

/**
 * PUT /:id/settings — Update exam settings (marks, shuffle, visibility, anti-cheat).
 */
export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        await ExamBuilderService.updateSettings(String(req.params.id), req.body);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Settings updated'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : message.includes('draft') ? 400 : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Update Scheduling (Step 4) ──────────────────────

/**
 * PUT /:id/scheduling — Update exam scheduling and pricing.
 */
export async function updateScheduling(req: AuthRequest, res: Response): Promise<void> {
    try {
        await ExamBuilderService.updateScheduling(String(req.params.id), req.body);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Scheduling updated'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : message.includes('draft') ? 400 : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Preview Exam ────────────────────────────────────

/**
 * GET /:id/preview — Preview an exam with its questions before publishing.
 */
export async function previewExam(req: AuthRequest, res: Response): Promise<void> {
    try {
        const exam = await Exam.findById(String(req.params.id)).populate('questionOrder').lean();
        if (!exam) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Exam not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(exam));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── Admin: Publish Exam (Step 5) ───────────────────────────

/**
 * POST /:id/publish — Validate and publish a draft exam.
 */
export async function publishExam(req: AuthRequest, res: Response): Promise<void> {
    try {
        const exam = await ExamBuilderService.publishExam(String(req.params.id));
        ResponseBuilder.send(res, 200, ResponseBuilder.success(exam, 'Exam published'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('Cannot publish') || message.includes('Only draft') ? 400
                : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Clone Exam ──────────────────────────────────────

/**
 * POST /:id/clone — Clone an existing exam as a new draft.
 */
export async function cloneExam(req: AuthRequest, res: Response): Promise<void> {
    try {
        const exam = await ExamBuilderService.cloneExam(String(req.params.id));
        ResponseBuilder.send(res, 201, ResponseBuilder.created(exam, 'Exam cloned'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        const code = status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ═══════════════════════════════════════════════════════════
// Student Handlers
// ═══════════════════════════════════════════════════════════

// ─── Student: Start Exam ────────────────────────────────────

/**
 * POST /:id/start — Start an exam session for the authenticated student.
 */
export async function startExamSession(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user!._id as string;
        const result = await ExamRunnerService.startExam(
            String(req.params.id),
            studentId,
            req.body.deviceInfo,
        );
        ResponseBuilder.send(res, 201, ResponseBuilder.created(result, 'Exam session started'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('not published') || message.includes('not started')
                || message.includes('ended') || message.includes('Maximum attempts')
                || message.includes('access') ? 403
                : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Student: Save Answers ──────────────────────────────────

/**
 * PATCH /sessions/:id/answers — Auto-save answers for an in-progress session.
 */
export async function saveAnswers(req: AuthRequest, res: Response): Promise<void> {
    try {
        await ExamRunnerService.saveAnswers(String(req.params.id), req.body.answers);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Answers saved'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('not in progress') || message.includes('expired')
                || message.includes('no longer active') ? 400
                : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Student: Submit Exam ───────────────────────────────────

/**
 * POST /:id/submit — Submit an exam session (manual or auto-timeout).
 */
export async function submitExamSession(req: AuthRequest, res: Response): Promise<void> {
    try {
        const submissionType = req.body.submissionType === 'auto_timeout' ? 'auto_timer' as const : 'manual' as const;
        const session = await ExamRunnerService.submitExam(req.body.sessionId, submissionType);

        // Trigger result computation asynchronously
        computeResult(String(session._id)).catch(() => {
            // Result computation errors are logged internally; don't block the response
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ sessionId: session._id }, 'Exam submitted'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('already been submitted') ? 400
                : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Student: Get Result ────────────────────────────────────

/**
 * GET /:id/result — Get the exam result for the authenticated student.
 */
export async function getResult(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user!._id as string;
        const result = await ExamResult.findOne({
            exam: String(req.params.id),
            student: studentId,
        }).lean();

        if (!result) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Result not found'));
            return;
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success(result));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── Student: Get Leaderboard ───────────────────────────────

/**
 * GET /:id/leaderboard — Get the leaderboard for a specific exam.
 */
export async function getExamLeaderboardHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const studentId = req.user?._id as string | undefined;
        const leaderboard = await getExamLeaderboard(String(req.params.id), page, studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(leaderboard));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
