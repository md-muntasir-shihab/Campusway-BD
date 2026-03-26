import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan';
import User from '../models/User';
import UserSubscription from '../models/UserSubscription';

type SubscriptionReason = 'missing' | 'inactive' | 'expired';

type CacheShape = Record<string, unknown> | null | undefined;

const SUBSCRIPTION_PLAN_SUMMARY_SELECT = [
    'code',
    'slug',
    'name',
    'supportLevel',
    'allowsExams',
    'allowsPremiumResources',
    'allowsSMSUpdates',
    'allowsEmailUpdates',
    'allowsGuardianAlerts',
].join(' ');

export type CanonicalSubscriptionSnapshot = {
    source: 'canonical' | 'cache' | 'none';
    subscription: Record<string, unknown> | null;
    plan: Record<string, unknown> | null;
    planCode: string;
    planSlug: string;
    planName: string;
    hasPlanIdentity: boolean;
    isActive: boolean;
    expiresAtUTC: Date | null;
    allowsExams: boolean | null;
    allowsPremiumResources: boolean | null;
    allowsSMSUpdates: boolean | null;
    allowsEmailUpdates: boolean | null;
    allowsGuardianAlerts: boolean | null;
    reason?: SubscriptionReason;
};

export type SupportEligibilityReason =
    | 'not_student'
    | 'no_active_subscription'
    | 'expired_subscription'
    | 'support_not_included_in_plan';

export type SupportEligibilityState = {
    allowed: boolean;
    reason?: SupportEligibilityReason;
    planCode: string;
    planName: string;
    supportLevel: string;
    status: 'active' | 'inactive' | 'expired' | 'missing';
    expiresAtUTC: Date | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asBoolean(value: unknown, fallback: boolean | null = null): boolean | null {
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return fallback;
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inferReason(hasPlanIdentity: boolean, isActive: boolean, expiresAtUTC: Date | null): SubscriptionReason | undefined {
    if (!hasPlanIdentity) return 'missing';
    if (isActive) return undefined;
    if (expiresAtUTC && expiresAtUTC.getTime() <= Date.now()) return 'expired';
    return 'inactive';
}

async function resolvePlanFromCache(cache: CacheShape): Promise<Record<string, unknown> | null> {
    const cacheRecord = asRecord(cache);
    if (!cacheRecord) return null;

    const planId = String(cacheRecord.planId || '').trim();
    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
        const plan = await SubscriptionPlan.findById(planId)
            .select(SUBSCRIPTION_PLAN_SUMMARY_SELECT)
            .lean();
        if (plan) return plan as Record<string, unknown>;
    }

    const planCode = String(cacheRecord.planCode || cacheRecord.plan || '').trim().toLowerCase();
    if (planCode) {
        const plan = await SubscriptionPlan.findOne({ code: planCode })
            .select(SUBSCRIPTION_PLAN_SUMMARY_SELECT)
            .lean();
        if (plan) return plan as Record<string, unknown>;
    }

    return null;
}

function toSnapshotFromValues(input: {
    source: 'canonical' | 'cache' | 'none';
    subscription?: Record<string, unknown> | null;
    plan?: Record<string, unknown> | null;
    cache?: CacheShape;
    isActive?: boolean;
    expiresAtUTC?: Date | null;
}): CanonicalSubscriptionSnapshot {
    const subscription = input.subscription || null;
    const plan = input.plan || null;
    const cache = asRecord(input.cache);

    const planCode = String(plan?.code || cache?.planCode || cache?.plan || '').trim().toLowerCase();
    const planSlug = String(plan?.slug || cache?.planSlug || planCode).trim().toLowerCase();
    const planName = String(plan?.name || cache?.planName || cache?.plan || '').trim();
    const expiresAtUTC = input.expiresAtUTC || asDate(subscription?.expiresAtUTC) || asDate(cache?.expiryDate);
    const isActive = Boolean(
        input.isActive
        && expiresAtUTC
        && expiresAtUTC.getTime() > Date.now(),
    );
    const hasPlanIdentity = Boolean(planCode || planSlug || planName || subscription?.planId);

    return {
        source: input.source,
        subscription,
        plan,
        planCode,
        planSlug,
        planName,
        hasPlanIdentity,
        isActive,
        expiresAtUTC,
        allowsExams: asBoolean(plan?.allowsExams),
        allowsPremiumResources: asBoolean(plan?.allowsPremiumResources),
        allowsSMSUpdates: asBoolean(plan?.allowsSMSUpdates),
        allowsEmailUpdates: asBoolean(plan?.allowsEmailUpdates),
        allowsGuardianAlerts: asBoolean(plan?.allowsGuardianAlerts),
        reason: inferReason(hasPlanIdentity, isActive, expiresAtUTC),
    };
}

export async function getCanonicalSubscriptionSnapshot(
    userId: string,
    fallbackCache?: CacheShape,
): Promise<CanonicalSubscriptionSnapshot> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
            source: 'none',
            subscription: null,
            plan: null,
            planCode: '',
            planSlug: '',
            planName: '',
            hasPlanIdentity: false,
            isActive: false,
            expiresAtUTC: null,
            allowsExams: null,
            allowsPremiumResources: null,
            allowsSMSUpdates: null,
            allowsEmailUpdates: null,
            allowsGuardianAlerts: null,
        reason: 'missing',
        };
    }

    const objectId = new mongoose.Types.ObjectId(userId);
    const activeSubscription = await UserSubscription.findOne({
        userId: objectId,
        status: 'active',
    })
        .sort({ expiresAtUTC: -1, updatedAt: -1, createdAt: -1 })
        .populate('planId', SUBSCRIPTION_PLAN_SUMMARY_SELECT)
        .lean();

    if (activeSubscription) {
        const plan = asRecord(activeSubscription.planId);
        return toSnapshotFromValues({
            source: 'canonical',
            subscription: activeSubscription as Record<string, unknown>,
            plan,
            cache: fallbackCache,
            isActive: true,
            expiresAtUTC: asDate(activeSubscription.expiresAtUTC),
        });
    }

    const latestSubscription = await UserSubscription.findOne({ userId: objectId })
        .sort({ updatedAt: -1, createdAt: -1 })
        .populate('planId', SUBSCRIPTION_PLAN_SUMMARY_SELECT)
        .lean();

    if (latestSubscription) {
        const plan = asRecord(latestSubscription.planId);
        const expiresAtUTC = asDate(latestSubscription.expiresAtUTC);
        const isActive = String(latestSubscription.status || '').trim().toLowerCase() === 'active';
        return toSnapshotFromValues({
            source: 'canonical',
            subscription: latestSubscription as Record<string, unknown>,
            plan,
            cache: fallbackCache,
            isActive,
            expiresAtUTC,
        });
    }

    const cacheRecord = asRecord(fallbackCache);
    const cachePlan = await resolvePlanFromCache(fallbackCache);
    return toSnapshotFromValues({
        source: cachePlan || cacheRecord ? 'cache' : 'none',
        subscription: null,
        plan: cachePlan,
        cache: fallbackCache,
        isActive: asBoolean(cacheRecord?.isActive, false) === true,
        expiresAtUTC: asDate(cacheRecord?.expiryDate),
    });
}

