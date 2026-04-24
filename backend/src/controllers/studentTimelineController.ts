import { Response } from 'express';
import mongoose from 'mongoose';
import StudentContactTimeline from '../models/StudentContactTimeline';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/auth';
import { getClientIp } from '../utils/requestMeta';
import { addSystemTimelineEvent } from '../services/studentTimelineService';
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
        target_type: 'student_timeline',
        ip_address: getClientIp(req),
        details: details || {},
    });
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/** GET /admin/students/:studentId/timeline */
export async function adminGetStudentTimeline(req: AuthRequest, res: Response): Promise<void> {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid studentId')); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { studentId };
    if (req.query.type) filter.type = String(req.query.type);
    if (req.query.sourceType) filter.sourceType = String(req.query.sourceType);

    const [items, total] = await Promise.all([
        StudentContactTimeline.find(filter)
            .populate('createdByAdminId', 'username full_name role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        StudentContactTimeline.countDocuments(filter),
    ]);
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ items, total, page, pages: Math.ceil(total / limit) }));
}

/** POST /admin/students/:studentId/timeline — add a manual note */
export async function adminAddTimelineEntry(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Unauthorized')); return; }

    const studentId = asObjectId(req.params.studentId);
    if (!studentId) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid studentId')); return; }

    const { type, content, linkedId } = req.body as { type?: string; content?: string; linkedId?: string };
    const allowedManual = ['note', 'call', 'message', 'support_ticket_link', 'payment_note'];
    if (!type || !allowedManual.includes(type)) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', `type must be one of: ${allowedManual.join(', ')}`));
        return;
    }
    if (!content || !content.trim()) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'content is required'));
        return;
    }

    const entry = await StudentContactTimeline.create({
        studentId,
        type,
        content: content.trim(),
        linkedId: linkedId ? asObjectId(linkedId) : undefined,
        createdByAdminId: new mongoose.Types.ObjectId(String(req.user._id)),
        sourceType: 'manual',
    });

    await createAudit(req, 'timeline_entry_added', { studentId, type, entryId: entry._id });
    ResponseBuilder.send(res, 201, ResponseBuilder.created({data: entry}, 'Timeline entry added'));
}

/** DELETE /admin/students/:studentId/timeline/:entryId */
export async function adminDeleteTimelineEntry(req: AuthRequest, res: Response): Promise<void> {
    const studentId = asObjectId(req.params.studentId);
    const entryId = asObjectId(req.params.entryId);
    if (!studentId || !entryId) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid ids')); return; }

    const entry = await StudentContactTimeline.findOneAndDelete({
        _id: entryId,
        studentId,
        sourceType: 'manual',
    });
    if (!entry) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Entry not found or is a system event (cannot delete)')); return; }

    await createAudit(req, 'timeline_entry_deleted', { studentId, entryId });
    ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Timeline entry deleted'));
}

/** GET /admin/students/:studentId/timeline/summary — counts by type */
export async function adminGetTimelineSummary(req: AuthRequest, res: Response): Promise<void> {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid studentId')); return; }

    const summary = await StudentContactTimeline.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$type', count: { $sum: 1 }, latest: { $max: '$createdAt' } } },
        { $sort: { latest: -1 } },
    ]);

    const total = await StudentContactTimeline.countDocuments({ studentId });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ summary, total }));
}

/* ═══════════════════════════════════════════════════════════
   UTILITY — add system event programmatically
   ═══════════════════════════════════════════════════════════ */

export { addSystemTimelineEvent };
