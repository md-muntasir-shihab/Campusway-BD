import mongoose from 'mongoose';
import SiteSettings from '../models/Settings';
import type { AntiCheatPolicy } from '../types/antiCheat';
import { SAFE_DEFAULTS } from '../types/antiCheat';
import SecuritySettings, {
    AccessControlSecuritySettings,
    AdminAccessSettings,
    AlertingSecuritySettings,
    AuthenticationSecuritySettings,
    BackupRestoreSecuritySettings,
    ExamProtectionSettings,
    ExportSecuritySettings,
    ISecuritySettings,
    LoggingSettings,
    LoginProtectionSettings,
    PanicSettings,
    PasswordPoliciesSettings,
    PasswordPolicy,
    RateLimitSettings,
    RetentionSettings,
    RiskyActionKey,
    RoleScopedPasswordPolicy,
    RuntimeGuardSettings,
    SessionSecuritySettings,
    SessionsSecurityCenterSettings,
    SiteAccessSettings,
    TwoFactorSecuritySettings,
    TwoPersonApprovalSettings,
    UploadSecuritySettings,
    VerificationRecoverySettings,
} from '../models/SecuritySettings';

export type SecuritySettingsSnapshot = {
    passwordPolicy: PasswordPolicy;
    loginProtection: LoginProtectionSettings;
    session: SessionSecuritySettings;
    adminAccess: AdminAccessSettings;
    siteAccess: SiteAccessSettings;
    examProtection: ExamProtectionSettings;
    logging: LoggingSettings;
    rateLimit: RateLimitSettings;
    twoPersonApproval: TwoPersonApprovalSettings;
    retention: RetentionSettings;
    panic: PanicSettings;
    authentication: AuthenticationSecuritySettings;
    passwordPolicies: PasswordPoliciesSettings;
    twoFactor: TwoFactorSecuritySettings;
    sessions: SessionsSecurityCenterSettings;
    accessControl: AccessControlSecuritySettings;
    verificationRecovery: VerificationRecoverySettings;
    uploadSecurity: UploadSecuritySettings;
    alerting: AlertingSecuritySettings;
    exportSecurity: ExportSecuritySettings;
    backupRestore: BackupRestoreSecuritySettings;
    runtimeGuards: RuntimeGuardSettings;
    antiCheatPolicy: AntiCheatPolicy;
    updatedBy?: string | null;
    updatedAt?: Date | null;
};

type PartialRoleScopedPasswordPolicy = Partial<RoleScopedPasswordPolicy>;
type PartialPasswordPoliciesSettings =
    Partial<Omit<PasswordPoliciesSettings, 'default' | 'admin' | 'staff' | 'student'>> & {
        default?: PartialRoleScopedPasswordPolicy;
        admin?: PartialRoleScopedPasswordPolicy;
        staff?: PartialRoleScopedPasswordPolicy;
        student?: PartialRoleScopedPasswordPolicy;
    };

export type SecuritySettingsUpdateInput = Partial<{
    passwordPolicy: Partial<PasswordPolicy>;
    loginProtection: Partial<LoginProtectionSettings>;
    session: Partial<SessionSecuritySettings>;
    adminAccess: Partial<AdminAccessSettings>;
    siteAccess: Partial<SiteAccessSettings>;
    examProtection: Partial<ExamProtectionSettings>;
    logging: Partial<LoggingSettings>;
    rateLimit: Partial<RateLimitSettings>;
    twoPersonApproval: Partial<TwoPersonApprovalSettings>;
    retention: Partial<RetentionSettings>;
    panic: Partial<PanicSettings>;
    authentication: Partial<AuthenticationSecuritySettings>;
    passwordPolicies: PartialPasswordPoliciesSettings;
    twoFactor: Partial<TwoFactorSecuritySettings>;
    sessions: Partial<SessionsSecurityCenterSettings>;
    accessControl: Partial<AccessControlSecuritySettings>;
    verificationRecovery: Partial<VerificationRecoverySettings>;
    uploadSecurity: Partial<UploadSecuritySettings>;
    alerting: Partial<AlertingSecuritySettings>;
    exportSecurity: Partial<ExportSecuritySettings>;
    backupRestore: Partial<BackupRestoreSecuritySettings>;
    runtimeGuards: Partial<RuntimeGuardSettings>;
    antiCheatPolicy: Partial<AntiCheatPolicy>;
}>;

export type PublicSecurityConfig = {
    maintenanceMode: boolean;
    blockNewRegistrations: boolean;
    requireProfileScoreForExam: boolean;
    profileScoreThreshold: number;
};

