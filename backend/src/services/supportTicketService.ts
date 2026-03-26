import mongoose from 'mongoose';

/**
 * @deprecated Legacy support-ticket service.
 * The unified communication backend uses `supportCommunicationService.ts`
 * as the canonical support implementation.
 */
import AuditLog from '../models/AuditLog';
import SupportTicket, {
    type ISupportTicket,
    type SupportTicketMessageSenderType,
    type SupportTicketPriority,
    type SupportTicketStatus,
    type SupportTicketThreadState,
} from '../models/SupportTicket';
import SupportTicketMessage, { type ISupportTicketMessage } from '../models/SupportTicketMessage';
import User from '../models/User';
import { createAdminAlert, createStudentNotification } from './adminAlertService';
import {
    buildNormalizedContactBundle,
    resolveCommunicationProfile,
    resolveCommunicationProfiles,
} from './communicationProfileService';
import { getCanonicalSubscriptionSnapshot } from './subscriptionAccessService';
import { addSystemTimelineEvent } from './studentTimelineService';

type LeanTicket = Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId | null;
    ticketNo: string;
    subject: string;
    message: string;
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
    timeline?: Array<Record<string, unknown>>;
    subscriptionSnapshot?: Record<string, unknown>;
    messageCount?: number;
    latestMessagePreview?: string;
    lastMessageAt?: Date | null;
    lastMessageSenderType?: SupportTicketMessageSenderType | null;
    unreadCountForAdmin?: number;
    unreadCountForUser?: number;
    threadState?: SupportTicketThreadState;
    createdAt?: Date;
    updatedAt?: Date;
};

type LeanMessage = Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    ticketId: mongoose.Types.ObjectId;
    senderType: SupportTicketMessageSenderType;
    senderId?: mongoose.Types.ObjectId | null;
    message: string;
    attachments?: Array<Record<string, unknown>>;
    readByAdminAt?: Date | null;
    readByUserAt?: Date | null;
    sequence: number;
    createdAt: Date;
    updatedAt: Date;
};

export interface SupportTicketListInput {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    threadState?: string;
    search?: string;
    unread?: string | boolean;
    assigned?: 'assigned' | 'unassigned' | '';
    planCode?: string;
}

export interface SupportTicketStatusUpdateInput {
    status?: SupportTicketStatus;
    assignedTo?: string | null;
    actorId?: string | null;
    actorRole?: string | null;
    ipAddress?: string;
}

