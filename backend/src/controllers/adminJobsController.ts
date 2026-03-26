import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getJobHealthWindow, getRecentJobRuns } from '../services/jobRunLogService';

export async function adminGetJobRuns(req: AuthRequest, res: Response): Promise<void> {
    try {
        const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
        const items = await getRecentJobRuns(limit);
        res.json({ items, total: items.length });
    } catch (error) {
        console.error('adminGetJobRuns error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetJobHealth(req: AuthRequest, res: Response): Promise<void> {
    try {
        const hours = Math.max(1, Math.min(168, Number(req.query.hours || 24)));
        const health = await getJobHealthWindow(hours);
        res.json(health);
    } catch (error) {
        console.error('adminGetJobHealth error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
