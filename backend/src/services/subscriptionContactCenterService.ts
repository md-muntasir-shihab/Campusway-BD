import ExcelJS from 'exceljs';
import mongoose from 'mongoose';

import AuditLog from '../models/AuditLog';
import ImportExportLog from '../models/ImportExportLog';
import NotificationSettings from '../models/NotificationSettings';
import StudentDueLedger from '../models/StudentDueLedger';
import StudentGroup from '../models/StudentGroup';
import StudentProfile from '../models/StudentProfile';
import SubscriptionContactPreset from '../models/SubscriptionContactPreset';
import SubscriptionPlan from '../models/SubscriptionPlan';
import User from '../models/User';
import UserSubscription from '../models/UserSubscription';

export type SubscriptionContactBucket =
    | 'active'
    | 'expired'
    | 'renewal_due'
    | 'cancelled_paused'
    | 'pending';

export type SubscriptionContactScope =
    | 'phones'
    | 'emails'
    | 'combined'
    | 'guardian'
    | 'student_guardian'
    | 'raw';

export type SubscriptionContactExportFormat = 'xlsx' | 'csv' | 'txt' | 'json' | 'clipboard';

export interface SubscriptionContactPresetPayload {
    name: string;
    prefix?: string;
    suffix?: string;
    separator?: string;
    includeName?: boolean;
    includeEmail?: boolean;
    includeGuardian?: boolean;
    includePlan?: boolean;
    includeStatus?: boolean;
    isDefault?: boolean;
}

export interface SubscriptionContactFilters {
    planIds?: string[];
    planCodes?: string[];
    bucket?: SubscriptionContactBucket | 'all';
    subscriptionStatuses?: string[];
    accountStatuses?: string[];
    departments?: string[];
    batches?: string[];
    sscBatches?: string[];
    institutionNames?: string[];
    groupIds?: string[];
    search?: string;
    hasPhone?: boolean;
    hasEmail?: boolean;
    hasGuardian?: boolean;
    paymentDue?: boolean;
    renewalThresholdDays?: number;
    profileScoreRange?: { min?: number; max?: number };
    savedAudienceId?: string;
    selectedUserIds?: string[];
}

export interface SubscriptionContactMember {
    subscriptionId: string;
    userId: string;
    fullName: string;
    username: string;
    accountStatus: string;
    email: string;
    phone: string;
    guardianName: string;
    guardianPhone: string;
    guardianEmail: string;
    planId: string;
    planName: string;
    planCode: string;
    subscriptionStatus: string;
    autoRenewEnabled: boolean;
    bucket: SubscriptionContactBucket;
    startAtUTC: string | null;
    expiresAtUTC: string | null;
    daysToExpiry: number | null;
    department: string;
    sscBatch: string;
    hscBatch: string;
    institutionName: string;
    groupNames: string[];
    pendingDue: number;
    paymentDue: boolean;
    profileScore: number;
    lastUpdatedAtUTC: string | null;
    openProfileRoute: string;
}

type SubscriptionContactRow = SubscriptionContactMember & {
    planDisplay: string;
    statusDisplay: string;
};

type LatestSubscriptionLean = {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    planId?: Record<string, unknown> | mongoose.Types.ObjectId | null;
    status?: string;
    autoRenewEnabled?: boolean;
    startAtUTC?: Date | null;
    expiresAtUTC?: Date | null;
    updatedAt?: Date | null;
    createdAt?: Date | null;
};

type LeanUser = {
    _id: mongoose.Types.ObjectId;
    full_name?: string;
    username?: string;
    email?: string;
    phone_number?: string;
    role?: string;
    status?: string;
};

type LeanProfile = {
    user_id: mongoose.Types.ObjectId;
    full_name?: string;
    username?: string;
    email?: string;
    phone?: string;
    phone_number?: string;
    guardian_name?: string;
    guardian_phone?: string;
    guardian_email?: string;
    department?: string;
    ssc_batch?: string;
    hsc_batch?: string;
    institution_name?: string;
    groupIds?: mongoose.Types.ObjectId[];
    profile_completion_percentage?: number;
    points?: number;
};

type LeanGroup = {
    _id: mongoose.Types.ObjectId;
    name?: string;
};

type LeanDue = {
    studentId: mongoose.Types.ObjectId;
    netDue?: number;
};

type ContactCenterContext = {
    members: SubscriptionContactRow[];
    filterOptions: {
        plans: Array<{ id: string; code: string; name: string }>;
        groups: Array<{ id: string; name: string }>;
        departments: string[];
        institutionNames: string[];
        savedAudiences: Array<{ id: string; name: string; memberCountCached: number }>;
    };
    renewalThresholdDays: number;
};

type ExportBuildResult = {
    text?: string;
    previewText?: string;
    rows?: Array<Record<string, string | number>>;
    rowCount: number;
    fileName: string;
    mimeType: string;
    buffer?: Buffer;
};

const CONTACT_CENTER_MODULE = 'subscription_contact_center';
const DEFAULT_RENEWAL_THRESHOLD_DAYS = 7;
const DEFAULT_SEPARATOR = '\n';
const CLIPBOARD_PREVIEW_LIMIT = 20;

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function toObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

function normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return Array.from(
            new Set(value.map((item) => String(item || '').trim()).filter(Boolean)),
        );
    }
    if (typeof value === 'string') {
        return Array.from(
            new Set(
                value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
            ),
        );
    }
    return [];
}

function normalizeBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === null || value === '') return undefined;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return undefined;
}

function normalizeNumber(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
}

function pickFirstString(...values: unknown[]): string {
    for (const value of values) {
        const text = String(value || '').trim();
        if (text) return text;
    }
    return '';
}

function normalizeSeparator(value: unknown): string {
    const text = String(value ?? DEFAULT_SEPARATOR);
    if (!text) return DEFAULT_SEPARATOR;
    if (text === '\\n') return '\n';
    if (text === '\\t') return '\t';
    return text;
}

