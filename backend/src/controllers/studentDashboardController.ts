import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import {
    getExamHistoryAndProgress,
    getFeaturedUniversities,
    getStudentDashboardAggregate,
    getStudentDashboardHeader,
    getStudentLiveAlerts,
    getStudentNotifications,
    getUpcomingExamCards,
} from '../services/studentDashboardService';
import { addStudentDashboardStreamClient } from '../realtime/studentDashboardStream';

function ensureStudent(req: AuthRequest, res: Response): string | null {
    if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return null;
    }
    if (req.user.role !== 'student') {
        res.status(403).json({ message: 'Student access only' });
        return null;
    }
    return req.user._id;
}

export async function getStudentDashboardAggregateHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const payload = await getStudentDashboardAggregate(studentId);
        res.json(payload);
    } catch (err) {
        console.error('getStudentDashboardAggregateHandler error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getStudentUpcomingExams(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const items = await getUpcomingExamCards(studentId);
        res.json({ items, lastUpdatedAt: new Date().toISOString() });
    } catch (err) {
        console.error('getStudentUpcomingExams error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getStudentFeaturedUniversities(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getFeaturedUniversities();
        res.json(data);
    } catch (err) {
        console.error('getStudentFeaturedUniversities error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getStudentNotificationFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getStudentNotifications(studentId);
        res.json(data);
    } catch (err) {
        console.error('getStudentNotificationFeed error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getStudentDashboardProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getStudentDashboardHeader(studentId);
        res.json(data);
    } catch (err) {
        console.error('getStudentDashboardProfile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getStudentExamHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getExamHistoryAndProgress(studentId);
        res.json(data);
    } catch (err) {
        console.error('getStudentExamHistory error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getStudentLiveAlertsHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getStudentLiveAlerts(studentId);
        res.json(data);
    } catch (err) {
        console.error('getStudentLiveAlertsHandler error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export function getStudentDashboardStream(req: AuthRequest, res: Response): void {
    const studentId = ensureStudent(req, res);
    if (!studentId) return;
    addStudentDashboardStreamClient(res);
}
