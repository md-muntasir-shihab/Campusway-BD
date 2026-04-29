import { describe, it, expect } from 'vitest';
import {
    computeScore,
    type AnswerData,
    type ExamScoreConfig,
} from '../services/ResultEngineService';

/**
 * Unit tests for ResultEngineService — computeScore pure function
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 */

describe('ResultEngineService', () => {
    describe('computeScore', () => {
        const defaultConfig: ExamScoreConfig = {
            marksPerQuestion: 1,
            negativeMarksPerQuestion: 0.25,
            totalQuestions: 5,
            passPercentage: 40,
        };

        // ─── Basic scoring ──────────────────────────────────────

        it('computes correct score for all correct answers', () => {
            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'B', correctAnswer: 'B' },
                { questionId: 'q3', selectedAnswer: 'C', correctAnswer: 'C' },
                { questionId: 'q4', selectedAnswer: 'D', correctAnswer: 'D' },
                { questionId: 'q5', selectedAnswer: 'A', correctAnswer: 'A' },
            ];

            const result = computeScore(answers, defaultConfig);

            expect(result.correctCount).toBe(5);
            expect(result.wrongCount).toBe(0);
            expect(result.unansweredCount).toBe(0);
            expect(result.obtainedMarks).toBe(5);
            expect(result.totalMarks).toBe(5);
            expect(result.percentage).toBe(100);
            expect(result.passed).toBe(true);
        });

        it('computes correct score for all wrong answers with negative marking', () => {
            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'B', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'A', correctAnswer: 'B' },
                { questionId: 'q3', selectedAnswer: 'D', correctAnswer: 'C' },
                { questionId: 'q4', selectedAnswer: 'C', correctAnswer: 'D' },
                { questionId: 'q5', selectedAnswer: 'B', correctAnswer: 'A' },
            ];

            const result = computeScore(answers, defaultConfig);

            expect(result.correctCount).toBe(0);
            expect(result.wrongCount).toBe(5);
            expect(result.unansweredCount).toBe(0);
            // Raw: 0 - (5 * 0.25) = -1.25, clamped to 0
            expect(result.obtainedMarks).toBe(0);
            expect(result.percentage).toBe(0);
            expect(result.passed).toBe(false);
        });

        it('computes mixed correct/wrong/unanswered', () => {
            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' }, // correct
                { questionId: 'q2', selectedAnswer: 'C', correctAnswer: 'B' }, // wrong
                { questionId: 'q3', selectedAnswer: '', correctAnswer: 'C' },  // unanswered
                { questionId: 'q4', selectedAnswer: 'D', correctAnswer: 'D' }, // correct
                { questionId: 'q5', selectedAnswer: '', correctAnswer: 'A' },  // unanswered
            ];

            const result = computeScore(answers, defaultConfig);

            expect(result.correctCount).toBe(2);
            expect(result.wrongCount).toBe(1);
            expect(result.unansweredCount).toBe(2);
            // Score: (2 * 1) - (1 * 0.25) = 1.75
            expect(result.obtainedMarks).toBe(1.75);
            expect(result.totalMarks).toBe(5);
            // Percentage: (1.75 / 5) * 100 = 35.00
            expect(result.percentage).toBe(35);
            expect(result.passed).toBe(false);
        });

        // ─── Percentage rounding to 2 decimal places ────────────

        it('rounds percentage to 2 decimal places', () => {
            const config: ExamScoreConfig = {
                marksPerQuestion: 1,
                negativeMarksPerQuestion: 0,
                totalQuestions: 3,
                passPercentage: 40,
            };

            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: '', correctAnswer: 'B' },
                { questionId: 'q3', selectedAnswer: '', correctAnswer: 'C' },
            ];

            const result = computeScore(answers, config);

            // 1/3 * 100 = 33.333... rounded to 33.33
            expect(result.percentage).toBe(33.33);
        });

        // ─── Pass/fail threshold ────────────────────────────────

        it('marks as passed when percentage equals pass percentage', () => {
            const config: ExamScoreConfig = {
                marksPerQuestion: 1,
                negativeMarksPerQuestion: 0,
                totalQuestions: 5,
                passPercentage: 40,
            };

            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'B', correctAnswer: 'B' },
                { questionId: 'q3', selectedAnswer: '', correctAnswer: 'C' },
                { questionId: 'q4', selectedAnswer: '', correctAnswer: 'D' },
                { questionId: 'q5', selectedAnswer: '', correctAnswer: 'A' },
            ];

            const result = computeScore(answers, config);

            // 2/5 * 100 = 40.00 — exactly at pass threshold
            expect(result.percentage).toBe(40);
            expect(result.passed).toBe(true);
        });

        it('marks as failed when percentage is just below pass percentage', () => {
            const config: ExamScoreConfig = {
                marksPerQuestion: 1,
                negativeMarksPerQuestion: 0.25,
                totalQuestions: 5,
                passPercentage: 40,
            };

            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'B', correctAnswer: 'B' },
                { questionId: 'q3', selectedAnswer: 'D', correctAnswer: 'C' }, // wrong
                { questionId: 'q4', selectedAnswer: '', correctAnswer: 'D' },
                { questionId: 'q5', selectedAnswer: '', correctAnswer: 'A' },
            ];

            const result = computeScore(answers, config);

            // Score: (2 * 1) - (1 * 0.25) = 1.75
            // Percentage: (1.75 / 5) * 100 = 35.00
            expect(result.percentage).toBe(35);
            expect(result.passed).toBe(false);
        });

        // ─── No negative marking ───────────────────────────────

        it('handles zero negative marking correctly', () => {
            const config: ExamScoreConfig = {
                marksPerQuestion: 2,
                negativeMarksPerQuestion: 0,
                totalQuestions: 4,
                passPercentage: 50,
            };

            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'C', correctAnswer: 'B' }, // wrong
                { questionId: 'q3', selectedAnswer: 'D', correctAnswer: 'C' }, // wrong
                { questionId: 'q4', selectedAnswer: 'D', correctAnswer: 'D' },
            ];

            const result = computeScore(answers, config);

            expect(result.correctCount).toBe(2);
            expect(result.wrongCount).toBe(2);
            // Score: (2 * 2) - (2 * 0) = 4
            expect(result.obtainedMarks).toBe(4);
            expect(result.totalMarks).toBe(8);
            expect(result.percentage).toBe(50);
            expect(result.passed).toBe(true);
        });

        // ─── Written questions excluded from auto-scoring ───────

        it('treats written_cq questions as unanswered', () => {
            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'some text', correctAnswer: '', questionType: 'written_cq' },
                { questionId: 'q3', selectedAnswer: 'B', correctAnswer: 'B' },
                { questionId: 'q4', selectedAnswer: '', correctAnswer: 'D' },
                { questionId: 'q5', selectedAnswer: 'essay', correctAnswer: '', questionType: 'written_cq' },
            ];

            const result = computeScore(answers, defaultConfig);

            expect(result.correctCount).toBe(2);
            expect(result.wrongCount).toBe(0);
            expect(result.unansweredCount).toBe(3); // 2 written + 1 blank
            expect(result.obtainedMarks).toBe(2);
        });

        // ─── Case-insensitive comparison ────────────────────────

        it('compares answers case-insensitively', () => {
            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'a', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'B', correctAnswer: 'b' },
                { questionId: 'q3', selectedAnswer: 'c', correctAnswer: 'C' },
                { questionId: 'q4', selectedAnswer: 'D', correctAnswer: 'd' },
                { questionId: 'q5', selectedAnswer: 'a', correctAnswer: 'A' },
            ];

            const result = computeScore(answers, defaultConfig);

            expect(result.correctCount).toBe(5);
            expect(result.wrongCount).toBe(0);
        });

        // ─── Empty answers array ────────────────────────────────

        it('handles empty answers array', () => {
            const result = computeScore([], defaultConfig);

            expect(result.correctCount).toBe(0);
            expect(result.wrongCount).toBe(0);
            expect(result.unansweredCount).toBe(0);
            expect(result.obtainedMarks).toBe(0);
            expect(result.totalMarks).toBe(5);
            expect(result.percentage).toBe(0);
            expect(result.passed).toBe(false);
        });

        // ─── Higher marks per question ──────────────────────────

        it('handles higher marks per question correctly', () => {
            const config: ExamScoreConfig = {
                marksPerQuestion: 4,
                negativeMarksPerQuestion: 1,
                totalQuestions: 3,
                passPercentage: 50,
            };

            const answers: AnswerData[] = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' }, // +4
                { questionId: 'q2', selectedAnswer: 'C', correctAnswer: 'B' }, // -1
                { questionId: 'q3', selectedAnswer: '', correctAnswer: 'C' },  // 0
            ];

            const result = computeScore(answers, config);

            expect(result.obtainedMarks).toBe(3); // 4 - 1 = 3
            expect(result.totalMarks).toBe(12);   // 3 * 4
            expect(result.percentage).toBe(25);    // (3/12) * 100
            expect(result.passed).toBe(false);
        });
    });
});
