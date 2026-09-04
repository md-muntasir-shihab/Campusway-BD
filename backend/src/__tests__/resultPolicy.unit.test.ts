import { describe, it, expect } from 'vitest';

/**
 * Unit tests for fixes C-6 and C-7, against the extracted pure policies in
 * `src/utils/resultPolicy.ts`.
 *
 * C-6: a 'scheduled' exam with no resultPublishDate must not publish "never" —
 * it falls back to the exam window endDate.
 * C-7: the pass-only certificate rule must use the real exam.passPercentage
 * (not the non-existent passMarks/pass_marks), falling back to minPercentage.
 */
import {
    getResultPublishMode,
    isExamResultPublished,
    certificateEligibility,
} from '../utils/resultPolicy';

describe('getResultPublishMode', () => {
    it('defaults to scheduled', () => {
        expect(getResultPublishMode({})).toBe('scheduled');
    });
    it('respects explicit modes', () => {
        expect(getResultPublishMode({ resultPublishMode: 'immediate' })).toBe('immediate');
        expect(getResultPublishMode({ resultPublishMode: 'manual' })).toBe('manual');
    });
});

describe('isExamResultPublished (fix C-6)', () => {
    const now = new Date('2026-01-15T00:00:00.000Z');

    it('returns true for immediate mode', () => {
        expect(isExamResultPublished({ resultPublishMode: 'immediate' }, now)).toBe(true);
    });

    it('returns false when a scheduled exam has no publish date and no endDate', () => {
        expect(isExamResultPublished({ resultPublishMode: 'scheduled' }, now)).toBe(false);
    });

    it('falls back to endDate so old/imported exams auto-publish once the window closes', () => {
        // endDate is in the future → not yet published.
        const futureEnd = { resultPublishMode: 'scheduled', endDate: '2026-02-01T00:00:00.000Z' };
        expect(isExamResultPublished(futureEnd, now)).toBe(false);
        // endDate now in the past → published (previously never would be).
        const pastEnd = { resultPublishMode: 'scheduled', endDate: '2026-01-01T00:00:00.000Z' };
        expect(isExamResultPublished(pastEnd, now)).toBe(true);
    });

    it('prefers resultPublishDate over endDate', () => {
        const exam = {
            resultPublishMode: 'scheduled',
            resultPublishDate: '2026-01-01T00:00:00.000Z',
            endDate: '2027-01-01T00:00:00.000Z',
        };
        expect(isExamResultPublished(exam, now)).toBe(true);
    });

    it('does not fall back to endDate in manual mode (manual is not auto-published)', () => {
        const exam = { resultPublishMode: 'manual', endDate: '2026-01-01T00:00:00.000Z' };
        expect(isExamResultPublished(exam, now)).toBe(false);
    });
});

describe('certificateEligibility (fix C-7)', () => {
    it('uses exam.passPercentage when set, so pass-only actually gates', () => {
        const exam = {
            resultPublishMode: 'immediate',
            certificateSettings: { enabled: true, minPercentage: 40, passOnly: true },
            passPercentage: 60,
        };
        const published = isExamResultPublished(exam, new Date('2026-01-01T00:00:00.000Z'));
        // 55% >= minPercentage(40) but < passPercentage(60) → not eligible.
        const elig = certificateEligibility(exam, { percentage: 55 }, published);
        expect(elig.passThreshold).toBe(60);
        expect(elig.reasons).toContain('pass_criteria_not_met');
        expect(elig.eligible).toBe(false);
    });

    it('falls back to minPercentage when passPercentage is unset (existing behavior)', () => {
        const exam = {
            certificateSettings: { enabled: true, minPercentage: 70, passOnly: true },
        };
        const elig = certificateEligibility(exam, { percentage: 75 }, true);
        expect(elig.passThreshold).toBe(70);
        expect(elig.eligible).toBe(true);
    });

    it('rejects when below minPercentage', () => {
        const exam = { certificateSettings: { enabled: true, minPercentage: 40, passOnly: true } };
        const elig = certificateEligibility(exam, { percentage: 30 }, true);
        expect(elig.reasons).toContain('minimum_percentage_not_met');
        expect(elig.eligible).toBe(false);
    });

    it('rejects when result not published', () => {
        const exam = { certificateSettings: { enabled: true, minPercentage: 40, passOnly: true } };
        const elig = certificateEligibility(exam, { percentage: 80 }, false);
        expect(elig.reasons).toContain('result_not_published');
        expect(elig.eligible).toBe(false);
    });

    it('rejects when certificate disabled', () => {
        const exam = { certificateSettings: { enabled: false, minPercentage: 40 } };
        const elig = certificateEligibility(exam, { percentage: 80 }, true);
        expect(elig.reasons).toContain('certificate_disabled');
        expect(elig.eligible).toBe(false);
    });
});
