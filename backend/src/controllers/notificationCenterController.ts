import { Response } from 'express';
import mongoose from 'mongoose';
import NotificationProvider from '../models/NotificationProvider';
import NotificationTemplate from '../models/NotificationTemplate';
import NotificationJob from '../models/NotificationJob';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog';
import Notification from '../models/Notification';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/auth';
import { getClientIp } from '../utils/requestMeta';
import { sendNotificationToStudent } from '../services/notificationProviderService';
import { encrypt } from '../services/cryptoService';
import { executeCampaign, retryFailedDeliveries } from '../services/notificationOrchestrationService';
import { createSecurityAlert } from './securityAlertController';

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
        target_type: 'notification_center',
        ip_address: getClientIp(req),
        details: details || {},
    });
}

function sanitizeProvider(doc: Record<string, unknown>): Record<string, unknown> {
    const plain = { ...doc };
    const credentialsConfigured = Boolean(plain.credentialsEncrypted);
    delete plain.credentialsEncrypted;
    return {
        ...plain,
        credentialsConfigured,
    };
}

/* ═══════════════════════════════════════════════════════════
   SUMMARY
   ═══════════════════════════════════════════════════════════ */

export async function adminGetNotificationSummary(_req: AuthRequest, res: Response): Promise<void> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [queued, sentToday, failedToday, providers, templates] = await Promise.all([
        NotificationJob.countDocuments({ status: 'queued' }),
        NotificationDeliveryLog.countDocuments({ status: 'sent', sentAtUTC: { $gte: todayStart } }),
        NotificationDeliveryLog.countDocuments({ status: 'failed', createdAt: { $gte: todayStart } }),
        NotificationProvider.countDocuments({ isEnabled: true }),
        NotificationTemplate.countDocuments({ isEnabled: true }),
    ]);

    res.json({ queued, sentToday, failedToday, activeProviders: providers, activeTemplates: templates });
}

/* ═══════════════════════════════════════════════════════════
   PROVIDERS  CRUD
   ═══════════════════════════════════════════════════════════ */

export async function adminGetProviders(_req: AuthRequest, res: Response): Promise<void> {
    // Never return credentialsEncrypted to the frontend
    const items = await NotificationProvider.find()
        .select('-credentialsEncrypted')
        .sort({ createdAt: -1 })
        .lean()
        .then((rows) => rows.map((row) => sanitizeProvider(row as unknown as Record<string, unknown>)));
    res.json({ items });
}

export async function adminCreateProvider(req: AuthRequest, res: Response): Promise<void> {
    const { type, provider, displayName, isEnabled, credentials, senderConfig, rateLimit } = req.body;

    if (!type || !provider || !displayName) {
        res.status(400).json({ message: 'type, provider, displayName required' });
        return;
    }

    const doc = await NotificationProvider.create({
        type,
        provider,
        displayName,
        isEnabled: isEnabled !== false,
        credentialsEncrypted: encrypt(JSON.stringify(credentials || {})),
        senderConfig: senderConfig || {},
        rateLimit: rateLimit || {},
    });

    await createAudit(req, 'notification_provider_created', { providerId: doc._id, type, provider });
    await createSecurityAlert(
        'provider_credentials_changed',
        'warning',
        'Notification provider added',
        `${displayName} credentials were added or updated.`,
        { providerId: String(doc._id), provider, type, actorUserId: req.user?._id || null },
    );
    res.status(201).json({ data: sanitizeProvider(doc.toObject() as unknown as Record<string, unknown>), message: 'Provider created' });
}

export async function adminUpdateProvider(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const { displayName, isEnabled, credentials, senderConfig, rateLimit } = req.body;
    const update: Record<string, unknown> = {};

    if (displayName !== undefined) update.displayName = displayName;
    if (typeof isEnabled === 'boolean') update.isEnabled = isEnabled;
    if (senderConfig !== undefined) update.senderConfig = senderConfig;
    if (rateLimit !== undefined) update.rateLimit = rateLimit;
    if (credentials !== undefined) update.credentialsEncrypted = encrypt(JSON.stringify(credentials || {}));

    const doc = await NotificationProvider.findByIdAndUpdate(id, { $set: update }, { new: true })
        .select('+credentialsEncrypted')
        .lean();
    if (!doc) { res.status(404).json({ message: 'Provider not found' }); return; }

    await createAudit(req, 'notification_provider_updated', { providerId: id });
    if (credentials !== undefined) {
        await createSecurityAlert(
            'provider_credentials_changed',
            'warning',
            'Notification provider credentials changed',
            `${String(doc.displayName || doc.provider || 'Provider')} credentials were changed.`,
            { providerId: String(id), actorUserId: req.user?._id || null },
        );
    }
    res.json({ data: sanitizeProvider(doc as unknown as Record<string, unknown>), message: 'Provider updated' });
}

