import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Helper to create a chainable Mongoose query mock
function chainableQuery(resolvedValue: any) {
    const chain: any = {
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(resolvedValue),
    };
    return chain;
}

vi.mock('../models/ExamEvent', () => {
    const find = vi.fn();
    const countDocuments = vi.fn();
    return { default: { find, countDocuments } };
});

vi.mock('../models/ExamSession', () => {
    const find = vi.fn();
    return { default: { find } };
});

vi.mock('../models/Exam', () => {
    const findById = vi.fn();
    return { default: { findById } };
});

import ExamEvent from '../models/ExamEvent';
import ExamSession from '../models/ExamSession';
import Exam from '../models/Exam';
import {
    getSessionTimeline,
    getExamAntiCheatSummary,
    exportExamForensics,
    getStudentAntiCheatHistory,
} from '../services/forensicsService';

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const oid = (id: string) => new mongoose.Types.ObjectId(id);

const ATTEMPT_ID = '507f1f77bcf86cd799439011';
const EXAM_ID = '507f1f77bcf86cd799439022';
const STUDENT_ID = '507f1f77bcf86cd799439033';
const SESSION_ID_1 = '507f1f77bcf86cd799439044';
const SESSION_ID_2 = '507f1f77bcf86cd799439055';

// ─── getSessionTimeline (Req 14.1) ──────────────────────────────────────────

describe('getSessionTimeline — chronological event list (Req 14.1)', () => {
    it('returns events sorted by createdAt ascending (chronological order)', async () => {
        const events = [
            { eventType: 'tab_switch', createdAt: new Date('2024-01-01T10:00:00Z'), metadata: {}, ip: '1.2.3.4' },
            { eventType: 'copy_attempt', createdAt: new Date('2024-01-01T10:01:00Z'), metadata: {}, ip: '1.2.3.4' },
            { eventType: 'fullscreen_exit', createdAt: new Date('2024-01-01T10:02:00Z'), metadata: {}, ip: '1.2.3.4' },
        ];

        const query = chainableQuery(events);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(query);

        const result = await getSessionTimeline(ATTEMPT_ID);

        expect(ExamEvent.find).toHaveBeenCalledWith({ attempt: oid(ATTEMPT_ID) });
        expect(query.sort).toHaveBeenCalledWith({ createdAt: 1 });
        expect(query.select).toHaveBeenCalledWith('eventType createdAt metadata ip');
        expect(result).toHaveLength(3);
        expect(result[0].eventType).toBe('tab_switch');
        expect(result[1].eventType).toBe('copy_attempt');
        expect(result[2].eventType).toBe('fullscreen_exit');
    });

    it('returns empty array when no events exist for the attempt', async () => {
        const query = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(query);

        const result = await getSessionTimeline(ATTEMPT_ID);

        expect(result).toEqual([]);
    });

    it('selects only eventType, createdAt, metadata, ip fields', async () => {
        const query = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(query);

        await getSessionTimeline(ATTEMPT_ID);

        expect(query.select).toHaveBeenCalledWith('eventType createdAt metadata ip');
    });
});

// ─── getExamAntiCheatSummary (Req 14.2) ─────────────────────────────────────

