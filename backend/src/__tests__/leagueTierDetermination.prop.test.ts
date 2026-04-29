import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: exam-management-system
 * Property 27: League Tier Determination
 *
 * **Validates: Requirements 19.4**
 *
 * The League_System assigns tiers based on mockTestsCompleted:
 *   Iron:     0–9
 *   Bronze:  10–24
 *   Silver:  25–49
 *   Gold:    50–99
 *   Diamond: 100–199
 *   Platinum: 200+
 *
 * This property test verifies the pure determineTier function across randomly
 * generated mockTestsCompleted values for correctness, monotonicity, boundary
 * accuracy, and valid tier output.
 */

// Mock Mongoose models to avoid schema initialization side effects
vi.mock('../models/XPLog', () => ({ default: {} }));
vi.mock('../models/CoinLog', () => ({ default: {} }));
vi.mock('../models/StreakRecord', () => ({ default: {} }));
vi.mock('../models/LeagueProgress', () => ({ default: {} }));
vi.mock('../models/Badge', () => ({ default: {} }));
vi.mock('../models/StudentBadge', () => ({ default: {} }));
vi.mock('../models/StudentAnalyticsAggregate', () => ({ default: {} }));

// Import pure functions and constants after mocks are set up
import { determineTier, LEAGUE_THRESHOLDS, type LeagueTier } from '../services/GamificationService';

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_TIERS: LeagueTier[] = ['iron', 'bronze', 'silver', 'gold', 'diamond', 'platinum'];

/** Expected tier for a given mockTestsCompleted value (reference implementation) */
function expectedTier(mockTestsCompleted: number): LeagueTier {
    if (mockTestsCompleted >= 200) return 'platinum';
    if (mockTestsCompleted >= 100) return 'diamond';
    if (mockTestsCompleted >= 50) return 'gold';
    if (mockTestsCompleted >= 25) return 'silver';
    if (mockTestsCompleted >= 10) return 'bronze';
    return 'iron';
}

/** Tier ordering for monotonicity checks (higher index = higher tier) */
const TIER_ORDER: Record<LeagueTier, number> = {
    iron: 0,
    bronze: 1,
    silver: 2,
    gold: 3,
    diamond: 4,
    platinum: 5,
};

// ─── Generators ──────────────────────────────────────────────────────────────

/** Non-negative integer representing mockTestsCompleted */
const mockTestsArb = fc.integer({ min: 0, max: 10_000 });

/** Boundary values that are especially important to test */
const boundaryArb = fc.constantFrom(0, 9, 10, 24, 25, 49, 50, 99, 100, 199, 200, 201, 500, 1000);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 27: League Tier Determination', () => {
    it('determineTier returns the correct tier for any non-negative integer', () => {
        fc.assert(
            fc.property(mockTestsArb, (mockTests) => {
                const tier = determineTier(mockTests);
                const expected = expectedTier(mockTests);
                expect(tier).toBe(expected);
            }),
            { numRuns: 1000 },
        );
    });

    it('determineTier always returns a valid LeagueTier string', () => {
        fc.assert(
            fc.property(mockTestsArb, (mockTests) => {
                const tier = determineTier(mockTests);
                expect(VALID_TIERS).toContain(tier);
            }),
            { numRuns: 500 },
        );
    });

    it('determineTier is monotonic: more tests → same or higher tier', () => {
        fc.assert(
            fc.property(mockTestsArb, mockTestsArb, (a, b) => {
                const [lo, hi] = a <= b ? [a, b] : [b, a];
                const tierLo = determineTier(lo);
                const tierHi = determineTier(hi);
                expect(TIER_ORDER[tierHi]).toBeGreaterThanOrEqual(TIER_ORDER[tierLo]);
            }),
            { numRuns: 500 },
        );
    });

    it('tier boundaries are correct at exact threshold values', () => {
        fc.assert(
            fc.property(boundaryArb, (mockTests) => {
                const tier = determineTier(mockTests);
                const expected = expectedTier(mockTests);
                expect(tier).toBe(expected);
            }),
            { numRuns: 200 },
        );
    });

    it('determineTier returns iron for 0 mock tests', () => {
        expect(determineTier(0)).toBe('iron');
    });

    it('tier changes exactly at configured thresholds', () => {
        // Verify that the tier changes at each threshold boundary
        // by checking one below and at the threshold
        const thresholdChecks: { below: number; at: number; belowTier: LeagueTier; atTier: LeagueTier }[] = [
            { below: 9, at: 10, belowTier: 'iron', atTier: 'bronze' },
            { below: 24, at: 25, belowTier: 'bronze', atTier: 'silver' },
            { below: 49, at: 50, belowTier: 'silver', atTier: 'gold' },
            { below: 99, at: 100, belowTier: 'gold', atTier: 'diamond' },
            { below: 199, at: 200, belowTier: 'diamond', atTier: 'platinum' },
        ];

        for (const { below, at, belowTier, atTier } of thresholdChecks) {
            expect(determineTier(below)).toBe(belowTier);
            expect(determineTier(at)).toBe(atTier);
        }
    });

    it('LEAGUE_THRESHOLDS covers all tiers and is sorted descending by minTests', () => {
        // Verify the thresholds constant is well-formed
        const tierNames = LEAGUE_THRESHOLDS.map((t) => t.tier);
        for (const validTier of VALID_TIERS) {
            expect(tierNames).toContain(validTier);
        }

        // Verify descending order of minTests
        for (let i = 1; i < LEAGUE_THRESHOLDS.length; i++) {
            expect(LEAGUE_THRESHOLDS[i - 1].minTests).toBeGreaterThan(LEAGUE_THRESHOLDS[i].minTests);
        }
    });

    it('within each tier range, all values map to the same tier', () => {
        const ranges: { min: number; max: number; tier: LeagueTier }[] = [
            { min: 0, max: 9, tier: 'iron' },
            { min: 10, max: 24, tier: 'bronze' },
            { min: 25, max: 49, tier: 'silver' },
            { min: 50, max: 99, tier: 'gold' },
            { min: 100, max: 199, tier: 'diamond' },
            { min: 200, max: 500, tier: 'platinum' },
        ];

        for (const range of ranges) {
            const rangeArb = fc.integer({ min: range.min, max: range.max });
            fc.assert(
                fc.property(rangeArb, (mockTests) => {
                    expect(determineTier(mockTests)).toBe(range.tier);
                }),
                { numRuns: 100 },
            );
        }
    });
});