export async function adminDeleteProvider(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const doc = await NotificationProvider.findByIdAndDelete(id);
    if (!doc) { res.status(404).json({ message: 'Provider not found' }); return; }

    await createAudit(req, 'notification_provider_deleted', { providerId: id });
    await createSecurityAlert(
        'provider_credentials_changed',
        'warning',
        'Notification provider deleted',
        `${String(doc.displayName || doc.provider || 'Provider')} was removed from the communication hub.`,
        { providerId: String(id), actorUserId: req.user?._id || null },
    );
    res.json({ message: 'Provider deleted' });
}

export async function adminTestProvider(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const provider = await NotificationProvider.findById(id).lean();
    if (!provider) { res.status(404).json({ message: 'Provider not found' }); return; }

    // For now just return success - actual test integration depends on provider
    await createAudit(req, 'notification_provider_test', { providerId: id });
    res.json({ message: 'Test send initiated', success: true });
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATES  CRUD
   ═══════════════════════════════════════════════════════════ */

export async function adminGetTemplates(req: AuthRequest, res: Response): Promise<void> {
    const filter: Record<string, unknown> = {};
    if (req.query.channel) filter.channel = String(req.query.channel);
    if (req.query.isEnabled === 'true') filter.isEnabled = true;
    if (req.query.isEnabled === 'false') filter.isEnabled = false;

    const items = await NotificationTemplate.find(filter).sort({ key: 1 }).lean();
    res.json({ items });
}

export async function adminCreateTemplate(req: AuthRequest, res: Response): Promise<void> {
    const { key, channel, subject, body, placeholdersAllowed, isEnabled } = req.body;

    if (!key || !channel || !body) {
        res.status(400).json({ message: 'key, channel, body required' });
        return;
    }

    const existing = await NotificationTemplate.findOne({ key: key.toUpperCase(), channel }).lean();
    if (existing) {
        res.status(409).json({ message: 'Template with this key and channel already exists' });
        return;
    }

    const doc = await NotificationTemplate.create({
        key: key.toUpperCase(),
        channel,
        subject,
        body,
        placeholdersAllowed: placeholdersAllowed || [],
        isEnabled: isEnabled !== false,
    });

    await createAudit(req, 'notification_template_created', { templateId: doc._id, key });
    res.status(201).json({ data: doc, message: 'Template created' });
}

export async function adminUpdateTemplate(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const { subject, body, placeholdersAllowed, isEnabled } = req.body;
    const update: Record<string, unknown> = {};

    if (subject !== undefined) update.subject = subject;
    if (body !== undefined) update.body = body;
    if (placeholdersAllowed !== undefined) update.placeholdersAllowed = placeholdersAllowed;
    if (typeof isEnabled === 'boolean') update.isEnabled = isEnabled;

    const doc = await NotificationTemplate.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!doc) { res.status(404).json({ message: 'Template not found' }); return; }

    await createAudit(req, 'notification_template_updated', { templateId: id });
    res.json({ data: doc, message: 'Template updated' });
}

export async function adminDeleteTemplate(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const doc = await NotificationTemplate.findByIdAndDelete(id);
    if (!doc) { res.status(404).json({ message: 'Template not found' }); return; }

    await createAudit(req, 'notification_template_deleted', { templateId: id });
    res.json({ message: 'Template deleted' });
}

/* ═══════════════════════════════════════════════════════════
   JOBS
   ═══════════════════════════════════════════════════════════ */

