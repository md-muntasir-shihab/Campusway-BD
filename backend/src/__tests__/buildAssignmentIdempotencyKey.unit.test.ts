import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

/**
 * Unit test for fix B-6: an atomic idempotency latch prevents two concurrent
 * identical assignment requests from both creating a subscription + payment +
 * finance transaction.
 *
 * `buildAssignmentIdempotencyKey` is pure (no DB). It must:
 *   1. Produce the SAME key for logically identical assignments (so concurrent
 *      requests collide on the unique index).
 *   2. Produce DIFFERENT keys for assignments that differ (plan/status/amount/
 *      user), so distinct assignments are never wrongly deduped.
 *   3. Round times to the second so near-simultaneous requests with a few ms
 *      of drift still collide.
 */
import { buildAssignmentIdempotencyKey } from '../services/subscriptionLifecycleService';

const uid = new mongoose.Types.ObjectId();
const pid = new mongoose.Types.ObjectId();

function baseInput(overrides: Record<string, unknown> = {}) {
    return {
        userId: uid,
        planId: pid,
        subscriptionStatus: 'active' as const,
        startAtUTC: new Date('2026-01-01T00:00:00.000Z'),
        expiresAtUTC: new Date('2026-01-31T00:00:00.000Z'),
        planIsFree: false,
        planAmount: 500,
        paymentStatus: 'paid' as const,
        ...overrides,
    };
}

describe('buildAssignmentIdempotencyKey (fix B-6)', () => {
    it('produces the same key for logically identical assignments', () => {
        const a = buildAssignmentIdempotencyKey(baseInput());
        const b = buildAssignmentIdempotencyKey(baseInput());
        expect(a).toBe(b);
    });

    it('collides for near-simultaneous requests whose drift stays within the same second bucket', () => {
        // Both land in the same whole-second bucket (0.1s and 0.4s), so the key
        // ignores the sub-second drift and they collide on the unique index.
        const a = buildAssignmentIdempotencyKey(baseInput({ startAtUTC: new Date('2026-01-01T00:00:00.100Z') }));
        const b = buildAssignmentIdempotencyKey(baseInput({ startAtUTC: new Date('2026-01-01T00:00:00.400Z') }));
        expect(a).toBe(b);
    });

    it('produces different keys for a different user', () => {
        const a = buildAssignmentIdempotencyKey(baseInput());
        const other = new mongoose.Types.ObjectId();
        const b = buildAssignmentIdempotencyKey(baseInput({ userId: other }));
        expect(a).not.toBe(b);
    });

    it('produces different keys for a different plan', () => {
        const a = buildAssignmentIdempotencyKey(baseInput());
        const other = new mongoose.Types.ObjectId();
        const b = buildAssignmentIdempotencyKey(baseInput({ planId: other }));
        expect(a).not.toBe(b);
    });

    it('produces different keys for a different amount', () => {
        const a = buildAssignmentIdempotencyKey(baseInput());
        const b = buildAssignmentIdempotencyKey(baseInput({ planAmount: 750 }));
        expect(a).not.toBe(b);
    });
});
