import mongoose, { Document, Schema } from 'mongoose';

export type SecurityLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface PasswordPolicy {
    minLength: number;
    requireNumber: boolean;
    requireUppercase: boolean;
    requireSpecial: boolean;
}

export interface LoginProtectionSettings {
    maxAttempts: number;
    lockoutMinutes: number;
    recaptchaEnabled: boolean;
}

export interface SessionSecuritySettings {
    accessTokenTTLMinutes: number;
    refreshTokenTTLDays: number;
    idleTimeoutMinutes: number;
}

export interface AdminAccessSettings {
    require2FAForAdmins: boolean;
    allowedAdminIPs: string[];
    adminPanelEnabled: boolean;
}

export interface SiteAccessSettings {
    maintenanceMode: boolean;
    blockNewRegistrations: boolean;
}

export interface ExamProtectionSettings {
    maxActiveSessionsPerUser: number;
    logTabSwitch: boolean;
    requireProfileScoreForExam: boolean;
    profileScoreThreshold: number;
}

export interface LoggingSettings {
    logLevel: SecurityLogLevel;
    logLoginFailures: boolean;
    logAdminActions: boolean;
}

export type RiskyActionKey =
    | 'data.destructive_change'
    | 'students.bulk_delete'
    | 'universities.bulk_delete'
    | 'news.bulk_delete'
    | 'exams.publish_result'
    | 'news.publish_breaking'
    | 'payments.mark_refunded'
    | 'students.export'
    | 'finance.adjustment'
    | 'providers.credentials_change'
    | 'security.settings_change'
    | 'backups.restore';

export interface TwoPersonApprovalSettings {
    enabled: boolean;
    riskyActions: RiskyActionKey[];
    approvalExpiryMinutes: number;
}

export interface RetentionSettings {
    enabled: boolean;
    examSessionsDays: number;
    auditLogsDays: number;
    eventLogsDays: number;
}

export interface PanicSettings {
    readOnlyMode: boolean;
    disableStudentLogins: boolean;
    disablePaymentWebhooks: boolean;
    disableExamStarts: boolean;
}

export interface RateLimitSettings {
    loginWindowMs: number;
    loginMax: number;
    examSubmitWindowMs: number;
    examSubmitMax: number;
    adminWindowMs: number;
    adminMax: number;
    uploadWindowMs: number;
    uploadMax: number;
}

export interface RoleScopedPasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    denyCommonPasswords: boolean;
    preventReuseCount: number;
    expiryDays: number;
    forceResetOnFirstLogin: boolean;
}

export interface AuthenticationSecuritySettings {
    loginAttemptsLimit: number;
    lockDurationMinutes: number;
    genericErrorMessages: boolean;
    verificationRequired: boolean;
    allowedLoginMethods: Array<'username' | 'email' | 'phone'>;
    accountLockEnabled: boolean;
    newDeviceAlerts: boolean;
    suspiciousLoginAlerts: boolean;
    adminLoginAlerts: boolean;
    throttleWindowMinutes: number;
    otpResendLimit: number;
    otpVerifyLimit: number;
    recaptchaEnabled: boolean;
}

export interface PasswordPoliciesSettings {
    default: RoleScopedPasswordPolicy;
    admin: RoleScopedPasswordPolicy;
    staff: RoleScopedPasswordPolicy;
    student: RoleScopedPasswordPolicy;
    strengthMeterEnabled: boolean;
}

export interface TwoFactorSecuritySettings {
    requireForRoles: string[];
    optionalForStudents: boolean;
    allowedMethods: Array<'authenticator' | 'email' | 'sms'>;
    defaultMethod: 'authenticator' | 'email' | 'sms';
    emailFallbackEnabled: boolean;
    smsFallbackEnabled: boolean;
    backupCodesEnabled: boolean;
    stepUpForSensitiveActions: boolean;
    otpExpiryMinutes: number;
    maxAttempts: number;
}

export interface SessionsSecurityCenterSettings {
    accessTokenTTLMinutes: number;
    refreshTokenTTLDays: number;
    idleTimeoutMinutes: number;
    absoluteTimeoutHours: number;
    rememberDeviceDays: number;
    maxActiveSessionsPerUser: number;
    allowConcurrentSessions: boolean;
}