const CACHE_TTL_MS = 30_000;
const ADMIN_ROLES = ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'];
const STAFF_ROLES = [...ADMIN_ROLES, 'chairman'];
const DANGEROUS_EXTENSIONS = ['exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'js', 'mjs', 'cjs', 'jar', 'php', 'phtml', 'sh', 'ps1'];
const COMMON_PASSWORDS = new Set(['password', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'admin123', 'welcome123', 'campusway', 'campusway123']);
const RISKY_ACTION_KEYS: RiskyActionKey[] = [
    'data.destructive_change',
    'students.bulk_delete',
    'universities.bulk_delete',
    'news.bulk_delete',
    'exams.publish_result',
    'news.publish_breaking',
    'payments.mark_refunded',
    'students.export',
    'finance.adjustment',
    'providers.credentials_change',
    'security.settings_change',
    'backups.restore',
];

const DEFAULT_ROLE_POLICY: RoleScopedPasswordPolicy = {
    minLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    denyCommonPasswords: true,
    preventReuseCount: 5,
    expiryDays: 0,
    forceResetOnFirstLogin: false,
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettingsSnapshot = {
    passwordPolicy: { minLength: 10, requireNumber: true, requireUppercase: true, requireSpecial: true },
    loginProtection: { maxAttempts: 5, lockoutMinutes: 15, recaptchaEnabled: false },
    session: { accessTokenTTLMinutes: 20, refreshTokenTTLDays: 7, idleTimeoutMinutes: 60 },
    adminAccess: { require2FAForAdmins: false, allowedAdminIPs: [], adminPanelEnabled: true },
    siteAccess: { maintenanceMode: false, blockNewRegistrations: false },
    examProtection: { maxActiveSessionsPerUser: 5, logTabSwitch: true, requireProfileScoreForExam: true, profileScoreThreshold: 70 },
    logging: { logLevel: 'info', logLoginFailures: true, logAdminActions: true },
    rateLimit: { loginWindowMs: 15 * 60 * 1000, loginMax: 10, examSubmitWindowMs: 15 * 60 * 1000, examSubmitMax: 60, adminWindowMs: 15 * 60 * 1000, adminMax: 300, uploadWindowMs: 15 * 60 * 1000, uploadMax: 80 },
    twoPersonApproval: { enabled: false, riskyActions: [...RISKY_ACTION_KEYS], approvalExpiryMinutes: 120 },
    retention: { enabled: false, examSessionsDays: 30, auditLogsDays: 180, eventLogsDays: 90 },
    panic: { readOnlyMode: false, disableStudentLogins: false, disablePaymentWebhooks: false, disableExamStarts: false },
    authentication: { loginAttemptsLimit: 5, lockDurationMinutes: 15, genericErrorMessages: true, verificationRequired: true, allowedLoginMethods: ['username', 'email'], accountLockEnabled: true, newDeviceAlerts: true, suspiciousLoginAlerts: true, adminLoginAlerts: true, throttleWindowMinutes: 15, otpResendLimit: 8, otpVerifyLimit: 25, recaptchaEnabled: false },
    passwordPolicies: {
        default: { ...DEFAULT_ROLE_POLICY },
        admin: { ...DEFAULT_ROLE_POLICY, minLength: 12, preventReuseCount: 8, expiryDays: 90, forceResetOnFirstLogin: true },
        staff: { ...DEFAULT_ROLE_POLICY, minLength: 10, preventReuseCount: 5, expiryDays: 180, forceResetOnFirstLogin: true },
        student: { ...DEFAULT_ROLE_POLICY, requireSpecial: false, preventReuseCount: 3, forceResetOnFirstLogin: false },
        strengthMeterEnabled: true,
    },
    twoFactor: { requireForRoles: [], optionalForStudents: true, allowedMethods: ['authenticator', 'email'], defaultMethod: 'authenticator', emailFallbackEnabled: true, smsFallbackEnabled: false, backupCodesEnabled: true, stepUpForSensitiveActions: true, otpExpiryMinutes: 10, maxAttempts: 5 },
    sessions: { accessTokenTTLMinutes: 20, refreshTokenTTLDays: 7, idleTimeoutMinutes: 60, absoluteTimeoutHours: 24, rememberDeviceDays: 30, maxActiveSessionsPerUser: 5, allowConcurrentSessions: true },
    accessControl: { enforceRoutePolicies: true, allowedAdminIPs: [], requireApprovalForRiskyActions: false, sensitiveActionReasonRequired: true, exportAllowedRoles: ['superadmin', 'admin', 'finance_agent'] },
    verificationRecovery: { requireVerifiedEmailForStudents: false, requireVerifiedEmailForAdmins: false, phoneVerificationEnabled: false, emailVerificationExpiryHours: 24, passwordResetExpiryMinutes: 60, resendCooldownMinutes: 5, allowAdminRecovery: true },
    uploadSecurity: { publicAllowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'], protectedAllowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'], maxImageSizeMB: 5, maxDocumentSizeMB: 10, blockDangerousExtensions: true, protectedAccessEnabled: true, virusScanStatus: 'hook_ready' },
    alerting: { recipients: [], failedLoginThreshold: 10, otpFailureThreshold: 10, backupFailureAlerts: true, providerChangeAlerts: true, exportAlerts: true, suspiciousAdminAlerts: true },
    exportSecurity: { allowedRoles: ['superadmin', 'admin', 'finance_agent'], requireApproval: false, requireReason: true, logAllExports: true, maskSensitiveFields: true },
    backupRestore: { backupHealthWarnAfterHours: 24, requireRestoreApproval: true, archiveBeforeHardDelete: true, showStatusOnDashboard: true },
    runtimeGuards: { maintenanceMode: false, blockNewRegistrations: false, readOnlyMode: false, disableStudentLogins: false, disablePaymentWebhooks: false, disableExamStarts: false, adminPanelEnabled: true, testingAccessMode: false },
    antiCheatPolicy: { ...SAFE_DEFAULTS },
    updatedBy: null,
    updatedAt: null,
};

let cache: { ts: number; settings: SecuritySettingsSnapshot } | null = null;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const asBool = (value: unknown, fallback: boolean): boolean => typeof value === 'boolean' ? value : fallback;
const asInt = (value: unknown, fallback: number, min: number, max: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.round(parsed)));
};
const asStringArray = (value: unknown, fallback: string[], maxItems = 100): string[] => {
    if (!Array.isArray(value)) return [...fallback];
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, maxItems)));
};
const asRoleArray = (value: unknown, fallback: string[], maxItems = 50): string[] => asStringArray(value, fallback, maxItems).map((item) => item.toLowerCase());
const asLogLevel = (value: unknown, fallback: LoggingSettings['logLevel']): LoggingSettings['logLevel'] => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error' ? normalized : fallback;
};
const normalizeAllowedLoginMethods = (value: unknown, fallback: AuthenticationSecuritySettings['allowedLoginMethods']): AuthenticationSecuritySettings['allowedLoginMethods'] => {
    const methods = asStringArray(value, fallback, 3).map((item) => item.toLowerCase()).filter((item): item is 'username' | 'email' | 'phone' => ['username', 'email', 'phone'].includes(item));
    return methods.length ? methods : [...fallback];
};
const normalizeTwoFactorMethods = (value: unknown, fallback: TwoFactorSecuritySettings['allowedMethods']): TwoFactorSecuritySettings['allowedMethods'] => {
    const methods = asStringArray(value, fallback, 3).map((item) => item.toLowerCase()).filter((item): item is 'authenticator' | 'email' | 'sms' => ['authenticator', 'email', 'sms'].includes(item));
    return methods.length ? methods : [...fallback];
};
const toLegacyPasswordPolicy = (policy: RoleScopedPasswordPolicy): PasswordPolicy => ({ minLength: policy.minLength, requireNumber: policy.requireNumber, requireUppercase: policy.requireUppercase, requireSpecial: policy.requireSpecial });
const normalizeRolePolicy = (value: unknown, fallback: RoleScopedPasswordPolicy, legacy?: PasswordPolicy): RoleScopedPasswordPolicy => {
    const source = isRecord(value) ? value : {};
    return {
        minLength: asInt(source.minLength, legacy?.minLength ?? fallback.minLength, 8, 128),
        requireUppercase: asBool(source.requireUppercase, legacy?.requireUppercase ?? fallback.requireUppercase),
        requireLowercase: asBool(source.requireLowercase, fallback.requireLowercase),
        requireNumber: asBool(source.requireNumber, legacy?.requireNumber ?? fallback.requireNumber),
        requireSpecial: asBool(source.requireSpecial, legacy?.requireSpecial ?? fallback.requireSpecial),
        denyCommonPasswords: asBool(source.denyCommonPasswords, fallback.denyCommonPasswords),
        preventReuseCount: asInt(source.preventReuseCount, fallback.preventReuseCount, 0, 24),
        expiryDays: asInt(source.expiryDays, fallback.expiryDays, 0, 3650),
        forceResetOnFirstLogin: asBool(source.forceResetOnFirstLogin, fallback.forceResetOnFirstLogin),
    };
};

