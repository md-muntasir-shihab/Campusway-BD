import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateExamPayload } from '../validators/examValidation';

/**
 * Feature: exam-question-bank, Property 14: Exam validation rejects invalid payloads
 *
 * Draft admin create/edit flows may save exam metadata before inline questions
 * are attached, so question integrity rules only apply when `questions` is
 * explicitly present in the payload.
 */

function makeQuestion(marks: number) {
    return { marks };
}

function validInlineExamPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        title: 'Sample Exam Title',
        questions: [makeQuestion(10), makeQuestion(10), makeQuestion(10)],
        duration: 60,
        totalMarks: 30,
        ...overrides,
    };
}

describe('Feature: exam-question-bank, Property 14: Exam validation rejects invalid payloads', () => {
    it('rejects when title is empty or whitespace-only', () => {
        const emptyTitleArb = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t  ');

        fc.assert(
            fc.property(emptyTitleArb, (emptyTitle) => {
                const payload = validInlineExamPayload({ title: emptyTitle });
                const result = validateExamPayload(payload);
                expect(result.valid).toBe(false);
                expect(result.errors.some((e) => e.toLowerCase().includes('title'))).toBe(true);
            }),
            { numRuns: 20 },
        );
    });

    it('rejects when duration is zero or negative', () => {
        const badDurationArb = fc.oneof(
            fc.constant(0),
            fc.integer({ min: -1000, max: -1 }),
            fc.double({ min: -1000, max: 0, noNaN: true }),
        );

        fc.assert(
            fc.property(badDurationArb, (badDuration) => {
                const payload = validInlineExamPayload({ duration: badDuration });
                const result = validateExamPayload(payload);
                expect(result.valid).toBe(false);
                expect(result.errors.some((e) => e.toLowerCase().includes('duration'))).toBe(true);
            }),
            { numRuns: 20 },
        );
    });

    it('rejects an explicitly empty inline questions payload', () => {
        const result = validateExamPayload({
            title: 'Inline Exam',
            duration: 60,
            questions: [],
            totalMarks: 0,
        });

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.toLowerCase().includes('question'))).toBe(true);
    });

    it('rejects when inline totalMarks is zero or negative', () => {
        const badMarksArb = fc.oneof(
            fc.constant(0),
            fc.integer({ min: -1000, max: -1 }),
            fc.double({ min: -1000, max: 0, noNaN: true }),
        );

        fc.assert(
            fc.property(badMarksArb, (badMarks) => {
                const questions = [makeQuestion(5), makeQuestion(5)];
                const payload = validInlineExamPayload({ totalMarks: badMarks, questions });
                const result = validateExamPayload(payload);
                expect(result.valid).toBe(false);
                expect(result.errors.some((e) => e.toLowerCase().includes('total marks'))).toBe(true);
            }),
            { numRuns: 20 },
        );
    });

    it('rejects when sum of question marks does not equal totalMarks', () => {
        const mismatchArb = fc
            .array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 10 })
            .chain((marksList) => {
                const actualSum = marksList.reduce((a, b) => a + b, 0);
                const wrongTotalArb = fc
                    .integer({ min: 1, max: actualSum + 100 })
                    .filter((t) => t !== actualSum);
                return wrongTotalArb.map((wrongTotal) => ({
                    questions: marksList.map((m) => makeQuestion(m)),
                    totalMarks: wrongTotal,
                }));
            });

        fc.assert(
            fc.property(mismatchArb, ({ questions, totalMarks }) => {
                const payload = validInlineExamPayload({ questions, totalMarks });
                const result = validateExamPayload(payload);
                expect(result.valid).toBe(false);
                expect(result.errors.some((e) => e.toLowerCase().includes('sum'))).toBe(true);
            }),
            { numRuns: 20 },
        );
    });

    it('accepts a draft payload without inline questions or total marks', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 80 }).filter((value) => value.trim().length > 0),
                fc.integer({ min: 1, max: 300 }),
                (title, duration) => {
                    const result = validateExamPayload({
                        title,
                        duration,
                        status: 'draft',
                    });

                    expect(result.valid).toBe(true);
                    expect(result.errors).toEqual([]);
                },
            ),
            { numRuns: 20 },
        );
    });

    it('accepts an external-link payload without inline questions', () => {
        const result = validateExamPayload({
            title: 'External Exam',
            duration: 90,
            deliveryMode: 'external_link',
            externalExamUrl: 'https://example.com/exam',
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('rejects group_only visibility without target groups', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 80 }).filter((value) => value.trim().length > 0),
                fc.integer({ min: 1, max: 300 }),
                (title, duration) => {
                    const result = validateExamPayload({
                        title,
                        duration,
                        visibilityMode: 'group_only',
                        targetGroupIds: [],
                    });

                    expect(result.valid).toBe(false);
                    expect(result.errors.some((e) => e.toLowerCase().includes('target group'))).toBe(true);
                },
            ),
            { numRuns: 20 },
        );
    });
});
