import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as DoubtSolverService from '../services/DoubtSolverService';

// ── Doubt Controller ────────────────────────────────────────
// Thin handlers delegating to DoubtSolverService.
// Requirements: 26.1, 26.3, 26.4

/**
 * POST / — Create a new doubt thread for a question.
 * Body: { questionId, content? }
 */
export async function createDoubt(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const { questionId } = req.body;
        const thread = await DoubtSolverService.createDoubt(questionId, userId);
        ResponseBuilder.send(res, 201, ResponseBuilder.created(thread, 'Doubt thread created'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('DOUBT_ERROR', message));
    }
}

/**
 * GET /question/:questionId — Get doubt threads for a specific question.
 * Query: page?
 */
export async function getThreadsByQuestion(req: AuthRequest, res: Response): Promise<void> {
    try {
        const questionId = String(req.params.questionId);
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);

        const result = await DoubtSolverService.getDoubtsForQuestion(questionId, page);
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(result.threads, result.page, result.limit, result.total),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * POST /:id/reply — Post a reply to a doubt thread.
 * Body: { threadId, content }
 */
export async function addReply(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const threadId = String(req.params.id);
        const { content } = req.body;
        const thread = await DoubtSolverService.addReply(threadId, userId, content);
        ResponseBuilder.send(res, 201, ResponseBuilder.created(thread, 'Reply added'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('DOUBT_ERROR', message));
    }
}

/**
 * POST /:id/vote — Vote on a reply in a doubt thread.
 * Body: { threadId, replyIndex, vote }
 */
export async function vote(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const threadId = String(req.params.id);
        const { replyIndex, vote: voteDirection } = req.body;
        const thread = await DoubtSolverService.voteReply(threadId, replyIndex, userId, voteDirection);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(thread, 'Vote recorded'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('out of range') ? 400
                : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('DOUBT_ERROR', message));
    }
}
