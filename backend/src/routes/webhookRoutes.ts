import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import ManualPayment from '../models/ManualPayment';
import PaymentWebhookEvent from '../models/PaymentWebhookEvent';
import { broadcastFinanceEvent } from '../realtime/financeStream';
import { broadcastStudentDashboardEvent } from '../realtime/studentDashboardStream';
import { getPanicSettings } from '../services/securityCenterService';
import { logger } from '../utils/logger';
import { createIncomeFromPayment } from '../services/financeCenterService';
import { activateSubscriptionFromPayment, recomputeStudentDueLedger } from '../services/subscriptionLifecycleService';
import { withOptionalTransaction } from '../services/txnRunner';

const router = Router();

/**
 * Compute a deterministic hash from the raw request body for deduplication.
 */
function computeRequestHash(payload: Record<string, unknown>): string {
    const sorted = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex');
}

/**
 * Verify SSLCommerz IPN signature (HMAC-SHA256).
 * In production, set SSLCOMMERZ_STORE_PASSWORD env var.
 */
function verifySSLCommerzSignature(payload: Record<string, unknown>): boolean {
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    if (!storePassword) {
        if (process.env.NODE_ENV !== 'production') return true;
        logger.error('SSLCOMMERZ_STORE_PASSWORD not set — rejecting webhook');
        return false;
    }

    const verifySign = String(payload.verify_sign || '');
    const verifyKey = String(payload.verify_key || '');
    if (!verifySign || !verifyKey) return false;

    const keyFields = verifyKey.split(',');
    const dataToHash = keyFields
        .sort()
        .map((key) => `${key}=${String(payload[key] || '')}`)
        .join('&');

    const computed = crypto
        .createHmac('sha256', storePassword)
        .update(dataToHash)
        .digest('hex');

    return computed === verifySign;
}

/**
 * SSLCommerz Webhook Handler — IPN (Instant Payment Notification)
 * Security: signature validation + replay protection + audit logging
 */