describe('getExamAntiCheatSummary — per-session aggregated view (Req 14.2)', () => {
    it('returns session summaries with anti-cheat counters', async () => {
        const sessions = [
            {
                _id: oid(SESSION_ID_1),
                student: oid(STUDENT_ID),
                attemptNo: 1,
                startedAt: new Date('2024-01-01T09:00:00Z'),
                status: 'submitted',
                tabSwitchCount: 3,
                copyAttemptCount: 1,
                fullscreenExitCount: 2,
                violationsCount: 6,
                sessionLocked: false,
                lockReason: '',
            },
            {
                _id: oid(SESSION_ID_2),
                student: oid(STUDENT_ID),
                attemptNo: 2,
                startedAt: new Date('2024-01-02T09:00:00Z'),
                status: 'in_progress',
                tabSwitchCount: 5,
                copyAttemptCount: 3,
                fullscreenExitCount: 0,
                violationsCount: 8,
                sessionLocked: true,
                lockReason: 'Too many tab switches',
            },
        ];

        const query = chainableQuery(sessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(query);

        const result = await getExamAntiCheatSummary(EXAM_ID);

        expect(ExamSession.find).toHaveBeenCalledWith({ exam: oid(EXAM_ID) });
        expect(result).toHaveLength(2);
        expect(result[0].sessionId).toBe(SESSION_ID_1);
        expect(result[0].tabSwitchCount).toBe(3);
        expect(result[0].sessionLocked).toBe(false);
        expect(result[1].sessionId).toBe(SESSION_ID_2);
        expect(result[1].sessionLocked).toBe(true);
        expect(result[1].lockReason).toBe('Too many tab switches');
    });

    it('defaults missing counter fields to 0 and booleans to false', async () => {
        const sessions = [
            {
                _id: oid(SESSION_ID_1),
                student: oid(STUDENT_ID),
                attemptNo: 1,
                startedAt: new Date('2024-01-01T09:00:00Z'),
                status: 'in_progress',
                // All counter fields missing (undefined)
            },
        ];

        const query = chainableQuery(sessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(query);

        const result = await getExamAntiCheatSummary(EXAM_ID);

        expect(result[0].tabSwitchCount).toBe(0);
        expect(result[0].copyAttemptCount).toBe(0);
        expect(result[0].fullscreenExitCount).toBe(0);
        expect(result[0].violationsCount).toBe(0);
        expect(result[0].sessionLocked).toBe(false);
        expect(result[0].lockReason).toBe('');
    });

    it('returns empty array when no sessions exist for the exam', async () => {
        const query = chainableQuery([]);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(query);

        const result = await getExamAntiCheatSummary(EXAM_ID);

        expect(result).toEqual([]);
    });
});

// ─── exportExamForensics (Req 14.3) ─────────────────────────────────────────

describe('exportExamForensics — JSON export format (Req 14.3)', () => {
    it('returns export with exam info, sessions, and timeline', async () => {
        const examDoc = {
            title: 'Math Final',
            totalQuestions: 50,
            totalMarks: 100,
            duration: 120,
        };
        const sessions = [
            {
                _id: oid(SESSION_ID_1),
                student: oid(STUDENT_ID),
                attemptNo: 1,
                startedAt: new Date('2024-01-01T09:00:00Z'),
                status: 'submitted',
                tabSwitchCount: 2,
                copyAttemptCount: 0,
                fullscreenExitCount: 1,
                violationsCount: 3,
                sessionLocked: false,
                lockReason: '',
            },
        ];
        const timelineEvents = [
            { eventType: 'tab_switch', createdAt: new Date('2024-01-01T09:05:00Z'), metadata: {}, ip: '1.2.3.4' },
            { eventType: 'fullscreen_exit', createdAt: new Date('2024-01-01T09:10:00Z'), metadata: {}, ip: '1.2.3.4' },
        ];

        // Mock Exam.findById
        const examQuery = chainableQuery(examDoc);
        (Exam.findById as ReturnType<typeof vi.fn>).mockReturnValue(examQuery);

        // Mock ExamSession.find (called by getExamAntiCheatSummary)
        const sessionQuery = chainableQuery(sessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        // Mock ExamEvent.find (called for timeline)
        const eventQuery = chainableQuery(timelineEvents);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        const result = await exportExamForensics(EXAM_ID);

        expect(result.exportedAt).toBeInstanceOf(Date);
        expect(result.exam.examId).toBe(EXAM_ID);
        expect(result.exam.title).toBe('Math Final');
        expect(result.exam.totalQuestions).toBe(50);
        expect(result.exam.totalMarks).toBe(100);
        expect(result.exam.duration).toBe(120);
        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].sessionId).toBe(SESSION_ID_1);
        expect(result.timeline).toHaveLength(2);
    });

    it('handles missing exam gracefully with defaults', async () => {
        const examQuery = chainableQuery(null);
        (Exam.findById as ReturnType<typeof vi.fn>).mockReturnValue(examQuery);

        const sessionQuery = chainableQuery([]);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        const eventQuery = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        const result = await exportExamForensics(EXAM_ID);

        expect(result.exam.title).toBe('Unknown');
        expect(result.exam.totalQuestions).toBe(0);
        expect(result.exam.totalMarks).toBe(0);
        expect(result.exam.duration).toBe(0);
        expect(result.sessions).toEqual([]);
        expect(result.timeline).toEqual([]);
    });

    it('timeline events are sorted chronologically (createdAt ascending)', async () => {
        const examQuery = chainableQuery({ title: 'Test', totalQuestions: 10, totalMarks: 20, duration: 60 });
        (Exam.findById as ReturnType<typeof vi.fn>).mockReturnValue(examQuery);

        const sessionQuery = chainableQuery([]);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        const eventQuery = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        await exportExamForensics(EXAM_ID);

        // Verify ExamEvent.find was called with sort createdAt: 1
        const findCall = (ExamEvent.find as ReturnType<typeof vi.fn>).mock.results;
        // The second call to ExamEvent.find is for the timeline (first is from getSessionTimeline if called)
        // In exportExamForensics, ExamEvent.find is called directly for timeline
        expect(eventQuery.sort).toHaveBeenCalledWith({ createdAt: 1 });
    });
});

// ─── getStudentAntiCheatHistory (Req 14.6) ──────────────────────────────────

describe('getStudentAntiCheatHistory — pagination & filters (Req 14.5, 14.6)', () => {
    const baseSessions = [
        {
            _id: oid(SESSION_ID_1),
            exam: oid(EXAM_ID),
            attemptNo: 1,
            startedAt: new Date('2024-01-01T09:00:00Z'),
            status: 'submitted',
            tabSwitchCount: 3,
            copyAttemptCount: 1,
            fullscreenExitCount: 2,
            violationsCount: 6,
            sessionLocked: false,
            lockReason: '',
        },
    ];

    const baseEvents = [
        { attempt: oid(SESSION_ID_1), eventType: 'tab_switch', createdAt: new Date('2024-01-01T09:05:00Z'), metadata: {}, ip: '1.2.3.4' },
        { attempt: oid(SESSION_ID_1), eventType: 'copy_attempt', createdAt: new Date('2024-01-01T09:06:00Z'), metadata: {}, ip: '1.2.3.4' },
    ];

    it('returns paginated results with correct structure', async () => {
        const sessionQuery = chainableQuery(baseSessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(2);

        const eventQuery = chainableQuery(baseEvents);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        const result = await getStudentAntiCheatHistory(STUDENT_ID);

        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
        expect(result.totalPages).toBe(1);
    });

    it('uses default page=1 and limit=20 when not specified', async () => {
        const sessionQuery = chainableQuery(baseSessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(0);

        const eventQuery = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        const result = await getStudentAntiCheatHistory(STUDENT_ID, {});

        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
    });

    it('applies custom pagination parameters', async () => {
        const sessionQuery = chainableQuery(baseSessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(50);

        const eventQuery = chainableQuery(baseEvents);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        const result = await getStudentAntiCheatHistory(STUDENT_ID, { page: 3, limit: 10 });

        expect(result.page).toBe(3);
        expect(result.limit).toBe(10);
        expect(result.totalPages).toBe(5);
        expect(eventQuery.skip).toHaveBeenCalledWith(20); // (3-1) * 10
        expect(eventQuery.limit).toHaveBeenCalledWith(10);
    });

    it('calculates totalPages correctly', async () => {
        const sessionQuery = chainableQuery(baseSessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(25);

        const eventQuery = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        const result = await getStudentAntiCheatHistory(STUDENT_ID, { page: 1, limit: 10 });

        expect(result.totalPages).toBe(3); // ceil(25/10) = 3
    });

    it('returns totalPages=1 when total is 0', async () => {
        const sessionQuery = chainableQuery([]);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(0);

        const eventQuery = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        const result = await getStudentAntiCheatHistory(STUDENT_ID, {});

        expect(result.totalPages).toBe(1);
    });

    it('applies date range filter to session query', async () => {
        const startDate = new Date('2024-01-01T00:00:00Z');
        const endDate = new Date('2024-01-31T23:59:59Z');

        const sessionQuery = chainableQuery(baseSessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(0);

        const eventQuery = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        await getStudentAntiCheatHistory(STUDENT_ID, { startDate, endDate });

        const sessionFindArg = (ExamSession.find as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(sessionFindArg.student).toEqual(oid(STUDENT_ID));
        expect(sessionFindArg.startedAt.$gte).toEqual(startDate);
        expect(sessionFindArg.startedAt.$lte).toEqual(endDate);
    });

    it('applies eventType filter to event query', async () => {
        const sessionQuery = chainableQuery(baseSessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(1);

        const eventQuery = chainableQuery([baseEvents[0]]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        await getStudentAntiCheatHistory(STUDENT_ID, { eventType: 'tab_switch' });

        const eventFindArg = (ExamEvent.find as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(eventFindArg.eventType).toBe('tab_switch');
    });

    it('applies date range filter to event query as well', async () => {
        const startDate = new Date('2024-01-01T00:00:00Z');
        const endDate = new Date('2024-01-31T23:59:59Z');

        const sessionQuery = chainableQuery(baseSessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(0);

        const eventQuery = chainableQuery([]);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        await getStudentAntiCheatHistory(STUDENT_ID, { startDate, endDate });

        const eventCountArg = (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(eventCountArg.createdAt.$gte).toEqual(startDate);
        expect(eventCountArg.createdAt.$lte).toEqual(endDate);
    });

    it('sorts events by createdAt descending', async () => {
        const sessionQuery = chainableQuery(baseSessions);
        (ExamSession.find as ReturnType<typeof vi.fn>).mockReturnValue(sessionQuery);

        (ExamEvent.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(2);

        const eventQuery = chainableQuery(baseEvents);
        (ExamEvent.find as ReturnType<typeof vi.fn>).mockReturnValue(eventQuery);

        await getStudentAntiCheatHistory(STUDENT_ID);

        expect(eventQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
});
