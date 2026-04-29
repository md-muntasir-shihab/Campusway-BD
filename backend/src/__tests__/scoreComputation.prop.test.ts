import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
    computeScore,
    type AnswerData,
    type ExamScoreConfig,
} from '../services/ResultEngineService';

/**
 * Feature: exam-management-system
 * Property 15: Score Computation
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 *
 * For any set of exam answers where each answer is either correct, incorrect,
 * or unanswered, given marks-per-question M and negative-marking value V:
 *   - total score = (correct_count × M) − (incorrect_count × V), clamped to 0 minimum
 *   - percentage = (obtained_marks / total_possible_marks) × 100 rounded to 2dp
 *   - pass/fail = percentage >= passPercentage
 *   - correctCount + wrongCount + unansweredCount = total answers length
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a random ExamScoreConfig with sensible ranges */
const examScoreConfigArb = fc.record({
    marksPerQuestion: fc.integer({ min: 1, max: 10 }),
    negativeMarksPerQuestion: fc.oneof(
        fc.constant(0),
        fc.constant(0.25),
        fc.constant(0.5),
        fc.constant(1),
        fc.double({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true }),
    ),
    totalQuestions: fc.integer({ min: 1, max: 50 }),
    passPercentage: fc.integer({ min: 0, max: 100 }),
});

/** Answer option keys */
const answerKeyArb = fc.constantFrom('A', 'B', 'C', 'D');

/**
 * Generate a single AnswerData entry that is randomly:
 *   - correct (selectedAnswer === correctAnswer)
 *   - wrong (selectedAnswer !== correctAnswer, non-empty)
 *   - unanswered (selectedAnswer is empty string)
 */
const answerDataArb: fc.Arbitrary<AnswerData> = fc
    .tuple(
        fc.uuid(),
        answerKeyArb,
        fc.constantFrom('correct', 'wrong', 'unanswered') as fc.Arbitrary<
            'correct' | 'wrong' | 'unanswered'
        >,
    )
    .map(([id, correctAnswer, kind]) => {
        let selectedAnswer: string;
        if (kind === 'correct') {
            selectedAnswer = correctAnswer;
        } else if (kind === 'wrong') {
            // Pick a different key
            const others = ['A', 'B', 'C', 'D'].filter((k) => k !== correctAnswer);
            selectedAnswer = others[0];
        } else {
            selectedAnswer = '';
        }
        return {
            questionId: id,
            selectedAnswer,
            correctAnswer,
        };
    });

/**
 * Generate an array of AnswerData whose length matches the config's totalQuestions.
 * This ensures the answers array is consistent with the exam config.
 */
function answersForConfigArb(config: ExamScoreConfig): fc.Arbitrary<AnswerData[]> {
    return fc.array(answerDataArb, {
        minLength: config.totalQuestions,
        maxLength: config.totalQuestions,
    });
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 15: Score Computation', () => {
    it('score = (correct × M) − (incorrect × V), clamped to 0 minimum', () => {
        fc.assert(
            fc.property(
                examScoreConfigArb.chain((config) =>
                    answersForConfigArb(config).map((answers) => ({ config, answers })),
                ),
                ({ config, answers }) => {
                    const result = computeScore(answers, config);

                    // Count expected correct, wrong, unanswered
                    let expectedCorrect = 0;
                    let expectedWrong = 0;
                    let expectedUnanswered = 0;

                    for (const a of answers) {
                        if (a.questionType === 'written_cq') {
                            expectedUnanswered++;
                        } else if (!a.selectedAnswer || a.selectedAnswer.trim() === '') {
                            expectedUnanswered++;
                        } else if (
                            a.selectedAnswer.trim().toUpperCase() ===
                            a.correctAnswer.trim().toUpperCase()
                        ) {
                            expectedCorrect++;
                        } else {
                            expectedWrong++;
                        }
                    }

                    // Property: score = (correct × M) − (incorrect × V), clamped to 0
                    const rawScore =
                        expectedCorrect * config.marksPerQuestion -
                        expectedWrong * config.negativeMarksPerQuestion;
                    const expectedObtained = Math.max(0, rawScore);

                    expect(result.obtainedMarks).toBe(expectedObtained);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('percentage = (obtainedMarks / totalMarks) × 100 rounded to 2 decimal places', () => {
        fc.assert(
            fc.property(
                examScoreConfigArb.chain((config) =>
                    answersForConfigArb(config).map((answers) => ({ config, answers })),
                ),
                ({ config, answers }) => {
                    const result = computeScore(answers, config);

                    const totalMarks = config.totalQuestions * config.marksPerQuestion;
                    const expectedPercentage =
                        totalMarks > 0
                            ? Math.round((result.obtainedMarks / totalMarks) * 100 * 100) / 100
                            : 0;

                    expect(result.percentage).toBe(expectedPercentage);
                    expect(result.totalMarks).toBe(totalMarks);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('passed = percentage >= passPercentage', () => {
        fc.assert(
            fc.property(
                examScoreConfigArb.chain((config) =>
                    answersForConfigArb(config).map((answers) => ({ config, answers })),
                ),
                ({ config, answers }) => {
                    const result = computeScore(answers, config);

                    const expectedPassed = result.percentage >= config.passPercentage;
                    expect(result.passed).toBe(expectedPassed);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('correctCount + wrongCount + unansweredCount = total answers length', () => {
        fc.assert(
            fc.property(
                examScoreConfigArb.chain((config) =>
                    answersForConfigArb(config).map((answers) => ({ config, answers })),
                ),
                ({ config, answers }) => {
                    const result = computeScore(answers, config);

                    expect(result.correctCount + result.wrongCount + result.unansweredCount).toBe(
                        answers.length,
                    );
                },
            ),
            { numRuns: 200 },
        );
    });
});