function toObjectId(value: string | mongoose.Types.ObjectId | null | undefined): mongoose.Types.ObjectId | null {
    if (!value) return null;
    if (value instanceof mongoose.Types.ObjectId) return value;
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

function uniqueObjectIds(values: Array<string | mongoose.Types.ObjectId | null | undefined>): mongoose.Types.ObjectId[] {
    const seen = new Set<string>();
    const output: mongoose.Types.ObjectId[] = [];
    for (const value of values) {
        const objectId = toObjectId(value);
        if (!objectId) continue;
        const key = String(objectId);
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(objectId);
    }
    return output;
}

function previewText(message: string, limit = 160): string {
    const clean = String(message || '').trim().replace(/\s+/g, ' ');
    if (clean.length <= limit) return clean;
    return `${clean.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function normalizeStatus(value: unknown): SupportTicketStatus {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'open' || normalized === 'in_progress' || normalized === 'resolved' || normalized === 'closed') {
        return normalized;
    }
    return 'open';
}

function normalizePriority(value: unknown): SupportTicketPriority {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'urgent') {
        return normalized;
    }
    return 'medium';
}

function normalizeThreadState(
    status: SupportTicketStatus,
    lastSenderType?: SupportTicketMessageSenderType | null,
): SupportTicketThreadState {
    if (status === 'resolved') return 'resolved';
    if (status === 'closed') return 'closed';
    if (lastSenderType === 'admin') return 'replied';
    if (lastSenderType === 'system') return 'idle';
    return 'pending';
}

function toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
}

async function createAuditLog(input: {
    actorId?: string | null;
    actorRole?: string | null;
    action: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
    ipAddress?: string;
}): Promise<void> {
    const actorId = toObjectId(input.actorId || null);
    if (!actorId) return;

    await AuditLog.create({
        actor_id: actorId,
        actor_role: String(input.actorRole || '').trim() || undefined,
        action: input.action,
        target_id: toObjectId(input.targetId || null) || undefined,
        target_type: 'support_ticket',
        ip_address: String(input.ipAddress || '').trim() || undefined,
        details: input.details || {},
    });
}

async function generateTicketNo(): Promise<string> {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const prefix = `${year}${month}${day}`;
    const startOfDay = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    const endOfDay = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
    const count = await SupportTicket.countDocuments({
        createdAt: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
    });
    return `TKT-${prefix}-${String(count + 1).padStart(4, '0')}`;
}

async function buildSubscriptionSnapshot(userId: string): Promise<Record<string, unknown>> {
    const snapshot = await getCanonicalSubscriptionSnapshot(userId);
    const plan = (
        snapshot.plan && typeof snapshot.plan === 'object' && !Array.isArray(snapshot.plan)
            ? snapshot.plan as Record<string, unknown>
            : {}
    );

    return {
        source: snapshot.source,
        planCode: snapshot.planCode,
        planName: snapshot.planName,
        supportLevel: String(plan.supportLevel || 'basic').trim() || 'basic',
        isActive: snapshot.isActive,
        expiresAtUTC: snapshot.expiresAtUTC ? snapshot.expiresAtUTC.toISOString() : null,
        status: snapshot.isActive ? 'active' : (snapshot.reason || 'inactive'),
    };
}

async function nextSequence(ticketId: mongoose.Types.ObjectId): Promise<number> {
    const latestMessage = await SupportTicketMessage.findOne({ ticketId })
        .sort({ sequence: -1 })
        .select('sequence')
        .lean<{ sequence?: number } | null>();
    return Number(latestMessage?.sequence || 0) + 1;
}

async function appendTicketMessage(input: {
    ticketId: mongoose.Types.ObjectId;
    senderType: SupportTicketMessageSenderType;
    senderId?: string | null;
    message: string;
    attachments?: Array<Record<string, unknown>>;
    markReadForAdmin?: boolean;
    markReadForUser?: boolean;
}): Promise<ISupportTicketMessage> {
    const senderId = toObjectId(input.senderId || null);
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const sequence = await nextSequence(input.ticketId);
        try {
            return await SupportTicketMessage.create({
                ticketId: input.ticketId,
                senderType: input.senderType,
                senderId,
                message: String(input.message || '').trim(),
                attachments: Array.isArray(input.attachments) ? input.attachments : [],
                readByAdminAt: input.markReadForAdmin ? new Date() : null,
                readByUserAt: input.markReadForUser ? new Date() : null,
                sequence,
            });
        } catch (error: any) {
            if (error?.code !== 11000 || attempt === 2) {
                throw error;
            }
        }
    }

    throw new Error('Unable to append support ticket message');
}

async function getMessagesByTicketIds(ticketIds: mongoose.Types.ObjectId[]): Promise<Map<string, LeanMessage[]>> {
    if (ticketIds.length === 0) return new Map();
    const rows = await SupportTicketMessage.find({ ticketId: { $in: ticketIds } })
        .sort({ sequence: 1, createdAt: 1 })
        .lean<LeanMessage[]>();
    const grouped = new Map<string, LeanMessage[]>();
    for (const row of rows) {
        const key = String(row.ticketId);
        const bucket = grouped.get(key) || [];
        bucket.push(row);
        grouped.set(key, bucket);
    }
    return grouped;
}

function fallbackMessagesFromLegacy(ticket: LeanTicket): LeanMessage[] {
    const timeline = Array.isArray(ticket.timeline) ? ticket.timeline : [];
    if (timeline.length > 0) {
        return timeline.map((entry, index) => ({
            _id: new mongoose.Types.ObjectId(),
            ticketId: ticket._id,
            senderType: String(entry.actorRole || '').trim().toLowerCase() === 'student' ? 'student' : 'admin',
            senderId: toObjectId(String(entry.actorId || '')),
            message: String(entry.message || '').trim(),
            attachments: [],
            readByAdminAt: new Date(),
            readByUserAt: new Date(),
            sequence: index + 1,
            createdAt: entry.createdAt ? new Date(String(entry.createdAt)) : (ticket.createdAt || new Date()),
            updatedAt: entry.createdAt ? new Date(String(entry.createdAt)) : (ticket.createdAt || new Date()),
        }));
    }

    if (String(ticket.message || '').trim()) {
        return [{
            _id: new mongoose.Types.ObjectId(),
            ticketId: ticket._id,
            senderType: 'student',
            senderId: ticket.studentId,
            message: String(ticket.message || '').trim(),
            attachments: [],
            readByAdminAt: new Date(),
            readByUserAt: new Date(),
            sequence: 1,
            createdAt: ticket.createdAt || new Date(),
            updatedAt: ticket.createdAt || new Date(),
        }];
    }

    return [];
}

async function recalculateTicketState(ticketId: mongoose.Types.ObjectId): Promise<ISupportTicket | null> {
    const [ticket, messages] = await Promise.all([
        SupportTicket.findById(ticketId),
        SupportTicketMessage.find({ ticketId })
            .sort({ sequence: 1, createdAt: 1 })
            .lean<LeanMessage[]>(),
    ]);
    if (!ticket) return null;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const unreadCountForAdmin = messages.filter((message) => message.senderType !== 'admin' && !message.readByAdminAt).length;
    const unreadCountForUser = messages.filter((message) => message.senderType === 'admin' && !message.readByUserAt).length;

    ticket.messageCount = messages.length;
    ticket.latestMessagePreview = previewText(lastMessage?.message || ticket.message || '');
    ticket.lastMessageAt = lastMessage?.createdAt || ticket.createdAt;
    ticket.lastMessageSenderType = lastMessage?.senderType || null;
    ticket.unreadCountForAdmin = unreadCountForAdmin;
    ticket.unreadCountForUser = unreadCountForUser;
    ticket.threadState = normalizeThreadState(ticket.status, ticket.lastMessageSenderType);
    if (firstMessage?.message) {
        ticket.message = firstMessage.message;
    }
    await ticket.save();
    return ticket;
}

async function serializeTicketRows(
    tickets: LeanTicket[],
    messagesByTicketId: Map<string, LeanMessage[]>,
): Promise<Record<string, unknown>[]> {
    if (tickets.length === 0) return [];

    const studentIds = uniqueObjectIds(tickets.map((ticket) => ticket.studentId));
    const assignedIds = uniqueObjectIds(tickets.map((ticket) => ticket.assignedTo || null));
    const [studentUsers, assignedUsers, profileMap] = await Promise.all([
        User.find({ _id: { $in: studentIds } })
            .select('username email full_name')
            .lean<Array<{ _id: mongoose.Types.ObjectId; username?: string; email?: string; full_name?: string }>>(),
        assignedIds.length > 0
            ? User.find({ _id: { $in: assignedIds } })
                .select('username full_name role')
                .lean<Array<{ _id: mongoose.Types.ObjectId; username?: string; full_name?: string; role?: string }>>()
            : Promise.resolve([]),
        resolveCommunicationProfiles(studentIds),
    ]);
    const studentUserMap = new Map(studentUsers.map((user) => [String(user._id), user]));
    const assignedUserMap = new Map(assignedUsers.map((user) => [String(user._id), user]));

    return tickets.map((ticket) => {
        const ticketId = String(ticket._id);
        const studentId = String(ticket.studentId);
        const messages = messagesByTicketId.get(ticketId) || fallbackMessagesFromLegacy(ticket);
        const timeline = messages.map((message) => ({
            actorId: message.senderId ? String(message.senderId) : '',
            actorRole: message.senderType === 'admin' ? 'admin' : message.senderType,
            message: message.message,
            createdAt: message.createdAt,
        }));
        const student = studentUserMap.get(studentId);
        const assigned = ticket.assignedTo ? assignedUserMap.get(String(ticket.assignedTo)) : null;
        const profileSummary = profileMap.get(studentId) || null;

        return {
            _id: ticketId,
            ticketNo: ticket.ticketNo,
            studentId: student ? {
                _id: String(student._id),
                username: student.username || '',
                email: student.email || '',
                full_name: student.full_name || '',
            } : studentId,
            subject: ticket.subject,
            message: messages[0]?.message || ticket.message,
            status: ticket.status,
            priority: ticket.priority,
            assignedTo: assigned ? {
                _id: String(assigned._id),
                username: assigned.username || '',
                full_name: assigned.full_name || '',
                role: assigned.role || '',
            } : (ticket.assignedTo ? String(ticket.assignedTo) : null),
            subscriptionSnapshot: ticket.subscriptionSnapshot || {},
            messageCount: Number(ticket.messageCount || messages.length || 0),
            latestMessagePreview: String(ticket.latestMessagePreview || previewText(messages[messages.length - 1]?.message || ticket.message || '')),
            lastMessageAt: ticket.lastMessageAt || messages[messages.length - 1]?.createdAt || ticket.updatedAt || ticket.createdAt || null,
            lastMessageSenderType: ticket.lastMessageSenderType || messages[messages.length - 1]?.senderType || null,
            unreadCountForAdmin: Number(ticket.unreadCountForAdmin || 0),
            unreadCountForUser: Number(ticket.unreadCountForUser || 0),
            threadState: ticket.threadState || normalizeThreadState(ticket.status, ticket.lastMessageSenderType || messages[messages.length - 1]?.senderType),
            timeline,
            messages: messages.map((message) => ({
                _id: String(message._id),
                ticketId,
                senderType: message.senderType,
                senderId: message.senderId ? String(message.senderId) : '',
                message: message.message,
                attachments: Array.isArray(message.attachments) ? message.attachments : [],
                readByAdminAt: message.readByAdminAt || null,
                readByUserAt: message.readByUserAt || null,
                sequence: message.sequence,
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
            })),
            senderProfileSummary: profileSummary,
            contactBundle: buildNormalizedContactBundle({
                fullName: profileSummary?.fullName || student?.full_name || '',
                email: profileSummary?.email || student?.email || '',
                phone: profileSummary?.phone || '',
            }),
            createdAt: ticket.createdAt || null,
            updatedAt: ticket.updatedAt || null,
        };
    });
}

export async function createSupportTicketForStudent(input: {
    studentId: string;
    subject: string;
    message: string;
    priority?: string;
    ipAddress?: string;
}): Promise<Record<string, unknown>> {
    const studentObjectId = toObjectId(input.studentId);
    if (!studentObjectId) {
        throw new Error('Invalid student id');
    }

    const [ticketNo, subscriptionSnapshot] = await Promise.all([
        generateTicketNo(),
        buildSubscriptionSnapshot(input.studentId),
    ]);

    const ticket = await SupportTicket.create({
        ticketNo,
        studentId: studentObjectId,
        subject: String(input.subject || '').trim(),
        message: String(input.message || '').trim(),
        status: 'open',
        priority: normalizePriority(input.priority),
        subscriptionSnapshot,
        messageCount: 0,
        latestMessagePreview: '',
        lastMessageAt: new Date(),
        lastMessageSenderType: 'student',
        unreadCountForAdmin: 0,
        unreadCountForUser: 0,
        threadState: 'pending',
        timeline: [],
    });

    await appendTicketMessage({
        ticketId: ticket._id,
        senderType: 'student',
        senderId: input.studentId,
        message: input.message,
        markReadForUser: true,
    });
    const recalculated = await recalculateTicketState(ticket._id);
    const studentProfile = await resolveCommunicationProfile(input.studentId);

    await Promise.all([
        createAuditLog({
            actorId: input.studentId,
            actorRole: 'student',
            action: 'support_ticket_created',
            targetId: String(ticket._id),
            details: { ticketNo: ticket.ticketNo },
            ipAddress: input.ipAddress,
        }),
        createAdminAlert({
            type: 'support_ticket_new',
            title: 'New support ticket',
            message: `${ticket.ticketNo}: ${ticket.subject}`,
            messagePreview: previewText(input.message),
            linkUrl: `/__cw_admin__/support-center?ticketId=${String(ticket._id)}`,
            targetRoute: '/__cw_admin__/support-center',
            targetEntityId: String(ticket._id),
            sourceType: 'support_ticket',
            sourceId: String(ticket._id),
            priority: input.priority === 'urgent' ? 'urgent' : 'normal',
            actorUserId: input.studentId,
            actorNameSnapshot: studentProfile?.fullName || '',
            category: 'update',
            targetRole: 'admin',
            dedupeKey: `support_ticket_new:${String(ticket._id)}`,
        }),
        addSystemTimelineEvent(
            studentObjectId,
            'support_ticket_link',
            `Support ticket ${ticket.ticketNo} created: ${ticket.subject}`,
            {
                ticketId: String(ticket._id),
                ticketNo: ticket.ticketNo,
            },
            ticket._id,
        ),
    ]);

    const serialized = await serializeTicketRows([{
        ...(recalculated ? recalculated.toObject() : ticket.toObject()),
        _id: ticket._id,
    } as LeanTicket], await getMessagesByTicketIds([ticket._id]));
    return serialized[0];
}

export async function replyToSupportTicketAsStudent(input: {
    ticketId: string;
    studentId: string;
    message: string;
    ipAddress?: string;
}): Promise<Record<string, unknown> | null> {
    const ticket = await SupportTicket.findOne({
        _id: input.ticketId,
        studentId: input.studentId,
    });
    if (!ticket) return null;
    if (ticket.status === 'closed') {
        throw new Error('Closed tickets cannot receive new replies');
    }

    if (ticket.status !== 'open') {
        ticket.status = 'open';
        await ticket.save();
    }

    const reply = await appendTicketMessage({
        ticketId: ticket._id,
        senderType: 'student',
        senderId: input.studentId,
        message: input.message,
        markReadForUser: true,
    });
    const recalculated = await recalculateTicketState(ticket._id);
    const studentProfile = await resolveCommunicationProfile(input.studentId);

    await Promise.all([
        createAuditLog({
            actorId: input.studentId,
            actorRole: 'student',
            action: 'support_ticket_student_replied',
            targetId: String(ticket._id),
            details: { ticketNo: ticket.ticketNo, replyMessageId: String(reply._id) },
            ipAddress: input.ipAddress,
        }),
        createAdminAlert({
            type: 'support_reply_new',
            title: 'New student reply',
            message: `${ticket.ticketNo}: ${ticket.subject}`,
            messagePreview: previewText(input.message),
            linkUrl: `/__cw_admin__/support-center?ticketId=${String(ticket._id)}`,
            targetRoute: '/__cw_admin__/support-center',
            targetEntityId: String(ticket._id),
            sourceType: 'support_ticket',
            sourceId: String(ticket._id),
            priority: 'normal',
            actorUserId: input.studentId,
            actorNameSnapshot: studentProfile?.fullName || '',
            category: 'update',
            targetRole: 'admin',
            dedupeKey: `support_reply_new:${String(ticket._id)}:${String(reply._id)}`,
        }),
    ]);

    const serialized = await serializeTicketRows([{
        ...(recalculated ? recalculated.toObject() : ticket.toObject()),
        _id: ticket._id,
    } as LeanTicket], await getMessagesByTicketIds([ticket._id]));
    return serialized[0] || null;
}

export async function replyToSupportTicketAsAdmin(input: {
    ticketId: string;
    adminId: string;
    adminRole: string;
    message: string;
    ipAddress?: string;
}): Promise<Record<string, unknown> | null> {
    const ticket = await SupportTicket.findById(input.ticketId);
    if (!ticket) return null;

    ticket.status = 'in_progress';
    await ticket.save();

    await appendTicketMessage({
        ticketId: ticket._id,
        senderType: 'admin',
        senderId: input.adminId,
        message: input.message,
        markReadForAdmin: true,
    });
    const recalculated = await recalculateTicketState(ticket._id);

    await Promise.all([
        createAuditLog({
            actorId: input.adminId,
            actorRole: input.adminRole,
            action: 'support_ticket_replied',
            targetId: String(ticket._id),
            details: { ticketNo: ticket.ticketNo },
            ipAddress: input.ipAddress,
        }),
        createStudentNotification({
            title: 'Support reply received',
            message: `${ticket.ticketNo}: ${previewText(input.message)}`,
            linkUrl: `/support/${String(ticket._id)}`,
            sourceType: 'support_ticket',
            sourceId: String(ticket._id),
            category: 'update',
            targetRole: 'student',
            targetUserIds: [ticket.studentId],
        }),
        addSystemTimelineEvent(
            ticket.studentId,
            'message',
            `Admin replied to support ticket ${ticket.ticketNo}`,
            {
                ticketId: String(ticket._id),
                ticketNo: ticket.ticketNo,
            },
            ticket._id,
        ),
    ]);

    const serialized = await serializeTicketRows([{
        ...(recalculated ? recalculated.toObject() : ticket.toObject()),
        _id: ticket._id,
    } as LeanTicket], await getMessagesByTicketIds([ticket._id]));
    return serialized[0] || null;
}

export async function updateSupportTicketStatus(
    ticketId: string,
    input: SupportTicketStatusUpdateInput,
): Promise<Record<string, unknown> | null> {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return null;

    const updateStatus = input.status ? normalizeStatus(input.status) : null;
    const assignedTo = input.assignedTo === null
        ? null
        : toObjectId(input.assignedTo || null);
    const statusChanged = Boolean(updateStatus && updateStatus !== ticket.status);

    if (updateStatus) ticket.status = updateStatus;
    if (input.assignedTo !== undefined) ticket.assignedTo = assignedTo;
    ticket.threadState = normalizeThreadState(ticket.status, ticket.lastMessageSenderType);
    await ticket.save();

    await Promise.all([
        createAuditLog({
            actorId: input.actorId,
            actorRole: input.actorRole,
            action: 'support_ticket_status_updated',
            targetId: String(ticket._id),
            details: {
                ticketNo: ticket.ticketNo,
                status: ticket.status,
                assignedTo: ticket.assignedTo ? String(ticket.assignedTo) : null,
            },
            ipAddress: input.ipAddress,
        }),
        statusChanged
            ? createStudentNotification({
                title: 'Support ticket updated',
                message: `${ticket.ticketNo}: status changed to ${ticket.status.replace('_', ' ')}`,
                linkUrl: `/support/${String(ticket._id)}`,
                sourceType: 'support_ticket',
                sourceId: String(ticket._id),
                category: 'update',
                targetRole: 'student',
                targetUserIds: [ticket.studentId],
            })
            : Promise.resolve(null),
        statusChanged
            ? addSystemTimelineEvent(
                ticket.studentId,
                'support_ticket_link',
                `Support ticket ${ticket.ticketNo} status changed to ${ticket.status.replace('_', ' ')}`,
                {
                    ticketId: String(ticket._id),
                    ticketNo: ticket.ticketNo,
                    status: ticket.status,
                },
                ticket._id,
            )
            : Promise.resolve(undefined),
    ]);

    const recalculated = await recalculateTicketState(ticket._id);
    const serialized = await serializeTicketRows([{
        ...(recalculated ? recalculated.toObject() : ticket.toObject()),
        _id: ticket._id,
    } as LeanTicket], await getMessagesByTicketIds([ticket._id]));
    return serialized[0] || null;
}

export async function markSupportTicketReadForAdmin(ticketId: string): Promise<void> {
    const objectId = toObjectId(ticketId);
    if (!objectId) return;

    await SupportTicketMessage.updateMany(
        {
            ticketId: objectId,
            senderType: { $ne: 'admin' },
            readByAdminAt: null,
        },
        { $set: { readByAdminAt: new Date() } },
    );
    await recalculateTicketState(objectId);
}

export async function markSupportTicketReadForUser(ticketId: string): Promise<void> {
    const objectId = toObjectId(ticketId);
    if (!objectId) return;

    await SupportTicketMessage.updateMany(
        {
            ticketId: objectId,
            senderType: 'admin',
            readByUserAt: null,
        },
        { $set: { readByUserAt: new Date() } },
    );
    await recalculateTicketState(objectId);
}

export async function listSupportTicketsForAdmin(input: SupportTicketListInput): Promise<{
    items: Record<string, unknown>[];
    total: number;
    page: number;
    pages: number;
}> {
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (input.status) filter.status = normalizeStatus(input.status);
    if (input.priority) filter.priority = normalizePriority(input.priority);
    if (input.threadState) filter.threadState = String(input.threadState).trim();
    if (input.planCode) filter['subscriptionSnapshot.planCode'] = String(input.planCode).trim().toLowerCase();
    if (input.assigned === 'assigned') filter.assignedTo = { $ne: null };
    if (input.assigned === 'unassigned') filter.assignedTo = null;
    if (toBoolean(input.unread)) filter.unreadCountForAdmin = { $gt: 0 };

    const search = String(input.search || '').trim();
    if (search) {
        const regex = new RegExp(search, 'i');
        filter.$or = [
            { ticketNo: regex },
            { subject: regex },
            { message: regex },
            { latestMessagePreview: regex },
        ];
    }

    const [tickets, total] = await Promise.all([
        SupportTicket.find(filter)
            .sort({ unreadCountForAdmin: -1, lastMessageAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean<LeanTicket[]>(),
        SupportTicket.countDocuments(filter),
    ]);
    const messagesByTicketId = await getMessagesByTicketIds(uniqueObjectIds(tickets.map((ticket) => ticket._id)));
    const items = await serializeTicketRows(tickets, messagesByTicketId);

    return {
        items,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
    };
}

export async function listSupportTicketsForStudent(studentId: string): Promise<Record<string, unknown>[]> {
    const studentObjectId = toObjectId(studentId);
    if (!studentObjectId) return [];
    const tickets = await SupportTicket.find({ studentId: studentObjectId })
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .lean<LeanTicket[]>();
    const messagesByTicketId = await getMessagesByTicketIds(uniqueObjectIds(tickets.map((ticket) => ticket._id)));
    return serializeTicketRows(tickets, messagesByTicketId);
}

export async function getSupportTicketForAdmin(ticketId: string): Promise<Record<string, unknown> | null> {
    const objectId = toObjectId(ticketId);
    if (!objectId) return null;
    await markSupportTicketReadForAdmin(ticketId);
    const ticket = await SupportTicket.findById(objectId).lean<LeanTicket | null>();
    if (!ticket) return null;
    const messagesByTicketId = await getMessagesByTicketIds([objectId]);
    const items = await serializeTicketRows([ticket], messagesByTicketId);
    return items[0] || null;
}

export async function getSupportTicketForStudent(
    ticketId: string,
    studentId: string,
): Promise<Record<string, unknown> | null> {
    const ticket = await SupportTicket.findOne({ _id: ticketId, studentId }).lean<LeanTicket | null>();
    if (!ticket) return null;
    await markSupportTicketReadForUser(ticketId);
    const messagesByTicketId = await getMessagesByTicketIds([ticket._id]);
    const items = await serializeTicketRows([ticket], messagesByTicketId);
    return items[0] || null;
}
