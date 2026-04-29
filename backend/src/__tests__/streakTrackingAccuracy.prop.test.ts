import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: exam-management-system
 * Property 26: Streak Tracking Accuracy
 *
 * **Validates: Requirements 19.3**
 *
 * Streak = consecutive days ending at most recent activity; a gap > 1 day resets.
 *
 * Rules under test (pure function computeStreakUpdate):
 *   - If lastActivityDate is null: streak starts at 1
 *   - If same calendar day (UTC): no change
 *   - If consecutive day (1 day gap): increment streak
 *   - If gap > 1 day: reset streak to 1
 *   - longestStreak is always >= currentStreak
 */

// Mock Mongoose models to avoid schema initialization side effects
vi.mock('../models/XPLog', () => ({ default: {} }));
vi.mock('../models/CoinLog', () => ({ default: {} }));
vi.mock('../models/StreakRecord', () => ({ default: {} }));
vi.mock('../models/LeagueProgress', () => ({ default: {} }));
vi.mock('../models/Badge', () => ({ default: {} }));
vi.mock('../models/StudentBadge', () => ({ default: {} }));
vi.mock('../models/StudentAnalyticsAggregate', () => ({ default: {} }));

// Import pure functions after mocks are set up
import { computeStreakUpdate, diffInCalendarDays } from '../services/GamificationService';

// ─── Generators ──────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/** Generate a valid UTC date from integer components (avoids NaN dates) */
const validDateArb = fc
    .record({
        year: fc.integer({ min: 2020, max: 2026 }),
        month: fc.integer({ min: 0, max: 11 }),
        day: fc.integer({ min: 1, max: 28 }),
        ms: fc.integer({ min: 0, max: MS_PER_DAY - 1 }),
    })
    .map(({ year, month, day, ms }) => new Date(Date.UTC(year, month, day) + ms));

/** Current streak: non-negative integer in a realistic range */
const currentStreakArb = fc.integer({ min: 0, max: 1000 });

/** Longest streak: non-negative integer in a realistic range */
const longestStreakArb = fc.integer({ min: 0, max: 1000 });

/**
 * Generate a pair (lastActivityDate, now) where both are on the same UTC calendar day.
 */
const sameDayPairArb = fc
    .record({
        year: fc.integer({ min: 2020, max: 2026 }),
        month: fc.integer({ min: 0, max: 11 }),
        day: fc.integer({ min: 1, max: 28 }),
        ms1: fc.integer({ min: 0, max: MS_PER_DAY - 1 }),
        ms2: fc.integer({ min: 0, max: MS_PER_DAY - 1 }),
    })
    .map(({ year, month, day, ms1, ms2 }) => {
        const dayStart = Date.UTC(year, month, day);
        return {
            lastActivity: new Date(dayStart + ms1),
            now: new Date(dayStart + ms2),
        };
    });

/**
 * Generate a pair (lastActivityDate, now) where now is exactly 1 calendar day after lastActivity.
 */
const consecutiveDayPairArb = fc
    .record({
        year: fc.integer({ min: 2020, max: 2026 }),
        month: fc.integer({ min: 0, max: 11 }),
        day: fc.integer({ min: 1, max: 27 }),
        ms1: fc.integer({ min: 0, max: MS_PER_DAY - 1 }),
        ms2: fc.integer({ min: 0, max: MS_PER_DAY - 1 }),
    })
    .map(({ year, month, day, ms1, ms2 }) => ({
        lastActivity: new Date(Date.UTC(year, month, day) + ms1),
        now: new Date(Date.UTC(year, month, day + 1) + ms2),
    }));

/**
 * Generate a pair (lastActivityDate, now) where now is > 1 calendar day after lastActivity.
 */
