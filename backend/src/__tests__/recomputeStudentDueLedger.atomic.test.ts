import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit test for fix C-5 (due-ledger read-modify-write lost update).
 *
 * Before the fix, recomputeStudentDueLedger read manualAdjustment/waiverAmount in
 * JS and then wrote netDue, so a concurrent admin adjustment was lost (stale
 * netDue → wrong exam payment gate decision).
 *
 * We assert that the model update is now an aggregation-pipeline `$set` that
 * derives netDue FROM the stored fields on the server (no read-modify-write
 * window), and that the old read-then-calculate `findOne` path is gone.
 */

const financeInvoice = {
    aggregate: vi.fn(),
};
const studentDueLedger = {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
};

vi.doMock('../models/FinanceInvoice', () => ({ default: financeInvoice }));
vi.doMock('../models/StudentDueLedger', () => ({ default: studentDueLedger }));

const { recomputeStudentDueLedger } = await import('../services/subscriptionLifecycleService');

const studentObjectId = '6512345678901234567890ab';

beforeEach(() => {
    vi.clearAllMocks();
    financeInvoice.aggregate.mockResolvedValue([{ totalDue: 500 }]);
    studentDueLedger.findOneAndUpdate.mockResolvedValue({ netDue: 500, manualAdjustment: 0, waiverAmount: 0 });
});

describe('recomputeStudentDueLedger (fix C-5: atomic no read-modify-write)', () => {
    it('does NOT perform a separate read of manualAdjustment/waiverAmount', async () => {
        await recomputeStudentDueLedger(studentObjectId);
        expect(studentDueLedger.findOne).not.toHaveBeenCalled();
    });

    it('passes an aggregation-pipeline update (array form) and not a $set object', async () => {
        await recomputeStudentDueLedger(studentObjectId);
        const [, update, ] = studentDueLedger.findOneAndUpdate.mock.calls[0];
        expect(Array.isArray(update)).toBe(true);
    });

    it('derives netDue on the server from computedDue + manualAdjustment - waiverAmount', async () => {
        await recomputeStudentDueLedger(studentObjectId);
        const update = studentDueLedger.findOneAndUpdate.mock.calls[0][1] as unknown as Record<string, unknown>[];
        const netDueStage = update.find((stage) => {
            const set = (stage as Record<string, unknown>).$set as Record<string, unknown> | undefined;
            return set && 'netDue' in set;
        });
        const netDue = ((netDueStage as Record<string, unknown>).$set as Record<string, unknown>).netDue as Record<string, unknown>;
        expect(netDue.$subtract).toEqual([
            { $add: ['$computedDue', '$manualAdjustment'] },
            '$waiverAmount',
        ]);
    });

    it('defaults manualAdjustment/waiverAmount to 0 on insert via $ifNull', async () => {
        await recomputeStudentDueLedger(studentObjectId);
        const [, update, ] = studentDueLedger.findOneAndUpdate.mock.calls[0];
        const firstStage = (update as unknown as Record<string, unknown>[])[0];
        const set = firstStage.$set as Record<string, unknown>;
        expect(set.manualAdjustment).toEqual({ $ifNull: ['$manualAdjustment', 0] });
        expect(set.waiverAmount).toEqual({ $ifNull: ['$waiverAmount', 0] });
    });
});
