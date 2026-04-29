import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import Exam from '../models/Exam';
import StudentGroup from '../models/StudentGroup';
import ExamResult from '../models/ExamResult';
import { getExaminerDashboard } from '../services/ExaminerAccountService';

/**
 * Feature: exam-management-system
 * Property 30: Examiner RBAC Isolation
 *
 * **Validates: Requirements 22.7**
 *
 * For any examiner user, dashboard queries should return only resources
 * where the ownership field (created_by for questions, createdBy for exams,
 * createdByAdminId for groups) matches the examiner's user ID.
 * Resources created by other examiners or admins must never appear.
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
    await QuestionBankQuestion.deleteMany({});
    await Exam.deleteMany({});
    await StudentGroup.deleteMany({});
    await ExamResult.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create questions owned by a specific user.
 */
async function createQuestionsForOwner(
    ownerId: mongoose.Types.ObjectId,
    count: number,
) {
    const docs = [];
    for (let i = 0; i < count; i++) {
        docs.push({
            subject: 'Physics',
            moduleCategory: 'Science',
            question_en: `Question ${i} by ${ownerId.toString().slice(-4)}`,
            options: [
                { key: 'A', text_en: 'Option A', isCorrect: true },
                { key: 'B', text_en: 'Option B' },
            ],
            correctKey: 'A',
            marks: 1,
            negativeMarks: 0,
            difficulty: 'easy',
            languageMode: 'en',
            isActive: true,
            isArchived: false,
            contentHash: `hash-${ownerId.toString().slice(-6)}-${i}-${Date.now()}`,
            versionNo: 1,
            created_by: ownerId,
        });
    }
    if (docs.length > 0) {
        await QuestionBankQuestion.insertMany(docs);
    }
}

/**
 * Create exams owned by a specific user.
 * Uses individual Exam.create() calls to avoid share_link unique index conflicts.
 */
