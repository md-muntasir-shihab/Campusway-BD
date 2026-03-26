import {
    getSecuritySettingsSnapshot,
    invalidateSecuritySettingsCache,
} from './securityCenterService';

export type TwoFactorMethod = 'email' | 'sms' | 'authenticator';

export interface SecurityConfig {
    singleBrowserLogin: boolean;
    forceLogoutOnNewLogin: boolean;
    enable2faAdmin: boolean;
    enable2faStudent: boolean;
    force2faSuperAdmin: boolean;
    default2faMethod: TwoFactorMethod;
    otpExpiryMinutes: number;
    maxOtpAttempts: number;
    ipChangeAlert: boolean;
    allowLegacyTokens: boolean;
    strictExamTabLock: boolean;
    strictTokenHashValidation: boolean;
    testingAccessMode: boolean;
    requiredTwoFactorRoles: string[];
    allowedTwoFactorMethods: TwoFactorMethod[];
    stepUpSensitiveActions: boolean;
    allowTestOtp: boolean;
    testOtpCode: string;
    passwordPolicy: {
        minLength: number;
        requireNumber: boolean;
        requireUppercase: boolean;
        requireSpecial: boolean;
    };
    passwordPolicies: {
        default: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecial: boolean;
            denyCommonPasswords: boolean;
            preventReuseCount: number;
            expiryDays: number;
            forceResetOnFirstLogin: boolean;
        };
        admin: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecial: boolean;
            denyCommonPasswords: boolean;
            preventReuseCount: number;
            expiryDays: number;
            forceResetOnFirstLogin: boolean;
        };
        staff: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecial: boolean;
            denyCommonPasswords: boolean;
            preventReuseCount: number;
            expiryDays: number;
            forceResetOnFirstLogin: boolean;
        };
        student: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecial: boolean;
            denyCommonPasswords: boolean;
            preventReuseCount: number;
            expiryDays: number;
            forceResetOnFirstLogin: boolean;
        };
        strengthMeterEnabled: boolean;
    };
    authentication: {
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
    };
    verificationRecovery: {
        requireVerifiedEmailForStudents: boolean;
        requireVerifiedEmailForAdmins: boolean;
        phoneVerificationEnabled: boolean;
        emailVerificationExpiryHours: number;
        passwordResetExpiryMinutes: number;
        resendCooldownMinutes: number;
        allowAdminRecovery: boolean;
    };
    loginProtection: {
        maxAttempts: number;
        lockoutMinutes: number;
        recaptchaEnabled: boolean;
    };
    session: {
        accessTokenTTLMinutes: number;
        refreshTokenTTLDays: number;
        idleTimeoutMinutes: number;
    };
    adminAccess: {
        require2FAForAdmins: boolean;
        allowedAdminIPs: string[];
        adminPanelEnabled: boolean;
    };
    siteAccess: {
        maintenanceMode: boolean;
        blockNewRegistrations: boolean;
    };
    examProtection: {
        maxActiveSessionsPerUser: number;
        logTabSwitch: boolean;
        requireProfileScoreForExam: boolean;
        profileScoreThreshold: number;
    };
    logging: {
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        logLoginFailures: boolean;
        logAdminActions: boolean;
    };
    rateLimit: {
        loginWindowMs: number;
        loginMax: number;
        examSubmitWindowMs: number;
        examSubmitMax: number;
        adminWindowMs: number;
        adminMax: number;
        uploadWindowMs: number;
        uploadMax: number;
    };
    panic: {
        readOnlyMode: boolean;
        disableStudentLogins: boolean;
        disablePaymentWebhooks: boolean;
        disableExamStarts: boolean;
    };
}

let cache: { data: SecurityConfig; ts: number } | null = null;

export async function getSecurityConfig(forceRefresh = false): Promise<SecurityConfig> {
    if (!forceRefresh && cache && Date.now() - cache.ts < 30_000) {
        return cache.data;
    }

    const settings = await getSecuritySettingsSnapshot(forceRefresh);
    const requiredTwoFactorRoles = settings.twoFactor.requireForRoles.map((role) => role.toLowerCase());
    const enable2faAdmin = requiredTwoFactorRoles.some((role) => ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'].includes(role));
    const enable2faStudent = requiredTwoFactorRoles.includes('student');
    const forceLogoutOnNewLogin = !settings.sessions.allowConcurrentSessions || settings.sessions.maxActiveSessionsPerUser <= 1;

    const data: SecurityConfig = {
        singleBrowserLogin: forceLogoutOnNewLogin,
        forceLogoutOnNewLogin,
        enable2faAdmin,
        enable2faStudent,
        force2faSuperAdmin: requiredTwoFactorRoles.includes('superadmin'),
        default2faMethod: settings.twoFactor.defaultMethod,
        otpExpiryMinutes: settings.twoFactor.otpExpiryMinutes,
        maxOtpAttempts: settings.twoFactor.maxAttempts,
        ipChangeAlert: settings.authentication.newDeviceAlerts || settings.authentication.suspiciousLoginAlerts,
        allowLegacyTokens: false,
        strictExamTabLock: settings.examProtection.logTabSwitch,
        strictTokenHashValidation: true,
        testingAccessMode: settings.runtimeGuards.testingAccessMode,
        requiredTwoFactorRoles,
        allowedTwoFactorMethods: settings.twoFactor.allowedMethods,
        stepUpSensitiveActions: settings.twoFactor.stepUpForSensitiveActions,
        allowTestOtp: String(
            process.env.ALLOW_TEST_OTP ||
            (process.env.NODE_ENV === 'production' ? 'false' : 'true')
        ).trim().toLowerCase() === 'true',
        testOtpCode: String(process.env.TEST_OTP_CODE || '123456'),
        passwordPolicy: settings.passwordPolicy,
        passwordPolicies: settings.passwordPolicies,
        authentication: settings.authentication,
        loginProtection: settings.loginProtection,
        session: settings.session,
        adminAccess: settings.adminAccess,
        siteAccess: settings.siteAccess,
        examProtection: settings.examProtection,
        logging: settings.logging,
        rateLimit: settings.rateLimit,
        panic: settings.panic,
        verificationRecovery: settings.verificationRecovery,
    };

    cache = { data, ts: Date.now() };
    return data;
}

export function invalidateSecurityConfigCache(): void {
    cache = null;
    invalidateSecuritySettingsCache();
}
