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
        res.status(400).json({ message: 'Invalid sessionId' });
        return;
    }

    const timeline = await getSessionTimeline(String(sessionId));
    res.json({ data: timeline });
}

/**
 * GET /exams/:examId/forensics/summary
 * Exam anti-cheat summary — per-session aggregated counters
 * Requirement 14.2
 */
export async function getForensicsSummary(req: AuthRequest, res: Response): Promise<void> {
    const examId = asObjectId(req.params.examId);
    if (!examId) {
        res.status(400).json({ message: 'Invalid examId' });
        return;
    }

    const summary = await getExamAntiCheatSummary(String(examId));
    res.json({ data: summary });
}

/**
 * GET /exams/:examId/forensics/export
 * Forensics JSON export — exam info, sessions, timeline
 * Requirement 14.3, 14.4
 */
export async function getForensicsExport(req: AuthRequest, res: Response): Promise<void> {
    const examId = asObjectId(req.params.examId);
    if (!examId) {
        res.status(400).json({ message: 'Invalid examId' });
        return;
    }

    const exportData = await exportExamForensics(String(examId));
    res.json(exportData);
}

/**
 * GET /students/:studentId/anti-cheat-history
 * Student anti-cheat history with filters & pagination
 * Requirement 14.5, 14.6
 */
export async function getStudentAntiCheatHistoryController(req: AuthRequest, res: Response): Promise<void> {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) {
        res.status(400).json({ message: 'Invalid studentId' });
        return;
    }

    const filters: ForensicsFilters = {};
    if (req.query.startDate) filters.startDate = new Date(String(req.query.startDate));
    if (req.query.endDate) filters.endDate = new Date(String(req.query.endDate));
    if (req.query.eventType) filters.eventType = String(req.query.eventType);
    if (req.query.page) filters.page = Math.max(1, Number(req.query.page) || 1);
    if (req.query.limit) filters.limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await getStudentAntiCheatHistory(String(studentId), filters);
    res.json(result);
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

    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
}

/**
 * PUT /security/alerts/:alertId/acknowledge
 * Acknowledge a security alert
 * Requirement 13.6
 */
export async function acknowledgeAlert(req: AuthRequest, res: Response): Promise<void> {
    const alertId = asObjectId(req.params.alertId);
    if (!alertId) {
        res.status(400).json({ message: 'Invalid alertId' });
        return;
    }

    if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
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
        res.status(404).json({ message: 'Alert not found' });
        return;
    }

    res.json({ data: alert, message: 'Alert acknowledged' });
}
