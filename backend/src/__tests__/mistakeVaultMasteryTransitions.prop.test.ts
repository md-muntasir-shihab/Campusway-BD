import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeMasteryTransition, type MasteryStatus } from '../services/MistakeVaultService';

/**
 * Feature: exam-management-system
 * Property 28: Mistake Vault Mastery Transitions
 *
 * **Validates: Requirements 20.4, 20.5**
 *
 * Transition rules for the mastery state machine:
 *   - correct retry from non-mastered → 'mastered'
 *   - incorrect retry from non-mastered → 'still_weak'
 *   - 'mastered' is absorbing: never changes regardless of input
 *   - result is always a valid MasteryStatus
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_STATUSES: MasteryStatus[] = ['weak', 'still_weak', 'mastered'];

// ─── Generators ──────────────────────────────────────────────────────────────

/** Any valid MasteryStatus */
const masteryStatusArb = fc.constantFrom<MasteryStatus>('weak', 'still_weak', 'mastered');

/** Only non-mastered statuses */
const nonMasteredStatusArb = fc.constantFrom<MasteryStatus>('weak', 'still_weak');

/** Boolean representing whether the retry was correct */
const wasCorrectArb = fc.boolean();

/** A sequence of retry results (booleans) of length 1–20 */
const retrySequenceArb = fc.array(fc.boolean(), { minLength: 1, maxLength: 20 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 28: Mistake Vault Mastery Transitions', () => {
    it('correct retry from any non-mastered status → mastered', () => {
        fc.assert(
            fc.property(nonMasteredStatusArb, (currentStatus) => {
                const result = computeMasteryTransition(currentStatus, true);
                expect(result).toBe('mastered');
            }),
            { numRuns: 200 },
        );
    });

    it('incorrect retry from any non-mastered status → still_weak', () => {
        fc.assert(
            fc.property(nonMasteredStatusArb, (currentStatus) => {
                const result = computeMasteryTransition(currentStatus, false);
                expect(result).toBe('still_weak');
            }),
            { numRuns: 200 },
        );
    });

    it('mastered is absorbing: status never changes regardless of wasCorrect', () => {
        fc.assert(
            fc.property(wasCorrectArb, (wasCorrect) => {
                const result = computeMasteryTransition('mastered', wasCorrect);
                expect(result).toBe('mastered');
            }),
            { numRuns: 200 },
        );
    });

    it('after any sequence of retries, if the last retry is correct then status is mastered', () => {
        fc.assert(
            fc.property(nonMasteredStatusArb, retrySequenceArb, (initialStatus, retries) => {
                // Apply all retries except the last, then apply a correct retry
                let status: MasteryStatus = initialStatus;
                for (const wasCorrect of retries) {
                    status = computeMasteryTransition(status, wasCorrect);
                }
                // Now apply one final correct retry
                status = computeMasteryTransition(status, true);
                expect(status).toBe('mastered');
            }),
            { numRuns: 500 },
        );
    });

    it('result is always a valid MasteryStatus', () => {
        fc.assert(
            fc.property(masteryStatusArb, wasCorrectArb, (currentStatus, wasCorrect) => {
                const result = computeMasteryTransition(currentStatus, wasCorrect);
                expect(VALID_STATUSES).toContain(result);
            }),
            { numRuns: 500 },
        );
    });

    it('mastered never goes backward: once mastered, any sequence of retries keeps mastered', () => {
        fc.assert(
            fc.property(retrySequenceArb, (retries) => {
                let status: MasteryStatus = 'mastered';
                for (const wasCorrect of retries) {
                    status = computeMasteryTransition(status, wasCorrect);
                    expect(status).toBe('mastered');
                }
            }),
            { numRuns: 500 },
        );
    });
});