export interface AccessControlSecuritySettings {
    enforceRoutePolicies: boolean;
    allowedAdminIPs: string[];
    requireApprovalForRiskyActions: boolean;
    sensitiveActionReasonRequired: boolean;
    exportAllowedRoles: string[];
}

export interface VerificationRecoverySettings {
    requireVerifiedEmailForStudents: boolean;
    requireVerifiedEmailForAdmins: boolean;
    phoneVerificationEnabled: boolean;
    emailVerificationExpiryHours: number;
    passwordResetExpiryMinutes: number;
    resendCooldownMinutes: number;
    allowAdminRecovery: boolean;
}

export interface UploadSecuritySettings {
    publicAllowedExtensions: string[];
    protectedAllowedExtensions: string[];
    maxImageSizeMB: number;
    maxDocumentSizeMB: number;
    blockDangerousExtensions: boolean;
    protectedAccessEnabled: boolean;
    virusScanStatus: 'disabled' | 'hook_ready' | 'enabled';
}

export interface AlertingSecuritySettings {
    recipients: string[];
    failedLoginThreshold: number;
    otpFailureThreshold: number;
    backupFailureAlerts: boolean;
    providerChangeAlerts: boolean;
    exportAlerts: boolean;
    suspiciousAdminAlerts: boolean;
}

export interface ExportSecuritySettings {
    allowedRoles: string[];
    requireApproval: boolean;
    requireReason: boolean;
    logAllExports: boolean;
    maskSensitiveFields: boolean;
}

export interface BackupRestoreSecuritySettings {
    backupHealthWarnAfterHours: number;
    requireRestoreApproval: boolean;
    archiveBeforeHardDelete: boolean;
    showStatusOnDashboard: boolean;
}

export interface RuntimeGuardSettings {
    maintenanceMode: boolean;
    blockNewRegistrations: boolean;
    readOnlyMode: boolean;
    disableStudentLogins: boolean;
    disablePaymentWebhooks: boolean;
    disableExamStarts: boolean;
    adminPanelEnabled: boolean;
    testingAccessMode: boolean;
}