function sortByLabel<T extends { name: string }>(items: T[]): T[] {
    return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function formatBucket(bucket: SubscriptionContactBucket): string {
    if (bucket === 'renewal_due') return 'Renewal Due';
    if (bucket === 'cancelled_paused') return 'Cancelled / Paused';
    return bucket.charAt(0).toUpperCase() + bucket.slice(1);
}

function computeBucket(status: string, expiresAtUTC: Date | null, renewalThresholdDays: number): SubscriptionContactBucket {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (normalizedStatus === 'suspended') return 'cancelled_paused';
    if (normalizedStatus === 'pending') return 'pending';
    if (normalizedStatus === 'expired') return 'expired';
    if (normalizedStatus !== 'active') return 'expired';
    if (!expiresAtUTC) return 'active';

    const now = Date.now();
    const expiryTime = expiresAtUTC.getTime();
    if (expiryTime <= now) return 'expired';

    const thresholdMs = Math.max(1, renewalThresholdDays) * 24 * 60 * 60 * 1000;
    return expiryTime <= now + thresholdMs ? 'renewal_due' : 'active';
}

function buildProfileRoute(userId: string): string {
    return `/__cw_admin__/student-management/students/${userId}`;
}

function sanitizePreset(input: SubscriptionContactPresetPayload): SubscriptionContactPresetPayload {
    return {
        name: String(input.name || '').trim(),
        prefix: String(input.prefix || '').slice(0, 40),
        suffix: String(input.suffix || '').slice(0, 40),
        separator: normalizeSeparator(input.separator),
        includeName: input.includeName === true,
        includeEmail: input.includeEmail === true,
        includeGuardian: input.includeGuardian === true,
        includePlan: input.includePlan === true,
        includeStatus: input.includeStatus === true,
        isDefault: input.isDefault === true,
    };
}

async function getDefaultRenewalThresholdDays(): Promise<number> {
    const settings = await NotificationSettings.findOne().select('subscriptionReminderDays').lean();
    const days = Array.isArray(settings?.subscriptionReminderDays)
        ? settings.subscriptionReminderDays.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
        : [];
    return days.length > 0 ? days[0] : DEFAULT_RENEWAL_THRESHOLD_DAYS;
}

async function ensureDefaultPreset(): Promise<void> {
    const count = await SubscriptionContactPreset.countDocuments();
    if (count > 0) return;

    await SubscriptionContactPreset.create({
        name: 'Plain Values',
        prefix: '',
        suffix: '',
        separator: DEFAULT_SEPARATOR,
        includeName: false,
        includeEmail: false,
        includeGuardian: false,
        includePlan: false,
        includeStatus: false,
        isDefault: true,
    });
}

function presetToClient(preset: Record<string, unknown>) {
    return {
        _id: String(preset._id || ''),
        name: String(preset.name || ''),
        prefix: String(preset.prefix || ''),
        suffix: String(preset.suffix || ''),
        separator: normalizeSeparator(preset.separator),
        includeName: Boolean(preset.includeName),
        includeEmail: Boolean(preset.includeEmail),
        includeGuardian: Boolean(preset.includeGuardian),
        includePlan: Boolean(preset.includePlan),
        includeStatus: Boolean(preset.includeStatus),
        isDefault: Boolean(preset.isDefault),
        updatedAt: preset.updatedAt ? new Date(String(preset.updatedAt)).toISOString() : null,
    };
}

async function resolvePreset(presetId?: string | null, inlinePreset?: Partial<SubscriptionContactPresetPayload> | null) {
    await ensureDefaultPreset();
    if (presetId && mongoose.Types.ObjectId.isValid(presetId)) {
        const preset = await SubscriptionContactPreset.findById(presetId).lean();
        if (preset) return presetToClient(preset as unknown as Record<string, unknown>);
    }
    if (inlinePreset && Object.keys(inlinePreset).length > 0) {
        return presetToClient(sanitizePreset({
            name: String(inlinePreset.name || 'Adhoc preset'),
            prefix: inlinePreset.prefix,
            suffix: inlinePreset.suffix,
            separator: inlinePreset.separator,
            includeName: inlinePreset.includeName,
            includeEmail: inlinePreset.includeEmail,
            includeGuardian: inlinePreset.includeGuardian,
            includePlan: inlinePreset.includePlan,
            includeStatus: inlinePreset.includeStatus,
            isDefault: false,
        }) as unknown as Record<string, unknown>);
    }
    const preset = await SubscriptionContactPreset.findOne({ isDefault: true }).sort({ updatedAt: -1 }).lean();
    if (preset) return presetToClient(preset as unknown as Record<string, unknown>);
    const fallback = await SubscriptionContactPreset.findOne().sort({ updatedAt: -1 }).lean();
    return presetToClient(fallback as unknown as Record<string, unknown>);
}

async function loadSavedAudienceRules(savedAudienceId?: string): Promise<Record<string, unknown>> {
    const objectId = toObjectId(savedAudienceId);
    if (!objectId) return {};
    const audience = await StudentGroup.findOne({ _id: objectId, type: 'dynamic' }).select('rules').lean();
    return asRecord(audience?.rules) || {};
}

function mergeFilters(baseRules: Record<string, unknown>, input: Record<string, unknown>): SubscriptionContactFilters {
    const profileScoreRangeSource = asRecord(input.profileScoreRange) || asRecord(baseRules.profileScoreRange);
    const planIds = normalizeStringArray(input.planIds).length > 0 ? normalizeStringArray(input.planIds) : normalizeStringArray(baseRules.planIds);
    const planCodes = normalizeStringArray(input.planCodes).length > 0 ? normalizeStringArray(input.planCodes) : normalizeStringArray(baseRules.planCodes);
    const groupIds = normalizeStringArray(input.groupIds).length > 0 ? normalizeStringArray(input.groupIds) : normalizeStringArray(baseRules.groupIds);
    const departments = normalizeStringArray(input.departments).length > 0 ? normalizeStringArray(input.departments) : normalizeStringArray(baseRules.departments);
    const batches = normalizeStringArray(input.batches).length > 0 ? normalizeStringArray(input.batches) : normalizeStringArray(baseRules.batches);
    const sscBatches = normalizeStringArray(input.sscBatches).length > 0 ? normalizeStringArray(input.sscBatches) : normalizeStringArray(baseRules.sscBatches);
    const institutionNames = normalizeStringArray(input.institutionNames).length > 0 ? normalizeStringArray(input.institutionNames) : normalizeStringArray(baseRules.institutionNames);
    const subscriptionStatuses = normalizeStringArray(input.subscriptionStatuses).length > 0
        ? normalizeStringArray(input.subscriptionStatuses)
        : normalizeStringArray(baseRules.subscriptionStatuses);
    const accountStatuses = normalizeStringArray(input.accountStatuses).length > 0
        ? normalizeStringArray(input.accountStatuses)
        : normalizeStringArray(baseRules.statuses);
    const bucket = String(input.bucket || baseRules.bucket || '').trim().toLowerCase() || 'all';

    return {
        planIds,
        planCodes,
        batches,
        sscBatches,
        institutionNames,
        groupIds,
        departments,
        bucket: ['active', 'expired', 'renewal_due', 'cancelled_paused', 'pending', 'all'].includes(bucket)
            ? bucket as SubscriptionContactFilters['bucket']
            : 'all',
        subscriptionStatuses,
        accountStatuses,
        search: pickFirstString(input.search),
        hasPhone: normalizeBoolean(input.hasPhone) ?? normalizeBoolean(baseRules.hasPhone),
        hasEmail: normalizeBoolean(input.hasEmail) ?? normalizeBoolean(baseRules.hasEmail),
        hasGuardian: normalizeBoolean(input.hasGuardian) ?? normalizeBoolean(baseRules.hasGuardian),
        paymentDue: normalizeBoolean(input.paymentDue) ?? normalizeBoolean(baseRules.paymentDue),
        renewalThresholdDays: normalizeNumber(input.renewalThresholdDays) ?? normalizeNumber(baseRules.renewalThresholdDays),
        profileScoreRange: profileScoreRangeSource
            ? {
                min: normalizeNumber(profileScoreRangeSource.min),
                max: normalizeNumber(profileScoreRangeSource.max),
            }
            : undefined,
        savedAudienceId: pickFirstString(input.savedAudienceId),
        selectedUserIds: normalizeStringArray(input.selectedUserIds),
    };
}

async function normalizeFilters(input: Record<string, unknown> = {}): Promise<SubscriptionContactFilters> {
    const savedRules = await loadSavedAudienceRules(pickFirstString(input.savedAudienceId));
    return mergeFilters(savedRules, input);
}

async function getLatestSubscriptions(): Promise<LatestSubscriptionLean[]> {
    const refs = await UserSubscription.aggregate<{ latestId: mongoose.Types.ObjectId }>([
        { $sort: { userId: 1, updatedAt: -1, createdAt: -1 } },
        { $group: { _id: '$userId', latestId: { $first: '$_id' } } },
    ]);
    const latestIds = refs.map((row) => row.latestId).filter(Boolean);
    if (latestIds.length === 0) return [];

    return UserSubscription.find({ _id: { $in: latestIds } })
        .populate('planId', 'name code priceBDT supportLevel allowsGuardianAlerts')
        .select('userId planId status autoRenewEnabled startAtUTC expiresAtUTC updatedAt createdAt')
        .lean<LatestSubscriptionLean[]>();
}

async function buildContext(input: Record<string, unknown> = {}): Promise<ContactCenterContext> {
    const filters = await normalizeFilters(input);
    const renewalThresholdDays = filters.renewalThresholdDays || await getDefaultRenewalThresholdDays();
    const latestSubscriptions = await getLatestSubscriptions();
    const userIds = latestSubscriptions
        .map((subscription) => subscription.userId)
        .filter(Boolean);

    const savedAudiencesRaw = await StudentGroup.find({ type: 'dynamic', isActive: true })
        .select('name memberCountCached')
        .sort({ updatedAt: -1 })
        .lean();

    if (userIds.length === 0) {
        return {
            members: [],
            filterOptions: {
                plans: [],
                groups: [],
                departments: [],
                institutionNames: [],
                savedAudiences: savedAudiencesRaw.map((audience) => ({
                    id: String(audience._id),
                    name: String(audience.name || ''),
                    memberCountCached: Number(audience.memberCountCached || 0),
                })),
            },
            renewalThresholdDays,
        };
    }

    const [users, profiles, dueRows] = await Promise.all([
        User.find({ _id: { $in: userIds }, role: 'student' })
            .select('full_name username email phone_number role status')
            .lean<LeanUser[]>(),
        StudentProfile.find({ user_id: { $in: userIds } })
            .select('user_id full_name username email phone phone_number guardian_name guardian_phone guardian_email department ssc_batch hsc_batch institution_name groupIds profile_completion_percentage points')
            .lean<LeanProfile[]>(),
        StudentDueLedger.find({ studentId: { $in: userIds } })
            .select('studentId netDue')
            .lean<LeanDue[]>(),
    ]);

    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const profileMap = new Map(profiles.map((profile) => [String(profile.user_id), profile]));
    const dueMap = new Map(dueRows.map((row) => [String(row.studentId), Number(row.netDue || 0)]));
    const groupIds = Array.from(
        new Set(
            profiles
                .flatMap((profile) => Array.isArray(profile.groupIds) ? profile.groupIds.map((groupId) => String(groupId)) : []),
        ),
    )
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));
    const groups = groupIds.length > 0
        ? await StudentGroup.find({ _id: { $in: groupIds } }).select('name').lean<LeanGroup[]>()
        : [];
    const groupMap = new Map(groups.map((group) => [String(group._id), String(group.name || '')]));

    const members: SubscriptionContactRow[] = latestSubscriptions
        .map((subscription) => {
            const userId = String(subscription.userId || '');
            const user = userMap.get(userId);
            if (!user) return null;

            const profile = profileMap.get(userId);
            const plan = asRecord(subscription.planId) || {};
            const planId = pickFirstString(plan._id, subscription.planId);
            const planCode = String(plan.code || '').trim().toLowerCase();
            const planName = pickFirstString(plan.name, planCode, 'Unassigned plan');
            const expiresAtUTC = subscription.expiresAtUTC ? new Date(subscription.expiresAtUTC) : null;
            const bucket = computeBucket(String(subscription.status || ''), expiresAtUTC, renewalThresholdDays);
            const daysToExpiry = expiresAtUTC
                ? Math.ceil((expiresAtUTC.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                : null;
            const groupNames = Array.isArray(profile?.groupIds)
                ? profile.groupIds
                    .map((groupId) => groupMap.get(String(groupId)) || '')
                    .filter(Boolean)
                : [];
            const profileScore = Number(
                profile?.profile_completion_percentage
                ?? profile?.points
                ?? 0,
            );

            const member: SubscriptionContactRow = {
                subscriptionId: String(subscription._id || ''),
                userId,
                fullName: pickFirstString(profile?.full_name, user.full_name, 'Student'),
                username: pickFirstString(profile?.username, user.username),
                accountStatus: pickFirstString(user.status, 'active'),
                email: pickFirstString(profile?.email, user.email).toLowerCase(),
                phone: pickFirstString(profile?.phone_number, profile?.phone, user.phone_number),
                guardianName: pickFirstString(profile?.guardian_name),
                guardianPhone: pickFirstString(profile?.guardian_phone),
                guardianEmail: pickFirstString(profile?.guardian_email).toLowerCase(),
                planId,
                planName,
                planCode,
                subscriptionStatus: String(subscription.status || '').trim().toLowerCase() || 'expired',
                autoRenewEnabled: Boolean(subscription.autoRenewEnabled),
                bucket,
                startAtUTC: subscription.startAtUTC ? new Date(subscription.startAtUTC).toISOString() : null,
                expiresAtUTC: expiresAtUTC ? expiresAtUTC.toISOString() : null,
                daysToExpiry,
                department: pickFirstString(profile?.department),
                sscBatch: pickFirstString(profile?.ssc_batch),
                hscBatch: pickFirstString(profile?.hsc_batch),
                institutionName: pickFirstString(profile?.institution_name),
                groupNames,
                pendingDue: Number(dueMap.get(userId) || 0),
                paymentDue: Number(dueMap.get(userId) || 0) > 0,
                profileScore,
                lastUpdatedAtUTC: subscription.updatedAt ? new Date(subscription.updatedAt).toISOString() : (subscription.createdAt ? new Date(subscription.createdAt).toISOString() : null),
                openProfileRoute: buildProfileRoute(userId),
                planDisplay: planName,
                statusDisplay: formatBucket(bucket),
            };

            return member;
        })
        .filter((member): member is SubscriptionContactRow => Boolean(member));

    const filteredMembers = members.filter((member) => {
        if (filters.planIds && filters.planIds.length > 0 && !filters.planIds.includes(member.planId)) return false;
        if (filters.planCodes && filters.planCodes.length > 0 && !filters.planCodes.map((item) => item.toLowerCase()).includes(member.planCode.toLowerCase())) return false;
        if (filters.bucket && filters.bucket !== 'all' && member.bucket !== filters.bucket) return false;
        if (filters.subscriptionStatuses && filters.subscriptionStatuses.length > 0 && !filters.subscriptionStatuses.includes(member.subscriptionStatus)) return false;
        if (filters.accountStatuses && filters.accountStatuses.length > 0 && !filters.accountStatuses.includes(member.accountStatus)) return false;
        if (filters.departments && filters.departments.length > 0 && !filters.departments.includes(member.department)) return false;
        if (filters.batches && filters.batches.length > 0 && !filters.batches.includes(member.hscBatch)) return false;
        if (filters.sscBatches && filters.sscBatches.length > 0 && !filters.sscBatches.includes(member.sscBatch)) return false;
        if (filters.institutionNames && filters.institutionNames.length > 0 && !filters.institutionNames.includes(member.institutionName)) return false;
        if (filters.groupIds && filters.groupIds.length > 0) {
            const groupIdSet = new Set(filters.groupIds);
            const profile = profileMap.get(member.userId);
            const belongs = (profile?.groupIds || []).some((groupId) => groupIdSet.has(String(groupId)));
            if (!belongs) return false;
        }
        if (filters.hasPhone === true && !member.phone) return false;
        if (filters.hasEmail === true && !member.email) return false;
        if (filters.hasGuardian === true && !member.guardianPhone && !member.guardianEmail) return false;
        if (filters.paymentDue === true && !member.paymentDue) return false;
        if (filters.profileScoreRange?.min !== undefined && member.profileScore < filters.profileScoreRange.min) return false;
        if (filters.profileScoreRange?.max !== undefined && member.profileScore > filters.profileScoreRange.max) return false;
        if (filters.search) {
            const term = filters.search.toLowerCase();
            const haystack = [
                member.fullName,
                member.email,
                member.phone,
                member.guardianPhone,
                member.guardianEmail,
                member.planName,
                member.planCode,
            ]
                .join(' ')
                .toLowerCase();
            if (!haystack.includes(term)) return false;
        }
        return true;
    });

    filteredMembers.sort((left, right) => {
        const bucketOrder: Record<SubscriptionContactBucket, number> = {
            renewal_due: 0,
            active: 1,
            expired: 2,
            cancelled_paused: 3,
            pending: 4,
        };
        if (bucketOrder[left.bucket] !== bucketOrder[right.bucket]) {
            return bucketOrder[left.bucket] - bucketOrder[right.bucket];
        }
        if ((left.daysToExpiry ?? 999999) !== (right.daysToExpiry ?? 999999)) {
            return (left.daysToExpiry ?? 999999) - (right.daysToExpiry ?? 999999);
        }
        return left.fullName.localeCompare(right.fullName);
    });

    return {
        members: filteredMembers,
        filterOptions: {
            plans: sortByLabel(
                Array.from(
                    new Map(
                        members
                            .filter((member) => member.planId || member.planCode || member.planName)
                            .map((member) => [
                                member.planId || member.planCode || member.planName,
                                { id: member.planId, code: member.planCode, name: member.planName },
                            ]),
                    ).values(),
                ),
            ),
            groups: sortByLabel(
                Array.from(
                    new Map(
                        groups.map((group) => [String(group._id), { id: String(group._id), name: String(group.name || '') }]),
                    ).values(),
                ),
            ),
            departments: Array.from(new Set(members.map((member) => member.department).filter(Boolean))).sort(),
            institutionNames: Array.from(new Set(members.map((member) => member.institutionName).filter(Boolean))).sort(),
            savedAudiences: savedAudiencesRaw.map((audience) => ({
                id: String(audience._id),
                name: String(audience.name || ''),
                memberCountCached: Number(audience.memberCountCached || 0),
            })),
        },
        renewalThresholdDays,
    };
}

function applySelection(rows: SubscriptionContactRow[], selectedUserIds?: string[]): SubscriptionContactRow[] {
    if (!selectedUserIds || selectedUserIds.length === 0) return rows;
    const selected = new Set(selectedUserIds);
    return rows.filter((row) => selected.has(row.userId));
}

function formatContactValue(value: string, preset: Record<string, unknown>) {
    const prefix = String(preset.prefix || '');
    const suffix = String(preset.suffix || '');
    return `${prefix}${value}${suffix}`;
}

function composeLine(member: SubscriptionContactRow, scope: SubscriptionContactScope, preset: Record<string, unknown>) {
    const includeName = Boolean(preset.includeName);
    const includeEmail = Boolean(preset.includeEmail);
    const includeGuardian = Boolean(preset.includeGuardian);
    const includePlan = Boolean(preset.includePlan);
    const includeStatus = Boolean(preset.includeStatus);
    const parts: string[] = [];

    if (includePlan && member.planName) parts.push(`[${member.planName}]`);
    if (includeStatus) parts.push(member.statusDisplay);
    if (includeName && member.fullName) parts.push(member.fullName);

    if (scope === 'phones') {
        if (!member.phone) return null;
        parts.push(formatContactValue(member.phone, preset));
        if (includeEmail && member.email) parts.push(member.email);
        if (includeGuardian && member.guardianPhone) parts.push(`Guardian: ${member.guardianPhone}`);
        return parts.join(' | ');
    }

    if (scope === 'emails') {
        if (!member.email) return null;
        parts.push(formatContactValue(member.email, preset));
        if (includeGuardian && member.guardianEmail) parts.push(`Guardian: ${member.guardianEmail}`);
        return parts.join(' | ');
    }

    if (scope === 'guardian') {
        const guardianValue = pickFirstString(member.guardianPhone, member.guardianEmail);
        if (!guardianValue) return null;
        parts.push(formatContactValue(guardianValue, preset));
        if (member.guardianName) parts.push(`Guardian name: ${member.guardianName}`);
        if (includeEmail && member.email) parts.push(`Student email: ${member.email}`);
        return parts.join(' | ');
    }

    if (scope === 'combined') {
        if (!member.phone && !member.email) return null;
        if (member.phone) parts.push(`Phone: ${formatContactValue(member.phone, preset)}`);
        if (member.email) parts.push(`Email: ${member.email}`);
        if (includeGuardian && (member.guardianPhone || member.guardianEmail)) {
            parts.push(`Guardian: ${pickFirstString(member.guardianPhone, member.guardianEmail)}`);
        }
        return parts.join(' | ');
    }

    if (scope === 'student_guardian') {
        const hasAnyContact = member.phone || member.email || member.guardianPhone || member.guardianEmail;
        if (!hasAnyContact) return null;
        if (member.phone) parts.push(`Phone: ${formatContactValue(member.phone, preset)}`);
        if (member.email) parts.push(`Email: ${member.email}`);
        if (member.guardianPhone) parts.push(`Guardian phone: ${member.guardianPhone}`);
        if (member.guardianEmail) parts.push(`Guardian email: ${member.guardianEmail}`);
        return parts.join(' | ');
    }

    return [
        member.fullName,
        member.phone,
        member.email,
        member.guardianPhone,
        member.planName,
        member.statusDisplay,
    ].filter(Boolean).join(' | ');
}

function buildStructuredRows(
    rows: SubscriptionContactRow[],
    scope: SubscriptionContactScope,
    preset: Record<string, unknown>,
): Array<Record<string, string | number>> {
    const includePlan = Boolean(preset.includePlan);
    const includeStatus = Boolean(preset.includeStatus);
    const structuredRows: Array<Record<string, string | number>> = [];

    rows.forEach((member) => {
        if (scope === 'phones') {
            if (!member.phone) return;
            structuredRows.push({
                ...(Boolean(preset.includeName) ? { studentName: member.fullName } : {}),
                phone: formatContactValue(member.phone, preset),
                ...(Boolean(preset.includeEmail) && member.email ? { email: member.email } : {}),
                ...(includePlan ? { planName: member.planName } : {}),
                ...(includeStatus ? { status: member.statusDisplay } : {}),
            });
            return;
        }
        if (scope === 'emails') {
            if (!member.email) return;
            structuredRows.push({
                ...(Boolean(preset.includeName) ? { studentName: member.fullName } : {}),
                email: formatContactValue(member.email, preset),
                ...(includePlan ? { planName: member.planName } : {}),
                ...(includeStatus ? { status: member.statusDisplay } : {}),
            });
            return;
        }
        if (scope === 'guardian') {
            if (!member.guardianPhone && !member.guardianEmail) return;
            structuredRows.push({
                studentName: member.fullName,
                guardianName: member.guardianName,
                guardianPhone: member.guardianPhone,
                guardianEmail: member.guardianEmail,
                ...(includePlan ? { planName: member.planName } : {}),
                ...(includeStatus ? { status: member.statusDisplay } : {}),
            });
            return;
        }
        if (scope === 'combined') {
            if (!member.phone && !member.email) return;
            structuredRows.push({
                studentName: member.fullName,
                phone: member.phone,
                email: member.email,
                ...(Boolean(preset.includeGuardian) ? {
                    guardianPhone: member.guardianPhone,
                    guardianEmail: member.guardianEmail,
                } : {}),
                ...(includePlan ? { planName: member.planName } : {}),
                ...(includeStatus ? { status: member.statusDisplay } : {}),
            });
            return;
        }
        if (scope === 'student_guardian') {
            structuredRows.push({
                studentName: member.fullName,
                phone: member.phone,
                email: member.email,
                guardianName: member.guardianName,
                guardianPhone: member.guardianPhone,
                guardianEmail: member.guardianEmail,
                ...(includePlan ? { planName: member.planName } : {}),
                ...(includeStatus ? { status: member.statusDisplay } : {}),
            });
            return;
        }
        structuredRows.push({
            studentName: member.fullName,
            username: member.username,
            phone: member.phone,
            email: member.email,
            guardianName: member.guardianName,
            guardianPhone: member.guardianPhone,
            guardianEmail: member.guardianEmail,
            planName: member.planName,
            planCode: member.planCode,
            status: member.statusDisplay,
            expiresAtUTC: member.expiresAtUTC || '',
            department: member.department,
            hscBatch: member.hscBatch,
            institutionName: member.institutionName,
            pendingDue: member.pendingDue,
            profileScore: member.profileScore,
        });
    });

    return structuredRows;
}

function toCSV(rows: Array<Record<string, string | number>>): Buffer {
    if (rows.length === 0) return Buffer.from('', 'utf-8');
    const headers = Object.keys(rows[0]);
    const lines = rows.map((row) =>
        headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','),
    );
    return Buffer.from([headers.join(','), ...lines].join('\n'), 'utf-8');
}

