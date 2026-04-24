import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getJobHealthWindow, getRecentJobRuns } from '../services/jobRunLogService';
import { ResponseBuilder } from '../utils/responseBuilder';

export async function adminGetJobRuns(req: AuthRequest, res: Response): Promise<void> {
    try {
        const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
        const items = await getRecentJobRuns(limit);
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items, total: items.length }));
    } catch (error) {
        console.error('adminGetJobRuns error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminGetJobHealth(req: AuthRequest, res: Response): Promise<void> {
    try {
        const hours = Math.max(1, Math.min(168, Number(req.query.hours || 24)));
        const health = await getJobHealthWindow(hours);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(health));
    } catch (error) {
        console.error('adminGetJobHealth error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
