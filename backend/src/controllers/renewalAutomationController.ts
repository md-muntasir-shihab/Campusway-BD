import { Response } from 'express';
import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan';
import UserSubscription from '../models/UserSubscription';
import SubscriptionAutomationLog from '../models/SubscriptionAutomationLog';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/auth';
import { syncUserSubscriptionCache } from '../services/subscriptionLifecycleService';
import { getClientIp } from '../utils/requestMeta';
import { ResponseBuilder } from '../utils/responseBuilder';

/* ── helpers ── */

function asObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

async function createAudit(req: AuthRequest, action: string, details?: Record<string, unknown>): Promise<void> {
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user._id)) return;
    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(req.user._id),
        actor_role: req.user.role,
        action,
        target_type: 'subscription',
        ip_address: getClientIp(req),
        details: details || {},
    });
}

async function syncCacheFromSubscription(sub: {
    userId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    status: string;
    startAtUTC?: Date | null;
    expiresAtUTC?: Date | null;
}): Promise<void> {
    const plan = await SubscriptionPlan.findById(sub.planId).lean();
    await syncUserSubscriptionCache({
        userId: String(sub.userId),
        plan: (plan as Record<string, unknown> | null) || null,
        status: String(sub.status || 'expired'),
        startAtUTC: sub.startAtUTC || null,
        expiresAtUTC: sub.expiresAtUTC || null,
    });
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS — Subscription Management
   ═══════════════════════════════════════════════════════════ */

/** GET /admin/subscriptions/active — list active subscriptions */
export async function adminGetActiveSubscriptions(req: AuthRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.autoRenew === 'true') filter.autoRenewEnabled = true;
    if (req.query.autoRenew === 'false') filter.autoRenewEnabled = false;

    const expiringSoon = String(req.query.expiringSoon || '').trim();
    if (expiringSoon === 'true') {
        const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        filter.status = 'active';
        filter.expiresAtUTC = { $lte: sevenDays, $gte: new Date() };
    }

    const [items, total] = await Promise.all([
        UserSubscription.find(filter)
            .populate('userId', 'username full_name email phone')
            .populate('planId', 'name price durationDays')
            .sort({ expiresAtUTC: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        UserSubscription.countDocuments(filter),
    ]);
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ items, total, page, pages: Math.ceil(total / limit) }));
}

/** GET /admin/subscriptions/stats — summary counts */
export async function adminGetSubscriptionStats(_req: AuthRequest, res: Response): Promise<void> {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [active, expired, expiringSoon, autoRenewEnabled, totalRevenue] = await Promise.all([
        UserSubscription.countDocuments({ status: 'active' }),
        UserSubscription.countDocuments({ status: 'expired' }),
        UserSubscription.countDocuments({ status: 'active', expiresAtUTC: { $lte: sevenDays, $gte: now } }),
        UserSubscription.countDocuments({ status: 'active', autoRenewEnabled: true }),
        SubscriptionAutomationLog.countDocuments({ action: 'renewed' }),
    ]);

    ResponseBuilder.send(res, 200, ResponseBuilder.success({ active, expired, expiringSoon, autoRenewEnabled, totalRenewals: totalRevenue }));
}

/** POST /admin/subscriptions/:id/extend — manually extend */
export async function adminExtendSubscription(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Unauthorized')); return; }

    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const { days } = req.body as { days?: number };
    if (!days || days < 1 || days > 365) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'days must be between 1 and 365'));
        return;
    }

    const sub = await UserSubscription.findById(id);
    if (!sub) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Subscription not found')); return; }

    const base = sub.expiresAtUTC && sub.expiresAtUTC > new Date() ? sub.expiresAtUTC : new Date();
    sub.expiresAtUTC = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    if (sub.status === 'expired') sub.status = 'active';
    await sub.save();
    await syncCacheFromSubscription(sub);

    await SubscriptionAutomationLog.create({
        studentId: sub.userId,
        planId: sub.planId,
        subscriptionId: sub._id,
        action: 'renewed',
        metadata: { days, extendedBy: req.user._id, manual: true },
    });

    await createAudit(req, 'subscription_extended', { subscriptionId: id, days });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ data: sub}, `Subscription extended by ${days} days`));
}

/** POST /admin/subscriptions/:id/expire — force expire */
export async function adminExpireSubscription(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Unauthorized')); return; }

    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const sub = await UserSubscription.findById(id);
    if (!sub) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Subscription not found')); return; }

    sub.status = 'expired';
    sub.expiresAtUTC = new Date();
    await sub.save();
    await syncCacheFromSubscription(sub);

    await SubscriptionAutomationLog.create({
        studentId: sub.userId,
        planId: sub.planId,
        subscriptionId: sub._id,
        action: 'expired',
        metadata: { expiredBy: req.user._id, manual: true },
    });

    await createAudit(req, 'subscription_force_expired', { subscriptionId: id });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({data: sub}, 'Subscription expired'));
}

/** POST /admin/subscriptions/:id/reactivate — reactivate expired */
export async function adminReactivateSubscription(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Unauthorized')); return; }

    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const { days } = req.body as { days?: number };
    if (!days || days < 1) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'days required')); return; }

    const sub = await UserSubscription.findById(id);
    if (!sub) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Subscription not found')); return; }

    sub.status = 'active';
    sub.expiresAtUTC = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await sub.save();
    await syncCacheFromSubscription(sub);

    await SubscriptionAutomationLog.create({
        studentId: sub.userId,
        planId: sub.planId,
        subscriptionId: sub._id,
        action: 'renewed',
        metadata: { days, reactivatedBy: req.user._id },
    });

    await createAudit(req, 'subscription_reactivated', { subscriptionId: id, days });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({data: sub}, 'Subscription reactivated'));
}

/** PATCH /admin/subscriptions/:id/auto-renew — toggle auto-renew */
export async function adminToggleAutoRenew(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const sub = await UserSubscription.findById(id);
    if (!sub) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Subscription not found')); return; }

    sub.autoRenewEnabled = !sub.autoRenewEnabled;
    await sub.save();

    await createAudit(req, 'subscription_auto_renew_toggled', { subscriptionId: id, autoRenewEnabled: sub.autoRenewEnabled });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ data: sub}, `Auto-renew ${sub.autoRenewEnabled ? 'enabled' : 'disabled'}`));
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS — Automation Logs
   ═══════════════════════════════════════════════════════════ */

/** GET /admin/subscriptions/automation-logs */
export async function adminGetAutomationLogs(req: AuthRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.action) filter.action = String(req.query.action);
    if (req.query.studentId) {
        const sid = asObjectId(req.query.studentId);
        if (sid) filter.studentId = sid;
    }

    const [items, total] = await Promise.all([
        SubscriptionAutomationLog.find(filter)
            .populate('studentId', 'username full_name email')
            .populate('planId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SubscriptionAutomationLog.countDocuments(filter),
    ]);
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ items, total, page, pages: Math.ceil(total / limit) }));
}

/** GET /admin/subscriptions/:studentId/history — subscription history for a student */
export async function adminGetStudentSubscriptionHistory(req: AuthRequest, res: Response): Promise<void> {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid studentId')); return; }

    const [subscriptions, logs] = await Promise.all([
        UserSubscription.find({ userId: studentId })
            .populate('planId', 'name price durationDays')
            .sort({ createdAt: -1 })
            .lean(),
        SubscriptionAutomationLog.find({ studentId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
    ]);
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ subscriptions, automationLogs: logs }));
}
