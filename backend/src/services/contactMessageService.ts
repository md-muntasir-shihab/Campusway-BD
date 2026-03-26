import mongoose from 'mongoose';

import ContactMessage, {
    type ContactMessageMatchedBy,
    type ContactMessageSourceType,
    type ContactMessageStatus,
    type IContactMessage,
} from '../models/ContactMessage';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import { addSystemTimelineEvent } from './studentTimelineService';
import { createAdminAlert } from './adminAlertService';
import {
    buildNormalizedContactBundle,
    normalizeEmail,
    normalizePhone,
    resolveCommunicationProfile,
    resolveCommunicationProfiles,
} from './communicationProfileService';
import { getCanonicalSubscriptionSnapshot } from './subscriptionAccessService';

type LeanUser = {
    _id: mongoose.Types.ObjectId;
    role?: string;
    subscription?: Record<string, unknown>;
};

type MatchCandidate = {
    user: LeanUser;
    linkedStudentId: string;
};

export type ContactMessageListFilter = 'all' | 'unread' | 'new' | 'resolved' | 'matched' | 'unmatched';

export interface CreateContactMessageInput {
    actorUserId?: string | null;
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
}

export interface ContactMessageListInput {
    page?: number;
    limit?: number;
    filter?: ContactMessageListFilter;
    search?: string;
}

export interface ContactMessagePatchInput {
    status?: ContactMessageStatus;
    unreadByAdmin?: boolean;
    isRead?: boolean;
    isReplied?: boolean;
}