function normalizeSnapshotPayload(payload: Record<string, unknown>): SecuritySettingsSnapshot {
    const defaults = clone(DEFAULT_SECURITY_SETTINGS);
    const legacyPasswordPolicy = {
        minLength: asInt(isRecord(payload.passwordPolicy) ? payload.passwordPolicy.minLength : undefined, defaults.passwordPolicy.minLength, 8, 128),
        requireNumber: asBool(isRecord(payload.passwordPolicy) ? payload.passwordPolicy.requireNumber : undefined, defaults.passwordPolicy.requireNumber),
        requireUppercase: asBool(isRecord(payload.passwordPolicy) ? payload.passwordPolicy.requireUppercase : undefined, defaults.passwordPolicy.requireUppercase),
        requireSpecial: asBool(isRecord(payload.passwordPolicy) ? payload.passwordPolicy.requireSpecial : undefined, defaults.passwordPolicy.requireSpecial),
    };
    const legacyLoginProtection = {
        maxAttempts: asInt(isRecord(payload.loginProtection) ? payload.loginProtection.maxAttempts : undefined, defaults.loginProtection.maxAttempts, 1, 20),
        lockoutMinutes: asInt(isRecord(payload.loginProtection) ? payload.loginProtection.lockoutMinutes : undefined, defaults.loginProtection.lockoutMinutes, 1, 240),
        recaptchaEnabled: asBool(isRecord(payload.loginProtection) ? payload.loginProtection.recaptchaEnabled : undefined, defaults.loginProtection.recaptchaEnabled),
    };
    const legacySession = {
        accessTokenTTLMinutes: asInt(isRecord(payload.session) ? payload.session.accessTokenTTLMinutes : undefined, defaults.session.accessTokenTTLMinutes, 5, 180),
        refreshTokenTTLDays: asInt(isRecord(payload.session) ? payload.session.refreshTokenTTLDays : undefined, defaults.session.refreshTokenTTLDays, 1, 120),
        idleTimeoutMinutes: asInt(isRecord(payload.session) ? payload.session.idleTimeoutMinutes : undefined, defaults.session.idleTimeoutMinutes, 5, 1440),
    };
    const legacyAdminAccess = {
        require2FAForAdmins: asBool(isRecord(payload.adminAccess) ? payload.adminAccess.require2FAForAdmins : undefined, defaults.adminAccess.require2FAForAdmins),
        allowedAdminIPs: asStringArray(isRecord(payload.adminAccess) ? payload.adminAccess.allowedAdminIPs : undefined, defaults.adminAccess.allowedAdminIPs, 200),
        adminPanelEnabled: asBool(isRecord(payload.adminAccess) ? payload.adminAccess.adminPanelEnabled : undefined, defaults.adminAccess.adminPanelEnabled),
    };
    const legacySiteAccess = {
        maintenanceMode: asBool(isRecord(payload.siteAccess) ? payload.siteAccess.maintenanceMode : undefined, defaults.siteAccess.maintenanceMode),
        blockNewRegistrations: asBool(isRecord(payload.siteAccess) ? payload.siteAccess.blockNewRegistrations : undefined, defaults.siteAccess.blockNewRegistrations),
    };
    const legacyExamProtection = {
        maxActiveSessionsPerUser: asInt(isRecord(payload.examProtection) ? payload.examProtection.maxActiveSessionsPerUser : undefined, defaults.examProtection.maxActiveSessionsPerUser, 1, 20),
        logTabSwitch: asBool(isRecord(payload.examProtection) ? payload.examProtection.logTabSwitch : undefined, defaults.examProtection.logTabSwitch),
        requireProfileScoreForExam: asBool(isRecord(payload.examProtection) ? payload.examProtection.requireProfileScoreForExam : undefined, defaults.examProtection.requireProfileScoreForExam),
        profileScoreThreshold: asInt(isRecord(payload.examProtection) ? payload.examProtection.profileScoreThreshold : undefined, defaults.examProtection.profileScoreThreshold, 0, 100),
    };
    const legacyPanic = {
        readOnlyMode: asBool(isRecord(payload.panic) ? payload.panic.readOnlyMode : undefined, defaults.panic.readOnlyMode),
        disableStudentLogins: asBool(isRecord(payload.panic) ? payload.panic.disableStudentLogins : undefined, defaults.panic.disableStudentLogins),
        disablePaymentWebhooks: asBool(isRecord(payload.panic) ? payload.panic.disablePaymentWebhooks : undefined, defaults.panic.disablePaymentWebhooks),
        disableExamStarts: asBool(isRecord(payload.panic) ? payload.panic.disableExamStarts : undefined, defaults.panic.disableExamStarts),
    };
    const authenticationSource = isRecord(payload.authentication) ? payload.authentication : {};
    const authentication: AuthenticationSecuritySettings = {
        loginAttemptsLimit: asInt(authenticationSource.loginAttemptsLimit, legacyLoginProtection.maxAttempts || defaults.authentication.loginAttemptsLimit, 1, 50),
        lockDurationMinutes: asInt(authenticationSource.lockDurationMinutes, legacyLoginProtection.lockoutMinutes || defaults.authentication.lockDurationMinutes, 1, 240),
        genericErrorMessages: asBool(authenticationSource.genericErrorMessages, defaults.authentication.genericErrorMessages),
        verificationRequired: asBool(authenticationSource.verificationRequired, defaults.authentication.verificationRequired),
        allowedLoginMethods: normalizeAllowedLoginMethods(authenticationSource.allowedLoginMethods, defaults.authentication.allowedLoginMethods),
        accountLockEnabled: asBool(authenticationSource.accountLockEnabled, defaults.authentication.accountLockEnabled),
        newDeviceAlerts: asBool(authenticationSource.newDeviceAlerts, defaults.authentication.newDeviceAlerts),
        suspiciousLoginAlerts: asBool(authenticationSource.suspiciousLoginAlerts, defaults.authentication.suspiciousLoginAlerts),
        adminLoginAlerts: asBool(authenticationSource.adminLoginAlerts, defaults.authentication.adminLoginAlerts),
        throttleWindowMinutes: asInt(authenticationSource.throttleWindowMinutes, defaults.authentication.throttleWindowMinutes, 1, 240),
        otpResendLimit: asInt(authenticationSource.otpResendLimit, defaults.authentication.otpResendLimit, 1, 50),
        otpVerifyLimit: asInt(authenticationSource.otpVerifyLimit, defaults.authentication.otpVerifyLimit, 1, 200),
        recaptchaEnabled: asBool(authenticationSource.recaptchaEnabled, legacyLoginProtection.recaptchaEnabled || defaults.authentication.recaptchaEnabled),
    };
    const passwordPoliciesSource = isRecord(payload.passwordPolicies) ? payload.passwordPolicies : {};
    const passwordPolicies: PasswordPoliciesSettings = {
        default: normalizeRolePolicy(passwordPoliciesSource.default, defaults.passwordPolicies.default, legacyPasswordPolicy),
        admin: normalizeRolePolicy(passwordPoliciesSource.admin, defaults.passwordPolicies.admin, legacyPasswordPolicy),
        staff: normalizeRolePolicy(passwordPoliciesSource.staff, defaults.passwordPolicies.staff, legacyPasswordPolicy),
        student: normalizeRolePolicy(passwordPoliciesSource.student, defaults.passwordPolicies.student, legacyPasswordPolicy),
        strengthMeterEnabled: asBool(passwordPoliciesSource.strengthMeterEnabled, defaults.passwordPolicies.strengthMeterEnabled),
    };
    const twoFactorSource = isRecord(payload.twoFactor) ? payload.twoFactor : {};
    const allowedMethods = normalizeTwoFactorMethods(twoFactorSource.allowedMethods, defaults.twoFactor.allowedMethods);
    const requireForRolesFallback = legacyAdminAccess.require2FAForAdmins
        ? Array.from(new Set([...defaults.twoFactor.requireForRoles, ...ADMIN_ROLES]))
        : defaults.twoFactor.requireForRoles;
    const twoFactor: TwoFactorSecuritySettings = {
        requireForRoles: asRoleArray(twoFactorSource.requireForRoles, requireForRolesFallback),
        optionalForStudents: asBool(twoFactorSource.optionalForStudents, defaults.twoFactor.optionalForStudents),
        allowedMethods,
        defaultMethod: allowedMethods.includes(String(twoFactorSource.defaultMethod || '').toLowerCase() as 'authenticator' | 'email' | 'sms')
            ? (String(twoFactorSource.defaultMethod).toLowerCase() as 'authenticator' | 'email' | 'sms')
            : (allowedMethods.includes(defaults.twoFactor.defaultMethod) ? defaults.twoFactor.defaultMethod : allowedMethods[0] || 'authenticator'),
        emailFallbackEnabled: asBool(twoFactorSource.emailFallbackEnabled, defaults.twoFactor.emailFallbackEnabled),
        smsFallbackEnabled: asBool(twoFactorSource.smsFallbackEnabled, defaults.twoFactor.smsFallbackEnabled),
        backupCodesEnabled: asBool(twoFactorSource.backupCodesEnabled, defaults.twoFactor.backupCodesEnabled),
        stepUpForSensitiveActions: asBool(twoFactorSource.stepUpForSensitiveActions, defaults.twoFactor.stepUpForSensitiveActions),
        otpExpiryMinutes: asInt(twoFactorSource.otpExpiryMinutes, defaults.twoFactor.otpExpiryMinutes, 1, 30),
        maxAttempts: asInt(twoFactorSource.maxAttempts, defaults.twoFactor.maxAttempts, 1, 20),
    };
    const sessionsSource = isRecord(payload.sessions) ? payload.sessions : {};
    const sessions: SessionsSecurityCenterSettings = {
        accessTokenTTLMinutes: asInt(sessionsSource.accessTokenTTLMinutes, legacySession.accessTokenTTLMinutes || defaults.sessions.accessTokenTTLMinutes, 5, 180),
        refreshTokenTTLDays: asInt(sessionsSource.refreshTokenTTLDays, legacySession.refreshTokenTTLDays || defaults.sessions.refreshTokenTTLDays, 1, 120),
        idleTimeoutMinutes: asInt(sessionsSource.idleTimeoutMinutes, legacySession.idleTimeoutMinutes || defaults.sessions.idleTimeoutMinutes, 5, 1440),
        absoluteTimeoutHours: asInt(sessionsSource.absoluteTimeoutHours, defaults.sessions.absoluteTimeoutHours, 1, 720),
        rememberDeviceDays: asInt(sessionsSource.rememberDeviceDays, defaults.sessions.rememberDeviceDays, 0, 365),
        maxActiveSessionsPerUser: asInt(sessionsSource.maxActiveSessionsPerUser, legacyExamProtection.maxActiveSessionsPerUser || defaults.sessions.maxActiveSessionsPerUser, 1, 20),
        allowConcurrentSessions: asBool(sessionsSource.allowConcurrentSessions, defaults.sessions.allowConcurrentSessions),
    };
    const exportSource = isRecord(payload.exportSecurity) ? payload.exportSecurity : {};
    const exportSecurity: ExportSecuritySettings = {
        allowedRoles: asRoleArray(exportSource.allowedRoles, defaults.exportSecurity.allowedRoles),
        requireApproval: asBool(exportSource.requireApproval, defaults.exportSecurity.requireApproval),
        requireReason: asBool(exportSource.requireReason, defaults.exportSecurity.requireReason),
        logAllExports: asBool(exportSource.logAllExports, defaults.exportSecurity.logAllExports),
        maskSensitiveFields: asBool(exportSource.maskSensitiveFields, defaults.exportSecurity.maskSensitiveFields),
    };
    const accessControlSource = isRecord(payload.accessControl) ? payload.accessControl : {};
    const accessControl: AccessControlSecuritySettings = {
        enforceRoutePolicies: asBool(accessControlSource.enforceRoutePolicies, defaults.accessControl.enforceRoutePolicies),
        allowedAdminIPs: asStringArray(accessControlSource.allowedAdminIPs, legacyAdminAccess.allowedAdminIPs.length ? legacyAdminAccess.allowedAdminIPs : defaults.accessControl.allowedAdminIPs, 200),
        requireApprovalForRiskyActions: asBool(accessControlSource.requireApprovalForRiskyActions, isRecord(payload.twoPersonApproval) ? Boolean(payload.twoPersonApproval.enabled) : defaults.accessControl.requireApprovalForRiskyActions),
        sensitiveActionReasonRequired: asBool(accessControlSource.sensitiveActionReasonRequired, defaults.accessControl.sensitiveActionReasonRequired),
        exportAllowedRoles: asRoleArray(accessControlSource.exportAllowedRoles, exportSecurity.allowedRoles),
    };
    const verificationSource = isRecord(payload.verificationRecovery) ? payload.verificationRecovery : {};
    const verificationRecovery: VerificationRecoverySettings = {
        requireVerifiedEmailForStudents: asBool(verificationSource.requireVerifiedEmailForStudents, defaults.verificationRecovery.requireVerifiedEmailForStudents),
        requireVerifiedEmailForAdmins: asBool(verificationSource.requireVerifiedEmailForAdmins, defaults.verificationRecovery.requireVerifiedEmailForAdmins),
        phoneVerificationEnabled: asBool(verificationSource.phoneVerificationEnabled, defaults.verificationRecovery.phoneVerificationEnabled),
        emailVerificationExpiryHours: asInt(verificationSource.emailVerificationExpiryHours, defaults.verificationRecovery.emailVerificationExpiryHours, 1, 168),
        passwordResetExpiryMinutes: asInt(verificationSource.passwordResetExpiryMinutes, defaults.verificationRecovery.passwordResetExpiryMinutes, 5, 1440),
        resendCooldownMinutes: asInt(verificationSource.resendCooldownMinutes, defaults.verificationRecovery.resendCooldownMinutes, 1, 120),
        allowAdminRecovery: asBool(verificationSource.allowAdminRecovery, defaults.verificationRecovery.allowAdminRecovery),
    };
    const uploadSource = isRecord(payload.uploadSecurity) ? payload.uploadSecurity : {};
    const uploadSecurity: UploadSecuritySettings = {
        publicAllowedExtensions: asStringArray(uploadSource.publicAllowedExtensions, defaults.uploadSecurity.publicAllowedExtensions, 50).map((item) => item.toLowerCase().replace(/^\./, '')),
        protectedAllowedExtensions: asStringArray(uploadSource.protectedAllowedExtensions, defaults.uploadSecurity.protectedAllowedExtensions, 50).map((item) => item.toLowerCase().replace(/^\./, '')),
        maxImageSizeMB: asInt(uploadSource.maxImageSizeMB, defaults.uploadSecurity.maxImageSizeMB, 1, 50),
        maxDocumentSizeMB: asInt(uploadSource.maxDocumentSizeMB, defaults.uploadSecurity.maxDocumentSizeMB, 1, 100),
        blockDangerousExtensions: asBool(uploadSource.blockDangerousExtensions, defaults.uploadSecurity.blockDangerousExtensions),
        protectedAccessEnabled: asBool(uploadSource.protectedAccessEnabled, defaults.uploadSecurity.protectedAccessEnabled),
        virusScanStatus: String(uploadSource.virusScanStatus || defaults.uploadSecurity.virusScanStatus).trim().toLowerCase() === 'enabled'
            ? 'enabled'
            : (String(uploadSource.virusScanStatus || defaults.uploadSecurity.virusScanStatus).trim().toLowerCase() === 'disabled' ? 'disabled' : 'hook_ready'),
    };
    const alertingSource = isRecord(payload.alerting) ? payload.alerting : {};
    const alerting: AlertingSecuritySettings = {
        recipients: asStringArray(alertingSource.recipients, defaults.alerting.recipients, 50),
        failedLoginThreshold: asInt(alertingSource.failedLoginThreshold, defaults.alerting.failedLoginThreshold, 1, 1000),
        otpFailureThreshold: asInt(alertingSource.otpFailureThreshold, defaults.alerting.otpFailureThreshold, 1, 1000),
        backupFailureAlerts: asBool(alertingSource.backupFailureAlerts, defaults.alerting.backupFailureAlerts),
        providerChangeAlerts: asBool(alertingSource.providerChangeAlerts, defaults.alerting.providerChangeAlerts),
        exportAlerts: asBool(alertingSource.exportAlerts, defaults.alerting.exportAlerts),
        suspiciousAdminAlerts: asBool(alertingSource.suspiciousAdminAlerts, defaults.alerting.suspiciousAdminAlerts),
    };
    const backupSource = isRecord(payload.backupRestore) ? payload.backupRestore : {};
    const backupRestore: BackupRestoreSecuritySettings = {
        backupHealthWarnAfterHours: asInt(backupSource.backupHealthWarnAfterHours, defaults.backupRestore.backupHealthWarnAfterHours, 1, 720),
        requireRestoreApproval: asBool(backupSource.requireRestoreApproval, defaults.backupRestore.requireRestoreApproval),
        archiveBeforeHardDelete: asBool(backupSource.archiveBeforeHardDelete, defaults.backupRestore.archiveBeforeHardDelete),
        showStatusOnDashboard: asBool(backupSource.showStatusOnDashboard, defaults.backupRestore.showStatusOnDashboard),
    };
    const runtimeSource = isRecord(payload.runtimeGuards) ? payload.runtimeGuards : {};
    const runtimeGuards: RuntimeGuardSettings = {
        maintenanceMode: asBool(runtimeSource.maintenanceMode, legacySiteAccess.maintenanceMode || defaults.runtimeGuards.maintenanceMode),
        blockNewRegistrations: asBool(runtimeSource.blockNewRegistrations, legacySiteAccess.blockNewRegistrations || defaults.runtimeGuards.blockNewRegistrations),
        readOnlyMode: asBool(runtimeSource.readOnlyMode, legacyPanic.readOnlyMode || defaults.runtimeGuards.readOnlyMode),
        disableStudentLogins: asBool(runtimeSource.disableStudentLogins, legacyPanic.disableStudentLogins || defaults.runtimeGuards.disableStudentLogins),
        disablePaymentWebhooks: asBool(runtimeSource.disablePaymentWebhooks, legacyPanic.disablePaymentWebhooks || defaults.runtimeGuards.disablePaymentWebhooks),
        disableExamStarts: asBool(runtimeSource.disableExamStarts, legacyPanic.disableExamStarts || defaults.runtimeGuards.disableExamStarts),
        adminPanelEnabled: asBool(runtimeSource.adminPanelEnabled, legacyAdminAccess.adminPanelEnabled || defaults.runtimeGuards.adminPanelEnabled),
        testingAccessMode: asBool(runtimeSource.testingAccessMode, defaults.runtimeGuards.testingAccessMode),
    };
    const loggingSource = isRecord(payload.logging) ? payload.logging : {};
    const logging: LoggingSettings = {
        logLevel: asLogLevel(loggingSource.logLevel, defaults.logging.logLevel),
        logLoginFailures: asBool(loggingSource.logLoginFailures, defaults.logging.logLoginFailures),
        logAdminActions: asBool(loggingSource.logAdminActions, defaults.logging.logAdminActions),
    };
    const rateLimitSource = isRecord(payload.rateLimit) ? payload.rateLimit : {};
    const loginWindowMsFallback = Math.max(60_000, authentication.throttleWindowMinutes * 60 * 1000);
    const rateLimit: RateLimitSettings = {
        loginWindowMs: asInt(rateLimitSource.loginWindowMs, loginWindowMsFallback, 10_000, 24 * 60 * 60 * 1000),
        loginMax: asInt(rateLimitSource.loginMax, Math.max(authentication.loginAttemptsLimit, defaults.rateLimit.loginMax), 1, 500),
        examSubmitWindowMs: asInt(rateLimitSource.examSubmitWindowMs, defaults.rateLimit.examSubmitWindowMs, 10_000, 24 * 60 * 60 * 1000),
        examSubmitMax: asInt(rateLimitSource.examSubmitMax, defaults.rateLimit.examSubmitMax, 1, 2000),
        adminWindowMs: asInt(rateLimitSource.adminWindowMs, loginWindowMsFallback, 10_000, 24 * 60 * 60 * 1000),
        adminMax: asInt(rateLimitSource.adminMax, Math.max(authentication.loginAttemptsLimit, defaults.rateLimit.adminMax), 1, 5000),
        uploadWindowMs: asInt(rateLimitSource.uploadWindowMs, defaults.rateLimit.uploadWindowMs, 10_000, 24 * 60 * 60 * 1000),
        uploadMax: asInt(rateLimitSource.uploadMax, defaults.rateLimit.uploadMax, 1, 5000),
    };
    const retentionSource = isRecord(payload.retention) ? payload.retention : {};
    const retention: RetentionSettings = {
        enabled: asBool(retentionSource.enabled, defaults.retention.enabled),
        examSessionsDays: asInt(retentionSource.examSessionsDays, defaults.retention.examSessionsDays, 7, 3650),
        auditLogsDays: asInt(retentionSource.auditLogsDays, defaults.retention.auditLogsDays, 30, 3650),
        eventLogsDays: asInt(retentionSource.eventLogsDays, defaults.retention.eventLogsDays, 30, 3650),
    };
    const examProtection: ExamProtectionSettings = {
        maxActiveSessionsPerUser: asInt(legacyExamProtection.maxActiveSessionsPerUser, sessions.maxActiveSessionsPerUser || defaults.examProtection.maxActiveSessionsPerUser, 1, 20),
        logTabSwitch: legacyExamProtection.logTabSwitch,
        requireProfileScoreForExam: legacyExamProtection.requireProfileScoreForExam,
        profileScoreThreshold: legacyExamProtection.profileScoreThreshold,
    };
    const twoPersonApprovalSource = isRecord(payload.twoPersonApproval) ? payload.twoPersonApproval : {};
    const derivedRisky = new Set<RiskyActionKey>([...defaults.twoPersonApproval.riskyActions, ...(exportSecurity.requireApproval ? ['students.export'] as RiskyActionKey[] : []), ...(backupRestore.requireRestoreApproval ? ['backups.restore'] as RiskyActionKey[] : []), ...(accessControl.requireApprovalForRiskyActions ? RISKY_ACTION_KEYS : [])]);
    const twoPersonApproval: TwoPersonApprovalSettings = {
        enabled: asBool(twoPersonApprovalSource.enabled, accessControl.requireApprovalForRiskyActions || exportSecurity.requireApproval || defaults.twoPersonApproval.enabled),
        riskyActions: Array.from(new Set((Array.isArray(twoPersonApprovalSource.riskyActions) ? twoPersonApprovalSource.riskyActions : Array.from(derivedRisky)).map((item) => String(item || '').trim()).filter((item): item is RiskyActionKey => RISKY_ACTION_KEYS.includes(item as RiskyActionKey)))),
        approvalExpiryMinutes: asInt(twoPersonApprovalSource.approvalExpiryMinutes, defaults.twoPersonApproval.approvalExpiryMinutes, 5, 1440),
    };
    const admin2faRequired = ADMIN_ROLES.some((role) => twoFactor.requireForRoles.includes(role));

    const antiCheatSource = isRecord(payload.antiCheatPolicy) ? payload.antiCheatPolicy : {};
    const antiCheatPolicy: AntiCheatPolicy = {
        tabSwitchLimit: asInt(antiCheatSource.tabSwitchLimit, defaults.antiCheatPolicy.tabSwitchLimit, 1, 100),
        copyPasteViolationLimit: asInt(antiCheatSource.copyPasteViolationLimit, defaults.antiCheatPolicy.copyPasteViolationLimit, 1, 50),
        requireFullscreen: asBool(antiCheatSource.requireFullscreen, defaults.antiCheatPolicy.requireFullscreen),
        violationAction: (['warn', 'submit', 'lock'] as const).includes(String(antiCheatSource.violationAction || '').trim().toLowerCase() as 'warn' | 'submit' | 'lock')
            ? (String(antiCheatSource.violationAction).trim().toLowerCase() as 'warn' | 'submit' | 'lock')
            : defaults.antiCheatPolicy.violationAction,
        warningCooldownSeconds: asInt(antiCheatSource.warningCooldownSeconds, defaults.antiCheatPolicy.warningCooldownSeconds, 0, 300),
        maxFullscreenExitLimit: asInt(antiCheatSource.maxFullscreenExitLimit, defaults.antiCheatPolicy.maxFullscreenExitLimit, 1, 50),
        enableClipboardBlock: asBool(antiCheatSource.enableClipboardBlock, defaults.antiCheatPolicy.enableClipboardBlock),
        enableContextMenuBlock: asBool(antiCheatSource.enableContextMenuBlock, defaults.antiCheatPolicy.enableContextMenuBlock),
        enableBlurTracking: asBool(antiCheatSource.enableBlurTracking, defaults.antiCheatPolicy.enableBlurTracking),
        allowMobileRelaxedMode: asBool(antiCheatSource.allowMobileRelaxedMode, defaults.antiCheatPolicy.allowMobileRelaxedMode),
        proctoringSignalsEnabled: asBool(antiCheatSource.proctoringSignalsEnabled, defaults.antiCheatPolicy.proctoringSignalsEnabled),
        strictExamTabLock: asBool(antiCheatSource.strictExamTabLock, defaults.antiCheatPolicy.strictExamTabLock),
    };

    return {
        passwordPolicy: toLegacyPasswordPolicy(passwordPolicies.default),
        loginProtection: { maxAttempts: authentication.loginAttemptsLimit, lockoutMinutes: authentication.lockDurationMinutes, recaptchaEnabled: authentication.recaptchaEnabled },
        session: { accessTokenTTLMinutes: sessions.accessTokenTTLMinutes, refreshTokenTTLDays: sessions.refreshTokenTTLDays, idleTimeoutMinutes: sessions.idleTimeoutMinutes },
        adminAccess: { require2FAForAdmins: admin2faRequired, allowedAdminIPs: [...accessControl.allowedAdminIPs], adminPanelEnabled: runtimeGuards.adminPanelEnabled },
        siteAccess: { maintenanceMode: runtimeGuards.maintenanceMode, blockNewRegistrations: runtimeGuards.blockNewRegistrations },
        examProtection,
        logging,
        rateLimit,
        twoPersonApproval,
        retention,
        panic: { readOnlyMode: runtimeGuards.readOnlyMode, disableStudentLogins: runtimeGuards.disableStudentLogins, disablePaymentWebhooks: runtimeGuards.disablePaymentWebhooks, disableExamStarts: runtimeGuards.disableExamStarts },
        authentication,
        passwordPolicies,
        twoFactor,
        sessions,
        accessControl,
        verificationRecovery,
        uploadSecurity,
        alerting,
        exportSecurity,
        backupRestore,
        runtimeGuards,
        antiCheatPolicy,
        updatedBy: payload.updatedBy ? String(payload.updatedBy) : null,
        updatedAt: payload.updatedAt ? new Date(String(payload.updatedAt)) : null,
    };
}

