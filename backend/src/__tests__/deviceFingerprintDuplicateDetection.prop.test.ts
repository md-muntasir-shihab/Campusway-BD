import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import Exam from '../models/Exam';
import ExamSession from '../models/ExamSession';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import AntiCheatViolationLog from '../models/AntiCheatViolationLog';
import { startExam, DeviceInfo } from '../services/ExamRunnerService';

/**
 * Feature: exam-management-system
 * Property 33: Device Fingerprint Duplicate Detection
 *
 * **Validates: Requirements 28.2**
 *
 * When two different students start the same exam with the same device
 * fingerprint, the system SHALL flag both sessions by creating
 * AntiCheatViolationLog entries with violationType 'fingerprint_match'.
 *
 * Conversely, when two different students use different fingerprints on
 * the same exam, no fingerprint_match violations should be created.
 */

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Exam.deleteMany({});
    await ExamSession.deleteMany({});
    await QuestionBankQuestion.deleteMany({});
    await AntiCheatViolationLog.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDeviceInfo(fingerprint: string, index: number): DeviceInfo {
    return {
        ipAddress: `192.168.1.${(index % 254) + 1}`,
        deviceInfo: `Device-${index}`,
        browserInfo: `Browser-${index}`,
        userAgent: `TestAgent/${index}`,
        deviceFingerprint: fingerprint,
    };
}

/**
 * Create a minimal published exam with at least one question.
 */
async function createPublishedExam() {
    const question = await QuestionBankQuestion.create({
        subject: 'Physics',
        moduleCategory: 'Mechanics',
        difficulty: 'medium',
        correctKey: 'A',
        question_en: 'Fingerprint detection test question',
        question_bn: 'ফিঙ্গারপ্রিন্ট সনাক্তকরণ পরীক্ষার প্রশ্ন',
        options: [
            { key: 'A', text_en: 'Option A', isCorrect: true },
            { key: 'B', text_en: 'Option B' },
            { key: 'C', text_en: 'Option C' },
            { key: 'D', text_en: 'Option D' },
        ],
        marks: 1,
        isActive: true,
        isArchived: false,
        status: 'published',
    });

    const now = new Date();
    const exam = await Exam.create({
        title: 'Fingerprint Detection Test Exam',
        subject: 'Physics',
        totalQuestions: 1,
        totalMarks: 1,
        duration: 60,
        isPublished: true,
        status: 'live',
        startDate: new Date(now.getTime() - 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 60 * 60 * 1000),
        resultPublishDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        createdBy: new mongoose.Types.ObjectId(),
        questionOrder: [question._id],
        exam_schedule_type: 'practice',
        visibilityMode: 'all_students',
        accessMode: 'all',
    });

    return exam;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 33: Device Fingerprint Duplicate Detection', () => {
    it('same fingerprint + different students on same exam creates fingerprint_match violations', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate a non-empty fingerprint string
                fc.string({ minLength: 8, maxLength: 64 }).filter((s) => s.trim().length > 0),
                async (fingerprint) => {
                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});
                    await AntiCheatViolationLog.deleteMany({});

                    const exam = await createPublishedExam();
                    const examId = (exam._id as mongoose.Types.ObjectId).toString();

                    const studentA = new mongoose.Types.ObjectId();
                    const studentB = new mongoose.Types.ObjectId();

                    // Student A starts the exam with the fingerprint
                    await startExam(examId, studentA.toString(), makeDeviceInfo(fingerprint, 1));

                    // At this point, no violations should exist (only one student)
                    const violationsBefore = await AntiCheatViolationLog.countDocuments({
                        exam: exam._id,
                        violationType: 'fingerprint_match',
                    });
                    expect(violationsBefore).toBe(0);

                    // Student B starts the same exam with the SAME fingerprint
                    await startExam(examId, studentB.toString(), makeDeviceInfo(fingerprint, 2));

                    // Now fingerprint_match violations should exist
                    const violations = await AntiCheatViolationLog.find({
                        exam: exam._id,
                        violationType: 'fingerprint_match',
                    });

                    // At least 2 violations: one for student A's session, one for student B's session
                    expect(violations.length).toBeGreaterThanOrEqual(2);

                    // Verify both students are flagged
                    const flaggedStudentIds = violations.map((v) => v.student.toString());
                    expect(flaggedStudentIds).toContain(studentA.toString());
                    expect(flaggedStudentIds).toContain(studentB.toString());

                    // All violations should reference the fingerprint
                    for (const v of violations) {
                        expect(v.deviceFingerprint).toBe(fingerprint);
                        expect(v.violationType).toBe('fingerprint_match');
                    }
                },
            ),
            { numRuns: 15 },
        );
    });

    it('different fingerprints on same exam by different students do NOT create fingerprint_match violations', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Two distinct fingerprints
                fc.string({ minLength: 8, maxLength: 64 }).filter((s) => s.trim().length > 0),
                fc.string({ minLength: 8, maxLength: 64 }).filter((s) => s.trim().length > 0),
                async (fpA, fpB) => {
                    // Ensure fingerprints are actually different
                    fc.pre(fpA !== fpB);

                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});
                    await AntiCheatViolationLog.deleteMany({});

                    const exam = await createPublishedExam();
                    const examId = (exam._id as mongoose.Types.ObjectId).toString();

                    const studentA = new mongoose.Types.ObjectId();
                    const studentB = new mongoose.Types.ObjectId();

                    // Student A starts with fingerprint A
                    await startExam(examId, studentA.toString(), makeDeviceInfo(fpA, 1));

                    // Student B starts with fingerprint B (different)
                    await startExam(examId, studentB.toString(), makeDeviceInfo(fpB, 2));

                    // No fingerprint_match violations should exist
                    const violations = await AntiCheatViolationLog.countDocuments({
                        exam: exam._id,
                        violationType: 'fingerprint_match',
                    });
                    expect(violations).toBe(0);
                },
            ),
            { numRuns: 15 },
        );
    });
});
