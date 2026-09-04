import { describe, it, expect } from 'vitest';

/**
 * Unit test for fix A-5 (renewal should not lose remaining days).
 *
 * `computeActivationExpiry` is a pure helper (no DB), so it runs without a
 * mongod. It must:
 *   1. Extend from the existing FUTURE expiry when renewing early.
 *   2. Start fresh from `startAtUTC` when the existing expiry is in the past.
 *   3. Start fresh when there is no existing expiry (new activation).
 */
import { computeActivationExpiry } from '../services/subscriptionLifecycleService';

const DAY_MS = 24 * 60 * 60 * 1000;
const durationDays = 30;

describe('computeActivationExpiry (fix A-5: preserve remaining days on renewal)', () => {
    it('extends from the existing FUTURE expiry (renewing 10 days early keeps them)', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        // Existing subscription expires in 10 days (still active).
        const existingExpiry = new Date(now.getTime() + 10 * DAY_MS);
        // Payment settles today.
        const startAtUTC = now;

        const result = computeActivationExpiry(startAtUTC, durationDays, existingExpiry, now);

        // 10 remaining days + 30 days of new period = expiry 40 days from now.
        expect(result.getTime()).toBeCloseTo(now.getTime() + 40 * DAY_MS, 0);
    });

    it('starts fresh from startAtUTC when the existing expiry is already in the past', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const existingExpiry = new Date(now.getTime() - 5 * DAY_MS); // expired 5 days ago
        const startAtUTC = now;

        const result = computeActivationExpiry(startAtUTC, durationDays, existingExpiry, now);

        expect(result.getTime()).toBeCloseTo(now.getTime() + durationDays * DAY_MS, 0);
    });

    it('starts fresh from startAtUTC when there is no existing expiry (new activation)', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const startAtUTC = now;

        const result = computeActivationExpiry(startAtUTC, durationDays, null, now);

        expect(result.getTime()).toBeCloseTo(now.getTime() + durationDays * DAY_MS, 0);
    });

    it('falls back to a 1-day minimum duration even if durationDays is invalid', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const result = computeActivationExpiry(now, 0, null, now);
        expect(result.getTime()).toBeCloseTo(now.getTime() + 1 * DAY_MS, 0);
    });
});