function previewText(message: string, limit = 160): string {
    const clean = String(message || '').trim().replace(/\s+/g, ' ');
    if (clean.length <= limit) return clean;
    return `${clean.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function toObjectIdString(value: unknown): string {
    return value instanceof mongoose.Types.ObjectId ? String(value) : String(value || '').trim();
}

function clampPage(value: unknown, fallback: number): number {
    const parsed = Number(value || fallback);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(1, Math.floor(parsed));
}

async function loadUserCandidate(userId: string): Promise<MatchCandidate | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const user = await User.findById(userId)
        .select('role subscription')
        .lean<LeanUser | null>();
    if (!user) return null;
    return {
        user,
        linkedStudentId: String(user.role || '').trim() === 'student' ? String(user._id) : '',
    };
}

async function findUniqueCandidateByEmail(email: string): Promise<MatchCandidate | 'ambiguous' | null> {
    if (!email) return null;

    const [users, profiles] = await Promise.all([
        User.find({ email })
            .select('role subscription')
            .lean<LeanUser[]>(),
        StudentProfile.find({ email })
            .select('user_id')
            .lean<Array<{ user_id: mongoose.Types.ObjectId }>>(),
    ]);

    const ids = Array.from(new Set([
        ...users.map((user) => String(user._id)),
        ...profiles.map((profile) => String(profile.user_id)),
    ]));
    if (ids.length === 0) return null;
    if (ids.length > 1) return 'ambiguous';

    const candidate = users.find((user) => String(user._id) === ids[0]) || await User.findById(ids[0])
        .select('role subscription')
        .lean<LeanUser | null>();
    if (!candidate) return null;

    return {
        user: candidate,
        linkedStudentId: (
            String(candidate.role || '').trim() === 'student'
            || profiles.some((profile) => String(profile.user_id) === ids[0])
        ) ? ids[0] : '',
    };
}

async function findUniqueCandidateByPhone(phone: string): Promise<MatchCandidate | 'ambiguous' | null> {
    if (!phone) return null;

    const [users, profiles] = await Promise.all([
        User.find({ phone_number: { $exists: true, $ne: '' } })
            .select('role subscription phone_number')
            .lean<Array<LeanUser & { phone_number?: string }>>(),
        StudentProfile.find({
            $or: [
                { phone_number: { $exists: true, $ne: '' } },
                { phone: { $exists: true, $ne: '' } },
            ],
        })
            .select('user_id phone phone_number')
            .lean<Array<{ user_id: mongoose.Types.ObjectId; phone?: string; phone_number?: string }>>(),
    ]);

    const userMatches = users.filter((user) => normalizePhone(user.phone_number) === phone);
    const profileMatches = profiles.filter((profile) => (
        normalizePhone(profile.phone_number) === phone
        || normalizePhone(profile.phone) === phone
    ));
    const ids = Array.from(new Set([
        ...userMatches.map((user) => String(user._id)),
        ...profileMatches.map((profile) => String(profile.user_id)),
    ]));
    if (ids.length === 0) return null;
    if (ids.length > 1) return 'ambiguous';

    const candidate = userMatches.find((user) => String(user._id) === ids[0]) || await User.findById(ids[0])
        .select('role subscription')
        .lean<LeanUser | null>();
    if (!candidate) return null;

    return {
        user: candidate,
        linkedStudentId: (
            String(candidate.role || '').trim() === 'student'
            || profileMatches.some((profile) => String(profile.user_id) === ids[0])
        ) ? ids[0] : '',
    };
}

async function resolveMatch(input: {
    actorUserId?: string | null;
    normalizedEmail: string;
    normalizedPhone: string;
}): Promise<{
    linkedUserId: string;
    linkedStudentId: string;
    matchedBy: ContactMessageMatchedBy;
    sourceType: ContactMessageSourceType;
}> {
    if (input.actorUserId) {
        const actorCandidate = await loadUserCandidate(input.actorUserId);
        if (actorCandidate) {
            const sourceType = await resolveSourceType(actorCandidate.user);
            return {
                linkedUserId: String(actorCandidate.user._id),
                linkedStudentId: actorCandidate.linkedStudentId,
                matchedBy: 'userId',
                sourceType,
            };
        }
    }

    const [emailCandidate, phoneCandidate] = await Promise.all([
        findUniqueCandidateByEmail(input.normalizedEmail),
        findUniqueCandidateByPhone(input.normalizedPhone),
    ]);
    if (emailCandidate === 'ambiguous' || phoneCandidate === 'ambiguous') {
        return { linkedUserId: '', linkedStudentId: '', matchedBy: 'none', sourceType: 'public' };
    }
    if (emailCandidate && phoneCandidate && String(emailCandidate.user._id) !== String(phoneCandidate.user._id)) {
        return { linkedUserId: '', linkedStudentId: '', matchedBy: 'none', sourceType: 'public' };
    }

    const candidate = emailCandidate || phoneCandidate;
    if (!candidate) {
        return { linkedUserId: '', linkedStudentId: '', matchedBy: 'none', sourceType: 'public' };
    }

    return {
        linkedUserId: String(candidate.user._id),
        linkedStudentId: candidate.linkedStudentId,
        matchedBy: emailCandidate ? 'email' : 'phone',
        sourceType: await resolveSourceType(candidate.user),
    };
}

async function resolveSourceType(user: LeanUser | null): Promise<ContactMessageSourceType> {
    if (!user) return 'public';
    if (String(user.role || '').trim() !== 'student') return 'user';

    const snapshot = await getCanonicalSubscriptionSnapshot(String(user._id), user.subscription);
    return snapshot.isActive ? 'subscriber' : 'student';
}

function applyCanonicalStatus(message: IContactMessage, status: ContactMessageStatus): void {
    message.status = status;
    if (status === 'new') {
        message.unreadByAdmin = true;
        message.adminOpenedAt = null;
        return;
    }

    message.unreadByAdmin = false;
    if (!message.adminOpenedAt) {
        message.adminOpenedAt = new Date();
    }
}

function buildPatchStatus(message: IContactMessage, input: ContactMessagePatchInput): ContactMessageStatus {
    if (input.status) return input.status;
    if (input.unreadByAdmin === true || input.isRead === false) return 'new';
    if (input.isReplied === true) return 'replied';
    if (input.unreadByAdmin === false || input.isRead === true) {
        if (message.status === 'resolved' || message.status === 'archived') {
            return message.status;
        }
        return 'opened';
    }
    if (input.isReplied === false && message.status === 'replied') {
        return message.unreadByAdmin ? 'new' : 'opened';
    }
    return message.status;
}

function buildContactListFilter(input: ContactMessageListInput): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    const mode = String(input.filter || 'all').trim().toLowerCase() as ContactMessageListFilter;
    if (mode === 'unread') filter.unreadByAdmin = true;
    if (mode === 'new') filter.status = 'new';
    if (mode === 'resolved') filter.status = 'resolved';
    if (mode === 'matched') {
        filter.matchedBy = { $ne: 'none' };
    }
    if (mode === 'unmatched') {
        filter.matchedBy = 'none';
    }

    const search = String(input.search || '').trim();
    if (search) {
        const regex = new RegExp(search, 'i');
        filter.$or = [
            { name: regex },
            { email: regex },
            { phone: regex },
            { subject: regex },
            { message: regex },
        ];
    }

    return filter;
}

async function serializeContactMessage(
    input: Record<string, unknown>,
    profileMap?: Map<string, Awaited<ReturnType<typeof resolveCommunicationProfile>>>,
): Promise<Record<string, unknown>> {
    const linkedUserId = toObjectIdString(input.linkedUserId);
    const profileSummary = linkedUserId
        ? (profileMap?.get(linkedUserId) || await resolveCommunicationProfile(linkedUserId))
        : null;

    return {
        _id: String(input._id || ''),
        name: String(input.name || '').trim(),
        email: normalizeEmail(input.email),
        phone: String(input.phone || '').trim(),
        subject: String(input.subject || '').trim(),
        message: String(input.message || '').trim(),
        status: String(input.status || 'new'),
        unreadByAdmin: Boolean(input.unreadByAdmin),
        adminOpenedAt: input.adminOpenedAt || null,
        sourceType: String(input.sourceType || 'public'),
        linkedUserId: linkedUserId || '',
        linkedStudentId: toObjectIdString(input.linkedStudentId),
        matchedBy: String(input.matchedBy || 'none'),
        normalizedEmail: normalizeEmail(input.normalizedEmail || input.email),
        normalizedPhone: normalizePhone(input.normalizedPhone || input.phone),
        metadata: (input.metadata && typeof input.metadata === 'object') ? input.metadata : {},
        isRead: Boolean(input.isRead),
        isReplied: Boolean(input.isReplied),
        createdAt: input.createdAt || null,
        updatedAt: input.updatedAt || null,
        senderProfileSummary: profileSummary,
        contactBundle: buildNormalizedContactBundle({
            fullName: String(profileSummary?.fullName || input.name || ''),
            email: String(profileSummary?.email || input.email || ''),
            phone: String(profileSummary?.phone || input.phone || ''),
        }),
    };
}

export async function createContactMessage(input: CreateContactMessageInput): Promise<Record<string, unknown>> {
    const normalizedEmail = normalizeEmail(input.email);
    const normalizedPhone = normalizePhone(input.phone);
    const match = await resolveMatch({
        actorUserId: input.actorUserId,
        normalizedEmail,
        normalizedPhone,
    });

    const created = await ContactMessage.create({
        name: String(input.name || '').trim(),
        email: normalizedEmail,
        phone: String(input.phone || '').trim(),
        subject: String(input.subject || '').trim(),
        message: String(input.message || '').trim(),
        status: 'new',
        unreadByAdmin: true,
        sourceType: match.sourceType,
        linkedUserId: match.linkedUserId || null,
        linkedStudentId: match.linkedStudentId || null,
        matchedBy: match.matchedBy,
        normalizedEmail,
        normalizedPhone,
        metadata: input.metadata || {},
        ip: String(input.ip || '').trim() || undefined,
        userAgent: String(input.userAgent || '').trim() || undefined,
    });

    await createAdminAlert({
        type: 'contact_new',
        title: 'New contact message',
        message: `${created.subject} from ${created.name}`.trim(),
        messagePreview: previewText(created.message),
        linkUrl: `/__cw_admin__/contact?focus=${String(created._id)}`,
        targetRoute: '/__cw_admin__/contact',
        targetEntityId: String(created._id),
        sourceType: 'contact_message',
        sourceId: String(created._id),
        priority: 'normal',
        actorUserId: match.linkedUserId || undefined,
        actorNameSnapshot: created.name,
        category: 'update',
        targetRole: 'admin',
        dedupeKey: `contact_new:${String(created._id)}`,
    });

    if (match.linkedStudentId) {
        await addSystemTimelineEvent(
            new mongoose.Types.ObjectId(match.linkedStudentId),
            'message',
            `Contact form submitted: ${created.subject}`,
            {
                contactMessageId: String(created._id),
                matchedBy: match.matchedBy,
            },
            created._id,
        );
    }

    return serializeContactMessage(created.toObject() as unknown as Record<string, unknown>);
}

export async function listContactMessages(input: ContactMessageListInput): Promise<{
    messages: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number; pages: number };
    unreadCount: number;
}> {
    const page = clampPage(input.page, 1);
    const limit = Math.min(100, clampPage(input.limit, 20));
    const skip = (page - 1) * limit;
    const filter = buildContactListFilter(input);

    const [rows, total, unreadCount] = await Promise.all([
        ContactMessage.find(filter)
            .sort({ unreadByAdmin: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean<Record<string, unknown>[]>(),
        ContactMessage.countDocuments(filter),
        ContactMessage.countDocuments({ unreadByAdmin: true }),
    ]);

    const linkedUserIds = rows
        .map((row) => toObjectIdString(row.linkedUserId))
        .filter(Boolean);
    const profileMap = await resolveCommunicationProfiles(linkedUserIds);
    const serialized = await Promise.all(rows.map((row) => serializeContactMessage(row, profileMap)));

    return {
        messages: serialized,
        pagination: {
            total,
            page,
            limit,
            pages: Math.max(1, Math.ceil(total / limit)),
        },
        unreadCount,
    };
}

export async function getContactMessageById(
    id: string,
    options: { markOpened?: boolean } = {},
): Promise<Record<string, unknown> | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const message = await ContactMessage.findById(id);
    if (!message) return null;

    if (options.markOpened && message.unreadByAdmin) {
        applyCanonicalStatus(message, message.status === 'new' ? 'opened' : message.status);
        await message.save();
    }

    return serializeContactMessage(message.toObject() as unknown as Record<string, unknown>);
}

export async function patchContactMessage(
    id: string,
    input: ContactMessagePatchInput,
): Promise<Record<string, unknown> | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const message = await ContactMessage.findById(id);
    if (!message) return null;

    applyCanonicalStatus(message, buildPatchStatus(message, input));
    await message.save();
    return serializeContactMessage(message.toObject() as unknown as Record<string, unknown>);
}

export async function markContactMessageRead(id: string): Promise<Record<string, unknown> | null> {
    return patchContactMessage(id, { unreadByAdmin: false, isRead: true });
}

export async function resolveContactMessage(id: string): Promise<Record<string, unknown> | null> {
    return patchContactMessage(id, { status: 'resolved' });
}

export async function archiveContactMessage(id: string): Promise<Record<string, unknown> | null> {
    return patchContactMessage(id, { status: 'archived' });
}

export async function deleteContactMessage(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await ContactMessage.deleteOne({ _id: id });
    return Number(result.deletedCount || 0) > 0;
}
