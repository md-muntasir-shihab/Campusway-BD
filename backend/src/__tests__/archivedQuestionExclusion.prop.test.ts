// Feature: exam-management-system, Property 10: Archived Question Exclusion

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fc from 'fast-check';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';
import {
    createQuestion,
    archiveQuestion,
    listQuestions,
    CreateQuestionDto,
} from '../services/QuestionBankService';
import QuestionBankQuestion from '../models/QuestionBankQuestion';

/**
 * Feature: exam-management-system, Property 10: Archived Question Exclusion
 *
 * *For any* set of questions where a subset is archived, calling listQuestions
 * must never return any archived question. The total count must equal the number
 * of non-archived questions, and every returned question must have isArchived = false.
 *
 * **Validates: Requirements 2.5**
 */

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/** Generate a valid MCQ question DTO with at least one correct option */
const questionDtoArb = fc
    .record({
        question_en: fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length >= 3),
        difficulty: fc.constantFrom(...DIFFICULTIES),
        marks: fc.integer({ min: 1, max: 10 }),
    })
    .map(
        ({ question_en, difficulty, marks }): CreateQuestionDto => ({
            question_type: 'mcq',
            question_en,
            options: [
                { key: 'A', text_en: 'Option A', isCorrect: true },
                { key: 'B', text_en: 'Option B', isCorrect: false },
                { key: 'C', text_en: 'Option C', isCorrect: false },
                { key: 'D', text_en: 'Option D', isCorrect: false },
            ],
            correctKey: 'A',
            subject: 'Mathematics',
            moduleCategory: 'Algebra',
            difficulty,
            marks,
        }),
    );

/**
 * Generate a list of question DTOs (2–6) and a set of indices to archive.
 * At least one question is archived and at least one remains active.
 */
const questionsWithArchiveIndicesArb = fc
    .array(questionDtoArb, { minLength: 2, maxLength: 6 })
    .chain((dtos) => {
        // Pick a non-empty proper subset of indices to archive
        const indices = dtos.map((_, i) => i);
        return fc
            .subarray(indices, { minLength: 1, maxLength: dtos.length - 1 })
            .map((archiveIndices) => ({ dtos, archiveIndices: new Set(archiveIndices) }));
    });

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

describe('Feature: exam-management-system, Property 10: Archived Question Exclusion', () => {
    it(
        'archived questions never appear in listQuestions results',
        { timeout: 120_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(questionsWithArchiveIndicesArb, async ({ dtos, archiveIndices }) => {
                    // Clean slate for each property run
                    await QuestionBankQuestion.deleteMany({});

                    // Create all questions
                    const created = [];
                    for (const dto of dtos) {
                        created.push(await createQuestion(dto));
                    }

                    // Archive the selected subset
                    for (const idx of archiveIndices) {
                        await archiveQuestion(created[idx]._id.toString());
                    }

                    const expectedActiveCount = dtos.length - archiveIndices.size;

                    // List all questions (no filters, large page to get everything)
                    const result = await listQuestions({}, { page: 1, limit: 100 });

                    // Total count must equal non-archived count
                    expect(result.total).toBe(expectedActiveCount);
                    expect(result.data.length).toBe(expectedActiveCount);

                    // No returned question should be archived
                    const archivedIds = new Set(
                        [...archiveIndices].map((i) => created[i]._id.toString()),
                    );
                    for (const q of result.data) {
                        expect(q.isArchived).not.toBe(true);
                        expect(archivedIds.has(q._id.toString())).toBe(false);
                    }
                }),
                { numRuns: 20 },
            );
        },
    );

    it(
        'archiving all questions results in an empty listing',
        { timeout: 60_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(questionDtoArb, { minLength: 1, maxLength: 4 }),
                    async (dtos) => {
                        // Clean slate for each property run
                        await QuestionBankQuestion.deleteMany({});

                        // Create all questions
                        const created = [];
                        for (const dto of dtos) {
                            created.push(await createQuestion(dto));
                        }

                        // Archive every question
                        for (const q of created) {
                            await archiveQuestion(q._id.toString());
                        }

                        // Listing should return zero results
                        const result = await listQuestions({}, { page: 1, limit: 100 });
                        expect(result.total).toBe(0);
                        expect(result.data.length).toBe(0);
                    },
                ),
                { numRuns: 15 },
            );
        },
    );

    it(
        'non-archived questions are always returned in listings',
        { timeout: 120_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(questionsWithArchiveIndicesArb, async ({ dtos, archiveIndices }) => {
                    // Clean slate for each property run
                    await QuestionBankQuestion.deleteMany({});

                    // Create all questions
                    const created = [];
                    for (const dto of dtos) {
                        created.push(await createQuestion(dto));
                    }

                    // Archive the selected subset
                    for (const idx of archiveIndices) {
                        await archiveQuestion(created[idx]._id.toString());
                    }

                    // List all questions
                    const result = await listQuestions({}, { page: 1, limit: 100 });

                    // Every non-archived question must appear in results
                    const returnedIds = new Set(result.data.map((q) => q._id.toString()));
                    for (let i = 0; i < created.length; i++) {
                        if (!archiveIndices.has(i)) {
                            expect(returnedIds.has(created[i]._id.toString())).toBe(true);
                        }
                    }
                }),
                { numRuns: 20 },
            );
        },
    );
});
