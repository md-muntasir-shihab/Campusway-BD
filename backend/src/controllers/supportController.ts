import { Response } from 'express';
import mongoose from 'mongoose';
import { createStudentNotification } from '../services/adminAlertService';
import { addSystemTimelineEvent } from '../services/studentTimelineService';
import type { AuthRequest } from '../middlewares/auth';
import { createCommunicationAuditEntry } from '../services/communicationCoreService';
import { canUseSupport as getCanonicalSupportEligibility } from '../services/subscriptionAccessService';
import {
    createStudentSupportTicket,
    getAdminSupportTicketDetail,
    getStudentSupportTicketDetail,
    listAdminSupportTickets,
    listStudentSupportTickets,
    markAdminSupportTicketRead,
    replyAdminSupportTicket,
    replyStudentSupportTicket,
    updateAdminSupportTicketStatus as updateSupportTicketStatus,
    type SupportTicketApiItem,
} from '../services/supportCommunicationService';
import { ResponseBuilder } from '../utils/responseBuilder';

function resolveTicketStudentId(ticket: SupportTicketApiItem): string {
    if (ticket.senderProfileSummary?.linkedStudentId) {
        return ticket.senderProfileSummary.linkedStudentId;
    }
    if (ticket.studentId && typeof ticket.studentId === 'object' && '_id' in ticket.studentId) {
        return String((ticket.studentId as { _id?: unknown })._id || '').trim();
    }
    return String(ticket.studentId || '').trim();
}

function mapSupportError(error: unknown): {
    status: number;
    payload: Record<string, unknown>;
} {
    const code = error instanceof Error ? error.message : '';
    if (code === 'SUPPORT_TICKET_NOT_FOUND') {
        return { status: 404, payload: { message: 'Support ticket not found' } };
    }
    if (code === 'SUPPORT_TICKET_CLOSED') {
        return { status: 400, payload: { message: 'Closed tickets cannot receive new replies' } };
    }
    if (code === 'SUPPORT_INVALID_ADMIN') {
        return { status: 400, payload: { message: 'Invalid admin user' } };
    }
    if (code === 'SUPPORT_EXPIRED_SUBSCRIPTION') {
        return {
            status: 403,
            payload: {
                subscriptionRequired: true,
                reason: 'expired_subscription',
                message: 'Your subscription has expired.',
            },
        };
    }
    if (code === 'SUPPORT_NO_ACTIVE_SUBSCRIPTION' || code === 'SUPPORT_NOT_ALLOWED') {
        return {
            status: 403,
            payload: {
                subscriptionRequired: true,
                reason: 'no_active_subscription',
                message: 'Active subscription required to access support.',
            },
        };
    }
    return { status: 500, payload: { message: 'Server error' } };
}

function ensureStudent(req: AuthRequest, res: Response): string | null {
    if (!req.user) {
        ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Authentication required'));
        return null;
    }
    if (req.user.role !== 'student') {
        ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access required'));
        return null;
    }
    return String(req.user._id || '').trim();
}

async function createSupportAudit(req: AuthRequest, action: string, targetId: string, details?: Record<string, unknown>): Promise<void> {
    await createCommunicationAuditEntry({
        actorId: req.user?._id || null,
        actorRole: req.user?.role || null,
        action,
        targetId,
        req,
        details,
    });
}

export async function studentGetSupportEligibility(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user?._id) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Authentication required'));
            return;
        }

        const result = await getCanonicalSupportEligibility(String(req.user._id));
        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            ...result,
            expiresAtUTC: result.expiresAtUTC ? result.expiresAtUTC.toISOString() : null,
        }));
    } catch (error) {
        console.error('studentGetSupportEligibility error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function studentCreateSupportTicket(req: AuthRequest, res: Response): Promise<void> {
    const studentId = ensureStudent(req, res);
    if (!studentId) return;

    try {
        const body = (req.body || {}) as Record<string, unknown>;
        const subject = String(body.subject || '').trim();
        const message = String(body.message || '').trim();
        if (!subject || !message) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'subject and message are required'));
            return;
        }

        const item = await createStudentSupportTicket({
            userId: studentId,
            subject,
            message,
            priority: typeof body.priority === 'string' ? body.priority : undefined,
        });

        await createSupportAudit(req, 'support_ticket_created', String(item._id), {
            ticketNo: item.ticketNo,
        });

        ResponseBuilder.send(res, 201, ResponseBuilder.created({item}, 'Support ticket created successfully'));
    } catch (error) {
        const mapped = mapSupportError(error);
        console.error('studentCreateSupportTicket error:', error);
        ResponseBuilder.send(res, mapped.status, ResponseBuilder.success(mapped.payload));
    }
}

export async function studentGetSupportTickets(req: AuthRequest, res: Response): Promise<void> {
    const studentId = ensureStudent(req, res);
    if (!studentId) return;

    try {
        const items = await listStudentSupportTickets(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items }));
    } catch (error) {
        const mapped = mapSupportError(error);
        console.error('studentGetSupportTickets error:', error);
        ResponseBuilder.send(res, mapped.status, ResponseBuilder.success(mapped.payload));
    }
}

export async function studentGetSupportTicketById(req: AuthRequest, res: Response): Promise<void> {
    const studentId = ensureStudent(req, res);
    if (!studentId) return;

    try {
        const item = await getStudentSupportTicketDetail(studentId, String(req.params.id || '').trim(), { markRead: true });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ item }));
    } catch (error) {
        const mapped = mapSupportError(error);
        console.error('studentGetSupportTicketById error:', error);
        ResponseBuilder.send(res, mapped.status, ResponseBuilder.success(mapped.payload));
    }
}