function resolveSupportStatus(snapshot: CanonicalSubscriptionSnapshot): SupportEligibilityState['status'] {
    if (snapshot.isActive) return 'active';
    if (snapshot.reason === 'expired') return 'expired';
    if (snapshot.hasPlanIdentity) return 'inactive';
    return 'missing';
}

export async function canUseSupport(
    userId: string,
    fallbackCache?: CacheShape,
): Promise<SupportEligibilityState> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
            allowed: false,
            reason: 'no_active_subscription',
            planCode: '',
            planName: '',
            supportLevel: 'basic',
            status: 'missing',
            expiresAtUTC: null,
        };
    }

    const user = await User.findById(userId)
        .select('role subscription')
        .lean<{ role?: string; subscription?: CacheShape } | null>();
    if (!user || String(user.role || '').trim() !== 'student') {
        return {
            allowed: false,
            reason: 'not_student',
            planCode: '',
            planName: '',
            supportLevel: 'basic',
            status: 'missing',
            expiresAtUTC: null,
        };
    }

    const snapshot = await getCanonicalSubscriptionSnapshot(userId, fallbackCache || user.subscription);
    const plan = asRecord(snapshot.plan);
    const state: SupportEligibilityState = {
        allowed: false,
        planCode: snapshot.planCode,
        planName: snapshot.planName,
        supportLevel: String(plan?.supportLevel || 'basic').trim() || 'basic',
        status: resolveSupportStatus(snapshot),
        expiresAtUTC: snapshot.expiresAtUTC,
    };

    if (!snapshot.hasPlanIdentity || !snapshot.isActive) {
        state.reason = snapshot.reason === 'expired' ? 'expired_subscription' : 'no_active_subscription';
        return state;
    }

    state.allowed = true;
    return state;
}
