/**
 * Adaptive Difficulty Controller
 * Requirement: 28
 */
import type { Request, Response } from 'express';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as AdaptiveDifficultyService from '../services/AdaptiveDifficultyService';

/**
 * GET /topics/:id/my-difficulty
 * Returns the student's adaptive difficulty rating for a specific topic.
 */
export async function getMyTopicDifficulty(req: Request, res: Response): Promise<void> {
    try {
        const studentId = (req as any).user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Not authenticated'));
            return;
        }

        const topicId = req.params.id as string;
        if (!topicId) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('BAD_REQUEST', 'Topic ID is required'));
            return;
        }

        const record = await AdaptiveDifficultyService.getTopicDifficulty(studentId, topicId);

        ResponseBuilder.send(res, 200, ResponseBuilder.success(record ?? {
            rating: 1200,
            totalAnswered: 0,
            correctCount: 0,
            accuracy: 0,
            difficultyLevel: 'beginner',
        }));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /my-difficulties
 * Returns all topic difficulty records for the authenticated student.
 */
export async function getAllMyDifficulties(req: Request, res: Response): Promise<void> {
    try {
        const studentId = (req as any).user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Not authenticated'));
            return;
        }

        const records = await AdaptiveDifficultyService.getAllTopicDifficulties(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(records));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
