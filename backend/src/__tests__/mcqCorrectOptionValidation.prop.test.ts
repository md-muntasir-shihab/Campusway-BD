// Feature: exam-management-system, Property 7: MCQ Correct Option Validation

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fc from 'fast-check';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';
import { createQuestion, CreateQuestionDto } from '../services/QuestionBankService';

/**
 * Feature: exam-management-system, Property 7: MCQ Correct Option Validation
 *
 * *For any* question of type MCQ, image-based MCQ, or true-false, if none of the
 * provided options has isCorrect set to true, creation should be rejected with a
 * validation error. Conversely, if at least one option has isCorrect true, creation
 * should succeed.
 *
 * **Validates: Requirements 2.2**
 */

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
const MCQ_TYPES = ['mcq', 'image_mcq', 'true_false'] as const;
const NON_MCQ_TYPES = ['written_cq', 'fill_blank'] as const;

/** Generate a random MCQ-like question type */
const mcqTypeArb = fc.constantFrom(...MCQ_TYPES);

/** Generate a random non-MCQ question type */
const nonMcqTypeArb = fc.constantFrom(...NON_MCQ_TYPES);

/** Generate an option with isCorrect explicitly false */
function incorrectOptionArb(key: typeof OPTION_KEYS[number]) {
    return fc.record({
        key: fc.constant(key),
        text_en: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        isCorrect: fc.constant(false),
    });
}

/** Generate an option with isCorrect = true */
function correctOptionArb(key: typeof OPTION_KEYS[number]) {
    return fc.record({
        key: fc.constant(key),
        text_en: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        isCorrect: fc.constant(true),
    });
}

/**
 * Generate 4 options where ALL have isCorrect = false (no correct answer).
 */
const allIncorrectOptionsArb = fc.tuple(
    incorrectOptionArb('A'),
    incorrectOptionArb('B'),
    incorrectOptionArb('C'),
    incorrectOptionArb('D'),
).map(([a, b, c, d]) => [a, b, c, d]);

/**
 * Generate 4 options where at least one has isCorrect = true.
 * We pick a random index to be the correct one.
 */
const atLeastOneCorrectOptionsArb = fc.integer({ min: 0, max: 3 }).chain((correctIdx) =>
    fc.tuple(
        ...OPTION_KEYS.map((key, i) =>
            i === correctIdx ? correctOptionArb(key) : incorrectOptionArb(key),
        ),
    ).map((opts) => opts),
);

/** Build a base question DTO (no hierarchy refs needed for MCQ validation) */
function buildDto(
    questionType: string,
    options: { key: string; text_en: string; isCorrect: boolean }[],
): CreateQuestionDto {
    return {
        question_type: questionType as CreateQuestionDto['question_type'],
        question_en: 'What is 2 + 2?',
        options,
        correctKey: 'A',
        subject: 'Mathematics',
        moduleCategory: 'Arithmetic',
        difficulty: 'easy',
        marks: 1,
    };
}

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

describe('Feature: exam-management-system, Property 7: MCQ Correct Option Validation', () => {
    it('rejects MCQ-type questions when no option has isCorrect = true', { timeout: 60_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(mcqTypeArb, allIncorrectOptionsArb, async (qType, options) => {
                const dto = buildDto(qType, options);
                await expect(createQuestion(dto)).rejects.toThrow(
                    /must have at least one option with isCorrect/i,
                );
            }),
            { numRuns: 30 },
        );
    });

    it('accepts MCQ-type questions when at least one option has isCorrect = true', { timeout: 60_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(mcqTypeArb, atLeastOneCorrectOptionsArb, async (qType, options) => {
                const dto = buildDto(qType, options);
                const result = await createQuestion(dto);
                expect(result).toBeDefined();
                expect(result._id).toBeDefined();
                expect(result.question_type).toBe(qType);
                // Verify at least one option is marked correct in the saved doc
                const hasCorrect = result.options.some((o) => o.isCorrect === true);
                expect(hasCorrect).toBe(true);
            }),
            { numRuns: 30 },
        );
    });

    it('allows non-MCQ types (written_cq, fill_blank) without any correct option', { timeout: 60_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(nonMcqTypeArb, allIncorrectOptionsArb, async (qType, options) => {
                const dto = buildDto(qType, options);
                // Non-MCQ types should not require a correct option
                const result = await createQuestion(dto);
                expect(result).toBeDefined();
                expect(result._id).toBeDefined();
                expect(result.question_type).toBe(qType);
            }),
            { numRuns: 20 },
        );
    });
});
