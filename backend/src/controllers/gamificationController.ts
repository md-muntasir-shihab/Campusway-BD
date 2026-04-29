import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as GamificationService from '../services/GamificationService';
import * as LeaderboardService from '../services/LeaderboardService';

// ── Gamification Controller ─────────────────────────────────
// Thin handlers delegating to GamificationService and LeaderboardService.
// Requirements: 19.10, 17.4

/**
 * GET /profile — Return the authenticated student's gamification profile.
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const profile = await GamificationService.getStudentGamificationProfile(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(profile));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /leaderboard/weekly — Return the weekly leaderboard (paginated).
 */
export async function getWeeklyLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const result = await LeaderboardService.getWeeklyLeaderboard(page);
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(result.entries, result.page, 20, result.total),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /leaderboard/global — Return the global leaderboard (paginated).
 */
export async function getGlobalLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const result = await LeaderboardService.getGlobalLeaderboard(page);
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(result.entries, result.page, 20, result.total),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
