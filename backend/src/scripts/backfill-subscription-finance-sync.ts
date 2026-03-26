import mongoose from 'mongoose';
import ManualPayment from '../models/ManualPayment';
import FinanceInvoice from '../models/FinanceInvoice';
import FinanceTransaction from '../models/FinanceTransaction';
import { createIncomeFromPayment, nextInvoiceNo } from '../services/financeCenterService';
import { activateSubscriptionFromPayment, recomputeStudentDueLedger } from '../services/subscriptionLifecycleService';

async function main() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusway');
    console.log('[backfill:subscription-finance-sync] connected');

    const touchedStudents = new Set<string>();
    let createdTransactions = 0;
    let createdInvoices = 0;
    let activatedSubscriptions = 0;

    const paidPayments = await ManualPayment.find({
        entryType: 'subscription',
        status: 'paid',
    }).sort({ createdAt: 1 });

    for (const payment of paidPayments) {
        const existingTxn = await FinanceTransaction.findOne({
            sourceType: 'subscription_payment',
            sourceId: String(payment._id),
            isDeleted: false,
        }).lean();

        if (!existingTxn) {
            await createIncomeFromPayment({
                paymentId: String(payment._id),
                studentId: String(payment.studentId),
                amount: Number(payment.amount || 0),
                method: String(payment.method || 'manual'),
                sourceType: 'subscription_payment',
                accountCode: '4100',
                categoryLabel: 'Subscription Revenue',
                description: `Backfilled from subscription payment ${String(payment._id)}`,
                adminId: String(payment.recordedBy || payment.studentId),
                planId: payment.subscriptionPlanId ? String(payment.subscriptionPlanId) : undefined,
                paidAtUTC: payment.paidAt || payment.date || new Date(),
            });
            createdTransactions += 1;
        }

        if (payment.subscriptionPlanId) {
            await activateSubscriptionFromPayment(payment, String(payment.recordedBy || payment.studentId));
            activatedSubscriptions += 1;
        }
        touchedStudents.add(String(payment.studentId));
    }

    const pendingPayments = await ManualPayment.find({
        entryType: 'subscription',
        status: 'pending',
    }).sort({ createdAt: 1 });

    for (const payment of pendingPayments) {
        if (!payment.subscriptionPlanId || !(Number(payment.amount || 0) > 0)) {
            continue;
        }

        const existingInvoice = await FinanceInvoice.findOne({
            studentId: payment.studentId,
            planId: payment.subscriptionPlanId,
            purpose: 'subscription',
            isDeleted: false,
            status: { $in: ['unpaid', 'partial', 'overdue'] },
        }).lean();

        if (!existingInvoice) {
            const invoiceNo = await nextInvoiceNo();
            await FinanceInvoice.create({
                invoiceNo,
                studentId: payment.studentId,
                purpose: 'subscription',
                planId: payment.subscriptionPlanId,
                amountBDT: Number(payment.amount || 0),
                paidAmountBDT: 0,
                status: 'unpaid',
                dueDateUTC: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                issuedAtUTC: payment.date || payment.createdAt || new Date(),
                notes: payment.notes || 'Backfilled from pending subscription payment',
                createdByAdminId: payment.recordedBy || payment.studentId,
            });
            createdInvoices += 1;
        }
        touchedStudents.add(String(payment.studentId));
    }

    for (const studentId of touchedStudents) {
        await recomputeStudentDueLedger(studentId, studentId, 'Subscription finance backfill');
    }

    console.log('[backfill:subscription-finance-sync] summary', {
        createdTransactions,
        createdInvoices,
        activatedSubscriptions,
        touchedStudents: touchedStudents.size,
    });

    await mongoose.disconnect();
    console.log('[backfill:subscription-finance-sync] done');
}

main().catch(async (error) => {
    console.error('[backfill:subscription-finance-sync] failed', error);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => undefined);
    }
    process.exit(1);
});