async function toXLSX(sheetName: string, rows: Array<Record<string, string | number>>): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);
    const headers = rows[0] ? Object.keys(rows[0]) : ['value'];
    sheet.columns = headers.map((header) => ({ header, key: header, width: 22 }));
    if (rows.length > 0) {
        rows.forEach((row) => sheet.addRow(row));
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function createExportLog(params: {
    adminId: string;
    category: 'phone_list' | 'email_list' | 'guardians' | 'manual_send_list' | 'other';
    format: SubscriptionContactExportFormat;
    totalRows: number;
    filters: Record<string, unknown>;
    fileName?: string;
    notes: string;
}) {
    await ImportExportLog.create({
        direction: 'export',
        category: params.category,
        format: params.format,
        performedBy: new mongoose.Types.ObjectId(params.adminId),
        totalRows: params.totalRows,
        successRows: params.totalRows,
        failedRows: 0,
        filters: params.filters,
        fileName: params.fileName,
        notes: params.notes,
    });
}

async function createAuditEntry(params: {
    adminId: string;
    actorRole?: string;
    action: string;
    status?: 'success' | 'warning' | 'failed' | 'pending';
    details?: Record<string, unknown> | string;
}) {
    if (!mongoose.Types.ObjectId.isValid(params.adminId)) return;
    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(params.adminId),
        actor_role: params.actorRole || '',
        action: params.action,
        module: CONTACT_CENTER_MODULE,
        status: params.status || 'success',
        details: params.details || {},
    });
}