const gapDayPairArb = fc
    .record({
        year: fc.integer({ min: 2020, max: 2025 }),
        month: fc.integer({ min: 0, max: 11 }),
        day: fc.integer({ min: 1, max: 28 }),
        gapDays: fc.integer({ min: 2, max: 365 }),
        ms1: fc.integer({ min: 0, max: MS_PER_DAY - 1 }),
        ms2: fc.integer({ min: 0, max: MS_PER_DAY - 1 }),
    })
    .map(({ year, month, day, gapDays, ms1, ms2 }) => ({
        lastActivity: new Date(Date.UTC(year, month, day) + ms1),
        now: new Date(Date.UTC(year, month, day + gapDays) + ms2),
        gapDays,
    }));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 26: Streak Tracking Accuracy', () => {
    it('first activity (null lastActivityDate) starts streak at 1', () => {
        fc.assert(
            fc.property(currentStreakArb, longestStreakArb, validDateArb, (curStreak, longStreak, now) => {
                const result = computeStreakUpdate(curStreak, longStreak, null, now);

                expect(result.currentStreak).toBe(1);
                expect(result.incrementedToday).toBe(true);
                expect(result.longestStreak).toBeGreaterThanOrEqual(1);
            }),
            { numRuns: 500 },
        );
    });

    it('same-day activity does not change the streak', () => {
        fc.assert(
            fc.property(currentStreakArb, longestStreakArb, sameDayPairArb, (curStreak, longStreak, pair) => {
                const result = computeStreakUpdate(curStreak, longStreak, pair.lastActivity, pair.now);

                expect(result.currentStreak).toBe(curStreak);
                expect(result.longestStreak).toBe(longStreak);
                expect(result.incrementedToday).toBe(false);
            }),
            { numRuns: 500 },
        );
    });

    it('consecutive day increments the streak by 1', () => {
        fc.assert(
            fc.property(
                currentStreakArb.filter((s) => s >= 1),
                longestStreakArb,
                consecutiveDayPairArb,
                (curStreak, longStreak, pair) => {
                    const result = computeStreakUpdate(curStreak, longStreak, pair.lastActivity, pair.now);

                    expect(result.currentStreak).toBe(curStreak + 1);
                    expect(result.incrementedToday).toBe(true);
                },
            ),
            { numRuns: 500 },
        );
    });

    it('gap > 1 day resets streak to 1', () => {
        fc.assert(
            fc.property(currentStreakArb, longestStreakArb, gapDayPairArb, (curStreak, longStreak, pair) => {
                const result = computeStreakUpdate(curStreak, longStreak, pair.lastActivity, pair.now);

                expect(result.currentStreak).toBe(1);
                expect(result.incrementedToday).toBe(true);
            }),
            { numRuns: 500 },
        );
    });

    it('longestStreak is always >= currentStreak after any update', () => {
        // Constrain longestStreak >= currentStreak because that is the invariant
        // maintained by the system — the function assumes valid input state.
        const validStreakPairArb = currentStreakArb.chain((cur) =>
            fc.integer({ min: cur, max: cur + 500 }).map((longest) => ({ cur, longest })),
        );

        fc.assert(
            fc.property(
                validStreakPairArb,
                fc.option(validDateArb, { nil: undefined }),
                validDateArb,
                (streaks, lastActivity, now) => {
                    const result = computeStreakUpdate(
                        streaks.cur,
                        streaks.longest,
                        lastActivity ?? null,
                        now,
                    );

                    expect(result.longestStreak).toBeGreaterThanOrEqual(result.currentStreak);
                },
            ),
            { numRuns: 500 },
        );
    });

    it('a sequence of consecutive days produces streak equal to number of days', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 30 }),
                fc.integer({ min: 2020, max: 2025 }),
                fc.integer({ min: 0, max: 5 }),
                fc.integer({ min: 1, max: 28 }),
                (numDays, year, month, startDay) => {
                    let currentStreak = 0;
                    let longestStreak = 0;
                    let lastActivityDate: Date | null = null;

                    for (let i = 0; i < numDays; i++) {
                        const now = new Date(Date.UTC(year, month, startDay + i, 12, 0, 0));
                        const result = computeStreakUpdate(currentStreak, longestStreak, lastActivityDate, now);
                        currentStreak = result.currentStreak;
                        longestStreak = result.longestStreak;
                        lastActivityDate = now;
                    }

                    expect(currentStreak).toBe(numDays);
                    expect(longestStreak).toBe(numDays);
                },
            ),
            { numRuns: 200 },
        );
    });

    it('diffInCalendarDays returns 0 for same UTC day regardless of time', () => {
        fc.assert(
            fc.property(sameDayPairArb, (pair) => {
                const diff = diffInCalendarDays(pair.lastActivity, pair.now);
                expect(diff).toBe(0);
            }),
            { numRuns: 300 },
        );
    });

    it('diffInCalendarDays returns 1 for consecutive UTC days', () => {
        fc.assert(
            fc.property(consecutiveDayPairArb, (pair) => {
                const diff = diffInCalendarDays(pair.lastActivity, pair.now);
                expect(diff).toBe(1);
            }),
            { numRuns: 300 },
        );
    });

    it('diffInCalendarDays returns gap for multi-day gaps', () => {
        fc.assert(
            fc.property(gapDayPairArb, (pair) => {
                const diff = diffInCalendarDays(pair.lastActivity, pair.now);
                expect(diff).toBe(pair.gapDays);
            }),
            { numRuns: 300 },
        );
    });
});
