import { describe, it, expect } from 'vitest';
import {
    computeAverageScore,
    computeTopicAccuracy,
    type TopicAnswerInput,
} from '../services/StudentAnalyticsService';

/**
 * Unit tests for StudentAnalyticsService — pure helper functions
 *
 * Validates: Requirements 9.1, 9.3
 */

describe('StudentAnalyticsService', () => {
    // ─── computeAverageScore ────────────────────────────────

    describe('computeAverageScore', () => {
        it('returns 0 for an empty array', () => {
            expect(computeAverageScore([])).toBe(0);
        });

        it('returns the single value for a one-element array', () => {
            expect(computeAverageScore([75])).toBe(75);
        });

        it('computes the mean of multiple scores', () => {
            expect(computeAverageScore([80, 90, 70])).toBe(80);
        });

        it('rounds to 2 decimal places', () => {
            // (10 + 20 + 30) / 3 = 20
            expect(computeAverageScore([10, 20, 30])).toBe(20);
            // (1 + 2) / 2 = 1.5
            expect(computeAverageScore([1, 2])).toBe(1.5);
            // (1 + 1 + 2) / 3 = 1.333... → 1.33
            expect(computeAverageScore([1, 1, 2])).toBe(1.33);
        });

        it('handles scores with decimals', () => {
            expect(computeAverageScore([3.5, 4.5])).toBe(4);
        });

        it('handles all zeros', () => {
            expect(computeAverageScore([0, 0, 0])).toBe(0);
        });
    });

    // ─── computeTopicAccuracy ───────────────────────────────

    describe('computeTopicAccuracy', () => {
        it('returns an empty map for empty input', () => {
            const result = computeTopicAccuracy([]);
            expect(result.size).toBe(0);
        });

        it('computes accuracy for a single topic', () => {
            const answers: TopicAnswerInput[] = [
                { topic: 'Physics', isCorrect: true },
                { topic: 'Physics', isCorrect: false },
                { topic: 'Physics', isCorrect: true },
            ];

            const result = computeTopicAccuracy(answers);

            expect(result.size).toBe(1);
            const physics = result.get('Physics');
            expect(physics).toBeDefined();
            expect(physics!.correct).toBe(2);
            expect(physics!.total).toBe(3);
            expect(physics!.percentage).toBe(66.67);
        });

        it('computes accuracy for multiple topics', () => {
            const answers: TopicAnswerInput[] = [
                { topic: 'Physics', isCorrect: true },
                { topic: 'Physics', isCorrect: true },
                { topic: 'Math', isCorrect: false },
                { topic: 'Math', isCorrect: true },
                { topic: 'Chemistry', isCorrect: false },
            ];

            const result = computeTopicAccuracy(answers);

            expect(result.size).toBe(3);

            const physics = result.get('Physics')!;
            expect(physics.correct).toBe(2);
            expect(physics.total).toBe(2);
            expect(physics.percentage).toBe(100);

            const math = result.get('Math')!;
            expect(math.correct).toBe(1);
            expect(math.total).toBe(2);
            expect(math.percentage).toBe(50);

            const chem = result.get('Chemistry')!;
            expect(chem.correct).toBe(0);
            expect(chem.total).toBe(1);
            expect(chem.percentage).toBe(0);
        });

        it('groups empty/blank topics under "(unknown)"', () => {
            const answers: TopicAnswerInput[] = [
                { topic: '', isCorrect: true },
                { topic: '  ', isCorrect: false },
                { topic: 'Math', isCorrect: true },
            ];

            const result = computeTopicAccuracy(answers);

            expect(result.size).toBe(2);
            const unknown = result.get('(unknown)')!;
            expect(unknown.correct).toBe(1);
            expect(unknown.total).toBe(2);
        });

        it('handles 100% accuracy', () => {
            const answers: TopicAnswerInput[] = [
                { topic: 'Bio', isCorrect: true },
                { topic: 'Bio', isCorrect: true },
            ];

            const result = computeTopicAccuracy(answers);
            expect(result.get('Bio')!.percentage).toBe(100);
        });

        it('handles 0% accuracy', () => {
            const answers: TopicAnswerInput[] = [
                { topic: 'Bio', isCorrect: false },
                { topic: 'Bio', isCorrect: false },
            ];

            const result = computeTopicAccuracy(answers);
            expect(result.get('Bio')!.percentage).toBe(0);
        });

        it('trims topic names', () => {
            const answers: TopicAnswerInput[] = [
                { topic: '  Physics  ', isCorrect: true },
                { topic: 'Physics', isCorrect: false },
            ];

            const result = computeTopicAccuracy(answers);
            expect(result.size).toBe(1);
            expect(result.get('Physics')!.total).toBe(2);
        });
    });
});