function mapScopeToCategory(scope: SubscriptionContactScope): 'phone_list' | 'email_list' | 'guardians' | 'manual_send_list' | 'other' {
    if (scope === 'phones') return 'phone_list';
    if (scope === 'emails') return 'email_list';
    if (scope === 'guardian') return 'guardians';
    if (scope === 'combined' || scope === 'student_guardian') return 'manual_send_list';
    return 'other';
}

async function buildExportResult(params: {
    filters: Record<string, unknown>;
    scope: SubscriptionContactScope;
    format: SubscriptionContactExportFormat;
    presetId?: string | null;
    preset?: Partial<SubscriptionContactPresetPayload> | null;
    adminId: string;
    actorRole?: string;
    auditAction: 'copy_preview' | 'export' | 'personal_outreach';
}) : Promise<ExportBuildResult> {
    const context = await buildContext(params.filters);
    const filteredRows = applySelection(context.members, normalizeStringArray(params.filters.selectedUserIds));
    const preset = await resolvePreset(params.presetId, params.preset);
    const structuredRows = buildStructuredRows(filteredRows, params.scope, preset as Record<string, unknown>);
    const separator = normalizeSeparator(preset.separator);
    const lines = filteredRows
        .map((member) => composeLine(member, params.scope, preset as Record<string, unknown>))
        .filter((line): line is string => Boolean(line));
    const dedupedLines = Array.from(new Set(lines));

    const fileStem = `subscription_contact_center_${params.scope}`;
    const fileName = `${fileStem}.${params.format === 'clipboard' ? 'txt' : params.format}`;
    const notes = `${CONTACT_CENTER_MODULE}:${params.auditAction}:${params.scope}`;
    const rowCount = params.scope === 'phones' || params.scope === 'emails' || params.scope === 'guardian'
        ? dedupedLines.length
        : structuredRows.length;

    await createExportLog({
        adminId: params.adminId,
        category: mapScopeToCategory(params.scope),
        format: params.format,
        totalRows: rowCount,
        filters: params.filters,
        fileName,
        notes,
    });
    await createAuditEntry({
        adminId: params.adminId,
        actorRole: params.actorRole,
        action: notes,
        details: {
            scope: params.scope,
            format: params.format,
            rowCount,
            presetId: params.presetId || null,
        },
    });

    if (params.format === 'clipboard' || params.format === 'txt') {
        const text = dedupedLines.join(separator) || structuredRows.map((row) => Object.values(row).join(' | ')).join('\n');
        const previewText = text.split(/\r?\n/).slice(0, CLIPBOARD_PREVIEW_LIMIT).join('\n');
        return {
            text,
            previewText,
            rowCount,
            fileName,
            mimeType: 'text/plain',
        };
    }

    if (params.format === 'json') {
        return {
            rows: structuredRows,
            rowCount: structuredRows.length,
            fileName,
            mimeType: 'application/json',
        };
    }

    const buffer = params.format === 'csv'
        ? toCSV(structuredRows)
        : await toXLSX('Subscription Contact Center', structuredRows);
    return {
        buffer,
        rowCount: structuredRows.length,
        fileName,
        mimeType: params.format === 'csv'
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
}

export async function resolveSubscriptionContactUserIds(filtersInput: Record<string, unknown> = {}): Promise<mongoose.Types.ObjectId[]> {
    const context = await buildContext(filtersInput);
    const selectedMembers = applySelection(context.members, normalizeStringArray(filtersInput.selectedUserIds));
    return selectedMembers
        .map((member) => toObjectId(member.userId))
        .filter((member): member is mongoose.Types.ObjectId => Boolean(member));
}

export async function getSubscriptionContactCenterOverview(filtersInput: Record<string, unknown> = {}) {
    const context = await buildContext(filtersInput);
    const grouped = new Map<string, {
        planId: string;
        planName: string;
        planCode: string;
        totalMembers: number;
        activeCount: number;
        expiredCount: number;
        renewalDueCount: number;
        cancelledCount: number;
        phoneReadyCount: number;
        emailReadyCount: number;
        lastUpdatedAtUTC: string | null;
    }>();

    for (const member of context.members) {
        const key = member.planId || member.planCode || member.planName;
        if (!grouped.has(key)) {
            grouped.set(key, {
                planId: member.planId,
                planName: member.planName,
                planCode: member.planCode,
                totalMembers: 0,
                activeCount: 0,
                expiredCount: 0,
                renewalDueCount: 0,
                cancelledCount: 0,
                phoneReadyCount: 0,
                emailReadyCount: 0,
                lastUpdatedAtUTC: member.lastUpdatedAtUTC,
            });
        }
        const bucket = grouped.get(key)!;
        bucket.totalMembers += 1;
        if (member.bucket === 'active') bucket.activeCount += 1;
        if (member.bucket === 'expired') bucket.expiredCount += 1;
        if (member.bucket === 'renewal_due') bucket.renewalDueCount += 1;
        if (member.bucket === 'cancelled_paused') bucket.cancelledCount += 1;
        if (member.phone) bucket.phoneReadyCount += 1;
        if (member.email) bucket.emailReadyCount += 1;
        if ((member.lastUpdatedAtUTC || '') > (bucket.lastUpdatedAtUTC || '')) {
            bucket.lastUpdatedAtUTC = member.lastUpdatedAtUTC;
        }
    }

    const summary = {
        totalMembers: context.members.length,
        activeCount: context.members.filter((member) => member.bucket === 'active').length,
        expiredCount: context.members.filter((member) => member.bucket === 'expired').length,
        renewalDueCount: context.members.filter((member) => member.bucket === 'renewal_due').length,
        cancelledCount: context.members.filter((member) => member.bucket === 'cancelled_paused').length,
        phoneReadyCount: context.members.filter((member) => Boolean(member.phone)).length,
        emailReadyCount: context.members.filter((member) => Boolean(member.email)).length,
    };

    return {
        summary,
        plans: Array.from(grouped.values()).sort((left, right) => right.totalMembers - left.totalMembers || left.planName.localeCompare(right.planName)),
        filterOptions: context.filterOptions,
        renewalThresholdDays: context.renewalThresholdDays,
        thresholdOptions: [3, 7, 15, 30],
    };
}

export async function getSubscriptionContactCenterMembers(input: {
    filters?: Record<string, unknown>;
    page?: number;
    limit?: number;
    includeGuardianData?: boolean;
}) {
    const context = await buildContext(input.filters || {});
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.min(200, Math.max(1, Number(input.limit || 25)));
    const start = (page - 1) * limit;
    const items = context.members.slice(start, start + limit).map((member) => ({
        ...member,
        guardianName: input.includeGuardianData === false ? '' : member.guardianName,
        guardianPhone: input.includeGuardianData === false ? '' : member.guardianPhone,
        guardianEmail: input.includeGuardianData === false ? '' : member.guardianEmail,
    }));

    return {
        items,
        total: context.members.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(context.members.length / limit)),
        summary: {
            totalMembers: context.members.length,
            selectedFilterBucket: String((input.filters || {}).bucket || 'all'),
            phoneReadyCount: context.members.filter((member) => Boolean(member.phone)).length,
            emailReadyCount: context.members.filter((member) => Boolean(member.email)).length,
        },
        filterOptions: context.filterOptions,
        renewalThresholdDays: context.renewalThresholdDays,
        thresholdOptions: [3, 7, 15, 30],
    };
}

