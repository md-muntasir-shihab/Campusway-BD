// Feature: exam-management-system, Property 13: Per-Question Analytics Accuracy

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fc from 'fast-check';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';
import {
    createQuestion,
    updateQuestionAnalytics,
    CreateQuestionDto,
} from '../services/QuestionBankService';
import QuestionBankQuestion from '../models/QuestionBankQuestion';

/**
 * Feature: exam-management-system, Property 13: Per-Question Analytics Accuracy
 *
 * *For any* question with N total attempts where C were correct, the
 * times_attempted field should equal N and correct_rate should equal
 * C/N * 100 (within floating-point tolerance).
 *
 * **Validates: Requirements 2.10**
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal valid question DTO for testing analytics */
function buildBaseQuestion(): CreateQuestionDto {
    return {
        question_type: 'mcq',
        question_en: 'What is the capital of Bangladesh?',
        options: [
            { key: 'A', text_en: 'Dhaka', isCorrect: true },
            { key: 'B', text_en: 'Chittagong', isCorrect: false },
            { key: 'C', text_en: 'Sylhet', isCorrect: false },
            { key: 'D', text_en: 'Rajshahi', isCorrect: false },
        ],
        correctKey: 'A',
        subject: 'General Knowledge',
        moduleCategory: 'Geography',
        difficulty: 'easy',
        marks: 1,
    };
}

/**
 * Arbitrary: generates a non-empty array of booleans representing
 * a sequence of attempt outcomes (true = correct, false = incorrect).
 * Length between 1 and 50 to keep tests fast.
 */
const attemptSequenceArb = fc.array(fc.boolean(), { minLength: 1, maxLength: 50 });

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

describe('Feature: exam-management-system, Property 13: Per-Question Analytics Accuracy', () => {
    it(
        'times_attempted equals N and correct_rate equals C/N * 100 after N attempts',
        { timeout: 120_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(attemptSequenceArb, async (attempts) => {
                    // Create a fresh question for each property run
                    const question = await createQuestion(buildBaseQuestion());
                    const questionId = question._id.toString();

                    // Apply each attempt sequentially
                    for (const wasCorrect of attempts) {
                        await updateQuestionAnalytics(questionId, wasCorrect);
                    }

                    // Read the final state from the database
                    const updated = await QuestionBankQuestion.findById(questionId).lean();
                    expect(updated).toBeDefined();

                    const N = attempts.length;
                    const C = attempts.filter((a) => a === true).length;
                    const expectedRate = (C / N) * 100;

                    // Verify times_attempted equals N
                    expect(updated!.times_attempted).toBe(N);

                    // Verify correct_rate equals C/N * 100 within floating-point tolerance
                    expect(updated!.correct_rate).toBeCloseTo(expectedRate, 5);
                }),
                { numRuns: 30 },
            );
        },
    );

    it(
        'correct_rate is 0 when all attempts are incorrect',
        { timeout: 60_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 30 }),
                    async (numAttempts) => {
                        const question = await createQuestion(buildBaseQuestion());
                        const questionId = question._id.toString();

                        // All incorrect attempts
                        for (let i = 0; i < numAttempts; i++) {
                            await updateQuestionAnalytics(questionId, false);
                        }

                        const updated = await QuestionBankQuestion.findById(questionId).lean();
                        expect(updated).toBeDefined();
                        expect(updated!.times_attempted).toBe(numAttempts);
                        expect(updated!.correct_rate).toBe(0);
                    },
                ),
                { numRuns: 20 },
            );
        },
    );

    it(
        'correct_rate is 100 when all attempts are correct',
        { timeout: 60_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 30 }),
                    async (numAttempts) => {
                        const question = await createQuestion(buildBaseQuestion());
                        const questionId = question._id.toString();

                        // All correct attempts
                        for (let i = 0; i < numAttempts; i++) {
                            await updateQuestionAnalytics(questionId, true);
                        }

                        const updated = await QuestionBankQuestion.findById(questionId).lean();
                        expect(updated).toBeDefined();
                        expect(updated!.times_attempted).toBe(numAttempts);
                        expect(updated!.correct_rate).toBe(100);
                    },
                ),
                { numRuns: 20 },
            );
        },
    );
});
