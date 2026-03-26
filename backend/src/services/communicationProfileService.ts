import mongoose from 'mongoose';

import StudentGroup from '../models/StudentGroup';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import { getCanonicalSubscriptionSnapshot } from './subscriptionAccessService';
import type {
    ContactMessageMatchedBy,
    ContactMessageSourceType,
} from '../models/ContactMessage';

export interface CommunicationProfileSummary {
    userId: string;
    linkedStudentId?: string | null;
    role: string;
    accountStatus: string;
    fullName: string;
    username: string;
    email: string;
    phone: string;
    avatarUrl: string;
    studentProfileId: string;
    subscriptionPlanCode: string;
    subscriptionPlanName: string;
    subscriptionStatus: string;
    supportLevel: string;
    expiresAtUTC: string | null;
    groupNames: string[];
    groups?: string[];
    batchLabel: string;
    batch?: string;
    institutionName: string;
    openProfileRoute: string;
    profileRoute?: string;
    openSubscriptionRoute: string;
    subscriptionRoute?: string;
    openPaymentsRoute: string;
    paymentRoute?: string;
    openCommunicationHistoryRoute: string;
    communicationHistoryRoute?: string;
    subscriptionPlan?: string;
    subscriptionExpiresAt?: string | null;
    formattedContactBundle?: string;
}

export interface NormalizedContactBundle {
    fullName: string;
    email: string;
    phone: string;
    copyText: string;
}

type LeanUser = {
    _id: mongoose.Types.ObjectId;
    role?: string;
    status?: string;
    full_name?: string;
    username?: string;
    email?: string;
    phone_number?: string;
    profile_photo?: string;
    subscription?: Record<string, unknown>;
};

type LeanStudentProfile = {
    _id: mongoose.Types.ObjectId;
    user_id: mongoose.Types.ObjectId;
    full_name?: string;
    username?: string;
    email?: string;
    profile_photo_url?: string;
    phone?: string;
    phone_number?: string;
    groupIds?: mongoose.Types.ObjectId[];
    institution_name?: string;
    ssc_batch?: string;
    hsc_batch?: string;
};

