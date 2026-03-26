import { Response } from 'express';
import mongoose from 'mongoose';
import SecurityAlertLog from '../models/SecurityAlertLog';
import SecuritySettings from '../models/SecuritySettings';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/auth';
import { getClientIp } from '../utils/requestMeta';

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
        target_type: 'security_alert',
        ip_address: getClientIp(req),
        details: details || {},
    });
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/** GET /admin/security-alerts — list alerts with filtering */
export async function adminGetSecurityAlerts(req: AuthRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.severity) filter.severity = String(req.query.severity);
    if (req.query.type) filter.type = String(req.query.type);
    if (req.query.isRead === 'true') filter.isRead = true;
    if (req.query.isRead === 'false') filter.isRead = false;

    const [items, total, unreadCount] = await Promise.all([
        SecurityAlertLog.find(filter)
            .populate('resolvedByAdminId', 'username full_name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SecurityAlertLog.countDocuments(filter),
        SecurityAlertLog.countDocuments({ isRead: false }),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit), unreadCount });
}

/** GET /admin/security-alerts/summary — counts by severity */
export async function adminGetSecurityAlertSummary(_req: AuthRequest, res: Response): Promise<void> {
    const [bySeverity, byType, unread] = await Promise.all([
        SecurityAlertLog.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        SecurityAlertLog.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        SecurityAlertLog.countDocuments({ isRead: false }),
    ]);
    res.json({ bySeverity, byType, unread });
}

/** POST /admin/security-alerts/:id/read */
export async function adminMarkAlertRead(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const alert = await SecurityAlertLog.findByIdAndUpdate(id, { $set: { isRead: true } }, { new: true });
    if (!alert) { res.status(404).json({ message: 'Alert not found' }); return; }
    res.json({ data: alert, message: 'Marked as read' });
}

/** POST /admin/security-alerts/mark-all-read */
export async function adminMarkAllAlertsRead(_req: AuthRequest, res: Response): Promise<void> {
    await SecurityAlertLog.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.json({ message: 'All alerts marked as read' });
}

/** POST /admin/security-alerts/:id/resolve */
export async function adminResolveAlert(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const alert = await SecurityAlertLog.findByIdAndUpdate(id, {
        $set: {
            isRead: true,
            resolvedAt: new Date(),
            resolvedByAdminId: new mongoose.Types.ObjectId(String(req.user._id)),
        },
    }, { new: true });
    if (!alert) { res.status(404).json({ message: 'Alert not found' }); return; }
    await createAudit(req, 'security_alert_resolved', { alertId: id, type: alert.type });
    res.json({ data: alert, message: 'Alert resolved' });
}

/** DELETE /admin/security-alerts/:id */
export async function adminDeleteAlert(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }

    const alert = await SecurityAlertLog.findByIdAndDelete(id);
    if (!alert) { res.status(404).json({ message: 'Alert not found' }); return; }
    await createAudit(req, 'security_alert_deleted', { alertId: id });
    res.json({ message: 'Alert deleted' });
}

/* ═══════════════════════════════════════════════════════════
   MAINTENANCE MODE — extends SecuritySettings
   ═══════════════════════════════════════════════════════════ */

/** GET /admin/maintenance/status */
export async function adminGetMaintenanceStatus(_req: AuthRequest, res: Response): Promise<void> {
    const settings = await SecuritySettings.findOne({ key: 'global' }).lean();
    if (!settings) {
        res.json({ maintenanceMode: false, blockNewRegistrations: false, panic: {} });
        return;
    }
    res.json({
        maintenanceMode: settings.siteAccess?.maintenanceMode ?? false,
        blockNewRegistrations: settings.siteAccess?.blockNewRegistrations ?? false,
        panic: settings.panic || {},
    });
}

/** PUT /admin/maintenance/status */
export async function adminUpdateMaintenanceStatus(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { maintenanceMode, blockNewRegistrations, panic } = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    if (typeof maintenanceMode === 'boolean') update['siteAccess.maintenanceMode'] = maintenanceMode;
    if (typeof blockNewRegistrations === 'boolean') update['siteAccess.blockNewRegistrations'] = blockNewRegistrations;
    if (panic && typeof panic === 'object') {
        const p = panic as Record<string, unknown>;
        if (typeof p.readOnlyMode === 'boolean') update['panic.readOnlyMode'] = p.readOnlyMode;
        if (typeof p.disableStudentLogins === 'boolean') update['panic.disableStudentLogins'] = p.disableStudentLogins;
        if (typeof p.disablePaymentWebhooks === 'boolean') update['panic.disablePaymentWebhooks'] = p.disablePaymentWebhooks;
        if (typeof p.disableExamStarts === 'boolean') update['panic.disableExamStarts'] = p.disableExamStarts;
    }

    update.updatedBy = new mongoose.Types.ObjectId(String(req.user._id));

    await SecuritySettings.findOneAndUpdate(
        { key: 'global' },
        { $set: update },
        { upsert: true, new: true },
    );

    await createAudit(req, 'maintenance_status_updated', update);
    res.json({ message: 'Maintenance status updated' });
}

/* ═══════════════════════════════════════════════════════════
   PUBLIC  SYSTEM STATUS
   ═══════════════════════════════════════════════════════════ */

/** GET /api/system/status — public health/maintenance check */
export async function getPublicSystemStatus(_req: AuthRequest, res: Response): Promise<void> {
    const settings = await SecuritySettings.findOne({ key: 'global' })
        .select('siteAccess.maintenanceMode panic.readOnlyMode')
        .lean();

    res.json({
        operational: !(settings?.siteAccess?.maintenanceMode),
        maintenanceMode: settings?.siteAccess?.maintenanceMode ?? false,
        readOnlyMode: settings?.panic?.readOnlyMode ?? false,
    });
}

/* ═══════════════════════════════════════════════════════════
   UTILITY — create alert programmatically
   ═══════════════════════════════════════════════════════════ */

export async function createSecurityAlert(
    type: string,
    severity: 'info' | 'warning' | 'critical',
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
): Promise<void> {
    await SecurityAlertLog.create({ type, severity, title, message, metadata });
}
