import SiteSettings from '../models/Settings';
import { SecurityConfig, getSecurityConfig, invalidateSecurityConfigCache } from './securityConfigService';
import { updateSecuritySettingsSnapshot } from './securityCenterService';

export interface RuntimeFeatureFlags {
    studentDashboardV2: boolean;
    studentManagementV2: boolean;
    subscriptionEngineV2: boolean;
    examShareLinks: boolean;
    proctoringSignals: boolean;
    aiQuestionSuggestions: boolean;
    pushNotifications: boolean;
    strictExamTabLock: boolean;
    webNextEnabled: boolean;
    studentRegistrationEnabled: boolean;
    financeDashboardV1: boolean;
    smsReminderEnabled: boolean;
    emailReminderEnabled: boolean;
    backupS3MirrorEnabled: boolean;
    nextAdminEnabled: boolean;
    nextStudentEnabled: boolean;
    trainingMode: boolean;
    requireDeleteKeywordConfirm: boolean;
}

export interface RuntimeSettingsSnapshot {
    security: SecurityConfig;
    featureFlags: RuntimeFeatureFlags;
    updatedAt: Date | null;
    updatedBy: string | null;
    runtimeVersion: number;
}

export interface RuntimeSettingsUpdateInput {
    security?: Partial<SecurityConfig>;
    featureFlags?: Partial<RuntimeFeatureFlags>;
    updatedBy?: string;
}

const DEFAULT_FEATURE_FLAGS: RuntimeFeatureFlags = {
    studentDashboardV2: true,
    studentManagementV2: true,
    subscriptionEngineV2: false,
    examShareLinks: false,
    proctoringSignals: false,
    aiQuestionSuggestions: false,
    pushNotifications: false,
    strictExamTabLock: false,
    webNextEnabled: false,
    studentRegistrationEnabled: false,
    financeDashboardV1: false,
    smsReminderEnabled: false,
    emailReminderEnabled: true,
    backupS3MirrorEnabled: false,
    nextAdminEnabled: false,
    nextStudentEnabled: false,
    trainingMode: false,
    requireDeleteKeywordConfirm: true,
};

function asBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function asPositiveInt(value: unknown, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.round(parsed);
}

function normalizeFeatureFlags(
    source: Record<string, unknown> | null | undefined,
    strictExamTabLock: boolean
): RuntimeFeatureFlags {
    const raw = source || {};
    return {
        studentDashboardV2: asBoolean(raw.studentDashboardV2, DEFAULT_FEATURE_FLAGS.studentDashboardV2),
        studentManagementV2: asBoolean(raw.studentManagementV2, DEFAULT_FEATURE_FLAGS.studentManagementV2),
        subscriptionEngineV2: asBoolean(raw.subscriptionEngineV2, DEFAULT_FEATURE_FLAGS.subscriptionEngineV2),
        examShareLinks: asBoolean(raw.examShareLinks, DEFAULT_FEATURE_FLAGS.examShareLinks),
        proctoringSignals: asBoolean(raw.proctoringSignals, DEFAULT_FEATURE_FLAGS.proctoringSignals),
        aiQuestionSuggestions: asBoolean(raw.aiQuestionSuggestions, DEFAULT_FEATURE_FLAGS.aiQuestionSuggestions),
        pushNotifications: asBoolean(raw.pushNotifications, DEFAULT_FEATURE_FLAGS.pushNotifications),
        strictExamTabLock,
        webNextEnabled: asBoolean(raw.webNextEnabled, DEFAULT_FEATURE_FLAGS.webNextEnabled),
        studentRegistrationEnabled: asBoolean(raw.studentRegistrationEnabled, DEFAULT_FEATURE_FLAGS.studentRegistrationEnabled),
        financeDashboardV1: asBoolean(raw.financeDashboardV1, DEFAULT_FEATURE_FLAGS.financeDashboardV1),
        smsReminderEnabled: asBoolean(raw.smsReminderEnabled, DEFAULT_FEATURE_FLAGS.smsReminderEnabled),
        emailReminderEnabled: asBoolean(raw.emailReminderEnabled, DEFAULT_FEATURE_FLAGS.emailReminderEnabled),
        backupS3MirrorEnabled: asBoolean(raw.backupS3MirrorEnabled, DEFAULT_FEATURE_FLAGS.backupS3MirrorEnabled),
        nextAdminEnabled: asBoolean(raw.nextAdminEnabled, DEFAULT_FEATURE_FLAGS.nextAdminEnabled),
        nextStudentEnabled: asBoolean(raw.nextStudentEnabled, DEFAULT_FEATURE_FLAGS.nextStudentEnabled),
        trainingMode: asBoolean(raw.trainingMode, DEFAULT_FEATURE_FLAGS.trainingMode),
        requireDeleteKeywordConfirm: asBoolean(
            raw.requireDeleteKeywordConfirm,
            DEFAULT_FEATURE_FLAGS.requireDeleteKeywordConfirm,
        ),
    };
}

export function getDefaultRuntimeFeatureFlags(): RuntimeFeatureFlags {
    return { ...DEFAULT_FEATURE_FLAGS };
}

