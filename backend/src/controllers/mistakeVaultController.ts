import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as MistakeVaultService from '../services/MistakeVaultService';

// ── Mistake Vault Controller ────────────────────────────────
// Thin handlers delegating to MistakeVaultService.
// Requirements: 20.2, 20.3

/**
 * GET / — List the authenticated student's mistake vault entries.
 * Query: subject?, chapter?, topic?, examId?, masteryStatus?, page?, limit?
 */
export async function getMistakes(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const filters: MistakeVaultService.MistakeVaultFilters = {
            subject: req.query.subject as string | undefined,
            chapter: req.query.chapter as string | undefined,
            topic: req.query.topic as string | undefined,
            examId: req.query.examId as string | undefined,
            masteryStatus: req.query.masteryStatus as 'weak' | 'still_weak' | 'mastered' | undefined,
            page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        };

        const result = await MistakeVaultService.getMistakes(studentId, filters);
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(result.entries, result.page, result.limit, result.total),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * POST /retry-session — Create a retry practice session from mistake vault entries.
 * Body: { subject?, chapter?, topic?, examId?, masteryStatus? }
 */
export async function createRetrySession(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const filters: MistakeVaultService.MistakeVaultFilters = {
            subject: req.body.subject,
            chapter: req.body.chapter,
            topic: req.body.topic,
            examId: req.body.examId,
            masteryStatus: req.body.masteryStatus,
        };

        const questionIds = await MistakeVaultService.createRetrySession(studentId, filters);
        ResponseBuilder.send(res, 201, ResponseBuilder.created(questionIds, 'Retry session created'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