function normalizeFromDocument(doc: ISecuritySettings | null): SecuritySettingsSnapshot {
    if (!doc) return clone(DEFAULT_SECURITY_SETTINGS);
    return normalizeSnapshotPayload(doc.toObject() as Record<string, unknown>);
}

function mergeSecuritySettings(current: SecuritySettingsSnapshot, input: SecuritySettingsUpdateInput): SecuritySettingsSnapshot {
    const merged: Record<string, unknown> = clone(current);
    if (input.passwordPolicy) {
        merged.passwordPolicy = { ...current.passwordPolicy, ...input.passwordPolicy };
        merged.passwordPolicies = { ...current.passwordPolicies, default: { ...current.passwordPolicies.default, ...input.passwordPolicy } };
    }
    if (input.loginProtection) {
        merged.loginProtection = { ...current.loginProtection, ...input.loginProtection };
        merged.authentication = { ...current.authentication, loginAttemptsLimit: input.loginProtection.maxAttempts ?? current.authentication.loginAttemptsLimit, lockDurationMinutes: input.loginProtection.lockoutMinutes ?? current.authentication.lockDurationMinutes, recaptchaEnabled: input.loginProtection.recaptchaEnabled ?? current.authentication.recaptchaEnabled };
    }
    if (input.session) {
        merged.session = { ...current.session, ...input.session };
        merged.sessions = { ...current.sessions, accessTokenTTLMinutes: input.session.accessTokenTTLMinutes ?? current.sessions.accessTokenTTLMinutes, refreshTokenTTLDays: input.session.refreshTokenTTLDays ?? current.sessions.refreshTokenTTLDays, idleTimeoutMinutes: input.session.idleTimeoutMinutes ?? current.sessions.idleTimeoutMinutes };
    }
    if (input.adminAccess) {
        merged.adminAccess = { ...current.adminAccess, ...input.adminAccess };
        merged.accessControl = { ...current.accessControl, allowedAdminIPs: input.adminAccess.allowedAdminIPs ?? current.accessControl.allowedAdminIPs };
        merged.runtimeGuards = { ...current.runtimeGuards, adminPanelEnabled: input.adminAccess.adminPanelEnabled ?? current.runtimeGuards.adminPanelEnabled };
        if (typeof input.adminAccess.require2FAForAdmins === 'boolean') {
            const requiredRoles = new Set(current.twoFactor.requireForRoles);
            if (input.adminAccess.require2FAForAdmins) {
                ADMIN_ROLES.forEach((role) => requiredRoles.add(role));
            } else {
                ADMIN_ROLES.forEach((role) => requiredRoles.delete(role));
            }
            merged.twoFactor = { ...current.twoFactor, requireForRoles: Array.from(requiredRoles) };
        }
    }
    if (input.siteAccess) {
        merged.siteAccess = { ...current.siteAccess, ...input.siteAccess };
        merged.runtimeGuards = { ...current.runtimeGuards, maintenanceMode: input.siteAccess.maintenanceMode ?? current.runtimeGuards.maintenanceMode, blockNewRegistrations: input.siteAccess.blockNewRegistrations ?? current.runtimeGuards.blockNewRegistrations };
    }
    if (input.examProtection) {
        merged.examProtection = { ...current.examProtection, ...input.examProtection };
        merged.sessions = { ...current.sessions, maxActiveSessionsPerUser: input.examProtection.maxActiveSessionsPerUser ?? current.sessions.maxActiveSessionsPerUser };
    }
    if (input.logging) merged.logging = { ...current.logging, ...input.logging };
    if (input.rateLimit) merged.rateLimit = { ...current.rateLimit, ...input.rateLimit };
    if (input.twoPersonApproval) {
        merged.twoPersonApproval = { ...current.twoPersonApproval, ...input.twoPersonApproval };
        merged.accessControl = { ...current.accessControl, requireApprovalForRiskyActions: input.twoPersonApproval.enabled ?? current.accessControl.requireApprovalForRiskyActions };
    }
    if (input.retention) merged.retention = { ...current.retention, ...input.retention };
    if (input.panic) {
        merged.panic = { ...current.panic, ...input.panic };
        merged.runtimeGuards = { ...current.runtimeGuards, readOnlyMode: input.panic.readOnlyMode ?? current.runtimeGuards.readOnlyMode, disableStudentLogins: input.panic.disableStudentLogins ?? current.runtimeGuards.disableStudentLogins, disablePaymentWebhooks: input.panic.disablePaymentWebhooks ?? current.runtimeGuards.disablePaymentWebhooks, disableExamStarts: input.panic.disableExamStarts ?? current.runtimeGuards.disableExamStarts };
    }
    if (input.authentication) merged.authentication = { ...current.authentication, ...input.authentication };
    if (input.passwordPolicies) {
        merged.passwordPolicies = {
            ...current.passwordPolicies,
            ...input.passwordPolicies,
            default: { ...current.passwordPolicies.default, ...(input.passwordPolicies.default || {}) },
            admin: { ...current.passwordPolicies.admin, ...(input.passwordPolicies.admin || {}) },
            staff: { ...current.passwordPolicies.staff, ...(input.passwordPolicies.staff || {}) },
            student: { ...current.passwordPolicies.student, ...(input.passwordPolicies.student || {}) },
        };
    }
    if (input.twoFactor) merged.twoFactor = { ...current.twoFactor, ...input.twoFactor };
    if (input.sessions) merged.sessions = { ...current.sessions, ...input.sessions };
    if (input.accessControl) merged.accessControl = { ...current.accessControl, ...input.accessControl };
    if (input.verificationRecovery) merged.verificationRecovery = { ...current.verificationRecovery, ...input.verificationRecovery };
    if (input.uploadSecurity) merged.uploadSecurity = { ...current.uploadSecurity, ...input.uploadSecurity };
    if (input.alerting) merged.alerting = { ...current.alerting, ...input.alerting };
    if (input.exportSecurity) merged.exportSecurity = { ...current.exportSecurity, ...input.exportSecurity };
    if (input.backupRestore) merged.backupRestore = { ...current.backupRestore, ...input.backupRestore };
    if (input.runtimeGuards) merged.runtimeGuards = { ...current.runtimeGuards, ...input.runtimeGuards };
    if (input.antiCheatPolicy) merged.antiCheatPolicy = { ...current.antiCheatPolicy, ...input.antiCheatPolicy };
    return normalizeSnapshotPayload(merged);
}

