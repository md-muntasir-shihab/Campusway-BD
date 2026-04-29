import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { prioritizeQuestions } from '../services/PracticeSessionService';

/**
 * Feature: exam-management-system
 * Property 21: Practice Prioritizes Previously Incorrect Questions
 *
 * **Validates: Requirements 12.5**
 *
 * For any student starting a practice session on a topic they have previously
 * practiced, questions the student previously answered incorrectly should appear
 * before questions they answered correctly or have not yet attempted.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a unique question ID string */
const questionIdArb = fc.uuid();

/** Generate a non-empty array of unique question IDs (1–30 questions) */
const uniqueQuestionIdsArb = fc
    .uniqueArray(questionIdArb, { minLength: 1, maxLength: 30 })
    .filter((arr) => arr.length >= 1);

/**
 * Generate a pair of (allQuestionIds, incorrectQuestionIds) where incorrect
 * is a non-empty subset of all question IDs.
 */
const questionPairWithIncorrectArb = uniqueQuestionIdsArb.chain((allIds) =>
    fc
        .subarray(allIds, { minLength: 1, maxLength: allIds.length })
        .map((incorrectIds) => ({ allIds, incorrectIds })),
);

/**
 * Generate a pair where incorrect is a strict subset (some questions are NOT incorrect).
 */
const mixedQuestionPairArb = uniqueQuestionIdsArb
    .filter((arr) => arr.length >= 2)
    .chain((allIds) =>
        fc
            .subarray(allIds, { minLength: 1, maxLength: allIds.length - 1 })
            .map((incorrectIds) => ({ allIds, incorrectIds })),
    );

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 21: Practice Prioritizes Previously Incorrect Questions', () => {
    it('all incorrect questions appear before any non-incorrect question', () => {
        fc.assert(
            fc.property(mixedQuestionPairArb, ({ allIds, incorrectIds }) => {
                const result = prioritizeQuestions(allIds, incorrectIds);
                const incorrectSet = new Set(incorrectIds);

                // Find the index of the last incorrect question in the result
                let lastIncorrectIndex = -1;
                // Find the index of the first non-incorrect question in the result
                let firstNonIncorrectIndex = result.length;

                for (let i = 0; i < result.length; i++) {
                    if (incorrectSet.has(result[i])) {
                        lastIncorrectIndex = i;
                    } else if (firstNonIncorrectIndex === result.length) {
                        firstNonIncorrectIndex = i;
                    }
                }

                expect(lastIncorrectIndex).toBeLessThan(firstNonIncorrectIndex);
            }),
            { numRuns: 200 },
        );
    });

    it('output is a permutation of input — no questions lost or duplicated', () => {
        fc.assert(
            fc.property(questionPairWithIncorrectArb, ({ allIds, incorrectIds }) => {
                const result = prioritizeQuestions(allIds, incorrectIds);

                // Same length
                expect(result).toHaveLength(allIds.length);

                // Same elements (no duplicates, no missing)
                const resultSorted = [...result].sort();
                const inputSorted = [...allIds].sort();
                expect(resultSorted).toEqual(inputSorted);
            }),
            { numRuns: 200 },
        );
    });

    it('relative order of non-incorrect questions is preserved', () => {
        fc.assert(
            fc.property(mixedQuestionPairArb, ({ allIds, incorrectIds }) => {
                const result = prioritizeQuestions(allIds, incorrectIds);
                const incorrectSet = new Set(incorrectIds);

                // Extract non-incorrect questions from original order
                const originalNonIncorrect = allIds.filter((id) => !incorrectSet.has(id));
                // Extract non-incorrect questions from result order
                const resultNonIncorrect = result.filter((id) => !incorrectSet.has(id));

                expect(resultNonIncorrect).toEqual(originalNonIncorrect);
            }),
            { numRuns: 200 },
        );
    });

    it('empty incorrect list returns original order', () => {
        fc.assert(
            fc.property(uniqueQuestionIdsArb, (allIds) => {
                const result = prioritizeQuestions(allIds, []);
                expect(result).toEqual(allIds);
            }),
            { numRuns: 200 },
        );
    });

    it('all incorrect returns original order (all are prioritized)', () => {
        fc.assert(
            fc.property(uniqueQuestionIdsArb, (allIds) => {
                const result = prioritizeQuestions(allIds, [...allIds]);
                expect(result).toEqual(allIds);
            }),
            { numRuns: 200 },
        );
    });
});