export async function studentReplySupportTicket(req: AuthRequest, res: Response): Promise<void> {
    const studentId = ensureStudent(req, res);
    if (!studentId) return;

    try {
        const message = String((req.body as Record<string, unknown>)?.message || '').trim();
        if (!message) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'message is required'));
            return;
        }

        const item = await replyStudentSupportTicket({
            userId: studentId,
            ticketId: String(req.params.id || '').trim(),
            message,
        });

        await createSupportAudit(req, 'support_ticket_student_replied', String(item._id), {
            ticketNo: item.ticketNo,
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({item}, 'Reply added successfully'));
    } catch (error) {
        const mapped = mapSupportError(error);
        console.error('studentReplySupportTicket error:', error);
        ResponseBuilder.send(res, mapped.status, ResponseBuilder.success(mapped.payload));
    }
}

export async function adminGetSupportTickets(req: AuthRequest, res: Response): Promise<void> {
    try {
        const result = await listAdminSupportTickets({
            page: Number(req.query.page || 1),
            limit: Number(req.query.limit || 20),
            status: typeof req.query.status === 'string' ? req.query.status : undefined,
            threadState: typeof req.query.threadState === 'string' ? req.query.threadState : undefined,
            unread: typeof req.query.unread === 'string' ? req.query.unread : undefined,
            assigned: typeof req.query.assigned === 'string' ? req.query.assigned : undefined,
            planCode: typeof req.query.planCode === 'string' ? req.query.planCode : undefined,
            priority: typeof req.query.priority === 'string' ? req.query.priority : undefined,
            search: typeof req.query.search === 'string' ? req.query.search : undefined,
        });
        ResponseBuilder.send(res, 200, ResponseBuilder.success(result));
    } catch (error) {
        console.error('adminGetSupportTickets error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminGetSupportTicketById(req: AuthRequest, res: Response): Promise<void> {
    try {
        const item = await getAdminSupportTicketDetail(String(req.params.id || '').trim(), { markRead: true });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ item }));
    } catch (error) {
        const mapped = mapSupportError(error);
        console.error('adminGetSupportTicketById error:', error);
        ResponseBuilder.send(res, mapped.status, ResponseBuilder.success(mapped.payload));
    }
}

export async function adminMarkSupportTicketRead(req: AuthRequest, res: Response): Promise<void> {
    try {
        const item = await markAdminSupportTicketRead(String(req.params.id || '').trim());
        ResponseBuilder.send(res, 200, ResponseBuilder.success({item}, 'Support ticket marked as read'));
    } catch (error) {
        const mapped = mapSupportError(error);
        console.error('adminMarkSupportTicketRead error:', error);
        ResponseBuilder.send(res, mapped.status, ResponseBuilder.success(mapped.payload));
    }
}

export async function adminUpdateSupportTicketStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
        const body = (req.body || {}) as Record<string, unknown>;
        const requestedStatus = typeof body.status === 'string' ? body.status : undefined;
        const item = await updateSupportTicketStatus({
            ticketId: String(req.params.id || '').trim(),
            status: requestedStatus,
            assignedTo: body.assignedTo === undefined ? undefined : String(body.assignedTo || ''),
        });

        await createSupportAudit(req, 'support_ticket_status_updated', String(item._id), {
            ticketNo: item.ticketNo,
            status: requestedStatus,
            assignedTo: body.assignedTo,
        });

        const studentId = resolveTicketStudentId(item);
        if (requestedStatus && mongoose.Types.ObjectId.isValid(studentId)) {
            await createStudentNotification({
                title: 'Support ticket updated',
                message: `${item.ticketNo} - ${item.subject}: Status changed to ${String(item.status).replace('_', ' ')}`,
                type: 'support_status_changed',
                messagePreview: item.latestMessagePreview
                    ? `Latest update: ${item.latestMessagePreview}`
                    : undefined,
                linkUrl: `/support/${String(item._id)}`,
                category: 'update',
                targetRole: 'student',
                targetUserIds: [studentId],
                sourceType: 'support_ticket',
                sourceId: String(item._id),
                targetRoute: '/support',
                targetEntityId: String(item._id),
                priority: 'normal',
            });
            await addSystemTimelineEvent(
                new mongoose.Types.ObjectId(studentId),
                'support_ticket_link',
                `Support ticket ${item.ticketNo} status changed to ${String(item.status).replace('_', ' ')}`,
                {
                    ticketId: String(item._id),
                    status: item.status,
                },
                new mongoose.Types.ObjectId(String(item._id)),
            );
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({item}, 'Support ticket updated'));
    } catch (error) {
        const mapped = mapSupportError(error);
        console.error('adminUpdateSupportTicketStatus error:', error);
        ResponseBuilder.send(res, mapped.status, ResponseBuilder.success(mapped.payload));
    }
}

export async function adminReplySupportTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user?._id) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Authentication required'));
            return;
        }

        const message = String((req.body as Record<string, unknown>)?.message || '').trim();
        if (!message) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'message is required'));
            return;
        }

        const item = await replyAdminSupportTicket({
            ticketId: String(req.params.id || '').trim(),
            adminUserId: String(req.user._id),
            adminRole: req.user.role,
            message,
        });

        await createSupportAudit(req, 'support_ticket_replied', String(item._id), {
            ticketNo: item.ticketNo,
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({item}, 'Reply added successfully'));
    } catch (error) {
        const mapped = mapSupportError(error);
        console.error('adminReplySupportTicket error:', error);
        ResponseBuilder.send(res, mapped.status, ResponseBuilder.success(mapped.payload));
    }
}