export async function previewSubscriptionContactCopy(input: {
    filters?: Record<string, unknown>;
    scope: SubscriptionContactScope;
    presetId?: string | null;
    preset?: Partial<SubscriptionContactPresetPayload> | null;
    adminId: string;
    actorRole?: string;
    mode?: 'copy_preview' | 'personal_outreach';
}) {
    const result = await buildExportResult({
        filters: input.filters || {},
        scope: input.scope,
        format: 'clipboard',
        presetId: input.presetId,
        preset: input.preset,
        adminId: input.adminId,
        actorRole: input.actorRole,
        auditAction: input.mode === 'personal_outreach' ? 'personal_outreach' : 'copy_preview',
    });
    return {
        text: result.text || '',
        previewText: result.previewText || '',
        rowCount: result.rowCount,
        fileName: result.fileName,
    };
}

export async function exportSubscriptionContactData(input: {
    filters?: Record<string, unknown>;
    scope: SubscriptionContactScope;
    format: SubscriptionContactExportFormat;
    presetId?: string | null;
    preset?: Partial<SubscriptionContactPresetPayload> | null;
    adminId: string;
    actorRole?: string;
}) {
    return buildExportResult({
        filters: input.filters || {},
        scope: input.scope,
        format: input.format,
        presetId: input.presetId,
        preset: input.preset,
        adminId: input.adminId,
        actorRole: input.actorRole,
        auditAction: 'export',
    });
}

