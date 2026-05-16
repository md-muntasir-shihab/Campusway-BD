import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restoreExamProgress } from '../examProgressPreservation';

const EXAM_PROGRESS_PRESERVATION_KEY = 'cw_exam_force_logout_preserved';

describe('examProgressPreservation', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.clearAllMocks();
    });

    describe('restoreExamProgress', () => {
        it('returns null if there is no preserved data', () => {
            expect(restoreExamProgress()).toBeNull();
        });

        it('returns null if localStorage throws an error (e.g. invalid JSON)', () => {
            window.localStorage.setItem(EXAM_PROGRESS_PRESERVATION_KEY, 'invalid-json-{');
            expect(restoreExamProgress()).toBeNull();
        });

        it('returns null if preserved data is valid JSON but missing required fields', () => {
            window.localStorage.setItem(
                EXAM_PROGRESS_PRESERVATION_KEY,
                JSON.stringify({ examId: '123' }) // missing sessionId and cache
            );
            expect(restoreExamProgress()).toBeNull();
        });

        it('returns the preserved data if it is valid', () => {
            const validData = {
                examId: 'exam-1',
                sessionId: 'session-2',
                cache: 'some-cache-string',
                preservedAt: new Date().toISOString()
            };
            window.localStorage.setItem(
                EXAM_PROGRESS_PRESERVATION_KEY,
                JSON.stringify(validData)
            );

            expect(restoreExamProgress()).toEqual({
                examId: 'exam-1',
                sessionId: 'session-2',
                cache: 'some-cache-string'
            });
        });
    });
});
