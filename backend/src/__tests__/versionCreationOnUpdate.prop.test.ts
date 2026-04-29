// Feature: exam-management-system, Property 9: Version Creation on Published-Exam Update

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fc from 'fast-check';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';
import {
    createQuestion,
    updateQuestion,
    CreateQuestionDto,
    UpdateQuestionDto,
} from '../services/QuestionBankService';
import QuestionRevision from '../models/QuestionRevision';
import Exam from '../models/Exam';

/**
 * Feature: exam-management-system, Property 9: Version Creation on Published-Exam Update
 *
 * *For any* question that is referenced by at least one published exam, updating
 * the question should create a new QuestionRevision document preserving the
 * original field values, and the original question document used by the published
 * exam should remain unchanged.
 *
 * **Validates: Requirements 2.4**
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a valid MCQ question DTO. */
function buildQuestionDto(overrides?: Partial<CreateQuestionDto>): CreateQuestionDto {
    return {
        question_type: 'mcq',
        question_en: 'What is 2 + 2?',
        question_bn: '২ + ২ = কত?',
        options: [
            { key: 'A', text_en: '3', isCorrect: false },
            { key: 'B', text_en: '4', isCorrect: true },
            { key: 'C', text_en: '5', isCorrect: false },
            { key: 'D', text_en: '6', isCorrect: false },
        ],
        correctKey: 'A',
        subject: 'Mathematics',
        moduleCategory: 'Arithmetic',
        difficulty: 'easy',
        marks: 1,
        negativeMarks: 0,
        tags: ['math', 'addition'],
        ...overrides,
    };
}

/** Create a published exam that references the given question IDs. */
async function createPublishedExam(questionIds: mongoose.Types.ObjectId[]): Promise<void> {
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await Exam.create({
        title: 'Published Test Exam',
        subject: 'Mathematics',
        totalQuestions: questionIds.length,
        totalMarks: questionIds.length,
        duration: 60,
        startDate: now,
        endDate: future,
        resultPublishDate: future,
        isPublished: true,
        status: 'scheduled',
        questionOrder: questionIds,
        createdBy: new mongoose.Types.ObjectId(),
    });
}

/** Create a draft (non-published) exam that references the given question IDs. */
async function createDraftExam(questionIds: mongoose.Types.ObjectId[]): Promise<void> {
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await Exam.create({
        title: 'Draft Test Exam',
        subject: 'Mathematics',
        totalQuestions: questionIds.length,
        totalMarks: questionIds.length,
        duration: 60,
        startDate: now,
        endDate: future,
        resultPublishDate: future,
        isPublished: false,
        status: 'draft',
        questionOrder: questionIds,
        createdBy: new mongoose.Types.ObjectId(),
    });
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a random update payload with at least one changed field. */
const updatePayloadArb = fc.record({
    question_en: fc.option(
        fc.string({ minLength: 3, maxLength: 100 }).filter((s) => s.trim().length > 0),
        { nil: undefined },
    ),
    explanation_en: fc.option(
        fc.string({ minLength: 3, maxLength: 100 }).filter((s) => s.trim().length > 0),
        { nil: undefined },
    ),
    difficulty: fc.option(
        fc.constantFrom('easy' as const, 'medium' as const, 'hard' as const),
        { nil: undefined },
    ),
    marks: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
    tags: fc.option(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
        { nil: undefined },
    ),
}).filter((payload) => {
    // Ensure at least one field is defined
    return Object.values(payload).some((v) => v !== undefined);
}) as fc.Arbitrary<UpdateQuestionDto>;

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
    await setupTestDb();
});

afterEach(async () => {
    await clearTestDb();
});

