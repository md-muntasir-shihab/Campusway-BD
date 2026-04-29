import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: exam-management-system
 * Property 25: XP Computation with Multipliers
 *
 * **Validates: Requirements 19.1**
 *
 * The awarded XP = Math.round(base_xp × difficulty_factor × streak_multiplier).
 * This property test verifies the pure computeXP function across randomly
 * generated inputs for correctness, identity, non-negativity, and monotonicity.
 */

// Mock Mongoose models to avoid schema initialization side effects
vi.mock('../models/XPLog', () => ({ default: {} }));
vi.mock('../models/CoinLog', () => ({ default: {} }));
vi.mock('../models/StreakRecord', () => ({ default: {} }));
vi.mock('../models/LeagueProgress', () => ({ default: {} }));
vi.mock('../models/Badge', () => ({ default: {} }));
vi.mock('../models/StudentBadge', () => ({ default: {} }));
vi.mock('../models/StudentAnalyticsAggregate', () => ({ default: {} }));

// Import the pure function after mocks are set up
import { computeXP } from '../services/GamificationService';

// ─── Generators ──────────────────────────────────────────────────────────────

/** Base XP: non-negative integer in a realistic range */
const baseXPArb = fc.integer({ min: 0, max: 1000 });

/** Difficulty factor: non-negative float in a realistic range */
const difficultyFactorArb = fc.double({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true });

/** Streak multiplier: non-negative float in a realistic range */
const streakMultiplierArb = fc.double({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 25: XP Computation with Multipliers', () => {
    it('computeXP(base, diff, streak) = Math.round(base × diff × streak)', () => {
        fc.assert(
            fc.property(baseXPArb, difficultyFactorArb, streakMultiplierArb, (base, diff, streak) => {
                const result = computeXP(base, diff, streak);
                const expected = Math.round(base * diff * streak);
                expect(result).toBe(expected);
            }),
            { numRuns: 500 },
        );
    });

    it('computeXP with all multipliers = 1 returns the base XP', () => {
        fc.assert(
            fc.property(baseXPArb, (base) => {
                const result = computeXP(base, 1, 1);
                expect(result).toBe(base);
            }),
            { numRuns: 200 },
        );
    });

    it('computeXP is always non-negative when all inputs are non-negative', () => {
        fc.assert(
            fc.property(baseXPArb, difficultyFactorArb, streakMultiplierArb, (base, diff, streak) => {
                const result = computeXP(base, diff, streak);
                expect(result).toBeGreaterThanOrEqual(0);
            }),
            { numRuns: 500 },
        );
    });

    it('higher difficulty factor produces higher or equal XP', () => {
        fc.assert(
            fc.property(
                baseXPArb.filter((b) => b > 0),
                difficultyFactorArb,
                difficultyFactorArb,
                streakMultiplierArb.filter((s) => s > 0),
                (base, diff1, diff2, streak) => {
                    const [lo, hi] = diff1 <= diff2 ? [diff1, diff2] : [diff2, diff1];
                    const xpLo = computeXP(base, lo, streak);
                    const xpHi = computeXP(base, hi, streak);
                    expect(xpHi).toBeGreaterThanOrEqual(xpLo);
                },
            ),
            { numRuns: 500 },
        );
    });

    it('higher streak multiplier produces higher or equal XP', () => {
        fc.assert(
            fc.property(
                baseXPArb.filter((b) => b > 0),
                difficultyFactorArb.filter((d) => d > 0),
                streakMultiplierArb,
                streakMultiplierArb,
                (base, diff, streak1, streak2) => {
                    const [lo, hi] = streak1 <= streak2 ? [streak1, streak2] : [streak2, streak1];
                    const xpLo = computeXP(base, diff, lo);
                    const xpHi = computeXP(base, diff, hi);
                    expect(xpHi).toBeGreaterThanOrEqual(xpLo);
                },
            ),
            { numRuns: 500 },
        );
    });
});
