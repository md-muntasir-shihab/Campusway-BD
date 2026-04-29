import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as BattleEngineService from '../services/BattleEngineService';

// ── Battle Controller ───────────────────────────────────────
// Thin handlers delegating to BattleEngineService.
// Requirements: 21.1, 21.2, 21.3, 21.6

/**
 * POST /challenge — Create a battle challenge against another student.
 * Body: { opponentId, topicId? }
 */
export async function createChallenge(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const { opponentId, topicId } = req.body;
        const battle = await BattleEngineService.createChallenge(studentId, opponentId, topicId);
        ResponseBuilder.send(res, 201, ResponseBuilder.created(battle, 'Battle challenge created'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('Cannot challenge yourself') || message.includes('No MCQ questions') ? 400 : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('BATTLE_ERROR', message));
    }
}

/**
 * POST /:id/accept — Accept a pending battle challenge.
 */
export async function acceptChallenge(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const battleId = String(req.params.id);
        const battle = await BattleEngineService.acceptChallenge(battleId, studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(battle, 'Battle challenge accepted'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status =
            message.includes('not found') ? 404 :
                message.includes('Cannot accept') || message.includes('Only the challenged') ? 400 :
                    500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('BATTLE_ERROR', message));
    }
}

/**
 * POST /:id/answer — Submit an answer during an active battle.
 * Body: { questionId, answer }
 */
export async function submitAnswer(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const battleId = String(req.params.id);
        const { questionId, answer } = req.body;
        const progress = await BattleEngineService.submitBattleAnswer(battleId, studentId, questionId, answer);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(progress));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status =
            message.includes('not found') ? 404 :
                message.includes('Cannot submit') || message.includes('not a participant') || message.includes('already answered') || message.includes('not part of') ? 400 :
                    500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('BATTLE_ERROR', message));
    }
}

/**
 * GET /history — Return paginated battle history for the authenticated student.
 */
export async function getBattleHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const result = await BattleEngineService.getBattleHistory(studentId, page);
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(result.data, result.page, result.limit, result.total),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
