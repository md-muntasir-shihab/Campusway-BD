import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
    computeAverageScore,
    computeTopicAccuracy,
    type TopicAnswerInput,
} from '../services/StudentAnalyticsService';

/**
 * Feature: exam-management-system
 * Property 18: Student Analytics Aggregation Accuracy
 *
 * **Validates: Requirements 9.1**
 *
 * For any student with a set of exam results:
 *   - averageScore = arithmetic mean of all scores, rounded to 2dp
 *   - per-topic accuracy: correct/total matches the input data for each topic
 *   - per-topic percentage = (correct/total) × 100 rounded to 2dp
 *   - all topics from input appear in the output
 *   - computeAverageScore([]) returns 0
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a random score (non-negative, up to 2 decimal places) */
const scoreArb = fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true })
    .map((v) => Math.round(v * 100) / 100);

/** Generate a non-empty array of scores */
const scoresArb = fc.array(scoreArb, { minLength: 1, maxLength: 100 });

/** Generate a single TopicAnswerInput with a known topic name */
const topicAnswerArb: fc.Arbitrary<TopicAnswerInput> = fc.record({
    topic: fc.constantFrom(
        'Physics', 'Math', 'Chemistry', 'Biology', 'English',
        'History', 'Geography', 'Economics', 'Bangla', 'ICT',
    ),
    isCorrect: fc.boolean(),
});

/** Generate a non-empty array of TopicAnswerInput */
const topicAnswersArb = fc.array(topicAnswerArb, { minLength: 1, maxLength: 200 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 18: Student Analytics Aggregation Accuracy', () => {
    it('averageScore equals the arithmetic mean of all scores, rounded to 2dp', () => {
        fc.assert(
            fc.property(scoresArb, (scores) => {
                const result = computeAverageScore(scores);

                const sum = scores.reduce((acc, s) => acc + s, 0);
                const expectedMean = Math.round((sum / scores.length) * 100) / 100;

                expect(result).toBe(expectedMean);
            }),
            { numRuns: 200 },
        );
    });

    it('per-topic accuracy correct/total matches the input data for each topic', () => {
        fc.assert(
            fc.property(topicAnswersArb, (answers) => {
                const result = computeTopicAccuracy(answers);

                // Manually compute expected per-topic counts
                const expected = new Map<string, { correct: number; total: number }>();
                for (const a of answers) {
                    const key = a.topic.trim() === '' ? '(unknown)' : a.topic.trim();
                    const entry = expected.get(key) || { correct: 0, total: 0 };
                    entry.total++;
                    if (a.isCorrect) entry.correct++;
                    expected.set(key, entry);
                }

                // Verify each topic's correct and total counts match
                for (const [topic, exp] of expected) {
                    const actual = result.get(topic);
                    expect(actual).toBeDefined();
                    expect(actual!.correct).toBe(exp.correct);
                    expect(actual!.total).toBe(exp.total);
                }
            }),
            { numRuns: 200 },
        );
    });

    it('per-topic percentage = (correct/total) × 100 rounded to 2dp', () => {
        fc.assert(
            fc.property(topicAnswersArb, (answers) => {
                const result = computeTopicAccuracy(answers);

                for (const [_topic, entry] of result) {
                    const expectedPercentage =
                        entry.total > 0
                            ? Math.round((entry.correct / entry.total) * 100 * 100) / 100
                            : 0;

                    expect(entry.percentage).toBe(expectedPercentage);
                }
            }),
            { numRuns: 200 },
        );
    });

    it('all topics from input appear in the output', () => {
        fc.assert(
            fc.property(topicAnswersArb, (answers) => {
                const result = computeTopicAccuracy(answers);

                // Collect unique topic keys from input
                const inputTopics = new Set<string>();
                for (const a of answers) {
                    const key = a.topic.trim() === '' ? '(unknown)' : a.topic.trim();
                    inputTopics.add(key);
                }

                // Every input topic must appear in the output
                for (const topic of inputTopics) {
                    expect(result.has(topic)).toBe(true);
                }

                // Output should not contain topics not in input
                expect(result.size).toBe(inputTopics.size);
            }),
            { numRuns: 200 },
        );
    });

    it('computeAverageScore([]) returns 0', () => {
        // Boundary property — empty input always yields 0
        const result = computeAverageScore([]);
        expect(result).toBe(0);
    });
});