function snapshotToPayload(settings: SecuritySettingsSnapshot): Record<string, unknown> {
    return {
        passwordPolicy: settings.passwordPolicy,
        loginProtection: settings.loginProtection,
        session: settings.session,
        adminAccess: settings.adminAccess,
        siteAccess: settings.siteAccess,
        examProtection: settings.examProtection,
        logging: settings.logging,
        rateLimit: settings.rateLimit,
        twoPersonApproval: settings.twoPersonApproval,
        retention: settings.retention,
        panic: settings.panic,
        authentication: settings.authentication,
        passwordPolicies: settings.passwordPolicies,
        twoFactor: settings.twoFactor,
        sessions: settings.sessions,
        accessControl: settings.accessControl,
        verificationRecovery: settings.verificationRecovery,
        uploadSecurity: settings.uploadSecurity,
        alerting: settings.alerting,
        exportSecurity: settings.exportSecurity,
        backupRestore: settings.backupRestore,
        runtimeGuards: settings.runtimeGuards,
        antiCheatPolicy: settings.antiCheatPolicy,
    };
}

async function mirrorToLegacySiteSettings(settings: SecuritySettingsSnapshot, updatedBy?: string): Promise<void> {
    const payload: Record<string, unknown> = {
        maintenanceMode: settings.runtimeGuards.maintenanceMode,
        'security.enable2faAdmin': settings.adminAccess.require2FAForAdmins,
        'security.force2faSuperAdmin': settings.twoFactor.requireForRoles.includes('superadmin'),
        'security.otpExpiryMinutes': settings.twoFactor.otpExpiryMinutes,
        'security.maxOtpAttempts': settings.twoFactor.maxAttempts,
        'security.strictExamTabLock': settings.examProtection.logTabSwitch,
        'featureFlags.strictExamTabLock': settings.examProtection.logTabSwitch,
        runtimeVersion: Date.now(),
    };
    if (updatedBy && mongoose.Types.ObjectId.isValid(updatedBy)) {
        payload.updatedBy = new mongoose.Types.ObjectId(updatedBy);
    }
    await SiteSettings.findOneAndUpdate({}, { $set: payload }, { upsert: true, setDefaultsOnInsert: true });
}

