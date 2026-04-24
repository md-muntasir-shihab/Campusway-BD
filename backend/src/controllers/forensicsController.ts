import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import {
    getSessionTimeline,
    getExamAntiCheatSummary,
    exportExamForensics,
    getStudentAntiCheatHistory,
    ForensicsFilters,
} from '../services/forensicsService';
import SecurityAlert from '../models/SecurityAlert';
import { ResponseBuilder } from '../utils/responseBuilder';

/* ── helpers ── */

function asObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

/* ═══════════════════════════════════════════════════════════
   FORENSICS ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/**
 * GET /exams/:examId/forensics/timeline/:sessionId
 * Session event timeline — chronological event list
 * Requirement 14.1
 */
export async function getForensicsTimeline(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = asObjectId(req.params.sessionId);
    if (!sessionId) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid sessionId'));
        return;
    }

    const timeline = await getSessionTimeline(String(sessionId));
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ data: timeline }));
}

/**
 * GET /exams/:examId/forensics/summary
 * Exam anti-cheat summary — per-session aggregated counters
 * Requirement 14.2
 */
export async function getForensicsSummary(req: AuthRequest, res: Response): Promise<void> {
    const examId = asObjectId(req.params.examId);
    if (!examId) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid examId'));
        return;
    }

    const summary = await getExamAntiCheatSummary(String(examId));
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ data: summary }));
}

/**
 * GET /exams/:examId/forensics/export
 * Forensics JSON export — exam info, sessions, timeline
 * Requirement 14.3, 14.4
 */
export async function getForensicsExport(req: AuthRequest, res: Response): Promise<void> {
    const examId = asObjectId(req.params.examId);
    if (!examId) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid examId'));
        return;
    }

    const exportData = await exportExamForensics(String(examId));
    ResponseBuilder.send(res, 200, ResponseBuilder.success(exportData));
}

/**
 * GET /students/:studentId/anti-cheat-history
 * Student anti-cheat history with filters & pagination
 * Requirement 14.5, 14.6
 */
export async function getStudentAntiCheatHistoryController(req: AuthRequest, res: Response): Promise<void> {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid studentId'));
        return;
    }

    const filters: ForensicsFilters = {};
    if (req.query.startDate) filters.startDate = new Date(String(req.query.startDate));
    if (req.query.endDate) filters.endDate = new Date(String(req.query.endDate));
    if (req.query.eventType) filters.eventType = String(req.query.eventType);
    if (req.query.page) filters.page = Math.max(1, Number(req.query.page) || 1);
    if (req.query.limit) filters.limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await getStudentAntiCheatHistory(String(studentId), filters);
    ResponseBuilder.send(res, 200, ResponseBuilder.success(result));
}

/* ═══════════════════════════════════════════════════════════
   SECURITY ALERTS (Anti-Cheat) ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/**
 * GET /security/alerts
 * Unacknowledged security alerts list
 * Requirement 13.6
 */
export async function getUnacknowledgedAlerts(req: AuthRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { acknowledged: false };
    if (req.query.alertType) filter.alertType = String(req.query.alertType);
    if (req.query.severity) filter.severity = String(req.query.severity);

    const [items, total] = await Promise.all([
        SecurityAlert.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SecurityAlert.countDocuments(filter),
    ]);

    ResponseBuilder.send(res, 200, ResponseBuilder.success({ items, total, page, pages: Math.ceil(total / limit) || 1 }));
}

/**
 * PUT /security/alerts/:alertId/acknowledge
 * Acknowledge a security alert
 * Requirement 13.6
 */
export async function acknowledgeAlert(req: AuthRequest, res: Response): Promise<void> {
    const alertId = asObjectId(req.params.alertId);
    if (!alertId) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid alertId'));
        return;
    }

    if (!req.user?._id) {
        ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Unauthorized'));
        return;
    }

    const alert = await SecurityAlert.findByIdAndUpdate(
        alertId,
        {
            $set: {
                acknowledged: true,
                acknowledgedBy: new mongoose.Types.ObjectId(String(req.user._id)),
                acknowledgedAt: new Date(),
            },
        },
        { new: true },
    );

    if (!alert) {
        ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Alert not found'));
        return;
    }

    ResponseBuilder.send(res, 200, ResponseBuilder.success({data: alert}, 'Alert acknowledged'));
}