export async function getRuntimeSettingsSnapshot(forceRefreshSecurity = true): Promise<RuntimeSettingsSnapshot> {
    let settings = await SiteSettings.findOne();
    if (!settings) {
        settings = await SiteSettings.create({});
    }

    const security = await getSecurityConfig(forceRefreshSecurity);
    const featureFlags = normalizeFeatureFlags(
        settings.featureFlags as Record<string, unknown> | undefined,
        security.strictExamTabLock
    );
    const runtimeVersion = asPositiveInt(settings.runtimeVersion, 1);

    const needsPatch =
        settings.runtimeVersion !== runtimeVersion ||
        settings.featureFlags?.strictExamTabLock !== security.strictExamTabLock ||
        settings.featureFlags?.studentDashboardV2 === undefined ||
        settings.featureFlags?.studentManagementV2 === undefined ||
        settings.featureFlags?.subscriptionEngineV2 === undefined ||
        settings.featureFlags?.examShareLinks === undefined ||
        settings.featureFlags?.proctoringSignals === undefined ||
        settings.featureFlags?.aiQuestionSuggestions === undefined ||
        settings.featureFlags?.pushNotifications === undefined ||
        settings.featureFlags?.webNextEnabled === undefined ||
        settings.featureFlags?.studentRegistrationEnabled === undefined ||
        settings.featureFlags?.financeDashboardV1 === undefined ||
        settings.featureFlags?.smsReminderEnabled === undefined ||
        settings.featureFlags?.emailReminderEnabled === undefined ||
        settings.featureFlags?.backupS3MirrorEnabled === undefined ||
        settings.featureFlags?.nextAdminEnabled === undefined ||
        settings.featureFlags?.nextStudentEnabled === undefined ||
        settings.featureFlags?.trainingMode === undefined ||
        settings.featureFlags?.requireDeleteKeywordConfirm === undefined;

    if (needsPatch) {
        await SiteSettings.updateOne(
            { _id: settings._id },
            {
                $set: {
                    featureFlags,
                    runtimeVersion,
                },
            }
        );
        settings = await SiteSettings.findById(settings._id);
    }

    return {
        security,
        featureFlags,
        updatedAt: settings?.updatedAt || null,
        updatedBy: settings?.updatedBy ? String(settings.updatedBy) : null,
        runtimeVersion,
    };
}

export async function updateRuntimeSettings(input: RuntimeSettingsUpdateInput): Promise<RuntimeSettingsSnapshot> {
    const current = await getRuntimeSettingsSnapshot(true);

    const nextSecurity: SecurityConfig = {
        ...current.security,
        ...(input.security || {}),
    };

    const nextFeatureFlags: RuntimeFeatureFlags = {
        ...current.featureFlags,
        ...(input.featureFlags || {}),
    };

    if (input.security?.strictExamTabLock !== undefined) {
        const strict = Boolean(input.security.strictExamTabLock);
        nextSecurity.strictExamTabLock = strict;
        nextFeatureFlags.strictExamTabLock = strict;
    } else if (input.featureFlags?.strictExamTabLock !== undefined) {
        const strict = Boolean(input.featureFlags.strictExamTabLock);
        nextSecurity.strictExamTabLock = strict;
        nextFeatureFlags.strictExamTabLock = strict;
    } else {
        nextFeatureFlags.strictExamTabLock = nextSecurity.strictExamTabLock;
    }

    const runtimeVersion = Math.max(1, Number(current.runtimeVersion || 1)) + 1;

    const updateDoc: Record<string, unknown> = {
        security: nextSecurity,
        featureFlags: nextFeatureFlags,
        runtimeVersion,
    };
    if (input.updatedBy) {
        updateDoc.updatedBy = input.updatedBy;
    }

    await SiteSettings.findOneAndUpdate(
        {},
        { $set: updateDoc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (input.security) {
        const admin2fa =
            input.security.enable2faAdmin !== undefined
                ? Boolean(input.security.enable2faAdmin)
                : (input.security.force2faSuperAdmin !== undefined ? Boolean(input.security.force2faSuperAdmin) : undefined);

        await updateSecuritySettingsSnapshot(
            {
                ...(admin2fa !== undefined ? { adminAccess: { require2FAForAdmins: admin2fa } } : {}),
                ...(input.security.otpExpiryMinutes !== undefined || input.security.maxOtpAttempts !== undefined
                    ? {
                        loginProtection: {
                            ...(input.security.otpExpiryMinutes !== undefined
                                ? { lockoutMinutes: Number(input.security.otpExpiryMinutes) }
                                : {}),
                            ...(input.security.maxOtpAttempts !== undefined
                                ? { maxAttempts: Number(input.security.maxOtpAttempts) }
                                : {}),
                        },
                    }
                    : {}),
                ...(input.security.strictExamTabLock !== undefined
                    ? { examProtection: { logTabSwitch: Boolean(input.security.strictExamTabLock) } }
                    : {}),
            },
            input.updatedBy,
        );
    }

    invalidateSecurityConfigCache();
    const refreshed = await getRuntimeSettingsSnapshot(true);
    return {
        ...refreshed,
        runtimeVersion,
    };
}