export async function getSecuritySettingsSnapshot(forceRefresh = false): Promise<SecuritySettingsSnapshot> {
    if (!forceRefresh && cache && Date.now() - cache.ts <= CACHE_TTL_MS) return cache.settings;
    let doc = await SecuritySettings.findOne({ key: 'global' });
    if (!doc) doc = await SecuritySettings.create({ key: 'global' });
    const normalized = normalizeFromDocument(doc);
    cache = { ts: Date.now(), settings: normalized };
    return normalized;
}

export async function updateSecuritySettingsSnapshot(input: SecuritySettingsUpdateInput, updatedBy?: string): Promise<SecuritySettingsSnapshot> {
    const current = await getSecuritySettingsSnapshot(true);
    const merged = mergeSecuritySettings(current, input);
    const payload = snapshotToPayload(merged);
    if (updatedBy && mongoose.Types.ObjectId.isValid(updatedBy)) {
        payload.updatedBy = new mongoose.Types.ObjectId(updatedBy);
    }
    const updated = await SecuritySettings.findOneAndUpdate({ key: 'global' }, { $set: payload }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const normalized = normalizeFromDocument(updated);
    await mirrorToLegacySiteSettings(normalized, updatedBy);
    cache = { ts: Date.now(), settings: normalized };
    return normalized;
}

export async function resetSecuritySettingsToDefault(updatedBy?: string): Promise<SecuritySettingsSnapshot> {
    return updateSecuritySettingsSnapshot(clone(DEFAULT_SECURITY_SETTINGS), updatedBy);
}

export function invalidateSecuritySettingsCache(): void {
    cache = null;
}

export async function getPublicSecurityConfig(forceRefresh = false): Promise<PublicSecurityConfig> {
    const settings = await getSecuritySettingsSnapshot(forceRefresh);
    return {
        maintenanceMode: settings.runtimeGuards.maintenanceMode,
        blockNewRegistrations: settings.runtimeGuards.blockNewRegistrations,
        requireProfileScoreForExam: settings.examProtection.requireProfileScoreForExam,
        profileScoreThreshold: settings.examProtection.profileScoreThreshold,
    };
}

export async function getPanicSettings(forceRefresh = false): Promise<PanicSettings> {
    return (await getSecuritySettingsSnapshot(forceRefresh)).panic;
}

export async function getRetentionSettings(forceRefresh = false): Promise<RetentionSettings> {
    return (await getSecuritySettingsSnapshot(forceRefresh)).retention;
}

export async function isTwoPersonApprovalRequired(action: RiskyActionKey, forceRefresh = false): Promise<boolean> {
    const settings = await getSecuritySettingsSnapshot(forceRefresh);
    return settings.twoPersonApproval.enabled && settings.twoPersonApproval.riskyActions.includes(action);
}

export function getDefaultSecuritySettings(): SecuritySettingsSnapshot {
    return clone(DEFAULT_SECURITY_SETTINGS);
}

export function getPasswordPolicyForRole(role: string | undefined | null, security?: SecuritySettingsSnapshot): RoleScopedPasswordPolicy {
    const settings = security || DEFAULT_SECURITY_SETTINGS;
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'student') return { ...settings.passwordPolicies.student };
    if (STAFF_ROLES.includes(normalized)) {
        return normalized === 'superadmin' || normalized === 'admin'
            ? { ...settings.passwordPolicies.admin }
            : { ...settings.passwordPolicies.staff };
    }
    return { ...settings.passwordPolicies.default };
}

