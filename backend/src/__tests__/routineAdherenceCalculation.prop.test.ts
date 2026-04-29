import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import type { IWeeklyScheduleEntry, IScheduleItem } from '../models/StudyRoutine';

// Mock the StudyRoutine model to avoid Mongoose schema side effects
vi.mock('../models/StudyRoutine', async () => {
    const actual = await vi.importActual<typeof import('../models/StudyRoutine')>('../models/StudyRoutine');
    return { ...actual, default: {} };
});

import { computeAdherence } from '../services/StudyRoutineService';

/**
 * Feature: exam-management-system
 * Property 32: Routine Adherence Calculation
 *
 * **Validates: Requirements 25.6**
 *
 * adherence = (completed / planned) × 100, rounded to the nearest integer.
 * If there are no planned items, adherence is 0.
 *
 * Properties verified:
 *   1. adherence = Math.round((completed / planned) × 100)
 *   2. adherence is always between 0 and 100 (inclusive)
 *   3. Empty schedule returns 0
 *   4. All completed returns 100
 *   5. None completed returns 0
 */

// ─── Generators ──────────────────────────────────────────────────────────────

const DAYS: IWeeklyScheduleEntry['day'][] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

/** Generate a single schedule item with a given completed status */
const scheduleItemArb = (completed: boolean): fc.Arbitrary<IScheduleItem> =>
    fc.record({
        subject: fc.string({ minLength: 1, maxLength: 20 }),
        topic: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
        goal: fc.string({ minLength: 1, maxLength: 30 }),
        completed: fc.constant(completed),
    });

/** Generate a schedule item with random completed status */
const randomScheduleItemArb: fc.Arbitrary<IScheduleItem> =
    fc.boolean().chain((completed) => scheduleItemArb(completed));

/** Generate a weekly schedule entry for a specific day */
const weeklyScheduleEntryArb = (day: IWeeklyScheduleEntry['day']): fc.Arbitrary<IWeeklyScheduleEntry> =>
    fc.record({
        day: fc.constant(day),
        items: fc.array(randomScheduleItemArb, { minLength: 0, maxLength: 5 }),
    });

/** Generate a full weekly schedule (0–7 days, each with 0–5 items) */
const weeklyScheduleArb: fc.Arbitrary<IWeeklyScheduleEntry[]> =
    fc.subarray(DAYS, { minLength: 0, maxLength: 7 })
        .chain((days) =>
            days.length === 0
                ? fc.constant([] as IWeeklyScheduleEntry[])
                : fc.tuple(...days.map((d) => weeklyScheduleEntryArb(d))).map((e) => e as IWeeklyScheduleEntry[]),
        );

/**
 * Generate a non-empty schedule where every item is completed.
 * At least 1 day with at least 1 item.
 */
const allCompletedScheduleArb: fc.Arbitrary<IWeeklyScheduleEntry[]> =
    fc.subarray(DAYS, { minLength: 1, maxLength: 7 })
        .chain((days) =>
            fc.tuple(
                ...days.map((d) =>
                    fc.record({
                        day: fc.constant(d) as fc.Arbitrary<IWeeklyScheduleEntry['day']>,
                        items: fc.array(scheduleItemArb(true), { minLength: 1, maxLength: 5 }),
                    }),
                ),
            ),
        )
        .map((entries) => entries as IWeeklyScheduleEntry[]);

/**
 * Generate a non-empty schedule where no item is completed.
 * At least 1 day with at least 1 item.
 */
const noneCompletedScheduleArb: fc.Arbitrary<IWeeklyScheduleEntry[]> =
    fc.subarray(DAYS, { minLength: 1, maxLength: 7 })
        .chain((days) =>
            fc.tuple(
                ...days.map((d) =>
                    fc.record({
                        day: fc.constant(d) as fc.Arbitrary<IWeeklyScheduleEntry['day']>,
                        items: fc.array(scheduleItemArb(false), { minLength: 1, maxLength: 5 }),
                    }),
                ),
            ),
        )
        .map((entries) => entries as IWeeklyScheduleEntry[]);

/**
 * Generate a non-empty schedule with a known number of planned and completed items.
 * Returns { schedule, planned, completed } for direct formula verification.
 */
const scheduleWithCountsArb = fc
    .record({
        numCompleted: fc.integer({ min: 0, max: 20 }),
        numNotCompleted: fc.integer({ min: 0, max: 20 }),
    })
    .filter(({ numCompleted, numNotCompleted }) => numCompleted + numNotCompleted > 0)
    .chain(({ numCompleted, numNotCompleted }) => {
        const completedItems = fc.array(scheduleItemArb(true), {
            minLength: numCompleted,
            maxLength: numCompleted,
        });
        const notCompletedItems = fc.array(scheduleItemArb(false), {
            minLength: numNotCompleted,
            maxLength: numNotCompleted,
        });
        return fc.tuple(completedItems, notCompletedItems).map(([cItems, ncItems]) => {
            // Distribute all items across a single day for simplicity
            const allItems = [...cItems, ...ncItems];
            const schedule: IWeeklyScheduleEntry[] = [{ day: 'monday', items: allItems }];
            return {
                schedule,
                planned: numCompleted + numNotCompleted,
                completed: numCompleted,
            };
        });
    });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 32: Routine Adherence Calculation', () => {
    it('adherence equals Math.round((completed / planned) × 100) for any schedule', () => {
        fc.assert(
            fc.property(scheduleWithCountsArb, ({ schedule, planned, completed }) => {
                const result = computeAdherence(schedule);
                const expected = Math.round((completed / planned) * 100);

                expect(result).toBe(expected);
            }),
            { numRuns: 500 },
        );
    });

    it('adherence is always between 0 and 100 inclusive', () => {
        fc.assert(
            fc.property(weeklyScheduleArb, (schedule) => {
                const result = computeAdherence(schedule);

                expect(result).toBeGreaterThanOrEqual(0);
                expect(result).toBeLessThanOrEqual(100);
            }),
            { numRuns: 500 },
        );
    });

    it('empty schedule returns 0', () => {
        fc.assert(
            fc.property(
                fc.constant([] as IWeeklyScheduleEntry[]),
                (schedule) => {
                    expect(computeAdherence(schedule)).toBe(0);
                },
            ),
            { numRuns: 10 },
        );

        // Also test days with empty items arrays
        fc.assert(
            fc.property(
                fc.subarray(DAYS, { minLength: 1, maxLength: 7 }).map((days) =>
                    days.map((d) => ({ day: d, items: [] }) as IWeeklyScheduleEntry),
                ),
                (schedule) => {
                    expect(computeAdherence(schedule)).toBe(0);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('all completed returns 100', () => {
        fc.assert(
            fc.property(allCompletedScheduleArb, (schedule) => {
                expect(computeAdherence(schedule)).toBe(100);
            }),
            { numRuns: 500 },
        );
    });

    it('none completed returns 0', () => {
        fc.assert(
            fc.property(noneCompletedScheduleArb, (schedule) => {
                expect(computeAdherence(schedule)).toBe(0);
            }),
            { numRuns: 500 },
        );
    });
});
