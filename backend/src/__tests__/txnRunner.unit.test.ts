import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

/**
 * Unit tests for withOptionalTransaction (audit step 2). No live DB required —
 * we spy on mongoose.startSession and stub mongoose.connection topology, and mock
 * the runtime-settings snapshot.
 */

const getRuntimeSettingsSnapshot = vi.fn();
vi.mock('../services/runtimeSettingsService', () => ({
    getRuntimeSettingsSnapshot,
}));

const { withOptionalTransaction, resetTransactionSupportCache, supportsTransactions } = await import('../services/txnRunner');

beforeEach(() => {
    vi.restoreAllMocks();
    resetTransactionSupportCache();
    // Default runtime setting: transactions opt-in OFF.
    getRuntimeSettingsSnapshot.mockResolvedValue({
        featureFlags: { dbTransactionsEnabled: false },
    });
    // Simulate a replica set so supportsTransactions() would be true.
    (mongoose.connection as any).client = {
        topology: { description: { type: 'ReplicaSetWithPrimary' } },
    };
});

describe('withOptionalTransaction (step 2)', () => {
    it('runs the callback WITHOUT a transaction when the feature flag is off', async () => {
        const startSessionSpy = vi.spyOn(mongoose, 'startSession').mockImplementation(() => {
            throw new Error('startSession should not be called when transactions are off');
        });

        let sessionArg: any = 'NOT_CALLED';
        const result = await withOptionalTransaction(async (session) => {
            sessionArg = session;
            return 42;
        }, { name: 'test.off' });

        expect(result).toBe(42);
        expect(sessionArg).toBeNull(); // no session passed -> ran without transaction
        expect(startSessionSpy).not.toHaveBeenCalled();
    });

    it('uses a real transaction when force:true and server supports it', async () => {
        let sessionArg: any = 'NOT_CALLED';
        const withTransaction = vi.fn(async (cb: any) => cb());
        vi.spyOn(mongoose, 'startSession').mockResolvedValue({
            withTransaction,
            endSession: vi.fn().mockResolvedValue(undefined),
            abortTransaction: vi.fn(),
            startTransaction: vi.fn(),
            commitTransaction: vi.fn(),
        } as any);

        const result = await withOptionalTransaction(async (session) => {
            sessionArg = session;
            return 'done';
        }, { name: 'test.force', force: true });

        expect(result).toBe('done');
        expect(mongoose.startSession).toHaveBeenCalledTimes(1);
        expect(withTransaction).toHaveBeenCalledTimes(1);
        expect(sessionArg).not.toBeNull(); // session was provided to the callback
    });

    it('falls back to no-transaction (no throw) when force:true but server is standalone', async () => {
        // Standalone topology -> supportsTransactions() false.
        (mongoose.connection as any).client = { topology: { description: { type: 'Single' } } };
        resetTransactionSupportCache();
        const startSessionSpy = vi.spyOn(mongoose, 'startSession').mockImplementation(() => {
            throw new Error('startSession should not be called on standalone');
        });

        let sessionArg: any = 'NOT_CALLED';
        const result = await withOptionalTransaction(async (session) => {
            sessionArg = session;
            return 'standalone-ok';
        }, { name: 'test.standalone', force: true });

        expect(result).toBe('standalone-ok');
        expect(sessionArg).toBeNull();
        expect(startSessionSpy).not.toHaveBeenCalled();
    });

    it('propagates a callback error and does not swallow it', async () => {
        const withTransaction = vi.fn(async (cb: any) => cb());
        vi.spyOn(mongoose, 'startSession').mockResolvedValue({
            withTransaction,
            endSession: vi.fn().mockResolvedValue(undefined),
            abortTransaction: vi.fn(),
        } as any);

        await expect(
            withOptionalTransaction(async () => {
                throw new Error('boom');
            }, { name: 'test.err', force: true }),
        ).rejects.toThrow('boom');

        expect(withTransaction).toHaveBeenCalledTimes(1);
    });

    it('supportsTransactions() reflects replica-set topology', () => {
        (mongoose.connection as any).client = { topology: { description: { type: 'ReplicaSetWithPrimary' } } };
        resetTransactionSupportCache();
        expect(supportsTransactions()).toBe(true);

        (mongoose.connection as any).client = { topology: { description: { type: 'Single' } } };
        resetTransactionSupportCache();
        expect(supportsTransactions()).toBe(false);
    });
});