router.post('/sslcommerz/ipn', async (req: Request, res: Response) => {
    try {
        const panic = await getPanicSettings(false);
        if (panic.disablePaymentWebhooks) {
            logger.warn('[Webhook] Payment webhook rejected by panic policy toggle', req);
            res.status(423).json({
                code: 'PAYMENT_WEBHOOKS_DISABLED',
                message: 'Payment webhooks are temporarily disabled by administrator policy.',
            });
            return;
        }

        const payload = req.body;
        const { status, tran_id, val_id, amount } = payload;
        const requestHash = computeRequestHash(payload);
        const signatureValid = verifySSLCommerzSignature(payload);

        logger.info(`[Webhook] SSLCommerz IPN received`, req, { tran_id, status, amount, val_id });

        // 1. Signature verification
        if (!signatureValid) {
            logger.error('[Webhook] Invalid SSLCommerz signature', req, { tran_id });
            // Still log the rejected event for audit
            await PaymentWebhookEvent.create({
                provider: 'sslcommerz',
                providerEventId: String(tran_id || crypto.randomUUID()),
                eventType: 'ipn',
                signatureValid: false,
                requestHash,
                status: 'failed',
                payload,
                errorMessage: 'Invalid signature',
            }).catch(() => { });
            res.status(400).json({ message: 'Invalid signature' });
            return;
        }

        // 2. Replay protection — check if this exact request was already processed
        const existingEvent = await PaymentWebhookEvent.findOne({
            provider: 'sslcommerz',
            providerEventId: String(tran_id),
            status: 'processed',
        }).lean();

        if (existingEvent) {
            logger.warn('[Webhook] Duplicate IPN — already processed', req, { tran_id });
            // Log duplicates as ignored for audit
            await PaymentWebhookEvent.create({
                provider: 'sslcommerz',
                providerEventId: `${String(tran_id)}_dup_${Date.now()}`,
                eventType: 'ipn',
                signatureValid: true,
                requestHash,
                status: 'ignored',
                payload,
                errorMessage: 'Duplicate — original already processed',
            }).catch(() => { });
            res.status(200).send('OK');
            return;
        }

        // 3. Log the event (audit trail) — resilient to idempotent retries (fix A-3).
        //    If a previous attempt created this event but crashed before marking it
        //    'processed', the unique {provider, providerEventId} index rejects a
        //    second insert. Previously that E11000 bubbled to the outer catch and
        //    produced HTTP 500, which SSLCommerz retries forever. We now recover by
        //    fetching the existing event instead of failing the request.
        let webhookEvent = await PaymentWebhookEvent.create({
            provider: 'sslcommerz',
            providerEventId: String(tran_id || crypto.randomUUID()),
            eventType: 'ipn',
            signatureValid: true,
            requestHash,
            status: 'received',
            payload,
        }).catch((err: any) => {
            if (err?.code === 11000) return null;
            throw err;
        });

        if (!webhookEvent) {
            webhookEvent = await PaymentWebhookEvent.findOne({
                provider: 'sslcommerz',
                providerEventId: String(tran_id),
            });
            if (webhookEvent && webhookEvent.status === 'processed') {
                logger.warn('[Webhook] Duplicate IPN — already processed (recovered)', req, { tran_id });
                res.status(200).send('OK');
                return;
            }
            if (!webhookEvent) {
                // Defensive: the event vanished between E11000 and re-fetch (should
                // be impossible with the unique index). Never fail the request —
                // continue processing under a unique audit id; the atomic payment
                // claim still prevents double effects.
                webhookEvent = await PaymentWebhookEvent.create({
                    provider: 'sslcommerz',
                    providerEventId: `${String(tran_id)}_recovered_${Date.now()}`,
                    eventType: 'ipn',
                    signatureValid: true,
                    requestHash,
                    status: 'received',
                    payload,
                });
            }
        }

        // 4. Find the matching payment
        const payment = await ManualPayment.findOne({ reference: tran_id });
        if (!payment) {
            logger.warn('[Webhook] No matching payment found', req, { tran_id });
            webhookEvent.status = 'ignored';
            webhookEvent.errorMessage = 'No matching payment record';
            await webhookEvent.save();
            res.status(200).send('OK');
            return;
        }

        // Already paid — idempotent
        if (payment.status === 'paid') {
            webhookEvent.status = 'ignored';
            webhookEvent.errorMessage = 'Payment already marked paid';
            webhookEvent.paymentId = payment._id;
            await webhookEvent.save();
            res.status(200).send('OK');
            return;
        }

        // 5. Process the payment status
        if (status === 'VALID' || status === 'AUTHENTICATED') {
            // Wrap the payment-state transition + downstream subscription/income
            // creation in a transaction when one is available; otherwise run as-is.
            // The withOptionalTransaction helper no-ops gracefully on standalone
            // mongod (audit step 2: opt-in transaction helper).
            const result = await withOptionalTransaction(async (session) => {
                // Fix A-4: claim the payment atomically with a status guard. Only
                // the first IPN that flips pending→paid wins; a concurrent IPN (or
                // a retry after a partial success) gets null and is treated as an
                // idempotent no-op — preventing a double subscription activation
                // and double income posting on standalone Mongo.
                const pay = await ManualPayment.findOneAndUpdate(
                    { _id: payment._id, status: { $ne: 'paid' } },
                    { status: 'paid', paymentDetails: payload, date: new Date() },
                    { new: true, session: session || undefined } as any,
                ) as any;
                if (!pay) return { skipped: true as const };

                if (pay.entryType === 'subscription' && pay.subscriptionPlanId) {
                    await activateSubscriptionFromPayment(pay, String(pay.recordedBy || pay.studentId), session);
                }
                return { skipped: false as const, pay };
            }, { name: 'webhook.payment.process' });

            if (result.skipped) {
                logger.warn('[Webhook] Payment not claimed (already paid by a concurrent request)', req, { tran_id });
                webhookEvent.status = 'ignored';
                webhookEvent.errorMessage = 'Payment already claimed by a concurrent IPN';
                webhookEvent.paymentId = payment._id;
                await webhookEvent.save();
                res.status(200).send('OK');
                return;
            }
            const pay = result.pay;

            webhookEvent.status = 'processed';
            webhookEvent.paymentId = pay._id;
            await webhookEvent.save();

            broadcastFinanceEvent('payment-updated', {
                paymentId: String(payment._id),
                status: 'paid',
                studentId: String(payment.studentId),
            });

            // Push subscription update to student dashboard via SSE (Bug 1.21)
            broadcastStudentDashboardEvent({
                type: 'subscription-updated',
                meta: {
                    paymentId: String(payment._id),
                    studentId: String(payment.studentId),
                    status: 'paid',
                    entryType: payment.entryType,
                },
            });

            logger.info('[Webhook] Payment marked as PAID', req, { tran_id, paymentId: String(payment._id) });

            // ── Auto-post income to Finance Center ──
            try {
                const sourceType = payment.entryType === 'subscription' ? 'subscription_payment'
                    : payment.entryType === 'exam_fee' ? 'exam_payment'
                        : 'manual_income';
                await createIncomeFromPayment({
                    paymentId: String(payment._id),
                    studentId: String(payment.studentId),
                    amount: Number(payment.amount),
                    method: String(payment.method || 'gateway'),
                    sourceType,
                    accountCode: sourceType === 'subscription_payment' ? '4100' : sourceType === 'exam_payment' ? '4200' : '4900',
                    categoryLabel: sourceType === 'subscription_payment' ? 'Subscription Revenue' : sourceType === 'exam_payment' ? 'Exam Fee Revenue' : 'Other Income',
                    description: `Auto-posted from payment ${tran_id}`,
                    adminId: String(payment.recordedBy || payment.studentId),
                    planId: payment.subscriptionPlanId ? String(payment.subscriptionPlanId) : undefined,
                    examId: payment.examId ? String(payment.examId) : undefined,
                    paidAtUTC: payment.date || new Date(),
                });
            } catch (fcErr) {
                logger.error('[Webhook] Finance auto-post failed', req, { tran_id, error: String(fcErr) });
            }

            if (payment.entryType === 'subscription') {
                await recomputeStudentDueLedger(
                    String(payment.studentId),
                    String(payment.recordedBy || payment.studentId),
                    `Subscription payment settled via webhook ${tran_id}`
                );
            }
        } else if (status === 'FAILED' || status === 'CANCELLED') {
            payment.status = 'failed';
            payment.paymentDetails = payload;
            await payment.save();

            webhookEvent.status = 'processed';
            webhookEvent.paymentId = payment._id;
            webhookEvent.errorMessage = `Payment ${status}`;
            await webhookEvent.save();

            broadcastFinanceEvent('payment-updated', {
                paymentId: String(payment._id),
                status: 'failed',
                studentId: String(payment.studentId),
            });

            logger.info('[Webhook] Payment marked as FAILED', req, { tran_id });
        } else {
            webhookEvent.status = 'ignored';
            webhookEvent.errorMessage = `Unhandled IPN status: ${status}`;
            await webhookEvent.save();
            logger.warn(`[Webhook] Unhandled IPN status: ${status}`, req, { tran_id });
        }

        res.status(200).send('OK');
    } catch (error) {
        logger.error(`[Webhook] Error processing SSLCommerz IPN: ${(error as Error).message}`, req, {
            stack: (error as Error).stack,
        });
        res.status(500).send('Internal Server Error');
    }
});

export default router;
