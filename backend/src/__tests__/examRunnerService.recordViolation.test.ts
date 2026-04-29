import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ExamSession from '../models/ExamSession';
import Exam from '../models/Exam';
import AntiCheatViolationLog from '../models/AntiCheatViolationLog';
import { recordViolation, ViolationEvent } from '../services/ExamRunnerService';

/**
 * Unit tests for ExamRunnerService.recordViolation
 * Validates: Requirements 6.1, 6.2, 6.3, 6.7, 28.1, 28.4
 */

let mongoServer: MongoMemoryServer;

// Shared test data
const studentId = new mongoose.Types.ObjectId();
const examId = new mongoose.Types.ObjectId();

async function createExam(overrides: Record<string, unknown> = {}) {
    const exam = new Exam({
        title: 'Test Exam',
        subject: 'Physics',
        totalQuestions: 10,
        totalMarks: 10,
        duration: 60,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-12-31'),
        resultPublishDate: new Date('2026-12-31'),
        isPublished: true,
        defaultMarksPerQuestion: 1,
        attemptLimit: 1,
        security_policies: {
            tab_switch_limit: 3,
            copy_paste_violations: 3,
            camera_enabled: false,
            require_fullscreen: true,
            auto_submit_on_violation: false,
            violation_action: 'warn',
        },
        ...overrides,
    });
    return exam.save();
}

async function createSession(examRef: mongoose.Types.ObjectId, overrides: Record<string, unknown> = {}) {
    const now = new Date();
    const session = new ExamSession({
        exam: examRef,
        student: studentId,
        attemptNo: 1,
        attemptRevision: 0,
        startedAt: now,
        lastSavedAt: now,
        autoSaves: 0,
        answers: [],
        tabSwitchEvents: [],
        ipAddress: '127.0.0.1',
        deviceInfo: 'test',
        browserInfo: 'test',
        userAgent: 'test',
        deviceFingerprint: 'fp-abc123',
        sessionLocked: false,
        isActive: true,
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        tabSwitchCount: 0,
        copyAttemptCount: 0,
        fullscreenExitCount: 0,
        violationsCount: 0,
        markedForReview: [],
        localStorageBackup: false,
        cheat_flags: [],
        auto_submitted: false,
        status: 'in_progress',
        ...overrides,
    });
    return session.save();
}

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await ExamSession.deleteMany({});
    await Exam.deleteMany({});
    await AntiCheatViolationLog.deleteMany({});
});

