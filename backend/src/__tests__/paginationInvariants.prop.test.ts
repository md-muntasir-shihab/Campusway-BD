// Feature: exam-management-system, Property 12: Pagination Invariants

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fc from 'fast-check';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';
import {
    createQuestion,
    listQuestions,
    CreateQuestionDto,
} from '../services/QuestionBankService';
import QuestionBankQuestion from '../models/QuestionBankQuestion';

/**
 * Feature: exam-management-system, Property 12: Pagination Invariants
 *
 * *For any* set of non-archived questions and *any* valid (page, limit) pair:
 *   1. Each page returns at most `limit` results
 *   2. The `total` count is accurate (matches actual number of non-archived questions)
 *   3. No duplicates across pages (union of all pages has unique IDs)
 *   4. Union of all pages equals the total count
 *
 * **Validates: Requirements 2.8**
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const QUESTION_TYPES = ['mcq', 'true_false'] as const;

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a valid CreateQuestionDto with randomized fields */
const questionDtoArb: fc.Arbitrary<CreateQuestionDto> = fc
    .record({
        difficulty: fc.constantFrom(...DIFFICULTIES),
        question_type: fc.constantFrom(...QUESTION_TYPES),
        question_en: fc.string({ minLength: 3, maxLength: 30 }).filter((s) => s.trim().length >= 3),
    })
    .map(
        (fields): CreateQuestionDto => ({
            question_type: fields.question_type,
            question_en: fields.question_en,
            options: [
                { key: 'A', text_en: 'Option A', isCorrect: true },
                { key: 'B', text_en: 'Option B', isCorrect: false },
                { key: 'C', text_en: 'Option C', isCorrect: false },
                { key: 'D', text_en: 'Option D', isCorrect: false },
            ],
            correctKey: 'A',
            subject: 'Mathematics',
            moduleCategory: 'General',
            difficulty: fields.difficulty,
            marks: 1,
        }),
    );

/** Generate a limit value (1–10 to keep test runs fast) */
const limitArb = fc.integer({ min: 1, max: 10 });

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

describe('Feature: exam-management-system, Property 12: Pagination Invariants', () => {
    it(
        'each page returns at most `limit` results and total count is accurate',
        { timeout: 120_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(questionDtoArb, { minLength: 1, maxLength: 12 }),
                    limitArb,
                    async (dtos, limit) => {
                        // Clean slate
                        await QuestionBankQuestion.deleteMany({});

                        // Create all questions
                        for (const dto of dtos) {
                            await createQuestion(dto);
                        }

                        const totalCreated = dtos.length;

                        // Fetch page 1 to get the total
                        const firstPage = await listQuestions({}, { page: 1, limit });

                        // Property: total count matches actual non-archived question count
                        expect(firstPage.total).toBe(totalCreated);

                        // Property: each page has at most `limit` results
                        expect(firstPage.data.length).toBeLessThanOrEqual(limit);

                        // Verify totalPages is correct
                        const expectedTotalPages = Math.ceil(totalCreated / limit) || 1;
                        expect(firstPage.totalPages).toBe(expectedTotalPages);
                    },
                ),
                { numRuns: 20 },
            );
        },
    );

    it(
        'no duplicates across pages and union of all pages equals total count',
        { timeout: 120_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(questionDtoArb, { minLength: 2, maxLength: 12 }),
                    limitArb,
                    async (dtos, limit) => {
                        // Clean slate
                        await QuestionBankQuestion.deleteMany({});

                        // Create all questions
                        for (const dto of dtos) {
                            await createQuestion(dto);
                        }

                        const totalCreated = dtos.length;
                        const totalPages = Math.ceil(totalCreated / limit) || 1;

                        const allIds: string[] = [];

                        // Fetch every page and collect all IDs
                        for (let page = 1; page <= totalPages; page++) {
                            const result = await listQuestions({}, { page, limit });

                            // Each page has at most `limit` results
                            expect(result.data.length).toBeLessThanOrEqual(limit);

                            // Total is consistent across all pages
                            expect(result.total).toBe(totalCreated);

                            for (const q of result.data) {
                                allIds.push(q._id.toString());
                            }
                        }

                        // Property: no duplicates across pages
                        const uniqueIds = new Set(allIds);
                        expect(uniqueIds.size).toBe(allIds.length);

                        // Property: union of all pages equals total count
                        expect(allIds.length).toBe(totalCreated);
                    },
                ),
                { numRuns: 20 },
            );
        },
    );
});
