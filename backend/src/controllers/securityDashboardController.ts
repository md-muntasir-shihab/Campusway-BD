import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import ActiveSession from '../models/ActiveSession';
import LoginActivity from '../models/LoginActivity';
import AuditLog from '../models/AuditLog';
import SecurityAlertLog from '../models/SecurityAlertLog';
import BackupJob from '../models/BackupJob';
import User from '../models/User';
import { ResponseBuilder } from '../utils/responseBuilder';

/**
 * GET /admin/security/dashboard
 *
 * Returns aggregate metrics for the Security Center dashboard.
 */
export async function getSecurityDashboardMetrics(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalActiveSessions,
            adminActiveSessions,
            suspiciousLogins24h,
            failedLogins24h,
            lockedAccounts,
            usersWithout2FA,
            totalAdminUsers,
            unreadAlerts,
            criticalAlerts,
            recentAuditLogs,
            lastBackup,
            totalUsers,
            blockedUsers,
        ] = await Promise.all([
            ActiveSession.countDocuments({ status: 'active' }),
            ActiveSession.countDocuments({
                status: 'active',
            }).then(async () => {
                // Join with User to find admin sessions
                const adminUserIds = await User.find({
                    role: { $in: ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'] },
                }).select('_id').lean();
                const ids = adminUserIds.map((u) => u._id);
                return ActiveSession.countDocuments({ status: 'active', user_id: { $in: ids } });
            }),
            LoginActivity.countDocuments({ suspicious: true, createdAt: { $gte: last24h } }),
            LoginActivity.countDocuments({ success: false, createdAt: { $gte: last24h } }),
            User.countDocuments({ lockUntil: { $gt: now } }),
            User.countDocuments({
                role: { $in: ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'] },
                twoFactorEnabled: { $ne: true },
            }),
            User.countDocuments({
                role: { $in: ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'] },
            }),
            SecurityAlertLog.countDocuments({ isRead: false }),
            SecurityAlertLog.countDocuments({ severity: 'critical', isRead: false }),
            AuditLog.find({})
                .sort({ timestamp: -1 })
                .limit(10)
                .populate('actor_id', 'username full_name role')
                .lean(),
            BackupJob.findOne({})
                .sort({ createdAt: -1 })
                .select('status type storage createdAt error')
                .lean(),
            User.countDocuments({}),
            User.countDocuments({ status: { $in: ['blocked', 'suspended'] } }),
        ]);

        // Failures trend (last 7 days, grouped by day)
        const failureTrend = await LoginActivity.aggregate([
            { $match: { success: false, createdAt: { $gte: last7d } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { date: '$_id', count: 1, _id: 0 } },
        ]);

        ResponseBuilder.send(res, 200, ResponseBuilder.success({activeSessions: totalActiveSessions,
            adminActiveSessions,
            suspiciousLogins24h,
            failedLogins24h,
            lockedAccounts,
            adminsWithout2FA: usersWithout2FA,
            totalAdminUsers,
            unreadAlerts,
            criticalAlerts,
            recentAuditLogs,
            lastBackup: lastBackup
                ? {
                    status: lastBackup.status,
                    type: lastBackup.type,
                    storage: lastBackup.storage,
                    createdAt: lastBackup.createdAt,
                    error: lastBackup.error || null,
                }
                : null,
            totalUsers,
            blockedUsers,
            failureTrend,}));
    } catch (error) {
        console.error('getSecurityDashboardMetrics error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/**
 * GET /admin/audit-logs
 *
 * Paginated list of audit logs with optional filtering.
 */
export async function getAuditLogsList(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};
        if (req.query.action) filter.action = String(req.query.action);
        if (req.query.actor_role) filter.actor_role = String(req.query.actor_role);
        if (req.query.target_type) filter.target_type = String(req.query.target_type);

        if (req.query.from || req.query.to) {
            const dateFilter: Record<string, Date> = {};
            if (req.query.from) dateFilter.$gte = new Date(String(req.query.from));
            if (req.query.to) dateFilter.$lte = new Date(String(req.query.to));
            filter.timestamp = dateFilter;
        }

        const [items, total] = await Promise.all([
            AuditLog.find(filter)
                .populate('actor_id', 'username full_name role')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items, total, page, pages: Math.ceil(total / limit) }));
    } catch (error) {
        console.error('getAuditLogsList error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
