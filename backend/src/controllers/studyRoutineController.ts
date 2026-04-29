import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as StudyRoutineService from '../services/StudyRoutineService';

// ── Study Routine Controller ────────────────────────────────
// Thin handlers delegating to StudyRoutineService.
// Requirements: 25.1, 25.2, 25.3

/**
 * GET / — Get the authenticated student's study routine.
 */
export async function getRoutine(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const routine = await StudyRoutineService.getRoutine(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(routine));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * PUT / — Update the authenticated student's study routine.
 * Body: { weeklySchedule?, examCountdowns? }
 */
export async function updateRoutine(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const data: StudyRoutineService.UpdateRoutineData = {
            weeklySchedule: req.body.weeklySchedule,
            examCountdowns: req.body.examCountdowns,
        };

        const routine = await StudyRoutineService.updateRoutine(studentId, data);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(routine, 'Study routine updated'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
