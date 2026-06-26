/**
 * Live integration test (in-memory MongoDB):
 * Proves that a paid subscription assignment records a FinanceTransaction
 * for the lifecycle event. Before the fix, emitFinanceTransaction used
 * method:'system' / status:'recorded' (both invalid enum values), so the
 * create threw and was silently swallowed by the surrounding try/catch —
 * meaning subscription lifecycle revenue was NEVER recorded.
 *
 * Allowed: temporary verification tool for existing behavior, not a feature.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock the notification orchestrator so we don't need campaign/notification infra.
vi.mock('../services/notificationOrchestrationService', () => ({
    triggerAutoSend: vi.fn().mockResolvedValue({ jobId: '', sent: 0, failed: 0 }),
}));

import User from '../models/User';
import SubscriptionPlan from '../models/SubscriptionPlan';
import FinanceTransaction from '../models/FinanceTransaction';
import UserSubscription from '../models/UserSubscription';
import ManualPayment from '../models/ManualPayment';
import FinanceInvoice from '../models/FinanceInvoice';
import StudentDueLedger from '../models/StudentDueLedger';
import { assignSubscriptionLifecycle } from '../services/subscriptionLifecycleService';

let mongoServer: MongoMemoryServer;
let adminId: string;
let studentId: string;
let planId: string;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const admin = await User.create({
        username: 'fin_admin',
        email: 'admin@campusway.local',
        full_name: 'Finance Admin',
        role: 'superadmin',
        password: 'hashed-test-password-123456',
        status: 'active',
    });
    adminId = String(admin._id);

    const student = await User.create({
        username: 'fin_student',
        email: 'student@campusway.local',
        full_name: 'Finance Student',
        role: 'student',
        password: 'hashed-test-password-123456',
        status: 'active',
    });
    studentId = String(student._id);

    const plan = await SubscriptionPlan.create({
        code: 'pro-monthly',
        slug: 'pro-monthly',
        name: 'Pro Monthly',
        type: 'paid',
        planType: 'paid',
        priceBDT: 500,
        price: 500,
        currency: 'BDT',
        durationDays: 30,
        durationValue: 30,
        durationUnit: 'days',
        billingCycle: 'monthly',
        enabled: true,
        isActive: true,
    });
    planId = String(plan._id);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Subscription lifecycle → FinanceTransaction recording (live)', () => {
    it('records a FinanceTransaction for a paid subscription assignment', async () => {
        const beforeCount = await FinanceTransaction.countDocuments({
            sourceType: 'subscription_payment',
        });

        const result = await assignSubscriptionLifecycle({
            userId: studentId,
            planId,
            actorId: adminId,
            paymentAmount: 500,
            paymentStatus: 'paid',
            paymentMethod: 'bkash',
            recordPayment: true,
        });

        // Sanity: subscription + payment created
        expect(result.subscription.status).toBe('active');
        expect(result.payment).not.toBeNull();
        expect(Number(result.payment?.amount)).toBe(500);

        // The lifecycle event MUST now persist a FinanceTransaction (the bug).
        // Two income txns are expected: one from createIncomeFromPayment (the
        // subscription payment) and one from emitFinanceTransaction (lifecycle).
        const afterCount = await FinanceTransaction.countDocuments({
            sourceType: 'subscription_payment',
        });
        expect(afterCount).toBeGreaterThan(beforeCount);

        // Verify the lifecycle-emitted txn specifically: it carries the plan
        // id as sourceId and the description prefix from emitFinanceTransaction.
        const lifecycleTxn = await FinanceTransaction.findOne({
            sourceType: 'subscription_payment',
            description: { $regex: /^subscription created/i },
        }).lean();
        expect(lifecycleTxn).not.toBeNull();
        expect(lifecycleTxn!.method).toBe('auto');
        expect(lifecycleTxn!.status).toBe('paid');
        expect(lifecycleTxn!.amount).toBe(500);
    });

    it('records a FinanceTransaction when expiring a subscription (cancellation = expense)', async () => {
        const beforeCount = await FinanceTransaction.countDocuments({
            direction: 'expense',
            sourceType: 'subscription_payment',
        });

        const { expireSubscriptionForUser } = await import('../services/subscriptionLifecycleService');
        await expireSubscriptionForUser(studentId, adminId, 'Live test expiry');

        const afterCount = await FinanceTransaction.countDocuments({
            direction: 'expense',
            sourceType: 'subscription_payment',
        });
        // Before the fix this stayed equal because method:'system'/status:'recorded'
        // made the create throw; now it must increment.
        expect(afterCount).toBeGreaterThan(beforeCount);
    });
});
