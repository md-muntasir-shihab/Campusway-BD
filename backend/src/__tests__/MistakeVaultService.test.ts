import { describe, it, expect } from 'vitest';
import {
    computeMasteryTransition,
    type MasteryStatus,
} from '../services/MistakeVaultService';

/**
 * Unit tests for MistakeVaultService — computeMasteryTransition pure function
 *
 * Validates: Requirements 20.4, 20.5
 */

describe('MistakeVaultService', () => {
    describe('computeMasteryTransition', () => {
        // ─── Correct retry transitions ──────────────────────────

        it('transitions from "weak" to "mastered" on correct retry', () => {
            expect(computeMasteryTransition('weak', true)).toBe('mastered');
        });

        it('transitions from "still_weak" to "mastered" on correct retry', () => {
            expect(computeMasteryTransition('still_weak', true)).toBe('mastered');
        });

        // ─── Incorrect retry transitions ────────────────────────

        it('transitions from "weak" to "still_weak" on incorrect retry', () => {
            expect(computeMasteryTransition('weak', false)).toBe('still_weak');
        });

        it('stays "still_weak" on incorrect retry from "still_weak"', () => {
            expect(computeMasteryTransition('still_weak', false)).toBe('still_weak');
        });

        // ─── Mastered never goes backward ───────────────────────

        it('stays "mastered" on correct retry from "mastered"', () => {
            expect(computeMasteryTransition('mastered', true)).toBe('mastered');
        });

        it('stays "mastered" on incorrect retry from "mastered" (never goes backward)', () => {
            expect(computeMasteryTransition('mastered', false)).toBe('mastered');
        });

        // ─── All status × correct/incorrect combinations ───────

        it('covers all 6 combinations of status × wasCorrect', () => {
            const results: [MasteryStatus, boolean, MasteryStatus][] = [
                ['weak', true, 'mastered'],
                ['weak', false, 'still_weak'],
                ['still_weak', true, 'mastered'],
                ['still_weak', false, 'still_weak'],
                ['mastered', true, 'mastered'],
                ['mastered', false, 'mastered'],
            ];

            for (const [current, wasCorrect, expected] of results) {
                expect(computeMasteryTransition(current, wasCorrect)).toBe(expected);
            }
        });
    });
});
