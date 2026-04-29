import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import Exam from '../models/Exam';
import ExamSession from '../models/ExamSession';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import { saveAnswers, restoreSession } from '../services/ExamRunnerService';

/**
 * Feature: exam-management-system
 * Property 24: Auto-Save Restore Round-Trip
 *
 * **Validates: Requirements 18.4**
 *
 * For any set of answers auto-saved to an exam session, reopening the session
 * after a browser crash should restore exactly the same answer state (same
 * question-answer mappings) as the last successful auto-save.
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
});

// ─── Generators ──────────────────────────────────────────────────────────────

/**
 * Generate a non-empty subset of question indices from [0..n-1],
 * representing which questions the student answered.
 */
function answeredSubsetArb(questionCount: number) {
    return fc.subarray(
        Array.from({ length: questionCount }, (_, i) => i),
        { minLength: 1, maxLength: questionCount },
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create an exam with N questions and return the exam + question IDs.
 */
async function createExamWithQuestions(questionCount: number) {
    const questionDocs = [];
    for (let i = 0; i < questionCount; i++) {
        questionDocs.push({
            subject: 'Physics',
            moduleCategory: 'Mechanics',
            difficulty: 'medium' as const,
            correctKey: 'A' as const,
            question_en: `Question ${i + 1}`,
            question_bn: `প্রশ্ন ${i + 1}`,
            options: [
                { key: 'A', text_en: 'Option A', text_bn: 'বিকল্প ক', isCorrect: true },
                { key: 'B', text_en: 'Option B', text_bn: 'বিকল্প খ' },
                { key: 'C', text_en: 'Option C', text_bn: 'বিকল্প গ' },
                { key: 'D', text_en: 'Option D', text_bn: 'বিকল্প ঘ' },
            ],
            marks: 1,
            isActive: true,
            isArchived: false,
            status: 'published',
        });
    }

    const questions = await QuestionBankQuestion.insertMany(questionDocs);
    const questionIds = questions.map((q) => q._id as mongoose.Types.ObjectId);

    const now = new Date();
    const exam = await Exam.create({
        title: 'Auto-Save Round-Trip Test Exam',
        subject: 'Physics',
        totalQuestions: questionCount,
        totalMarks: questionCount,
        duration: 60,
        isPublished: true,
        status: 'live',
        startDate: new Date(now.getTime() - 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 60 * 60 * 1000),
        resultPublishDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        visibilityMode: 'all_students',
        accessMode: 'all',
        createdBy: new mongoose.Types.ObjectId(),
        questionOrder: questionIds,
        exam_schedule_type: 'practice',
    });

    return { exam, questionIds };
}

/**
 * Create an in-progress exam session for a student.
 */
async function createSession(
    examId: mongoose.Types.ObjectId,
    studentId: mongoose.Types.ObjectId,
) {
    const now = new Date();
    const session = await ExamSession.create({
        exam: examId,
        student: studentId,
        attemptNo: 1,
        attemptRevision: 0,
        startedAt: now,
        lastSavedAt: now,
        autoSaves: 0,
        answers: [],
        tabSwitchEvents: [],
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test Device',
        browserInfo: 'Test Browser',
        userAgent: 'TestAgent/1.0',
        deviceFingerprint: 'test-fp-001',
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
    });

    return session;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 24: Auto-Save Restore Round-Trip', () => {
    it('saved answers are restored exactly after session reopen', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Number of questions in the exam (1 to 10)
                fc.integer({ min: 1, max: 10 }),
                async (questionCount) => {
                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});

                    // Setup: create exam with questions
                    const { exam, questionIds } =
                        await createExamWithQuestions(questionCount);
                    const studentId = new mongoose.Types.ObjectId();

                    // Create an in-progress session
                    const session = await createSession(
                        exam._id as mongoose.Types.ObjectId,
                        studentId,
                    );
                    const sessionId = (
                        session._id as mongoose.Types.ObjectId
                    ).toString();

                    // Generate random answers for a random subset of questions
                    const answeredIndices = fc.sample(
                        answeredSubsetArb(questionCount),
                        1,
                    )[0];

                    const answers = answeredIndices.map((idx) => {
                        const selectedAnswer = fc.sample(
                            fc.constantFrom('A', 'B', 'C', 'D'),
                            1,
                        )[0];
                        return {
                            questionId: questionIds[idx].toString(),
                            selectedAnswer,
                        };
                    });

                    // Act: save answers via the service
                    await saveAnswers(sessionId, answers);

                    // Act: restore the session (simulating browser crash + reopen)
                    const restored = await restoreSession(sessionId);

                    // Build maps for comparison
                    const savedMap = new Map(
                        answers.map((a) => [a.questionId, a.selectedAnswer]),
                    );
                    const restoredMap = new Map(
                        restored.answers.map((a) => [
                            a.questionId,
                            a.selectedAnswer,
                        ]),
                    );

                    // Property: same number of answers
                    expect(restoredMap.size).toBe(savedMap.size);

                    // Property: every saved answer is present and matches
                    for (const [questionId, selectedAnswer] of savedMap) {
                        expect(restoredMap.has(questionId)).toBe(true);
                        expect(restoredMap.get(questionId)).toBe(
                            selectedAnswer,
                        );
                    }

                    // Property: no extra answers in restored state
                    for (const [questionId] of restoredMap) {
                        expect(savedMap.has(questionId)).toBe(true);
                    }
                },
            ),
            { numRuns: 20 },
        );
    });

    it('multiple sequential saves restore only the latest answer per question', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Number of questions (2 to 6)
                fc.integer({ min: 2, max: 6 }),
                // Number of save rounds (2 to 4)
                fc.integer({ min: 2, max: 4 }),
                async (questionCount, saveRounds) => {
                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});

                    // Setup
                    const { exam, questionIds } =
                        await createExamWithQuestions(questionCount);
                    const studentId = new mongoose.Types.ObjectId();
                    const session = await createSession(
                        exam._id as mongoose.Types.ObjectId,
                        studentId,
                    );
                    const sessionId = (
                        session._id as mongoose.Types.ObjectId
                    ).toString();

                    // Track the latest answer for each question across all rounds
                    const latestAnswers = new Map<string, string>();

                    for (let round = 0; round < saveRounds; round++) {
                        // Pick a random subset of questions to answer
                        const answeredIndices = fc.sample(
                            answeredSubsetArb(questionCount),
                            1,
                        )[0];

                        const answers = answeredIndices.map((idx) => {
                            const selectedAnswer = fc.sample(
                                fc.constantFrom('A', 'B', 'C', 'D'),
                                1,
                            )[0];
                            return {
                                questionId: questionIds[idx].toString(),
                                selectedAnswer,
                            };
                        });

                        await saveAnswers(sessionId, answers);

                        // Update tracking map with the latest answers
                        for (const a of answers) {
                            latestAnswers.set(a.questionId, a.selectedAnswer);
                        }
                    }

                    // Restore session
                    const restored = await restoreSession(sessionId);
                    const restoredMap = new Map(
                        restored.answers.map((a) => [
                            a.questionId,
                            a.selectedAnswer,
                        ]),
                    );

                    // Property: restored answers match the latest saved answer
                    expect(restoredMap.size).toBe(latestAnswers.size);

                    for (const [questionId, selectedAnswer] of latestAnswers) {
                        expect(restoredMap.has(questionId)).toBe(true);
                        expect(restoredMap.get(questionId)).toBe(
                            selectedAnswer,
                        );
                    }
                },
            ),
            { numRuns: 15 },
        );
    });
});
