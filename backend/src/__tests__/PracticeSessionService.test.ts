import { describe, it, expect } from 'vitest';
import {
    selectDifficultyForMastery,
    prioritizeQuestions,
    getPracticeSessionSummary,
    type MasteryLevel,
} from '../services/PracticeSessionService';

/**
 * Unit tests for PracticeSessionService — pure helper functions
 *
 * Validates: Requirements 12.1, 12.3, 12.5, 30.1, 30.2, 30.4
 */

describe('PracticeSessionService', () => {
    // ─── selectDifficultyForMastery ─────────────────────────

    describe('selectDifficultyForMastery', () => {
        it('returns "easy" for beginner mastery', () => {
            expect(selectDifficultyForMastery('beginner')).toBe('easy');
        });

        it('returns "medium" for intermediate mastery', () => {
            expect(selectDifficultyForMastery('intermediate')).toBe('medium');
        });

        it('returns "hard" for advanced mastery', () => {
            expect(selectDifficultyForMastery('advanced')).toBe('hard');
        });

        it('returns "hard" for mastered level', () => {
            expect(selectDifficultyForMastery('mastered')).toBe('hard');
        });

        it('defaults to "easy" for unknown mastery level', () => {
            expect(selectDifficultyForMastery('unknown' as MasteryLevel)).toBe('easy');
        });
    });

    // ─── prioritizeQuestions ────────────────────────────────

    describe('prioritizeQuestions', () => {
        it('places incorrect questions before correct/unattempted ones', () => {
            const all = ['q1', 'q2', 'q3', 'q4', 'q5'];
            const incorrect = ['q3', 'q5'];
            const result = prioritizeQuestions(all, incorrect);

            expect(result).toEqual(['q3', 'q5', 'q1', 'q2', 'q4']);
        });

        it('returns original order when no incorrect questions', () => {
            const all = ['q1', 'q2', 'q3'];
            const result = prioritizeQuestions(all, []);

            expect(result).toEqual(['q1', 'q2', 'q3']);
        });

        it('returns all as incorrect-first when all are incorrect', () => {
            const all = ['q1', 'q2', 'q3'];
            const incorrect = ['q1', 'q2', 'q3'];
            const result = prioritizeQuestions(all, incorrect);

            expect(result).toEqual(['q1', 'q2', 'q3']);
        });

        it('handles empty question list', () => {
            expect(prioritizeQuestions([], [])).toEqual([]);
        });

        it('ignores incorrect IDs not in the all list', () => {
            const all = ['q1', 'q2'];
            const incorrect = ['q3', 'q99'];
            const result = prioritizeQuestions(all, incorrect);

            expect(result).toEqual(['q1', 'q2']);
        });

        it('preserves total count (no duplicates, no losses)', () => {
            const all = ['q1', 'q2', 'q3', 'q4'];
            const incorrect = ['q2', 'q4'];
            const result = prioritizeQuestions(all, incorrect);

            expect(result).toHaveLength(all.length);
            expect(new Set(result).size).toBe(all.length);
        });
    });

    // ─── getPracticeSessionSummary ──────────────────────────

    describe('getPracticeSessionSummary', () => {
        it('computes correct summary for a mixed session', () => {
            const questionIds = ['q1', 'q2', 'q3', 'q4', 'q5'];
            const answers = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'B', correctAnswer: 'C' },
                { questionId: 'q3', selectedAnswer: 'D', correctAnswer: 'D' },
            ];

            const summary = getPracticeSessionSummary(questionIds, answers);

            expect(summary.totalQuestions).toBe(5);
            expect(summary.attempted).toBe(3);
            expect(summary.correct).toBe(2);
            expect(summary.incorrect).toBe(1);
            expect(summary.accuracyPercentage).toBeCloseTo(66.67, 1);
        });

        it('returns 0% accuracy when no answers provided', () => {
            const summary = getPracticeSessionSummary(['q1', 'q2'], []);

            expect(summary.totalQuestions).toBe(2);
            expect(summary.attempted).toBe(0);
            expect(summary.correct).toBe(0);
            expect(summary.incorrect).toBe(0);
            expect(summary.accuracyPercentage).toBe(0);
        });

        it('returns 100% accuracy when all answers correct', () => {
            const answers = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A' },
                { questionId: 'q2', selectedAnswer: 'B', correctAnswer: 'B' },
            ];

            const summary = getPracticeSessionSummary(['q1', 'q2'], answers);

            expect(summary.accuracyPercentage).toBe(100);
            expect(summary.correct).toBe(2);
            expect(summary.incorrect).toBe(0);
        });

        it('returns 0% accuracy when all answers incorrect', () => {
            const answers = [
                { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'B' },
                { questionId: 'q2', selectedAnswer: 'C', correctAnswer: 'D' },
            ];

            const summary = getPracticeSessionSummary(['q1', 'q2'], answers);

            expect(summary.accuracyPercentage).toBe(0);
            expect(summary.correct).toBe(0);
            expect(summary.incorrect).toBe(2);
        });

        it('handles empty session', () => {
            const summary = getPracticeSessionSummary([], []);

            expect(summary.totalQuestions).toBe(0);
            expect(summary.attempted).toBe(0);
            expect(summary.accuracyPercentage).toBe(0);
        });
    });
});