export async function listSubscriptionContactPresets() {
    await ensureDefaultPreset();
    const presets = await SubscriptionContactPreset.find()
        .sort({ isDefault: -1, updatedAt: -1, name: 1 })
        .lean();
    return presets.map((preset) => presetToClient(preset as unknown as Record<string, unknown>));
}

export async function createSubscriptionContactPreset(input: {
    payload: SubscriptionContactPresetPayload;
    adminId: string;
    actorRole?: string;
}) {
    await ensureDefaultPreset();
    const payload = sanitizePreset(input.payload);
    if (!payload.name) {
        throw new Error('Preset name is required');
    }
    if (payload.isDefault) {
        await SubscriptionContactPreset.updateMany({}, { $set: { isDefault: false } });
    }
    const preset = await SubscriptionContactPreset.create({
        ...payload,
        createdByAdminId: new mongoose.Types.ObjectId(input.adminId),
        updatedByAdminId: new mongoose.Types.ObjectId(input.adminId),
    });
    await createAuditEntry({
        adminId: input.adminId,
        actorRole: input.actorRole,
        action: 'preset_created',
        details: { presetId: String(preset._id), name: payload.name },
    });
    return presetToClient(preset.toObject() as unknown as Record<string, unknown>);
}

export async function updateSubscriptionContactPreset(input: {
    presetId: string;
    payload: Partial<SubscriptionContactPresetPayload>;
    adminId: string;
    actorRole?: string;
}) {
    const preset = await SubscriptionContactPreset.findById(input.presetId);
    if (!preset) {
        throw new Error('Preset not found');
    }
    const merged = sanitizePreset({
        name: input.payload.name ?? preset.name,
        prefix: input.payload.prefix ?? preset.prefix,
        suffix: input.payload.suffix ?? preset.suffix,
        separator: input.payload.separator ?? preset.separator,
        includeName: input.payload.includeName ?? preset.includeName,
        includeEmail: input.payload.includeEmail ?? preset.includeEmail,
        includeGuardian: input.payload.includeGuardian ?? preset.includeGuardian,
        includePlan: input.payload.includePlan ?? preset.includePlan,
        includeStatus: input.payload.includeStatus ?? preset.includeStatus,
        isDefault: input.payload.isDefault ?? preset.isDefault,
    });
    if (!merged.name) {
        throw new Error('Preset name is required');
    }
    if (merged.isDefault) {
        await SubscriptionContactPreset.updateMany({ _id: { $ne: preset._id } }, { $set: { isDefault: false } });
    }
    Object.assign(preset, merged, {
        updatedByAdminId: new mongoose.Types.ObjectId(input.adminId),
    });
    await preset.save();
    await createAuditEntry({
        adminId: input.adminId,
        actorRole: input.actorRole,
        action: 'preset_updated',
        details: { presetId: String(preset._id), name: merged.name },
    });
    return presetToClient(preset.toObject() as unknown as Record<string, unknown>);
}

