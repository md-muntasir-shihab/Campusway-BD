/**
 * Smoke test: proves that FinanceTransaction rejects `method: 'system'`
 * (the value emitted by subscriptionLifecycleService.emitFinanceTransaction)
 * because the model enum does not include 'system'. This documents the
 * silent revenue-recording failure for subscription lifecycle events.
 *
 * Allowed: written as a temporary verification tool, not a production feature.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import FinanceTransaction from '../models/FinanceTransaction';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

const baseProps = {
    txnCode: 'CW-FIN-TEST',
    direction: 'income' as const,
    amount: 100,
    currency: 'BDT',
    dateUTC: new Date(),
    accountCode: '4100',
    categoryLabel: 'Subscription Revenue',
    description: 'test',
    status: 'paid' as const,
    sourceType: 'subscription_payment' as const,
    createdByAdminId: new mongoose.Types.ObjectId(),
};

describe('FinanceTransaction.method enum validation (Bug: subscriptionLifecycle uses "system")', () => {
    it('rejects method "system" (the value emitFinanceTransaction passes)', async () => {
        await expect(
            FinanceTransaction.create({ ...baseProps, txnCode: 'CW-FIN-TEST-1', method: 'system' }),
        ).rejects.toThrow();
    });

    it('accepts method "auto" (the intended system-emitted value)', async () => {
        const doc = await FinanceTransaction.create({ ...baseProps, txnCode: 'CW-FIN-TEST-2', method: 'auto' });
        expect(doc.method).toBe('auto');
    });

    it('accepts method "manual"', async () => {
        const doc = await FinanceTransaction.create({ ...baseProps, txnCode: 'CW-FIN-TEST-3', method: 'manual' });
        expect(doc.method).toBe('manual');
    });
});