afterAll(async () => {
    await teardownTestDb();
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 9: Version Creation on Published-Exam Update', () => {
    it('creates a QuestionRevision when updating a question referenced by a published exam', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(updatePayloadArb, async (updateData) => {
                // 1. Create a question
                const question = await createQuestion(buildQuestionDto());
                const questionId = (question._id as mongoose.Types.ObjectId).toString();

                // 2. Create a published exam referencing this question
                await createPublishedExam([question._id as mongoose.Types.ObjectId]);

                // 3. Capture original field values before update
                const originalQuestionEn = question.question_en;
                const originalDifficulty = question.difficulty;
                const originalMarks = question.marks;
                const originalTags = [...question.tags];

                // 4. Count revisions before update
                const revisionsBefore = await QuestionRevision.countDocuments({ questionId: question._id });

                // 5. Update the question
                const updated = await updateQuestion(questionId, updateData);

                // 6. Verify a new revision was created
                const revisionsAfter = await QuestionRevision.countDocuments({ questionId: question._id });
                expect(revisionsAfter).toBe(revisionsBefore + 1);

                // 7. Verify the revision preserves original data
                const revision = await QuestionRevision.findOne({ questionId: question._id })
                    .sort({ revisionNo: -1 })
                    .lean();
                expect(revision).toBeDefined();
                expect(revision!.questionId.toString()).toBe(questionId);
                expect(revision!.revisionNo).toBe(1);

                const snapshot = revision!.snapshot as Record<string, unknown>;
                expect(snapshot.question_en).toBe(originalQuestionEn);
                expect(snapshot.difficulty).toBe(originalDifficulty);
                expect(snapshot.marks).toBe(originalMarks);
                expect(snapshot.tags).toEqual(originalTags);

                // 8. Verify the question document was actually updated
                if (updateData.question_en !== undefined) {
                    expect(updated.question_en).toBe(updateData.question_en);
                }
                if (updateData.difficulty !== undefined) {
                    expect(updated.difficulty).toBe(updateData.difficulty);
                }
                if (updateData.marks !== undefined) {
                    expect(updated.marks).toBe(updateData.marks);
                }
                if (updateData.tags !== undefined) {
                    expect(updated.tags).toEqual(updateData.tags);
                }
            }),
            { numRuns: 30 },
        );
    });

    it('does NOT create a QuestionRevision when updating a question not referenced by any published exam', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(updatePayloadArb, async (updateData) => {
                // 1. Create a question
                const question = await createQuestion(buildQuestionDto());
                const questionId = (question._id as mongoose.Types.ObjectId).toString();

                // 2. No published exam references this question (only a draft exam)
                await createDraftExam([question._id as mongoose.Types.ObjectId]);

                // 3. Count revisions before update
                const revisionsBefore = await QuestionRevision.countDocuments({ questionId: question._id });

                // 4. Update the question
                await updateQuestion(questionId, updateData);

                // 5. Verify NO new revision was created
                const revisionsAfter = await QuestionRevision.countDocuments({ questionId: question._id });
                expect(revisionsAfter).toBe(revisionsBefore);
            }),
            { numRuns: 20 },
        );
    });

    it('does NOT create a QuestionRevision when question has no exam references at all', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(updatePayloadArb, async (updateData) => {
                // 1. Create a question with no exam references
                const question = await createQuestion(buildQuestionDto());
                const questionId = (question._id as mongoose.Types.ObjectId).toString();

                // 2. Update the question
                await updateQuestion(questionId, updateData);

                // 3. Verify NO revision was created
                const revisionCount = await QuestionRevision.countDocuments({ questionId: question._id });
                expect(revisionCount).toBe(0);
            }),
            { numRuns: 20 },
        );
    });

    it('creates incremental revision numbers on successive updates to a published-exam question', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 4 }),
                async (updateCount) => {
                    // 1. Create a question and a published exam
                    const question = await createQuestion(buildQuestionDto());
                    const questionId = (question._id as mongoose.Types.ObjectId).toString();
                    await createPublishedExam([question._id as mongoose.Types.ObjectId]);

                    // 2. Perform multiple updates
                    for (let i = 0; i < updateCount; i++) {
                        await updateQuestion(questionId, {
                            question_en: `Updated question text iteration ${i + 1}`,
                        });
                    }

                    // 3. Verify revision count matches update count
                    const revisions = await QuestionRevision.find({ questionId: question._id })
                        .sort({ revisionNo: 1 })
                        .lean();
                    expect(revisions.length).toBe(updateCount);

                    // 4. Verify revision numbers are sequential
                    for (let i = 0; i < revisions.length; i++) {
                        expect(revisions[i].revisionNo).toBe(i + 1);
                    }
                },
            ),
            { numRuns: 10 },
        );
    });
});