export interface ISecuritySettings extends Document {
    key: 'global';
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
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const legacyPasswordPolicySchema = new Schema<PasswordPolicy>(
    {
        minLength: { type: Number, default: 10, min: 8, max: 64 },
        requireNumber: { type: Boolean, default: true },
        requireUppercase: { type: Boolean, default: true },
        requireSpecial: { type: Boolean, default: true },
    },
    { _id: false },
);

const loginProtectionSchema = new Schema<LoginProtectionSettings>(
    {
        maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
        lockoutMinutes: { type: Number, default: 15, min: 1, max: 240 },
        recaptchaEnabled: { type: Boolean, default: false },
    },
    { _id: false },
);

const legacySessionSchema = new Schema<SessionSecuritySettings>(
    {
        accessTokenTTLMinutes: { type: Number, default: 20, min: 5, max: 180 },
        refreshTokenTTLDays: { type: Number, default: 7, min: 1, max: 120 },
        idleTimeoutMinutes: { type: Number, default: 60, min: 5, max: 1440 },
    },
    { _id: false },
);

const adminAccessSchema = new Schema<AdminAccessSettings>(
    {
        require2FAForAdmins: { type: Boolean, default: false },
        allowedAdminIPs: { type: [String], default: [] },
        adminPanelEnabled: { type: Boolean, default: true },
    },
    { _id: false },
);

const siteAccessSchema = new Schema<SiteAccessSettings>(
    {
        maintenanceMode: { type: Boolean, default: false },
        blockNewRegistrations: { type: Boolean, default: false },
    },
    { _id: false },
);

const examProtectionSchema = new Schema<ExamProtectionSettings>(
    {
        maxActiveSessionsPerUser: { type: Number, default: 1, min: 1, max: 20 },
        logTabSwitch: { type: Boolean, default: true },
        requireProfileScoreForExam: { type: Boolean, default: true },
        profileScoreThreshold: { type: Number, default: 70, min: 0, max: 100 },
    },
    { _id: false },
);

const loggingSchema = new Schema<LoggingSettings>(
    {
        logLevel: { type: String, enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
        logLoginFailures: { type: Boolean, default: true },
        logAdminActions: { type: Boolean, default: true },
    },
    { _id: false },
);

const rateLimitSchema = new Schema<RateLimitSettings>(
    {
        loginWindowMs: { type: Number, default: 15 * 60 * 1000, min: 10_000 },
        loginMax: { type: Number, default: 10, min: 1, max: 500 },
        examSubmitWindowMs: { type: Number, default: 15 * 60 * 1000, min: 10_000 },
        examSubmitMax: { type: Number, default: 60, min: 1, max: 1000 },
        adminWindowMs: { type: Number, default: 15 * 60 * 1000, min: 10_000 },
        adminMax: { type: Number, default: 300, min: 1, max: 2000 },
        uploadWindowMs: { type: Number, default: 15 * 60 * 1000, min: 10_000 },
        uploadMax: { type: Number, default: 80, min: 1, max: 1000 },
    },
    { _id: false },
);

const twoPersonApprovalSchema = new Schema<TwoPersonApprovalSettings>(
    {
        enabled: { type: Boolean, default: false },
        riskyActions: {
            type: [String],
            default: [
                'students.bulk_delete',
                'data.destructive_change',
                'universities.bulk_delete',
                'news.bulk_delete',
                'exams.publish_result',
                'news.publish_breaking',
                'payments.mark_refunded',
                'students.export',
                'finance.adjustment',
                'providers.credentials_change',
                'security.settings_change',
            ],
        },
        approvalExpiryMinutes: { type: Number, default: 120, min: 5, max: 1440 },
    },
    { _id: false },
);

const retentionSchema = new Schema<RetentionSettings>(
    {
        enabled: { type: Boolean, default: false },
        examSessionsDays: { type: Number, default: 30, min: 7, max: 3650 },
        auditLogsDays: { type: Number, default: 180, min: 30, max: 3650 },
        eventLogsDays: { type: Number, default: 90, min: 30, max: 3650 },
    },
    { _id: false },
);

const panicSchema = new Schema<PanicSettings>(
    {
        readOnlyMode: { type: Boolean, default: false },
        disableStudentLogins: { type: Boolean, default: false },
        disablePaymentWebhooks: { type: Boolean, default: false },
        disableExamStarts: { type: Boolean, default: false },
    },
    { _id: false },
);

const roleScopedPasswordPolicySchema = new Schema<RoleScopedPasswordPolicy>(
    {
        minLength: { type: Number, default: 10, min: 8, max: 128 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumber: { type: Boolean, default: true },
        requireSpecial: { type: Boolean, default: true },
        denyCommonPasswords: { type: Boolean, default: true },
        preventReuseCount: { type: Number, default: 5, min: 0, max: 24 },
        expiryDays: { type: Number, default: 0, min: 0, max: 3650 },
        forceResetOnFirstLogin: { type: Boolean, default: false },
    },
    { _id: false },
);

const authenticationSchema = new Schema<AuthenticationSecuritySettings>(
    {
        loginAttemptsLimit: { type: Number, default: 5, min: 1, max: 50 },
        lockDurationMinutes: { type: Number, default: 15, min: 1, max: 240 },
        genericErrorMessages: { type: Boolean, default: true },
        verificationRequired: { type: Boolean, default: true },
        allowedLoginMethods: { type: [String], default: ['username', 'email'] },
        accountLockEnabled: { type: Boolean, default: true },
        newDeviceAlerts: { type: Boolean, default: true },
        suspiciousLoginAlerts: { type: Boolean, default: true },
        adminLoginAlerts: { type: Boolean, default: true },
        throttleWindowMinutes: { type: Number, default: 15, min: 1, max: 240 },
        otpResendLimit: { type: Number, default: 8, min: 1, max: 50 },
        otpVerifyLimit: { type: Number, default: 25, min: 1, max: 200 },
        recaptchaEnabled: { type: Boolean, default: false },
    },
    { _id: false },
);

const passwordPoliciesSchema = new Schema<PasswordPoliciesSettings>(
    {
        default: { type: roleScopedPasswordPolicySchema, default: () => ({}) },
        admin: {
            type: roleScopedPasswordPolicySchema,
            default: () => ({
                minLength: 12,
                requireUppercase: true,
                requireLowercase: true,
                requireNumber: true,
                requireSpecial: true,
                denyCommonPasswords: true,
                preventReuseCount: 8,
                expiryDays: 90,
                forceResetOnFirstLogin: true,
            }),
        },
        staff: {
            type: roleScopedPasswordPolicySchema,
            default: () => ({
                minLength: 10,
                requireUppercase: true,
                requireLowercase: true,
                requireNumber: true,
                requireSpecial: true,
                denyCommonPasswords: true,
                preventReuseCount: 5,
                expiryDays: 180,
                forceResetOnFirstLogin: true,
            }),
        },
        student: {
            type: roleScopedPasswordPolicySchema,
            default: () => ({
                minLength: 10,
                requireUppercase: true,
                requireLowercase: true,
                requireNumber: true,
                requireSpecial: false,
                denyCommonPasswords: true,
                preventReuseCount: 3,
                expiryDays: 0,
                forceResetOnFirstLogin: false,
            }),
        },
        strengthMeterEnabled: { type: Boolean, default: true },
    },
    { _id: false },
);

const twoFactorSchema = new Schema<TwoFactorSecuritySettings>(
    {
        requireForRoles: { type: [String], default: ['superadmin', 'admin'] },
        optionalForStudents: { type: Boolean, default: true },
        allowedMethods: { type: [String], default: ['authenticator', 'email'] },
        defaultMethod: { type: String, enum: ['authenticator', 'email', 'sms'], default: 'authenticator' },
        emailFallbackEnabled: { type: Boolean, default: true },
        smsFallbackEnabled: { type: Boolean, default: false },
        backupCodesEnabled: { type: Boolean, default: true },
        stepUpForSensitiveActions: { type: Boolean, default: true },
        otpExpiryMinutes: { type: Number, default: 10, min: 1, max: 30 },
        maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
    },
    { _id: false },
);

const sessionsSchema = new Schema<SessionsSecurityCenterSettings>(
    {
        accessTokenTTLMinutes: { type: Number, default: 20, min: 5, max: 180 },
        refreshTokenTTLDays: { type: Number, default: 7, min: 1, max: 120 },
        idleTimeoutMinutes: { type: Number, default: 60, min: 5, max: 1440 },
        absoluteTimeoutHours: { type: Number, default: 24, min: 1, max: 720 },
        rememberDeviceDays: { type: Number, default: 30, min: 0, max: 365 },
        maxActiveSessionsPerUser: { type: Number, default: 5, min: 1, max: 20 },
        allowConcurrentSessions: { type: Boolean, default: true },
    },
    { _id: false },
);

const accessControlSchema = new Schema<AccessControlSecuritySettings>(
    {
        enforceRoutePolicies: { type: Boolean, default: true },
        allowedAdminIPs: { type: [String], default: [] },
        requireApprovalForRiskyActions: { type: Boolean, default: false },
        sensitiveActionReasonRequired: { type: Boolean, default: true },
        exportAllowedRoles: { type: [String], default: ['superadmin', 'admin', 'finance_agent'] },
    },
    { _id: false },
);

const verificationRecoverySchema = new Schema<VerificationRecoverySettings>(
    {
        requireVerifiedEmailForStudents: { type: Boolean, default: true },
        requireVerifiedEmailForAdmins: { type: Boolean, default: false },
        phoneVerificationEnabled: { type: Boolean, default: false },
        emailVerificationExpiryHours: { type: Number, default: 24, min: 1, max: 168 },
        passwordResetExpiryMinutes: { type: Number, default: 60, min: 5, max: 1440 },
        resendCooldownMinutes: { type: Number, default: 5, min: 1, max: 120 },
        allowAdminRecovery: { type: Boolean, default: true },
    },
    { _id: false },
);

const uploadSecuritySchema = new Schema<UploadSecuritySettings>(
    {
        publicAllowedExtensions: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
        protectedAllowedExtensions: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'] },
        maxImageSizeMB: { type: Number, default: 5, min: 1, max: 50 },
        maxDocumentSizeMB: { type: Number, default: 10, min: 1, max: 100 },
        blockDangerousExtensions: { type: Boolean, default: true },
        protectedAccessEnabled: { type: Boolean, default: true },
        virusScanStatus: { type: String, enum: ['disabled', 'hook_ready', 'enabled'], default: 'hook_ready' },
    },
    { _id: false },
);

const alertingSchema = new Schema<AlertingSecuritySettings>(
    {
        recipients: { type: [String], default: [] },
        failedLoginThreshold: { type: Number, default: 10, min: 1, max: 1000 },
        otpFailureThreshold: { type: Number, default: 10, min: 1, max: 1000 },
        backupFailureAlerts: { type: Boolean, default: true },
        providerChangeAlerts: { type: Boolean, default: true },
        exportAlerts: { type: Boolean, default: true },
        suspiciousAdminAlerts: { type: Boolean, default: true },
    },
    { _id: false },
);

const exportSecuritySchema = new Schema<ExportSecuritySettings>(
    {
        allowedRoles: { type: [String], default: ['superadmin', 'admin', 'finance_agent'] },
        requireApproval: { type: Boolean, default: false },
        requireReason: { type: Boolean, default: true },
        logAllExports: { type: Boolean, default: true },
        maskSensitiveFields: { type: Boolean, default: true },
    },
    { _id: false },
);

const backupRestoreSchema = new Schema<BackupRestoreSecuritySettings>(
    {
        backupHealthWarnAfterHours: { type: Number, default: 24, min: 1, max: 720 },
        requireRestoreApproval: { type: Boolean, default: true },
        archiveBeforeHardDelete: { type: Boolean, default: true },
        showStatusOnDashboard: { type: Boolean, default: true },
    },
    { _id: false },
);

const runtimeGuardsSchema = new Schema<RuntimeGuardSettings>(
    {
        maintenanceMode: { type: Boolean, default: false },
        blockNewRegistrations: { type: Boolean, default: false },
        readOnlyMode: { type: Boolean, default: false },
        disableStudentLogins: { type: Boolean, default: false },
        disablePaymentWebhooks: { type: Boolean, default: false },
        disableExamStarts: { type: Boolean, default: false },
        adminPanelEnabled: { type: Boolean, default: true },
        testingAccessMode: { type: Boolean, default: false },
    },
    { _id: false },
);

const SecuritySettingsSchema = new Schema<ISecuritySettings>(
    {
        key: { type: String, default: 'global', unique: true, index: true },
        passwordPolicy: { type: legacyPasswordPolicySchema, default: () => ({}) },
        loginProtection: { type: loginProtectionSchema, default: () => ({}) },
        session: { type: legacySessionSchema, default: () => ({}) },
        adminAccess: { type: adminAccessSchema, default: () => ({}) },
        siteAccess: { type: siteAccessSchema, default: () => ({}) },
        examProtection: { type: examProtectionSchema, default: () => ({}) },
        logging: { type: loggingSchema, default: () => ({}) },
        rateLimit: { type: rateLimitSchema, default: () => ({}) },
        twoPersonApproval: { type: twoPersonApprovalSchema, default: () => ({}) },
        retention: { type: retentionSchema, default: () => ({}) },
        panic: { type: panicSchema, default: () => ({}) },
        authentication: { type: authenticationSchema, default: () => ({}) },
        passwordPolicies: { type: passwordPoliciesSchema, default: () => ({}) },
        twoFactor: { type: twoFactorSchema, default: () => ({}) },
        sessions: { type: sessionsSchema, default: () => ({}) },
        accessControl: { type: accessControlSchema, default: () => ({}) },
        verificationRecovery: { type: verificationRecoverySchema, default: () => ({}) },
        uploadSecurity: { type: uploadSecuritySchema, default: () => ({}) },
        alerting: { type: alertingSchema, default: () => ({}) },
        exportSecurity: { type: exportSecuritySchema, default: () => ({}) },
        backupRestore: { type: backupRestoreSchema, default: () => ({}) },
        runtimeGuards: { type: runtimeGuardsSchema, default: () => ({}) },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    {
        timestamps: true,
        collection: 'security_settings',
        strict: true,
    },
);

export default mongoose.model<ISecuritySettings>('SecuritySettings', SecuritySettingsSchema);
