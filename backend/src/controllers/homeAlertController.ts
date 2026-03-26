import { Request, Response } from 'express';
import mongoose from 'mongoose';
import HomeAlert from '../models/HomeAlert';
import LiveAlertAck from '../models/LiveAlertAck';
import StudentProfile from '../models/StudentProfile';
import { AuthRequest } from '../middlewares/auth';

type AlertTarget = {
    type: 'all' | 'groups' | 'users';
    groupIds: string[];
    userIds: string[];
};

function normalizeStringArray(input: unknown): string[] {
    if (Array.isArray(input)) return input.map((v) => String(v || '').trim()).filter(Boolean);
    if (typeof input === 'string') return input.split(',').map((v) => v.trim()).filter(Boolean);
    return [];
}

function normalizeTarget(input: unknown): AlertTarget {
    const value = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {};
    const typeRaw = String(value.type || 'all').trim().toLowerCase();
    const type: 'all' | 'groups' | 'users' = (
        typeRaw === 'groups' || typeRaw === 'users' || typeRaw === 'all'
    ) ? typeRaw : 'all';
    return {
        type,
        groupIds: normalizeStringArray(value.groupIds),
        userIds: normalizeStringArray(value.userIds),
    };
}

function isInWindow(startAt?: Date | null, endAt?: Date | null, now = new Date()): boolean {
    if (startAt && startAt.getTime() > now.getTime()) return false;
    if (endAt && endAt.getTime() < now.getTime()) return false;
    return true;
}

async function isTargetedToStudent(alert: Record<string, unknown>, studentId: string): Promise<boolean> {
    const target = normalizeTarget(alert.target);
    if (target.type === 'all') return true;
    if (target.type === 'users') return target.userIds.includes(studentId);
    const profile = await StudentProfile.findOne({ user_id: studentId }).select('groupIds').lean();
    const studentGroupIds = Array.isArray(profile?.groupIds)
        ? profile!.groupIds.map((id) => String(id))
        : [];
    return target.groupIds.some((id) => studentGroupIds.includes(id));
}