export async function deleteSubscriptionContactPreset(input: {
    presetId: string;
    adminId: string;
    actorRole?: string;
}) {
    const preset = await SubscriptionContactPreset.findById(input.presetId);
    if (!preset) {
        throw new Error('Preset not found');
    }
    if (preset.isDefault) {
        throw new Error('Default preset cannot be deleted');
    }
    await preset.deleteOne();
    await createAuditEntry({
        adminId: input.adminId,
        actorRole: input.actorRole,
        action: 'preset_deleted',
        details: { presetId: input.presetId, name: preset.name },
    });
    return { success: true };
}

export async function getSubscriptionContactLogs(input: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.min(100, Math.max(1, Number(input.limit || 25)));
    const [exportsRaw, auditsRaw] = await Promise.all([
        ImportExportLog.find({
            notes: { $regex: `^${CONTACT_CENTER_MODULE}:` },
        })
            .populate('performedBy', 'full_name username')
            .sort({ createdAt: -1 })
            .limit(limit * 3)
            .lean(),
        AuditLog.find({ module: CONTACT_CENTER_MODULE })
            .sort({ timestamp: -1 })
            .limit(limit * 3)
            .lean(),
    ]);

    const exportItems = exportsRaw.map((item) => ({
        _id: `export:${String(item._id)}`,
        kind: 'export',
        title: String(item.notes || 'subscription_contact_center'),
        category: String(item.category || ''),
        format: String(item.format || ''),
        rowCount: Number(item.totalRows || 0),
        performedByName: pickFirstString(
            asRecord(item.performedBy)?.full_name,
            asRecord(item.performedBy)?.username,
        ),
        createdAt: item.createdAt ? new Date(String(item.createdAt)).toISOString() : new Date().toISOString(),
    }));

    const auditItems = auditsRaw.map((item) => ({
        _id: `audit:${String(item._id)}`,
        kind: 'audit',
        title: String(item.action || ''),
        category: String(item.module || ''),
        format: '',
        rowCount: 0,
        performedByName: '',
        createdAt: item.timestamp ? new Date(String(item.timestamp)).toISOString() : new Date().toISOString(),
        details: item.details,
    }));

    const items = [...exportItems, ...auditItems]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const total = items.length;
    const start = (page - 1) * limit;
    return {
        items: items.slice(start, start + limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}

export async function getSubscriptionContactCenterFilterMeta() {
    const [plans, groups, settings] = await Promise.all([
        SubscriptionPlan.find({ isArchived: { $ne: true }, isActive: true })
            .select('name code')
            .sort({ displayOrder: 1, name: 1 })
            .lean(),
        StudentGroup.find({ isActive: true })
            .select('name')
            .sort({ sortOrder: 1, name: 1 })
            .lean(),
        NotificationSettings.findOne().select('subscriptionReminderDays').lean(),
    ]);
    return {
        plans: plans.map((plan) => ({
            id: String(plan._id),
            code: String(plan.code || ''),
            name: String(plan.name || ''),
        })),
        groups: groups.map((group) => ({
            id: String(group._id),
            name: String(group.name || ''),
        })),
        renewalThresholdDays: Array.isArray(settings?.subscriptionReminderDays) && settings.subscriptionReminderDays.length > 0
            ? Number(settings.subscriptionReminderDays[0]) || DEFAULT_RENEWAL_THRESHOLD_DAYS
            : DEFAULT_RENEWAL_THRESHOLD_DAYS,
    };
}
