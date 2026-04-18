import mongoose from 'mongoose';
import ExamEvent, { IExamEvent } from '../models/ExamEvent';
import ExamSession, { IExamSession } from '../models/ExamSession';
import Exam from '../models/Exam';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionSummary {
    sessionId: string;
    studentId: string;
    attemptNo: number;
    startedAt: Date;
    status: string;
    tabSwitchCount: number;
    copyAttemptCount: number;
    fullscreenExitCount: number;
    violationsCount: number;
    sessionLocked: boolean;
    lockReason: string;
}

export interface ForensicsExport {
    exportedAt: Date;
    exam: {
        examId: string;
        title: string;
        totalQuestions: number;
        totalMarks: number;
        duration: number;
    };
    sessions: SessionSummary[];
    timeline: Pick<IExamEvent, 'eventType' | 'metadata' | 'ip' | 'createdAt'>[];
}

export interface ForensicsFilters {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T = any> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ─── Session Timeline ────────────────────────────────────────────────────────

/**
 * Return all ExamEvent records for a given attempt (session) in
 * chronological order. Each entry includes eventType, timestamp,
 * metadata, and ip.
 *
 * Requirement 14.1
 */
export async function getSessionTimeline(attemptId: string): Promise<IExamEvent[]> {
    return ExamEvent.find({ attempt: new mongoose.Types.ObjectId(attemptId) })
        .sort({ createdAt: 1 })
        .select('eventType createdAt metadata ip')
        .lean<IExamEvent[]>();
}

// ─── Exam Anti-Cheat Summary ─────────────────────────────────────────────────

/**
 * Aggregate per-session anti-cheat counters for every session belonging
 * to the given exam. Returns tabSwitchCount, copyAttemptCount,
 * fullscreenExitCount, violationsCount, sessionLocked, and lockReason
 * for each session.
 *
 * Requirement 14.2
 */
export async function getExamAntiCheatSummary(examId: string): Promise<SessionSummary[]> {
    const sessions = await ExamSession.find({ exam: new mongoose.Types.ObjectId(examId) })
        .select(
            'student attemptNo startedAt status tabSwitchCount copyAttemptCount fullscreenExitCount violationsCount sessionLocked lockReason',
        )
        .lean<IExamSession[]>();

    return sessions.map((s) => ({
        sessionId: String(s._id),
        studentId: String(s.student),
        attemptNo: s.attemptNo,
        startedAt: s.startedAt,
        status: s.status,
        tabSwitchCount: s.tabSwitchCount ?? 0,
        copyAttemptCount: s.copyAttemptCount ?? 0,
        fullscreenExitCount: s.fullscreenExitCount ?? 0,
        violationsCount: s.violationsCount ?? 0,
        sessionLocked: s.sessionLocked ?? false,
        lockReason: s.lockReason ?? '',
    }));
}

// ─── Export Exam Forensics ───────────────────────────────────────────────────

/**
 * Build a full JSON forensics export for an exam: exam metadata,
 * per-session summaries, and the complete event timeline across all
 * sessions.
 *
 * Requirement 14.3
 */
export async function exportExamForensics(examId: string): Promise<ForensicsExport> {
    const examOid = new mongoose.Types.ObjectId(examId);

    const [exam, sessions, timeline] = await Promise.all([
        Exam.findById(examOid).select('title totalQuestions totalMarks duration').lean(),
        getExamAntiCheatSummary(examId),
        ExamEvent.find({ exam: examOid })
            .sort({ createdAt: 1 })
            .select('eventType createdAt metadata ip')
            .lean<IExamEvent[]>(),
    ]);

    return {
        exportedAt: new Date(),
        exam: {
            examId,
            title: (exam as any)?.title ?? 'Unknown',
            totalQuestions: (exam as any)?.totalQuestions ?? 0,
            totalMarks: (exam as any)?.totalMarks ?? 0,
            duration: (exam as any)?.duration ?? 0,
        },
        sessions,
        timeline,
    };
}

// ─── Student Anti-Cheat History ──────────────────────────────────────────────

/**
 * Retrieve a paginated list of ExamSession + ExamEvent records for a
 * specific student, with optional date range and eventType filters.
 *
 * Requirement 14.5, 14.6
 */
export async function getStudentAntiCheatHistory(
    studentId: string,
    filters: ForensicsFilters = {},
): Promise<PaginatedResult> {
    const { startDate, endDate, eventType, page = 1, limit = 20 } = filters;
    const studentOid = new mongoose.Types.ObjectId(studentId);

    // Build session query
    const sessionQuery: Record<string, any> = { student: studentOid };
    if (startDate || endDate) {
        sessionQuery.startedAt = {};
        if (startDate) sessionQuery.startedAt.$gte = startDate;
        if (endDate) sessionQuery.startedAt.$lte = endDate;
    }

    // Fetch matching sessions
    const sessions = await ExamSession.find(sessionQuery)
        .select(
            'exam attemptNo startedAt status tabSwitchCount copyAttemptCount fullscreenExitCount violationsCount sessionLocked lockReason',
        )
        .sort({ startedAt: -1 })
        .lean<IExamSession[]>();

    const sessionIds = sessions.map((s) => s._id);

    // Build event query
    const eventQuery: Record<string, any> = { student: studentOid, attempt: { $in: sessionIds } };
    if (eventType) eventQuery.eventType = eventType;
    if (startDate || endDate) {
        eventQuery.createdAt = {};
        if (startDate) eventQuery.createdAt.$gte = startDate;
        if (endDate) eventQuery.createdAt.$lte = endDate;
    }

    const total = await ExamEvent.countDocuments(eventQuery);
    const skip = (page - 1) * limit;

    const events = await ExamEvent.find(eventQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('attempt eventType createdAt metadata ip')
        .lean<IExamEvent[]>();

    return {
        data: events,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    };
}