export async function getPublicAlerts(_req: Request, res: Response): Promise<void> {
    try {
        const now = new Date();
        const alerts = await HomeAlert.find({
            isActive: true,
            status: 'published',
        })
            .sort({ priority: -1, createdAt: -1 })
            .limit(20)
            .lean();

        const activeAlerts = alerts.filter((alert) => isInWindow(alert.startAt, alert.endAt, now));
        res.json({ alerts: activeAlerts });
    } catch (err) {
        console.error('getPublicAlerts error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getActiveStudentAlerts(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = String(req.user?._id || '');
        if (!studentId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const now = new Date();
        const alerts = await HomeAlert.find({
            isActive: true,
            status: 'published',
        })
            .sort({ priority: -1, createdAt: -1 })
            .limit(30)
            .lean();

        const filtered: Array<Record<string, unknown>> = [];
        for (const alert of alerts) {
            if (!isInWindow(alert.startAt, alert.endAt, now)) continue;
            const targeted = await isTargetedToStudent(alert as unknown as Record<string, unknown>, studentId);
            if (!targeted) continue;
            filtered.push(alert as unknown as Record<string, unknown>);
        }

        const ackRows = await LiveAlertAck.find({
            studentId: new mongoose.Types.ObjectId(studentId),
            alertId: { $in: filtered.map((a) => a._id) },
        }).lean();
        const ackSet = new Set(ackRows.map((row) => String(row.alertId)));

        const filteredAlertIds = filtered
            .map((alert) => alert._id)
            .filter(Boolean);

        const items = filtered.map((alert) => ({
            ...alert,
            acknowledged: ackSet.has(String(alert._id)),
        }));

        if (filteredAlertIds.length > 0) {
            await HomeAlert.updateMany(
                { _id: { $in: filteredAlertIds as any[] } },
                { $inc: { 'metrics.impressions': 1 } },
            );
        }

        res.json({ alerts: items });
    } catch (err) {
        console.error('getActiveStudentAlerts error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function ackStudentAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = String(req.user?._id || '');
        const alertId = String(req.params.id || req.params.alertId || '');
        if (!studentId || !alertId || !mongoose.Types.ObjectId.isValid(alertId)) {
            res.status(400).json({ message: 'Invalid alert acknowledgement request.' });
            return;
        }

        const alert = await HomeAlert.findById(alertId).lean();
        if (!alert || !alert.isActive || alert.status !== 'published') {
            res.status(404).json({ message: 'Alert not found.' });
            return;
        }

        const targeted = await isTargetedToStudent(alert as unknown as Record<string, unknown>, studentId);
        if (!targeted) {
            res.status(403).json({ message: 'Alert not targeted to this user.' });
            return;
        }

        const result = await LiveAlertAck.updateOne(
            {
                alertId: new mongoose.Types.ObjectId(alertId),
                studentId: new mongoose.Types.ObjectId(studentId),
            },
            { $setOnInsert: { ackAt: new Date() } },
            { upsert: true },
        );

        if (result.upsertedCount > 0) {
            await HomeAlert.updateOne({ _id: alertId }, { $inc: { 'metrics.acknowledgements': 1 } });
        }

        res.json({ acknowledged: true, alertId });
    } catch (err) {
        console.error('ackStudentAlert error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetAlerts(req: Request, res: Response): Promise<void> {
    try {
        const { page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.max(1, parseInt(String(limit), 10) || 50);

        const total = await HomeAlert.countDocuments();
        const alerts = await HomeAlert.find()
            .sort({ priority: -1, createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();

        const ackCounts = await LiveAlertAck.aggregate([
            { $match: { alertId: { $in: alerts.map((a) => a._id) } } },
            { $group: { _id: '$alertId', count: { $sum: 1 } } },
        ]);
        const ackMap = new Map<string, number>(ackCounts.map((row) => [String(row._id), Number(row.count || 0)]));

        const items = alerts.map((alert) => ({
            ...alert,
            metrics: {
                impressions: Number((alert as any).metrics?.impressions || 0),
                acknowledgements: ackMap.get(String(alert._id)) || Number((alert as any).metrics?.acknowledgements || 0),
            },
        }));

        res.json({
            alerts: items,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        console.error('adminGetAlerts error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminCreateAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
        const body = (req.body || {}) as Record<string, unknown>;
        const message = String(body.message || '').trim();
        if (!message) {
            res.status(400).json({ message: 'Alert message is required' });
            return;
        }

        const title = String(body.title || '').trim();
        const priority = Number(body.priority || 0);
        const statusRaw = String(body.status || 'draft').trim().toLowerCase();
        const status: 'draft' | 'published' = statusRaw === 'published' ? 'published' : 'draft';
        const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
        const target = normalizeTarget(body.target);

        const alert = await HomeAlert.create({
            title,
            message,
            link: String(body.link || ''),
            priority: Number.isFinite(priority) ? priority : 0,
            isActive,
            status,
            requireAck: Boolean(body.requireAck),
            target,
            startAt: body.startAt ? new Date(String(body.startAt)) : undefined,
            endAt: body.endAt ? new Date(String(body.endAt)) : undefined,
            createdBy: req.user?._id,
        });
        res.status(201).json({ alert, message: 'Alert created' });
    } catch (err) {
        console.error('adminCreateAlert error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminUpdateAlert(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const body = (req.body || {}) as Record<string, unknown>;
        const update: Record<string, unknown> = {};
        if (body.title !== undefined) update.title = String(body.title || '').trim();
        if (body.message !== undefined) update.message = String(body.message || '').trim();
        if (body.link !== undefined) update.link = String(body.link || '');
        if (body.priority !== undefined) update.priority = Number(body.priority || 0);
        if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);
        if (body.requireAck !== undefined) update.requireAck = Boolean(body.requireAck);
        if (body.status !== undefined) {
            update.status = String(body.status).toLowerCase() === 'published' ? 'published' : 'draft';
        }
        if (body.startAt !== undefined) update.startAt = body.startAt ? new Date(String(body.startAt)) : null;
        if (body.endAt !== undefined) update.endAt = body.endAt ? new Date(String(body.endAt)) : null;
        if (body.target !== undefined) update.target = normalizeTarget(body.target);

        const alert = await HomeAlert.findByIdAndUpdate(id, update, { new: true });
        if (!alert) {
            res.status(404).json({ message: 'Alert not found' });
            return;
        }
        res.json({ alert, message: 'Alert updated' });
    } catch (err) {
        console.error('adminUpdateAlert error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminDeleteAlert(req: Request, res: Response): Promise<void> {
    try {
        const alert = await HomeAlert.findByIdAndDelete(req.params.id);
        if (!alert) {
            res.status(404).json({ message: 'Alert not found' });
            return;
        }
        await LiveAlertAck.deleteMany({ alertId: alert._id });
        res.json({ message: 'Alert deleted' });
    } catch (err) {
        console.error('adminDeleteAlert error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminToggleAlert(req: Request, res: Response): Promise<void> {
    try {
        const alert = await HomeAlert.findById(req.params.id);
        if (!alert) {
            res.status(404).json({ message: 'Alert not found' });
            return;
        }
        alert.isActive = !alert.isActive;
        await alert.save();
        res.json({ alert, message: `Alert ${alert.isActive ? 'enabled' : 'disabled'}` });
    } catch (err) {
        console.error('adminToggleAlert error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminPublishAlert(req: Request, res: Response): Promise<void> {
    try {
        const alert = await HomeAlert.findById(req.params.id);
        if (!alert) {
            res.status(404).json({ message: 'Alert not found' });
            return;
        }

        const body = (req.body || {}) as Record<string, unknown>;
        const publish = body.publish !== undefined ? Boolean(body.publish) : true;
        alert.status = publish ? 'published' : 'draft';
        alert.isActive = publish;
        await alert.save();
        res.json({
            alert,
            message: publish ? 'Alert published' : 'Alert unpublished',
        });
    } catch (err) {
        console.error('adminPublishAlert error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