export function isPasswordCompliant(password: string, policy: PasswordPolicy | RoleScopedPasswordPolicy, options?: { passwordHistory?: string[] }): { ok: boolean; message?: string } {
    const normalized = String(password || '');
    const extended = policy as RoleScopedPasswordPolicy;
    if (normalized.length < Math.max(8, policy.minLength)) return { ok: false, message: `Password must be at least ${policy.minLength} characters long.` };
    if (policy.requireUppercase && !/[A-Z]/.test(normalized)) return { ok: false, message: 'Password must include at least one uppercase letter.' };
    if ('requireLowercase' in extended && extended.requireLowercase && !/[a-z]/.test(normalized)) return { ok: false, message: 'Password must include at least one lowercase letter.' };
    if (policy.requireNumber && !/\d/.test(normalized)) return { ok: false, message: 'Password must include at least one number.' };
    if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(normalized)) return { ok: false, message: 'Password must include at least one special character.' };
    if ('denyCommonPasswords' in extended && extended.denyCommonPasswords && COMMON_PASSWORDS.has(normalized.trim().toLowerCase())) return { ok: false, message: 'Password is too common. Choose a less predictable password.' };
    if ('preventReuseCount' in extended && extended.preventReuseCount > 0 && Array.isArray(options?.passwordHistory) && options.passwordHistory.includes(normalized)) return { ok: false, message: 'Password cannot reuse a recent password.' };
    return { ok: true };
}

