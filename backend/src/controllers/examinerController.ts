import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as ExaminerAccountService from '../services/ExaminerAccountService';

// ── Examiner Controller ─────────────────────────────────────
// Thin handlers delegating to ExaminerAccountService.
// Requirements: 22.1, 22.3

/**
 * POST /apply — Submit an examiner application.
 * Body: { institutionName?, experience?, subjects?, reason }
 */
export async function applyForExaminer(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const applicationData = {
            institutionName: req.body.institutionName,
            experience: req.body.experience,
            subjects: req.body.subjects,
            reason: req.body.reason,
        };

        const application = await ExaminerAccountService.submitApplication(userId, applicationData);
        ResponseBuilder.send(res, 201, ResponseBuilder.created(application, 'Examiner application submitted'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('already have') || message.includes('already an approved') ? 409 : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('EXAMINER_ERROR', message));
    }
}

/**
 * GET /dashboard — Get the examiner's dashboard data.
 */
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examinerId = req.user?._id?.toString();
        if (!examinerId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const dashboard = await ExaminerAccountService.getExaminerDashboard(examinerId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(dashboard));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /earnings — Get the examiner's revenue/earnings report.
 */
export async function getEarnings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examinerId = req.user?._id?.toString();
        if (!examinerId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const earnings = await ExaminerAccountService.getExaminerEarnings(examinerId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(earnings));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
