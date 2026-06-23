/**
 * Brain Clash (Live 1v1 Battle) Controller
 * Requirement: 29
 */
import type { Request, Response } from 'express';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as BrainClashService from '../services/BrainClashService';

/**
 * POST /brain-clash/queue
 * Join matchmaking queue. Responds when matched or times out.
 */
export async function joinQueue(req: Request, res: Response): Promise<void> {
    try {
        const studentId = (req as any).user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const { subjectId } = req.body;

        // joinQueue is async, resolving with battleId when a match is found
        const battleId = await BrainClashService.joinQueue(studentId, subjectId);

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ battleId }, 'Match found!'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        if (message === 'QUEUE_TIMEOUT') {
            ResponseBuilder.send(res, 408, ResponseBuilder.error('REQUEST_TIMEOUT', 'Matchmaking timed out. No opponent found.'));
        } else {
            ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
        }
    }
}

/**
 * DELETE /brain-clash/queue
 * Cancel matchmaking / leave queue.
 */
export async function leaveQueue(req: Request, res: Response): Promise<void> {
    try {
        const studentId = (req as any).user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        BrainClashService.leaveQueue(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Left matchmaking queue'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /brain-clash/:battleId/stream
 * SSE endpoint for live 1v1 battle event streaming.
 */
export async function sseStream(req: Request, res: Response): Promise<void> {
    const battleId = req.params.battleId as string;
    const studentId = (req as any).user?._id?.toString();

    if (!studentId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Register SSE connection in service
    BrainClashService.registerSSEConnection(battleId, studentId, res);

    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
        res.write(': ping\n\n');
    }, 10_000);

    req.on('close', () => {
        clearInterval(pingInterval);
        BrainClashService.removeSSEConnection(battleId, studentId);
    });
}

/**
 * POST /brain-clash/:battleId/answer
 * Submit an answer for the current question in the battle.
 */
export async function submitAnswer(req: Request, res: Response): Promise<void> {
    try {
        const studentId = (req as any).user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const battleId = req.params.battleId as string;
        const { questionIndex, selectedAnswer, timeTakenMs } = req.body;

        if (questionIndex === undefined || selectedAnswer === undefined || timeTakenMs === undefined) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('BAD_REQUEST', 'Missing answer details'));
            return;
        }

        const result = await BrainClashService.processAnswer(battleId, studentId, {
            questionIndex,
            selectedAnswer,
            timeTakenMs,
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success(result, 'Answer submitted successfully'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /brain-clash/history
 * Get paginated battle history.
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
    try {
        const studentId = (req as any).user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 20);

        const data = await BrainClashService.getBattleHistory(studentId, page, limit);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(data));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /brain-clash/:battleId
 * Get details of a single battle.
 */
export async function getBattleDetails(req: Request, res: Response): Promise<void> {
    try {
        const battleId = req.params.battleId as string;
        const battle = await BrainClashService.getBattle(battleId);
        if (!battle) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Battle not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(battle));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