function toObjectId(value: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId | null {
    if (value instanceof mongoose.Types.ObjectId) return value;
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

function uniqueObjectIds(values: Array<string | mongoose.Types.ObjectId>): mongoose.Types.ObjectId[] {
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

function pickFirstNonEmpty(...values: unknown[]): string {
    for (const value of values) {
        const normalized = String(value || '').trim();
        if (normalized) return normalized;
    }
    return '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function normalizeEmail(value: unknown): string {
    return String(value || '').trim().toLowerCase();
}

export function normalizePhone(value: unknown): string {
    return String(value || '').replace(/\D+/g, '');
}

export function buildNormalizedContactBundle(input: {
    fullName?: string;
    email?: string;
    phone?: string;
}): NormalizedContactBundle {
    const fullName = String(input.fullName || '').trim();
    const email = normalizeEmail(input.email);
    const phone = String(input.phone || '').trim();
    const copyText = [
        fullName ? `Name: ${fullName}` : '',
        email ? `Email: ${email}` : '',
        phone ? `Phone: ${phone}` : '',
    ]
        .filter(Boolean)
        .join('\n');

    return {
        fullName,
        email,
        phone,
        copyText,
    };
}

function buildProfileRoute(userId: string, role: string): string {
    if (role === 'student') {
        return `/__cw_admin__/student-management/students/${userId}`;
    }
    return `/__cw_admin__/users?focus=${userId}`;
}

export async function resolveCommunicationProfiles(
    userIdsInput: Array<string | mongoose.Types.ObjectId>,
): Promise<Map<string, CommunicationProfileSummary>> {
    const userIds = uniqueObjectIds(userIdsInput);
    if (userIds.length === 0) {
        return new Map();
    }

    const [users, profiles] = await Promise.all([
        User.find({ _id: { $in: userIds } })
            .select('role status full_name username email phone_number profile_photo subscription')
            .lean<LeanUser[]>(),
        StudentProfile.find({ user_id: { $in: userIds } })
            .select('user_id full_name username email profile_photo_url phone phone_number groupIds institution_name ssc_batch hsc_batch')
            .lean<LeanStudentProfile[]>(),
    ]);

    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const profileMap = new Map(profiles.map((profile) => [String(profile.user_id), profile]));
    const groupIds = uniqueObjectIds(
        profiles.flatMap((profile) => Array.isArray(profile.groupIds) ? profile.groupIds : []),
    );
    const groups = groupIds.length > 0
        ? await StudentGroup.find({ _id: { $in: groupIds } }).select('name batchTag').lean<{ _id: mongoose.Types.ObjectId; name?: string; batchTag?: string }[]>()
        : [];
    const groupMap = new Map(groups.map((group) => [String(group._id), group]));

    const snapshots = await Promise.all(userIds.map(async (userId) => {
        const user = userMap.get(String(userId));
        const snapshot = await getCanonicalSubscriptionSnapshot(String(userId), user?.subscription);
        return [String(userId), snapshot] as const;
    }));
    const snapshotMap = new Map(snapshots);

    const output = new Map<string, CommunicationProfileSummary>();
    for (const userId of userIds) {
        const key = String(userId);
        const user = userMap.get(key);
        if (!user) continue;

        const profile = profileMap.get(key);
        const snapshot = snapshotMap.get(key);
        const plan = asRecord(snapshot?.plan);
        const groupNames = Array.isArray(profile?.groupIds)
            ? profile!.groupIds
                .map((groupId) => groupMap.get(String(groupId)))
                .map((group) => pickFirstNonEmpty(group?.name))
                .filter(Boolean)
            : [];
        const batchLabel = pickFirstNonEmpty(
            profile?.hsc_batch,
            profile?.ssc_batch,
            Array.isArray(profile?.groupIds)
                ? profile!.groupIds
                    .map((groupId) => groupMap.get(String(groupId)))
                    .map((group) => pickFirstNonEmpty(group?.batchTag))
                    .find(Boolean)
                : '',
        );
        const role = String(user.role || '').trim() || 'student';
        const subscriptionStatus = snapshot?.isActive
            ? 'active'
            : (
                snapshot?.reason === 'expired'
                    ? 'expired'
                    : (snapshot?.hasPlanIdentity ? 'inactive' : 'missing')
            );

        output.set(key, {
            userId: key,
            linkedStudentId: role === 'student' ? key : null,
            role,
            accountStatus: String(user.status || '').trim() || 'active',
            fullName: pickFirstNonEmpty(profile?.full_name, user.full_name),
            username: pickFirstNonEmpty(profile?.username, user.username),
            email: normalizeEmail(pickFirstNonEmpty(user.email, profile?.email)),
            phone: pickFirstNonEmpty(profile?.phone_number, profile?.phone, user.phone_number),
            avatarUrl: pickFirstNonEmpty(user.profile_photo, profile?.profile_photo_url),
            studentProfileId: profile ? String(profile._id) : '',
            subscriptionPlanCode: String(snapshot?.planCode || '').trim(),
            subscriptionPlanName: pickFirstNonEmpty(snapshot?.planName, plan?.name),
            subscriptionPlan: pickFirstNonEmpty(snapshot?.planName, plan?.name),
            subscriptionStatus,
            supportLevel: pickFirstNonEmpty(plan?.supportLevel, 'basic'),
            expiresAtUTC: snapshot?.expiresAtUTC ? snapshot.expiresAtUTC.toISOString() : null,
            subscriptionExpiresAt: snapshot?.expiresAtUTC ? snapshot.expiresAtUTC.toISOString() : null,
            groupNames,
            groups: groupNames,
            batchLabel,
            batch: batchLabel,
            institutionName: pickFirstNonEmpty(profile?.institution_name),
            openProfileRoute: buildProfileRoute(key, role),
            profileRoute: buildProfileRoute(key, role),
            openSubscriptionRoute: role === 'student'
                ? `/__cw_admin__/student-management/students/${key}?tab=subscription`
                : '',
            subscriptionRoute: role === 'student'
                ? `/__cw_admin__/student-management/students/${key}?tab=subscription`
                : '',
            openPaymentsRoute: role === 'student'
                ? `/__cw_admin__/student-management/students/${key}?tab=payments`
                : '',
            paymentRoute: role === 'student'
                ? `/__cw_admin__/student-management/students/${key}?tab=payments`
                : '',
            openCommunicationHistoryRoute: role === 'student'
                ? `/__cw_admin__/student-management/students/${key}?tab=crm-timeline`
                : '',
            communicationHistoryRoute: role === 'student'
                ? `/__cw_admin__/student-management/students/${key}?tab=crm-timeline`
                : '',
            formattedContactBundle: buildNormalizedContactBundle({
                fullName: pickFirstNonEmpty(profile?.full_name, user.full_name),
                email: normalizeEmail(pickFirstNonEmpty(user.email, profile?.email)),
                phone: pickFirstNonEmpty(profile?.phone_number, profile?.phone, user.phone_number),
            }).copyText,
        });
    }

    return output;
}

export async function resolveCommunicationProfile(
    userId: string | mongoose.Types.ObjectId | null | undefined,
): Promise<CommunicationProfileSummary | null> {
    if (!userId) return null;
    const profiles = await resolveCommunicationProfiles([userId]);
    return profiles.get(String(userId)) || null;
}

export const buildCommunicationProfileSummary = resolveCommunicationProfile;

function resolveSourceType(role: string, subscriptionActive: boolean): ContactMessageSourceType {
    if (role === 'student' && subscriptionActive) return 'subscriber';
    if (role === 'student') return 'student';
    if (role) return 'user';
    return 'public';
}

async function resolveCandidateUserIdsByEmail(email: string): Promise<string[]> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return [];

    const [users, profiles] = await Promise.all([
        User.find({ email: normalizedEmail }).select('_id').lean<Array<{ _id: mongoose.Types.ObjectId }>>(),
        StudentProfile.find({ email: normalizedEmail }).select('user_id').lean<Array<{ user_id: mongoose.Types.ObjectId }>>(),
    ]);

    return Array.from(new Set([
        ...users.map((user) => String(user._id)),
        ...profiles.map((profile) => String(profile.user_id)),
    ]));
}

async function resolveCandidateUserIdsByPhone(phone: string): Promise<string[]> {
    const normalized = normalizePhone(phone);
    const raw = String(phone || '').trim();
    if (!normalized && !raw) return [];

    const candidates = Array.from(new Set([raw, normalized, normalized ? `+${normalized}` : ''].filter(Boolean)));
    const [users, profiles] = await Promise.all([
        User.find({ phone_number: { $in: candidates } }).select('_id').lean<Array<{ _id: mongoose.Types.ObjectId }>>(),
        StudentProfile.find({
            $or: [
                { phone_number: { $in: candidates } },
                { phone: { $in: candidates } },
            ],
        }).select('user_id').lean<Array<{ user_id: mongoose.Types.ObjectId }>>(),
    ]);

    return Array.from(new Set([
        ...users.map((user) => String(user._id)),
        ...profiles.map((profile) => String(profile.user_id)),
    ]));
}

export async function matchContactToKnownProfile(input: {
    authenticatedUserId?: string | mongoose.Types.ObjectId | null;
    email?: string | null;
    phone?: string | null;
}): Promise<{
    linkedUserId: mongoose.Types.ObjectId | null;
    linkedStudentId: mongoose.Types.ObjectId | null;
    matchedBy: ContactMessageMatchedBy;
    sourceType: ContactMessageSourceType;
    profileSummary: CommunicationProfileSummary | null;
    subscriptionSnapshot: Awaited<ReturnType<typeof getCanonicalSubscriptionSnapshot>> | null;
}> {
    const authenticatedUserId = toObjectId(input.authenticatedUserId || '');
    if (authenticatedUserId) {
        const profileSummary = await resolveCommunicationProfile(authenticatedUserId);
        const user = await User.findById(authenticatedUserId).select('role subscription').lean<LeanUser | null>();
        const snapshot = await getCanonicalSubscriptionSnapshot(String(authenticatedUserId), user?.subscription);
        return {
            linkedUserId: authenticatedUserId,
            linkedStudentId: user?.role === 'student' ? authenticatedUserId : null,
            matchedBy: 'userId',
            sourceType: resolveSourceType(String(user?.role || '').trim(), snapshot.isActive),
            profileSummary,
            subscriptionSnapshot: snapshot,
        };
    }

    const emailCandidates = await resolveCandidateUserIdsByEmail(String(input.email || ''));
    if (emailCandidates.length > 1) {
        return {
            linkedUserId: null,
            linkedStudentId: null,
            matchedBy: 'none',
            sourceType: 'public',
            profileSummary: null,
            subscriptionSnapshot: null,
        };
    }

    const phoneCandidates = await resolveCandidateUserIdsByPhone(String(input.phone || ''));
    if (phoneCandidates.length > 1) {
        return {
            linkedUserId: null,
            linkedStudentId: null,
            matchedBy: 'none',
            sourceType: 'public',
            profileSummary: null,
            subscriptionSnapshot: null,
        };
    }

    const emailMatch = emailCandidates[0] || '';
    const phoneMatch = phoneCandidates[0] || '';
    if (emailMatch && phoneMatch && emailMatch !== phoneMatch) {
        return {
            linkedUserId: null,
            linkedStudentId: null,
            matchedBy: 'none',
            sourceType: 'public',
            profileSummary: null,
            subscriptionSnapshot: null,
        };
    }

    const matchedUserId = emailMatch || phoneMatch;
    if (!matchedUserId) {
        return {
            linkedUserId: null,
            linkedStudentId: null,
            matchedBy: 'none',
            sourceType: 'public',
            profileSummary: null,
            subscriptionSnapshot: null,
        };
    }

    const objectId = toObjectId(matchedUserId);
    const user = await User.findById(objectId).select('role subscription').lean<LeanUser | null>();
    const snapshot = await getCanonicalSubscriptionSnapshot(matchedUserId, user?.subscription);
    const role = String(user?.role || '').trim();

    return {
        linkedUserId: objectId,
        linkedStudentId: role === 'student' ? objectId : null,
        matchedBy: emailMatch ? 'email' : 'phone',
        sourceType: resolveSourceType(role, snapshot.isActive),
        profileSummary: await resolveCommunicationProfile(matchedUserId),
        subscriptionSnapshot: snapshot,
    };
}
