import { describe, it, expect } from 'vitest';

/**
 * Unit test for fix A-2 (Question Bank analytics always zero).
 *
 * Previously refreshAnalyticsForQuestion read `AnswerModel`, which the active
 * exam engine never writes, so analytics were always 0. It now reads the real
 * `ExamSession` answers. This pure helper counts correct/wrong/skipped from
 * those sessions — DB-free.
 *
 * Obligations:
 *   1. Correct = selectedAnswer matches the snapshot correctKey.
 *   2. Wrong = selectedAnswer set but mismatched.
 *   3. Skipped = selectedAnswer empty.
 *   4. In-progress sessions are ignored (answers not final).
 *   5. Answers for snapshot ids NOT in the correctKey map are ignored.
 *   6. A missing/blank status is treated as a finalized attempt (counted).
 */
import { countExamSessionAnalytics } from '../services/questionBankAdvancedService';

const map = new Map<string, string>([
    ['q1', 'A'],
    ['q2', 'B'],
    ['q3', 'C'],
]);

describe('countExamSessionAnalytics (fix A-2)', () => {
    it('counts correct, wrong and skipped across sessions', () => {
        const sessions = [
            {
                status: 'submitted',
                answers: [
                    { questionId: 'q1', selectedAnswer: 'A' }, // correct
                    { questionId: 'q2', selectedAnswer: 'D' }, // wrong
                    { questionId: 'q3', selectedAnswer: '' },  // skipped
                ],
            },
            {
                status: 'evaluated',
                answers: [
                    { questionId: 'q1', selectedAnswer: 'B' }, // wrong
                    { questionId: 'q2', selectedAnswer: 'B' }, // correct
                    { questionId: 'q3', selectedAnswer: 'C' }, // correct
                ],
            },
        ];

        expect(countExamSessionAnalytics(sessions, map)).toEqual({
            totalCorrect: 3,
            totalWrong: 2,
            totalSkipped: 1,
        });
    });

    it('ignores in-progress sessions (answers not final)', () => {
        const sessions = [
            {
                status: 'in_progress',
                answers: [{ questionId: 'q1', selectedAnswer: 'A' }],
            },
        ];
        expect(countExamSessionAnalytics(sessions, map)).toEqual({
            totalCorrect: 0,
            totalWrong: 0,
            totalSkipped: 0,
        });
    });

    it('ignores answers for snapshot ids not in the correctKey map', () => {
        const sessions = [
            {
                status: 'submitted',
                answers: [
                    { questionId: 'unknown-id', selectedAnswer: 'A' },
                    { questionId: 'q1', selectedAnswer: 'A' },
                ],
            },
        ];
        expect(countExamSessionAnalytics(sessions, map)).toEqual({
            totalCorrect: 1,
            totalWrong: 0,
            totalSkipped: 0,
        });
    });

    it('treats a missing or blank status as a finalised attempt', () => {
        const sessions = [
            { answers: [{ questionId: 'q1', selectedAnswer: 'A' }] },
            { status: '', answers: [{ questionId: 'q2', selectedAnswer: 'X' }] },
        ];
        expect(countExamSessionAnalytics(sessions, map)).toEqual({
            totalCorrect: 1,
            totalWrong: 1,
            totalSkipped: 0,
        });
    });

    it('handles empty sessions array', () => {
        expect(countExamSessionAnalytics([], map)).toEqual({
            totalCorrect: 0,
            totalWrong: 0,
            totalSkipped: 0,
        });
    });
});