describe('ExamRunnerService.recordViolation', () => {
    // ─── Basic violation recording ───────────────────────────────────

    it('creates an AntiCheatViolationLog document for a tab_switch violation', async () => {
        const exam = await createExam({ _id: examId });
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        const violation: ViolationEvent = {
            violationType: 'tab_switch',
            details: 'User switched to another tab',
            deviceFingerprint: 'fp-abc123',
            ipAddress: '192.168.1.1',
        };

        await recordViolation(session._id as string, violation);

        const logs = await AntiCheatViolationLog.find({ session: session._id });
        expect(logs).toHaveLength(1);
        expect(logs[0].violationType).toBe('tab_switch');
        expect(logs[0].details).toBe('User switched to another tab');
        expect(logs[0].student.toString()).toBe(studentId.toString());
        expect(logs[0].exam.toString()).toBe(exam._id!.toString());
    });

    // ─── Type-specific counter increments ────────────────────────────

    it('increments tabSwitchCount for tab_switch violations', async () => {
        const exam = await createExam();
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        await recordViolation(session._id as string, { violationType: 'tab_switch' });

        const updated = await ExamSession.findById(session._id);
        expect(updated!.tabSwitchCount).toBe(1);
    });

    it('increments copyAttemptCount for copy_attempt violations', async () => {
        const exam = await createExam();
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        await recordViolation(session._id as string, { violationType: 'copy_attempt' });

        const updated = await ExamSession.findById(session._id);
        expect(updated!.copyAttemptCount).toBe(1);
    });

    it('increments fullscreenExitCount for fullscreen_exit violations', async () => {
        const exam = await createExam();
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        await recordViolation(session._id as string, { violationType: 'fullscreen_exit' });

        const updated = await ExamSession.findById(session._id);
        expect(updated!.fullscreenExitCount).toBe(1);
    });

    it('does not increment type-specific counters for fingerprint_match violations', async () => {
        const exam = await createExam();
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        await recordViolation(session._id as string, { violationType: 'fingerprint_match' });

        const updated = await ExamSession.findById(session._id);
        expect(updated!.tabSwitchCount).toBe(0);
        expect(updated!.copyAttemptCount).toBe(0);
        expect(updated!.fullscreenExitCount).toBe(0);
    });

    // ─── General violationsCount ─────────────────────────────────────

    it('increments violationsCount for every violation type', async () => {
        const exam = await createExam();
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        await recordViolation(session._id as string, { violationType: 'tab_switch' });
        await recordViolation(session._id as string, { violationType: 'copy_attempt' });
        await recordViolation(session._id as string, { violationType: 'fullscreen_exit' });

        const updated = await ExamSession.findById(session._id);
        expect(updated!.violationsCount).toBe(3);
    });

    // ─── Cheat flags ─────────────────────────────────────────────────

    it('adds a cheat_flag entry with reason and timestamp', async () => {
        const exam = await createExam();
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        await recordViolation(session._id as string, {
            violationType: 'tab_switch',
            details: 'Switched to Chrome',
        });

        const updated = await ExamSession.findById(session._id);
        expect(updated!.cheat_flags).toHaveLength(1);
        expect(updated!.cheat_flags[0].reason).toBe('tab_switch: Switched to Chrome');
        expect(updated!.cheat_flags[0].timestamp).toBeInstanceOf(Date);
    });

    // ─── Auto-submit on limit exceeded ───────────────────────────────

    it('auto-submits when violations exceed the configured limit', async () => {
        const exam = await createExam({
            security_policies: {
                tab_switch_limit: 2,
                copy_paste_violations: 3,
                camera_enabled: false,
                require_fullscreen: true,
                auto_submit_on_violation: false,
                violation_action: 'warn',
            },
        });
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        // First two violations — within limit
        const result1 = await recordViolation(session._id as string, { violationType: 'tab_switch' });
        expect(result1.autoSubmitted).toBe(false);
        expect(result1.violationCount).toBe(1);
        expect(result1.maxAllowed).toBe(2);

        const result2 = await recordViolation(session._id as string, { violationType: 'tab_switch' });
        expect(result2.autoSubmitted).toBe(false);
        expect(result2.violationCount).toBe(2);

        // Third violation — exceeds limit of 2
        const result3 = await recordViolation(session._id as string, { violationType: 'tab_switch' });
        expect(result3.autoSubmitted).toBe(true);
        expect(result3.violationCount).toBe(3);
        expect(result3.maxAllowed).toBe(2);

        // Verify session is now submitted
        const updated = await ExamSession.findById(session._id);
        expect(updated!.status).toBe('submitted');
        expect(updated!.submissionType).toBe('forced');
        expect(updated!.auto_submitted).toBe(true);
    });

    it('uses default limit of 3 when exam has no security_policies', async () => {
        const exam = await createExam({ security_policies: undefined });
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        const result = await recordViolation(session._id as string, { violationType: 'tab_switch' });
        expect(result.maxAllowed).toBe(3);
        expect(result.autoSubmitted).toBe(false);
    });

    // ─── Return value structure ──────────────────────────────────────

    it('returns correct ViolationResult shape', async () => {
        const exam = await createExam();
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        const result = await recordViolation(session._id as string, { violationType: 'tab_switch' });

        expect(result).toHaveProperty('autoSubmitted');
        expect(result).toHaveProperty('violationCount');
        expect(result).toHaveProperty('maxAllowed');
        expect(typeof result.autoSubmitted).toBe('boolean');
        expect(typeof result.violationCount).toBe('number');
        expect(typeof result.maxAllowed).toBe('number');
    });

    // ─── Error cases ─────────────────────────────────────────────────

    it('throws when session does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        await expect(
            recordViolation(fakeId.toString(), { violationType: 'tab_switch' }),
        ).rejects.toThrow('Exam session not found');
    });

    it('throws when session is already submitted', async () => {
        const exam = await createExam();
        const session = await createSession(exam._id as mongoose.Types.ObjectId, {
            status: 'submitted',
        });

        await expect(
            recordViolation(session._id as string, { violationType: 'tab_switch' }),
        ).rejects.toThrow('Cannot record violation: session is not in progress');
    });

    it('does not record violation after auto-submit', async () => {
        const exam = await createExam({
            security_policies: {
                tab_switch_limit: 1,
                copy_paste_violations: 3,
                camera_enabled: false,
                require_fullscreen: true,
                auto_submit_on_violation: false,
                violation_action: 'warn',
            },
        });
        const session = await createSession(exam._id as mongoose.Types.ObjectId);

        // First violation within limit
        await recordViolation(session._id as string, { violationType: 'tab_switch' });
        // Second violation triggers auto-submit
        await recordViolation(session._id as string, { violationType: 'tab_switch' });

        // Third violation should fail — session is now submitted
        await expect(
            recordViolation(session._id as string, { violationType: 'tab_switch' }),
        ).rejects.toThrow('Cannot record violation: session is not in progress');
    });
});