async function createExamsForOwner(
    ownerId: mongoose.Types.ObjectId,
    count: number,
) {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
        await Exam.create({
            title: `Exam ${i} by ${ownerId.toString().slice(-4)}`,
            subject: 'Physics',
            totalQuestions: 10,
            totalMarks: 10,
            duration: 30,
            startDate: new Date(now),
            endDate: new Date(now + 86400000),
            resultPublishDate: new Date(now + 86400000),
            createdBy: ownerId,
            share_link: `share-${ownerId.toString().slice(-6)}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
    }
}

/**
 * Create student groups owned by a specific user.
 */
async function createGroupsForOwner(
    ownerId: mongoose.Types.ObjectId,
    count: number,
) {
    const docs = [];
    for (let i = 0; i < count; i++) {
        docs.push({
            name: `Group ${i} by ${ownerId.toString().slice(-4)}`,
            slug: `group-${ownerId.toString().slice(-6)}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdByAdminId: ownerId,
            isActive: true,
            type: 'manual',
        });
    }
    if (docs.length > 0) {
        await StudentGroup.insertMany(docs);
    }
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 30: Examiner RBAC Isolation', () => {
    it('examiner dashboard returns only resources owned by that examiner, not by others', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Resource counts for examiner A (0–5 each)
                fc.integer({ min: 0, max: 5 }),
                fc.integer({ min: 0, max: 5 }),
                fc.integer({ min: 0, max: 5 }),
                // Resource counts for examiner B (0–5 each)
                fc.integer({ min: 0, max: 5 }),
                fc.integer({ min: 0, max: 5 }),
                fc.integer({ min: 0, max: 5 }),
                async (
                    questionsA, examsA, groupsA,
                    questionsB, examsB, groupsB,
                ) => {
                    // Clean slate
                    await QuestionBankQuestion.deleteMany({});
                    await Exam.deleteMany({});
                    await StudentGroup.deleteMany({});
                    await ExamResult.deleteMany({});

                    // Two distinct examiner IDs
                    const examinerA = new mongoose.Types.ObjectId();
                    const examinerB = new mongoose.Types.ObjectId();

                    // Create resources for examiner A
                    await createQuestionsForOwner(examinerA, questionsA);
                    await createExamsForOwner(examinerA, examsA);
                    await createGroupsForOwner(examinerA, groupsA);

                    // Create resources for examiner B
                    await createQuestionsForOwner(examinerB, questionsB);
                    await createExamsForOwner(examinerB, examsB);
                    await createGroupsForOwner(examinerB, groupsB);

                    // Act: get dashboard for examiner A
                    const dashA = await getExaminerDashboard(examinerA.toString());

                    // Assert: examiner A sees only their own resources
                    expect(dashA.questionCount).toBe(questionsA);
                    expect(dashA.examCount).toBe(examsA);
                    expect(dashA.groupCount).toBe(groupsA);

                    // Act: get dashboard for examiner B
                    const dashB = await getExaminerDashboard(examinerB.toString());

                    // Assert: examiner B sees only their own resources
                    expect(dashB.questionCount).toBe(questionsB);
                    expect(dashB.examCount).toBe(examsB);
                    expect(dashB.groupCount).toBe(groupsB);
                },
            ),
            { numRuns: 20 },
        );
    });

    it('examiner with no resources sees zero counts even when other examiners have resources', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Resource counts for the "other" examiner (1–5 each, at least some)
                fc.integer({ min: 1, max: 5 }),
                fc.integer({ min: 1, max: 5 }),
                fc.integer({ min: 1, max: 5 }),
                async (otherQuestions, otherExams, otherGroups) => {
                    // Clean slate
                    await QuestionBankQuestion.deleteMany({});
                    await Exam.deleteMany({});
                    await StudentGroup.deleteMany({});
                    await ExamResult.deleteMany({});

                    const emptyExaminer = new mongoose.Types.ObjectId();
                    const otherExaminer = new mongoose.Types.ObjectId();

                    // Create resources only for the other examiner
                    await createQuestionsForOwner(otherExaminer, otherQuestions);
                    await createExamsForOwner(otherExaminer, otherExams);
                    await createGroupsForOwner(otherExaminer, otherGroups);

                    // Act: get dashboard for the examiner with no resources
                    const dash = await getExaminerDashboard(emptyExaminer.toString());

                    // Assert: zero across the board — no leakage from other examiner
                    expect(dash.questionCount).toBe(0);
                    expect(dash.examCount).toBe(0);
                    expect(dash.groupCount).toBe(0);
                    expect(dash.recentResults).toHaveLength(0);
                },
            ),
            { numRuns: 15 },
        );
    });

    it('examiner recent results only include results from their own exams', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Number of results for examiner A's exam (1–4)
                fc.integer({ min: 1, max: 4 }),
                // Number of results for examiner B's exam (1–4)
                fc.integer({ min: 1, max: 4 }),
                async (resultsA, resultsB) => {
                    // Clean slate
                    await QuestionBankQuestion.deleteMany({});
                    await Exam.deleteMany({});
                    await StudentGroup.deleteMany({});
                    await ExamResult.deleteMany({});

                    const examinerA = new mongoose.Types.ObjectId();
                    const examinerB = new mongoose.Types.ObjectId();

                    // Create one exam per examiner
                    const now = Date.now();
                    const examA = await Exam.create({
                        title: 'Exam A',
                        subject: 'Physics',
                        totalQuestions: 10,
                        totalMarks: 100,
                        duration: 60,
                        startDate: new Date(now),
                        endDate: new Date(now + 86400000),
                        resultPublishDate: new Date(now + 86400000),
                        createdBy: examinerA,
                        share_link: `share-a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    });

                    const examB = await Exam.create({
                        title: 'Exam B',
                        subject: 'Math',
                        totalQuestions: 10,
                        totalMarks: 100,
                        duration: 60,
                        startDate: new Date(now),
                        endDate: new Date(now + 86400000),
                        resultPublishDate: new Date(now + 86400000),
                        createdBy: examinerB,
                        share_link: `share-b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    });

                    // Create results for examiner A's exam
                    const resultDocsA = [];
                    for (let i = 0; i < resultsA; i++) {
                        resultDocsA.push({
                            exam: examA._id,
                            student: new mongoose.Types.ObjectId(),
                            answers: [],
                            totalMarks: 100,
                            obtainedMarks: 50 + i,
                            correctCount: 5 + i,
                            wrongCount: 5 - i,
                            unansweredCount: 0,
                            percentage: 50 + i,
                            submittedAt: new Date(),
                        });
                    }
                    await ExamResult.insertMany(resultDocsA);

                    // Create results for examiner B's exam
                    const resultDocsB = [];
                    for (let i = 0; i < resultsB; i++) {
                        resultDocsB.push({
                            exam: examB._id,
                            student: new mongoose.Types.ObjectId(),
                            answers: [],
                            totalMarks: 100,
                            obtainedMarks: 60 + i,
                            correctCount: 6 + i,
                            wrongCount: 4 - i,
                            unansweredCount: 0,
                            percentage: 60 + i,
                            submittedAt: new Date(),
                        });
                    }
                    await ExamResult.insertMany(resultDocsB);

                    // Act: get dashboard for examiner A
                    const dashA = await getExaminerDashboard(examinerA.toString());

                    // Assert: examiner A only sees results from their own exam
                    expect(dashA.recentResults).toHaveLength(resultsA);
                    for (const result of dashA.recentResults) {
                        expect(result.examId).toBe(
                            (examA._id as mongoose.Types.ObjectId).toString(),
                        );
                    }

                    // Act: get dashboard for examiner B
                    const dashB = await getExaminerDashboard(examinerB.toString());

                    // Assert: examiner B only sees results from their own exam
                    expect(dashB.recentResults).toHaveLength(resultsB);
                    for (const result of dashB.recentResults) {
                        expect(result.examId).toBe(
                            (examB._id as mongoose.Types.ObjectId).toString(),
                        );
                    }
                },
            ),
            { numRuns: 15 },
        );
    });
});
