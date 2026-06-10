import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import Settings from '../models/Settings';
import GroupMembership from '../models/GroupMembership';
import StudentNotificationRead from '../models/StudentNotificationRead';
import User from '../models/User';

// ── Notification Management Controller ──────────────────────
// Thin handlers for admin notification management endpoints:
// sent list, channel defaults CRUD, and announcement creation.
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4,
//               6.1, 6.3, 7.1, 7.2, 7.3, 7.5, 7.6, 10.1, 10.2, 10.4

/** All 9 notification event types used for system defaults. */
const NOTIFICATION_EVENT_TYPES = [
    { eventType: 'exam_published', label: 'Exam Published' },
    { eventType: 'exam_starting_soon', label: 'Exam Starting Soon' },
    { eventType: 'result_published', label: 'Result Published' },
    { eventType: 'streak_warning', label: 'Streak Warning' },
    { eventType: 'group_membership', label: 'Group Membership' },
    { eventType: 'battle_challenge', label: 'Battle Challenge' },
    { eventType: 'payment_confirmation', label: 'Payment Confirmation' },
    { eventType: 'routine_reminder', label: 'Routine Reminder' },
    { eventType: 'doubt_reply', label: 'Doubt Reply' },
] as const;

/**
 * Build system defaults: all event types with inApp true, others false.
 */
function buildSystemDefaults() {
    return NOTIFICATION_EVENT_TYPES.map((entry) => ({
        eventType: entry.eventType,
        label: entry.label,
        inApp: true,
        email: false,
        push: false,
        sms: false,
    }));
}

// ─── GET /admin/sent ────────────────────────────────────────

/**
 * GET /admin/sent — List recently sent notifications.
 * Accepts optional `limit` query param (default 50, clamped to [1, 200]).
 */
export async function getSentNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
        let limit = parseInt(req.query.limit as string, 10);
        if (isNaN(limit)) limit = 50;
        limit = Math.max(1, Math.min(200, limit));

        const items = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Read counts: number of distinct students who have read each notification
        // (from the existing per-student read records).
        const notificationIds = items.map((n) => n._id);
        const readAgg = notificationIds.length > 0
            ? await StudentNotificationRead.aggregate([
                { $match: { notificationId: { $in: notificationIds } } },
                { $group: { _id: '$notificationId', count: { $sum: 1 } } },
            ])
            : [];
        const readCountById = new Map<string, number>(
            readAgg.map((r: { _id: mongoose.Types.ObjectId; count: number }) => [String(r._id), Number(r.count || 0)]),
        );

        // Total recipients: explicit targetUserIds when present, otherwise the
        // size of the targeted role/group audience.
        const totalStudentsCache = { value: -1 };
        const resolveTotalRecipients = async (n: typeof items[number]): Promise<number> => {
            const explicit = Array.isArray(n.targetUserIds) ? n.targetUserIds.length : 0;
            if (explicit > 0) return explicit;
            const role = String(n.targetRole || 'student');
            if (role === 'student' || role === 'all') {
                if (totalStudentsCache.value < 0) {
                    totalStudentsCache.value = await User.countDocuments({ role: 'student', isActive: { $ne: false } });
                }
                return totalStudentsCache.value;
            }
            return 0;
        };

        const withCounts = [];
        for (const n of items) {
            withCounts.push({
                ...n,
                readCount: readCountById.get(String(n._id)) || 0,
                totalRecipients: await resolveTotalRecipients(n),
            });
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items: withCounts }));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── GET /admin/defaults ────────────────────────────────────

/**
 * GET /admin/defaults — Fetch notification channel defaults.
 * Returns saved defaults from Settings, or system defaults if none found.
 */
export async function getNotificationDefaults(req: AuthRequest, res: Response): Promise<void> {
    try {
        const settings = await Settings.findOne().lean();
        const saved = (settings as Record<string, unknown> | null)?.notificationChannelDefaults as
            | unknown[]
            | undefined;

        const defaults = saved && Array.isArray(saved) && saved.length > 0
            ? saved
            : buildSystemDefaults();

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ defaults }));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── PUT /admin/defaults ────────────────────────────────────

/**
 * PUT /admin/defaults — Update notification channel defaults.
 * Body already validated by Zod middleware.
 */
export async function updateNotificationDefaults(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { defaults } = req.body;

        await Settings.findOneAndUpdate(
            {},
            { $set: { notificationChannelDefaults: defaults } },
            { upsert: true, new: true },
        );

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ defaults }));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── POST /admin/announce ───────────────────────────────────

/**
 * POST /admin/announce — Send an announcement notification.
 * Body already validated by Zod middleware.
 */
export async function sendAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { title, message, type, targetRole, targetGroupId, targetUserIds } = req.body;

        // Resolve group membership if targetGroupId is provided
        let resolvedUserIds = targetUserIds;
        if (targetGroupId) {
            const memberships = await GroupMembership.find({
                groupId: targetGroupId,
                membershipStatus: 'active',
            }).select('studentId').lean();

            resolvedUserIds = memberships.map((m) => m.studentId);
        }

        const notification = await Notification.create({
            title,
            message,
            type: type || 'announcement',
            category: 'general',
            createdBy: req.user!._id,
            ...(targetRole ? { targetRole } : {}),
            ...(resolvedUserIds ? { targetUserIds: resolvedUserIds } : {}),
        });

        ResponseBuilder.send(res, 201, ResponseBuilder.created(notification));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
