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
import { ResponseBuilder } from '../utils/responseBuilder';

function ensureStudent(req: AuthRequest, res: Response): string | null {
    if (!req.user) {
        ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Not authenticated'));
        return null;
    }
    if (req.user.role !== 'student') {
        ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access only'));
        return null;
    }
    return req.user._id;
}

export async function getStudentDashboardAggregateHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const payload = await getStudentDashboardAggregate(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(payload));
    } catch (err) {
        console.error('getStudentDashboardAggregateHandler error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getStudentUpcomingExams(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const items = await getUpcomingExamCards(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items, lastUpdatedAt: new Date().toISOString() }));
    } catch (err) {
        console.error('getStudentUpcomingExams error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getStudentFeaturedUniversities(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getFeaturedUniversities();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(data));
    } catch (err) {
        console.error('getStudentFeaturedUniversities error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getStudentNotificationFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getStudentNotifications(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(data));
    } catch (err) {
        console.error('getStudentNotificationFeed error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getStudentDashboardProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getStudentDashboardHeader(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(data));
    } catch (err) {
        console.error('getStudentDashboardProfile error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getStudentExamHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getExamHistoryAndProgress(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(data));
    } catch (err) {
        console.error('getStudentExamHistory error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getStudentLiveAlertsHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;
        const data = await getStudentLiveAlerts(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(data));
    } catch (err) {
        console.error('getStudentLiveAlertsHandler error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export function getStudentDashboardStream(req: AuthRequest, res: Response): void {
    const studentId = ensureStudent(req, res);
    if (!studentId) return;
    addStudentDashboardStreamClient(res);
}