export function shouldExpirePassword(policy: RoleScopedPasswordPolicy): boolean {
    return Number(policy.expiryDays || 0) > 0;
}

export function calculatePasswordExpiryDate(policy: RoleScopedPasswordPolicy, fromDate = new Date()): Date | null {
    return shouldExpirePassword(policy) ? new Date(fromDate.getTime() + policy.expiryDays * 24 * 60 * 60 * 1000) : null;
}

export function isIpAllowed(ipAddress: string, allowlist: string[]): boolean {
    if (!allowlist.length) return true;
    const normalized = String(ipAddress || '').trim();
    if (!normalized) return false;
    return allowlist.some((allowed) => {
        const value = String(allowed || '').trim();
        if (!value) return false;
        if (value === normalized) return true;
        if (value.includes('/')) return normalized.startsWith(value.split('/')[0]);
        return false;
    });
}

export function isProtectedUploadExtensionAllowed(extension: string, settings: SecuritySettingsSnapshot): boolean {
    const normalized = String(extension || '').trim().toLowerCase().replace(/^\./, '');
    if (!normalized) return false;
    if (settings.uploadSecurity.blockDangerousExtensions && DANGEROUS_EXTENSIONS.includes(normalized)) return false;
    return settings.uploadSecurity.protectedAllowedExtensions.includes(normalized);
}

export function isPublicUploadExtensionAllowed(extension: string, settings: SecuritySettingsSnapshot): boolean {
    const normalized = String(extension || '').trim().toLowerCase().replace(/^\./, '');
    if (!normalized) return false;
    if (settings.uploadSecurity.blockDangerousExtensions && DANGEROUS_EXTENSIONS.includes(normalized)) return false;
    return settings.uploadSecurity.publicAllowedExtensions.includes(normalized);
}