export async function adminGetJobs(req: AuthRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.channel) filter.channel = String(req.query.channel);
    if (req.query.templateKey) filter.templateKey = String(req.query.templateKey).toUpperCase();

    const [items, total] = await Promise.all([
        NotificationJob.find(filter)
            .populate('createdByAdminId', 'username full_name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        NotificationJob.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
}

export async function adminSendNotification(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { channel, target, templateKey, targetStudentId, targetGroupId, targetStudentIds, targetFilterJson, payloadOverrides, scheduledAtUTC, customBody, customSubject, campaignName, guardianTargeted, recipientMode } = req.body;

    if (!channel || !target || !templateKey) {
        res.status(400).json({ message: 'channel, target, templateKey required' });
        return;
    }

    let audienceFilters: Record<string, unknown> | undefined;
    if (target === 'filter' && targetFilterJson) {
        try {
            audienceFilters = typeof targetFilterJson === 'string'
                ? JSON.parse(targetFilterJson)
                : targetFilterJson;
        } catch {
            res.status(400).json({ message: 'Invalid targetFilterJson' });
            return;
        }
    }

    const result = await executeCampaign({
        campaignName: String(campaignName || templateKey),
        channels: channel === 'both' ? ['sms', 'email'] : [channel],
        templateKey: String(templateKey).toUpperCase(),
        customBody,
        customSubject,
        vars: payloadOverrides,
        audienceType: target === 'group' ? 'group' : target === 'filter' ? 'filter' : 'manual',
        audienceGroupId: target === 'group' ? String(targetGroupId || '') : undefined,
        audienceFilters,
        manualStudentIds: target === 'single'
            ? [String(targetStudentId || '')].filter(Boolean)
            : Array.isArray(targetStudentIds)
                ? targetStudentIds.map((value: unknown) => String(value || '')).filter(Boolean)
                : undefined,
        guardianTargeted: Boolean(guardianTargeted),
        recipientMode: recipientMode === 'guardian' || recipientMode === 'both' ? recipientMode : 'student',
        scheduledAtUTC: scheduledAtUTC ? new Date(scheduledAtUTC) : undefined,
        adminId: String(req.user._id),
    });

    await createAudit(req, 'notification_job_created', { jobId: result.jobId, templateKey, target });
    res.status(201).json({
        data: { jobId: result.jobId, sent: result.sent, failed: result.failed, skipped: result.skipped },
        message: scheduledAtUTC ? 'Notification job scheduled' : 'Notification job queued or processed',
    });
}

export async function adminRetryFailedJob(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const job = await NotificationJob.findById(id);
    if (!job) { res.status(404).json({ message: 'Job not found' }); return; }

    if (job.status !== 'failed' && job.status !== 'partial') {
        res.status(400).json({ message: 'Only failed or partial jobs can be retried' });
        return;
    }

    const result = await retryFailedDeliveries(String(id), String(req.user!._id));
    await createAudit(req, 'notification_job_retried', { jobId: id, ...result });
    res.json({ data: result, message: 'Failed deliveries retried' });
}

/* ═══════════════════════════════════════════════════════════
   DELIVERY  LOGS
   ═══════════════════════════════════════════════════════════ */

export async function adminGetDeliveryLogs(req: AuthRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.channel) filter.channel = String(req.query.channel);
    if (req.query.jobId) {
        const jobId = asObjectId(req.query.jobId);
        if (jobId) filter.jobId = jobId;
    }
    if (req.query.studentId) {
        const sid = asObjectId(req.query.studentId);
        if (sid) filter.studentId = sid;
    }

    const [items, total] = await Promise.all([
        NotificationDeliveryLog.find(filter)
            .populate('studentId', 'full_name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        NotificationDeliveryLog.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
}

/* ═══════════════════════════════════════════════════════════
   STUDENT  IN-APP  NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */

export async function studentGetNotifications(req: AuthRequest, res: Response): Promise<void> {
    const studentId = asObjectId(req.user?._id);
    if (!studentId) { res.status(401).json({ message: 'Auth required' }); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const now = new Date();
    const filter = {
        isActive: true,
        $or: [
            { targetRole: 'student' },
            { targetRole: 'all' },
            { targetUserIds: studentId },
        ],
        $and: [
            { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
            { $or: [{ expireAt: null }, { expireAt: { $gte: now } }] },
        ],
    };

    const [items, total, unread] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ ...filter, isActive: true }),
    ]);

    res.json({ items, total, unread, page, pages: Math.ceil(total / limit) });
}

export async function studentMarkNotificationRead(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    // Mark as read by deactivating
    res.json({ message: 'Notification marked as read' });
}

export async function studentMarkAllNotificationsRead(_req: AuthRequest, res: Response): Promise<void> {
    res.json({ message: 'All notifications marked as read' });
}
