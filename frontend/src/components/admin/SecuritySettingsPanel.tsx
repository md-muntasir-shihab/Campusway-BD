import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Lock, RotateCcw, Save, Shield, Unlock, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    AdminFeatureFlags,
    AdminActionApproval,
    SecurityCenterSettings,
    SensitiveActionProof,
    adminApprovePendingAction,
    adminForceLogoutAllUsers,
    adminGetPendingApprovals,
    adminGetRuntimeSettings,
    adminGetSecurityCenterSettings,
    adminRejectPendingAction,
    adminResetSecurityCenterSettings,
    adminSetAdminPanelLockState,
    adminUpdateRuntimeSettings,
    adminUpdateSecurityCenterSettings,
} from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';
import SecurityHelpButton, { type SecurityHelpButtonProps } from './SecurityHelpButton';
import { promptForSensitiveActionProof } from '../../utils/sensitiveAction';

const DEFAULT_SETTINGS: SecurityCenterSettings = {
    passwordPolicy: {
        minLength: 10,
        requireNumber: true,
        requireUppercase: true,
        requireSpecial: true,
    },
    loginProtection: {
        maxAttempts: 5,
        lockoutMinutes: 15,
        recaptchaEnabled: false,
    },
    session: {
        accessTokenTTLMinutes: 20,
        refreshTokenTTLDays: 7,
        idleTimeoutMinutes: 60,
    },
    adminAccess: {
        require2FAForAdmins: false,
        allowedAdminIPs: [],
        adminPanelEnabled: true,
    },
    siteAccess: {
        maintenanceMode: false,
        blockNewRegistrations: false,
    },
    examProtection: {
        maxActiveSessionsPerUser: 1,
        logTabSwitch: true,
        requireProfileScoreForExam: true,
        profileScoreThreshold: 70,
    },
    logging: {
        logLevel: 'info',
        logLoginFailures: true,
        logAdminActions: true,
    },
    rateLimit: {
        loginWindowMs: 15 * 60 * 1000,
        loginMax: 10,
        examSubmitWindowMs: 15 * 60 * 1000,
        examSubmitMax: 60,
        adminWindowMs: 15 * 60 * 1000,
        adminMax: 300,
        uploadWindowMs: 15 * 60 * 1000,
        uploadMax: 80,
    },
    twoPersonApproval: {
        enabled: false,
        riskyActions: [
            'students.bulk_delete',
            'universities.bulk_delete',
            'news.bulk_delete',
            'exams.publish_result',
            'news.publish_breaking',
            'payments.mark_refunded',
        ],
        approvalExpiryMinutes: 120,
    },
    retention: {
        enabled: false,
        examSessionsDays: 30,
        auditLogsDays: 180,
        eventLogsDays: 90,
    },
    panic: {
        readOnlyMode: false,
        disableStudentLogins: false,
        disablePaymentWebhooks: false,
        disableExamStarts: false,
    },
    authentication: {
        loginAttemptsLimit: 5,
        lockDurationMinutes: 15,
        genericErrorMessages: true,
        verificationRequired: true,
        allowedLoginMethods: ['username', 'email'],
        accountLockEnabled: true,
        newDeviceAlerts: true,
        suspiciousLoginAlerts: true,
        adminLoginAlerts: true,
        throttleWindowMinutes: 15,
        otpResendLimit: 8,
        otpVerifyLimit: 25,
        recaptchaEnabled: false,
    },
    twoFactor: {
        requireForRoles: ['superadmin', 'admin'],
        optionalForStudents: true,
        allowedMethods: ['authenticator', 'email'],
        defaultMethod: 'authenticator',
        emailFallbackEnabled: true,
        smsFallbackEnabled: false,
        backupCodesEnabled: true,
        stepUpForSensitiveActions: true,
        otpExpiryMinutes: 10,
        maxAttempts: 5,
    },
    accessControl: {
        enforceRoutePolicies: true,
        allowedAdminIPs: [],
        requireApprovalForRiskyActions: false,
        sensitiveActionReasonRequired: true,
        exportAllowedRoles: ['superadmin', 'admin', 'finance_agent'],
    },
    verificationRecovery: {
        requireVerifiedEmailForStudents: true,
        requireVerifiedEmailForAdmins: false,
        phoneVerificationEnabled: false,
        emailVerificationExpiryHours: 24,
        passwordResetExpiryMinutes: 60,
        resendCooldownMinutes: 5,
        allowAdminRecovery: true,
    },
    uploadSecurity: {
        publicAllowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        protectedAllowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'],
        maxImageSizeMB: 5,
        maxDocumentSizeMB: 10,
        blockDangerousExtensions: true,
        protectedAccessEnabled: true,
        virusScanStatus: 'hook_ready',
    },
    alerting: {
        recipients: [],
        failedLoginThreshold: 10,
        otpFailureThreshold: 10,
        backupFailureAlerts: true,
        providerChangeAlerts: true,
        exportAlerts: true,
        suspiciousAdminAlerts: true,
    },
    exportSecurity: {
        allowedRoles: ['superadmin', 'admin', 'finance_agent'],
        requireApproval: false,
        requireReason: true,
        logAllExports: true,
        maskSensitiveFields: true,
    },
    backupRestore: {
        backupHealthWarnAfterHours: 24,
        requireRestoreApproval: true,
        archiveBeforeHardDelete: true,
        showStatusOnDashboard: true,
    },
    runtimeGuards: {
        maintenanceMode: false,
        blockNewRegistrations: false,
        readOnlyMode: false,
        disableStudentLogins: false,
        disablePaymentWebhooks: false,
        disableExamStarts: false,
        adminPanelEnabled: true,
        testingAccessMode: false,
    },
    updatedBy: null,
    updatedAt: null,
};

const DEFAULT_RUNTIME_FLAGS: AdminFeatureFlags = {
    studentDashboardV2: false,
    studentManagementV2: false,
    subscriptionEngineV2: false,
    examShareLinks: false,
    proctoringSignals: false,
    aiQuestionSuggestions: false,
    pushNotifications: false,
    strictExamTabLock: false,
    webNextEnabled: false,
    trainingMode: false,
    requireDeleteKeywordConfirm: true,
};

const RISKY_ACTION_OPTIONS: Array<{
    key: SecurityCenterSettings['twoPersonApproval']['riskyActions'][number];
    label: string;
}> = [
    { key: 'data.destructive_change', label: 'All destructive deletes, archives, and restores' },
    { key: 'students.bulk_delete', label: 'Students bulk delete' },
    { key: 'universities.bulk_delete', label: 'Universities bulk delete' },
    { key: 'news.bulk_delete', label: 'News delete actions' },
    { key: 'exams.publish_result', label: 'Publish exam result' },
    { key: 'news.publish_breaking', label: 'Publish breaking news' },
    { key: 'payments.mark_refunded', label: 'Mark payment refunded' },
];

function numberInput(label: string, value: number, onChange: (next: number) => void, min = 0, max = 999999) {
    return (
        <input
            aria-label={label}
            title={label}
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(event) => onChange(Number(event.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white"
        />
    );
}

const SECTION_COPY: Record<string, { title: string; description: string }> = {
    settings: { title: 'Security Settings', description: 'Configure the platform-wide security baseline from one place.' },
    authentication: { title: 'Authentication & Login', description: 'Control login attempts, lockouts, and verification requirements.' },
    'password-policies': { title: 'Password Policies', description: 'Tune password complexity, expiry, and reset behavior by role.' },
    'two-factor': { title: 'Two-Factor Authentication', description: 'Enforce role-based MFA, backup codes, and sensitive-action step-up.' },
    sessions: { title: 'Sessions & Devices', description: 'Adjust session lifetime, forced logout behavior, and device visibility.' },
    'access-control': { title: 'Access Control & Role Security', description: 'Harden admin access, approvals, and privileged workflows.' },
    'api-route': { title: 'API & Route Protection', description: 'Review route enforcement, rate limits, and backend-only protections.' },
    verification: { title: 'Verification & Recovery', description: 'Manage email verification, reset expiry, and account recovery rules.' },
    uploads: { title: 'Upload & File Security', description: 'Set upload limits, allowed extensions, and protected-file rules.' },
    backup: { title: 'Backup & Restore Safety', description: 'Review retention, restore safeguards, and recoverability controls.' },
};

const SECTION_HELP: Record<string, SecurityHelpButtonProps> = {
    runtime: {
        title: 'Runtime Flags',
        content: 'These toggles change live feature exposure without replacing the main Security Center policy.',
        affected: 'Admins and students who can see route-gated features.',
        enabledNote: 'The linked runtime behavior becomes active immediately after saving.',
        disabledNote: 'The related feature stays hidden or inactive even if the code exists.',
        bestPractice: 'Keep runtime flags limited to rollout controls, not core security enforcement.',
    },
    password: {
        title: 'Password Policy',
        content: 'Controls minimum complexity and baseline password strength requirements.',
        impact: 'Reduces weak-password and credential-stuffing risk.',
        affected: 'All users creating or changing passwords.',
        enabledNote: 'New passwords must satisfy the configured complexity rules.',
        disabledNote: 'Users can set simpler passwords and account takeover risk rises.',
        bestPractice: 'Keep admin and staff passwords stronger than student defaults.',
    },
    login: {
        title: 'Login & Session Security',
        content: 'Sets lockouts, token lifetime, and idle timeout limits for authenticated sessions.',
        impact: 'Reduces brute-force attempts and stale-session abuse.',
        affected: 'All users logging into CampusWay.',
        enabledNote: 'Repeated failures trigger lockouts and idle sessions expire faster.',
        disabledNote: 'Attackers get longer windows to guess credentials or reuse sessions.',
        bestPractice: 'Keep idle timeouts tight for admin traffic and review session counts regularly.',
    },
    verification: {
        title: 'Verification & Recovery',
        content: 'Controls whether verified email is required before login and whether login messaging stays generic.',
        impact: 'Balances account assurance against access friction.',
        affected: 'Students and admins during login and recovery flows.',
        enabledNote: 'Only verified users can sign in for the selected role.',
        disabledNote: 'Unverified accounts can still sign in if their password is correct.',
        bestPractice: 'Keep admin verification optional only temporarily; turn it back on once admin emails are verified.',
    },
    adminAccess: {
        title: 'Admin Access',
        content: 'Defines admin-only protections like required MFA, IP allowlists, and panel availability.',
        impact: 'Protects the highest-privilege routes from account compromise.',
        affected: 'Superadmins, admins, moderators, and other staff roles.',
        enabledNote: 'Admins face stronger access checks before they can enter the control plane.',
        disabledNote: 'Privileged access depends more heavily on passwords alone.',
        bestPractice: 'Require authenticator-based 2FA for all privileged roles.',
    },
    siteExam: {
        title: 'Site & Exam Protection',
        content: 'Combines public-site gates with exam eligibility and anti-abuse settings.',
        impact: 'Reduces abuse on registrations and protects exam integrity.',
        affected: 'Public visitors and students entering exams.',
        enabledNote: 'Site restrictions and exam eligibility rules are enforced consistently.',
        disabledNote: 'More users can start registrations or exams with fewer guardrails.',
        bestPractice: 'Only lower these controls during planned maintenance or support incidents.',
    },
    rateLimit: {
        title: 'Rate Limiting',
        content: 'Controls request windows and burst ceilings for login, admin, exam submit, and upload actions.',
        impact: 'Helps block automated abuse before it reaches business logic.',
        affected: 'Any user or bot hitting protected endpoints.',
        enabledNote: 'Excessive request bursts are throttled and logged.',
        disabledNote: 'Attackers can hammer sensitive endpoints with fewer backend checks.',
        bestPractice: 'Set lower limits for login and uploads than for ordinary dashboard reads.',
    },
    logging: {
        title: 'Logging & Audit',
        content: 'Controls how much security telemetry is written for troubleshooting and incident review.',
        impact: 'Improves investigation quality after sensitive actions or failures.',
        affected: 'Security operators and admin reviewers.',
        enabledNote: 'Important auth and admin events remain visible in the audit trail.',
        disabledNote: 'You lose forensic detail needed during incident response.',
        bestPractice: 'Keep login-failure and admin-action logging enabled in production.',
    },
    sensitive: {
        title: 'Sensitive Actions & Exports',
        content: 'Determines whether risky actions require reasons, step-up 2FA, export approval, and protected-file access.',
        impact: 'Reduces silent misuse of exports, resets, restores, and provider changes.',
        affected: 'Admins performing destructive or data-sensitive operations.',
        enabledNote: 'Protected actions must supply proof and produce stronger audit evidence.',
        disabledNote: 'Sensitive actions execute with less friction and less accountability.',
        bestPractice: 'Keep reasons, export logs, and step-up authentication enabled for privileged operators.',
    },
    approval: {
        title: 'Two-Person Approval',
        content: 'Requires a second privileged reviewer before selected risky actions can execute.',
        impact: 'Prevents one compromised admin from making high-impact changes alone.',
        affected: 'Admins performing risky actions and approvers reviewing them.',
        enabledNote: 'Selected risky actions enter an approval queue before execution.',
        disabledNote: 'The initiating admin can execute those actions immediately.',
        bestPractice: 'Use this for exports, restores, and destructive bulk operations.',
    },
    panic: {
        title: 'Panic Mode',
        content: 'Emergency toggles for locking the platform into a safer mode during an incident.',
        impact: 'Limits blast radius while the incident is investigated.',
        affected: 'Students, admins, and payment/exam entry flows.',
        enabledNote: 'The selected surfaces stop accepting risky state changes.',
        disabledNote: 'Normal platform behavior resumes immediately.',
        bestPractice: 'Use only during real incidents and record the reason in audit logs.',
    },
    retention: {
        title: 'Retention Policy',
        content: 'Controls how long security-relevant operational records stay available.',
        impact: 'Balances investigation depth against storage cost.',
        affected: 'Audit reviewers, ops, and compliance reporting.',
        enabledNote: 'Old records are archived or pruned on the configured schedule.',
        disabledNote: 'Data remains longer and storage grows without policy enforcement.',
        bestPractice: 'Retain audit logs longer than transient exam session data.',
    },
    critical: {
        title: 'Critical Security Actions',
        content: 'Manual emergency controls for forced logout and admin panel locking.',
        impact: 'Lets security operators contain live incidents quickly.',
        affected: 'All active users or all admins, depending on the action.',
        enabledNote: 'The action executes immediately after sensitive-action proof passes.',
        disabledNote: 'The system keeps running with the current active sessions and admin access.',
        bestPractice: 'Always include a clear incident reason before using these controls.',
    },
};

const CONTROL_HELP: Record<string, SecurityHelpButtonProps> = {
    webNext: {
        title: 'Web Next Runtime Flag',
        content: 'Enables the newer admin or site experience without changing the core security policy document.',
        affected: 'Admins using routes wired to the newer frontend shell.',
        enabledNote: 'The newer route experience becomes reachable immediately after runtime save.',
        disabledNote: 'The platform keeps serving the current stable experience only.',
        bestPractice: 'Use this only for staged rollout, not as a substitute for RBAC or security settings.',
    },
    trainingMode: {
        title: 'Training Mode',
        content: 'Keeps training-only UI or sample workflows visible for controlled demos and onboarding.',
        affected: 'Admins working inside training-aware screens.',
        enabledNote: 'Training-oriented prompts or demo helpers can appear in the admin experience.',
        disabledNote: 'Only production-oriented controls remain visible.',
        bestPractice: 'Leave this off in production unless staff is actively rehearsing workflows.',
    },
    deleteKeyword: {
        title: 'Delete Keyword Confirmation',
        content: 'Requires explicit keyword confirmation before delete actions can proceed.',
        impact: 'Reduces accidental destructive actions during admin work.',
        affected: 'Admins performing hard delete or similar destructive actions.',
        enabledNote: 'Admins must deliberately type a confirmation keyword before deletion.',
        disabledNote: 'Delete prompts become easier to bypass by mistake.',
        bestPractice: 'Keep this on for any environment with real user or finance data.',
    },
    passwordMinLength: {
        title: 'Minimum Password Length',
        content: 'Sets the baseline character count for new passwords.',
        impact: 'Longer passwords make brute-force and credential guessing harder.',
        affected: 'All users changing or setting passwords.',
        enabledNote: 'Short passwords are rejected during password creation or reset.',
        disabledNote: 'Users can choose shorter passwords that are easier to crack.',
        bestPractice: 'Keep privileged roles at 10-12 characters or higher.',
    },
    passwordNumber: {
        title: 'Require Numbers',
        content: 'Adds a numeric character requirement to new passwords.',
        affected: 'All users creating or resetting passwords.',
        enabledNote: 'Passwords must include at least one digit.',
        disabledNote: 'Users can set passwords without numeric variation.',
        bestPractice: 'Combine this with length and special-character rules for admin accounts.',
    },
    passwordUppercase: {
        title: 'Require Uppercase',
        content: 'Requires at least one uppercase character in newly chosen passwords.',
        affected: 'All users during password set or reset.',
        enabledNote: 'Passwords missing uppercase letters are rejected.',
        disabledNote: 'Passwords can be simpler and easier to reuse across services.',
        bestPractice: 'Keep this on for staff and admin accounts.',
    },
    passwordSpecial: {
        title: 'Require Special Character',
        content: 'Requires symbols such as `!`, `@`, or `#` in newly created passwords.',
        affected: 'All password creation and reset flows.',
        enabledNote: 'Passwords must include a non-alphanumeric character.',
        disabledNote: 'Simpler passwords become valid and resistance drops.',
        bestPractice: 'Use together with deny-common-password checks and password history.',
    },
    loginMaxAttempts: {
        title: 'Max Login Attempts',
        content: 'Controls how many failed credential attempts are allowed before lockout.',
        impact: 'Limits brute-force and password-spraying attacks.',
        affected: 'Anyone attempting to sign in.',
        enabledNote: 'Repeated failures trigger lockout sooner.',
        disabledNote: 'Attackers get a larger window to guess credentials.',
        bestPractice: 'Keep this between 5 and 10 for public login surfaces.',
    },
    lockoutMinutes: {
        title: 'Lockout Duration',
        content: 'Sets how long an account stays locked after too many failed logins.',
        affected: 'Users who trigger failed-login protection.',
        enabledNote: 'Locked users must wait until the lockout window expires.',
        disabledNote: 'Lockouts clear too quickly and abuse pressure stays high.',
        bestPractice: 'Use at least 15 minutes for internet-exposed logins.',
    },
    accessTokenTtl: {
        title: 'Access Token Lifetime',
        content: 'Sets how long the in-memory access token can be used before refresh is required.',
        affected: 'All signed-in users.',
        enabledNote: 'Sessions refresh more often and stolen access tokens expire sooner.',
        disabledNote: 'A stolen access token remains useful for longer.',
        bestPractice: 'Keep admin access tokens short-lived.',
    },
    refreshTokenTtl: {
        title: 'Refresh Token Lifetime',
        content: 'Defines how long the refresh-cookie session can survive before re-login is required.',
        affected: 'All signed-in users with persistent sessions.',
        enabledNote: 'Users can stay signed in across browser restarts until this window ends.',
        disabledNote: 'Shorter persistence forces more frequent full reauthentication.',
        bestPractice: 'Use shorter windows for admin traffic than for students when possible.',
    },
    idleTimeout: {
        title: 'Idle Timeout',
        content: 'Ends inactive sessions after the configured number of idle minutes.',
        impact: 'Prevents abandoned browsers from staying authenticated.',
        affected: 'All users with inactive sessions.',
        enabledNote: 'Inactive sessions are revoked automatically after the timeout window.',
        disabledNote: 'Stale sessions remain live longer and increase hijack risk.',
        bestPractice: 'Set tighter idle timeouts for admin and finance access.',
    },
    adminEmailVerification: {
        title: 'Require Verified Email For Admin Login',
        content: 'Blocks admin sign-in until the admin email address is marked verified.',
        impact: 'Prevents unverified privileged identities from authenticating.',
        affected: 'Superadmins, admins, moderators, and other privileged roles.',
        enabledNote: 'Unverified admin accounts cannot log in until email verification is completed.',
        disabledNote: 'Admins can log in without email verification if their password is valid.',
        bestPractice: 'Keep this off only temporarily while fixing admin access, then turn it back on.',
    },
    studentEmailVerification: {
        title: 'Require Verified Email For Student Login',
        content: 'Blocks student access until the user completes email verification.',
        affected: 'Student login and recovery flows.',
        enabledNote: 'Only verified students can sign in.',
        disabledNote: 'Students can sign in before email verification completes.',
        bestPractice: 'Enable this when email deliverability and resend flows are stable.',
    },
    genericErrors: {
        title: 'Generic Login Errors',
        content: 'Hides whether the username, password, or account state caused a login failure.',
        impact: 'Reduces user enumeration and credential-testing intelligence.',
        affected: 'Anyone receiving login errors.',
        enabledNote: 'Attackers learn less about valid accounts from login responses.',
        disabledNote: 'Detailed login errors expose more account-state information.',
        bestPractice: 'Keep this enabled on public and admin login forms.',
    },
    newDeviceAlerts: {
        title: 'New Device Alerts',
        content: 'Raises alerts when a login comes from a new browser or IP signature.',
        impact: 'Helps catch account takeovers early.',
        affected: 'Users with new or unusual login context.',
        enabledNote: 'Security alerts appear for unseen device fingerprints or IP combinations.',
        disabledNote: 'Potential account takeover signals are easier to miss.',
        bestPractice: 'Pair this with admin alerting and session review.',
    },
    admin2fa: {
        title: 'Require 2FA For Admins',
        content: 'Forces privileged roles to complete two-factor authentication during login.',
        impact: 'Greatly reduces password-only compromise risk.',
        affected: 'Admin, staff, moderator, and similar privileged roles.',
        enabledNote: 'Privileged users must complete MFA before entering the admin panel.',
        disabledNote: 'Passwords alone can unlock privileged access.',
        bestPractice: 'Require authenticator-app MFA for all privileged accounts.',
    },
    adminPanelEnabled: {
        title: 'Admin Panel Availability',
        content: 'Acts as an emergency gate for the admin interface.',
        affected: 'All admins attempting to access the control plane.',
        enabledNote: 'Admins can access the panel normally if other policy checks pass.',
        disabledNote: 'Admin panel access is blocked until the toggle is turned back on.',
        bestPractice: 'Use this only during incidents, maintenance, or compromise response.',
    },
    allowedAdminIps: {
        title: 'Allowed Admin IPs',
        content: 'Restricts admin access to a comma-separated allowlist of trusted IP addresses.',
        impact: 'Shrinks the exposed admin attack surface.',
        affected: 'Admins signing in from non-allowlisted networks.',
        enabledNote: 'Only listed networks can access privileged admin routes.',
        disabledNote: 'Admins can log in from any network that passes authentication.',
        bestPractice: 'Use office, VPN, or bastion IPs and keep the list current.',
    },
    sensitiveReason: {
        title: 'Reason Required For Sensitive Actions',
        content: 'Requires a short operator explanation before risky actions can run.',
        impact: 'Improves accountability and audit context.',
        affected: 'Admins performing exports, resets, restores, and similar actions.',
        enabledNote: 'Protected actions must include an operator reason.',
        disabledNote: 'Audit evidence loses context about why an action happened.',
        bestPractice: 'Keep reasons mandatory for data export, role change, and session revocation.',
    },
    sensitiveStepUp: {
        title: 'Step-Up 2FA For Sensitive Actions',
        content: 'Requires fresh authenticator or backup-code confirmation even after login.',
        impact: 'Protects against stolen live sessions performing risky actions.',
        affected: '2FA-enabled admins executing protected actions.',
        enabledNote: 'Sensitive actions require a fresh 2FA check.',
        disabledNote: 'A stolen authenticated session can do more damage without extra proof.',
        bestPractice: 'Leave this on for exports, provider changes, restores, and password resets.',
    },
    exportLogging: {
        title: 'Log All Export Actions',
        content: 'Writes export operations into the audit trail with operator context.',
        affected: 'Admins exporting data and auditors reviewing those exports.',
        enabledNote: 'Exports appear in audit review and incident investigations.',
        disabledNote: 'Sensitive data movement becomes harder to trace later.',
        bestPractice: 'Keep export logging enabled for student, finance, and security datasets.',
    },
    exportApproval: {
        title: 'Require Approval For Exports',
        content: 'Queues protected export actions for secondary review when policy requires it.',
        affected: 'Admins exporting protected datasets and approving reviewers.',
        enabledNote: 'Selected exports pause until a second approver signs off.',
        disabledNote: 'The initiating admin can export immediately.',
        bestPractice: 'Use this for bulk student, finance, or contact exports.',
    },
    protectedUploads: {
        title: 'Protected File Access',
        content: 'Serves sensitive uploads through authenticated access checks instead of direct public URLs.',
        impact: 'Protects payment proofs, student documents, and other non-public files.',
        affected: 'Admins and students opening protected attachments.',
        enabledNote: 'Sensitive files require an authorized signed-in context to open.',
        disabledNote: 'Protected uploads can fall back to weaker direct access patterns.',
        bestPractice: 'Keep this enabled for any document containing personal or payment data.',
    },
    maintenanceMode: {
        title: 'Maintenance Mode',
        content: 'Places public-facing surfaces into a controlled maintenance experience.',
        affected: 'Public visitors and regular users during maintenance windows.',
        enabledNote: 'Visitors see the maintenance state instead of live interactions.',
        disabledNote: 'The live site remains fully available.',
        bestPractice: 'Enable only for planned changes or incident containment.',
    },
    blockRegistrations: {
        title: 'Block New Registrations',
        content: 'Stops creation of new student accounts while keeping existing accounts intact.',
        affected: 'New visitors trying to register.',
        enabledNote: 'New signups are blocked until the switch is turned off.',
        disabledNote: 'New student registration stays open.',
        bestPractice: 'Use during abuse spikes, migration windows, or invite-only launches.',
    },
    profileScoreThreshold: {
        title: 'Exam Profile Score Threshold',
        content: 'Sets the minimum profile-completion score required before students can enter exams.',
        affected: 'Students whose profiles are incomplete.',
        enabledNote: 'Students below the threshold cannot start protected exams.',
        disabledNote: 'Students can attempt exams with less-complete profiles.',
        bestPractice: 'Use this to keep exam eligibility tied to complete student records.',
    },
    maxActiveSessions: {
        title: 'Max Active Sessions Per User',
        content: 'Caps how many simultaneous sessions a single user can keep active.',
        impact: 'Limits credential sharing and stale device exposure.',
        affected: 'Users signing in from many devices at once.',
        enabledNote: 'Older sessions are forced out once the session cap is exceeded.',
        disabledNote: 'A user can stay signed in across more devices.',
        bestPractice: 'Keep lower caps for exam and admin contexts.',
    },
    requireProfileScore: {
        title: 'Require Profile Score For Exam Access',
        content: 'Enforces profile completion before exam entry rules can pass.',
        affected: 'Students launching protected exam routes.',
        enabledNote: 'Exam access checks the configured profile score threshold.',
        disabledNote: 'Profile completeness no longer blocks exam access.',
        bestPractice: 'Keep this enabled for high-stakes admission or result workflows.',
    },
    logTabSwitch: {
        title: 'Log Tab Switch Violations',
        content: 'Records tab switching or exam context changes for exam monitoring.',
        affected: 'Students taking monitored exams and reviewers investigating misconduct.',
        enabledNote: 'Potential exam integrity violations are recorded for review.',
        disabledNote: 'You lose monitoring context around suspicious exam behavior.',
        bestPractice: 'Keep this on wherever exam integrity matters.',
    },
    loginWindow: {
        title: 'Login Rate Limit Window',
        content: 'Defines the time window used for login request burst limits.',
        affected: 'All login attempts hitting rate-limited auth routes.',
        enabledNote: 'Rate limiting evaluates login bursts inside this window.',
        disabledNote: 'A poorly tuned window weakens login abuse protection.',
        bestPractice: 'Use a shorter window with a strict cap for login endpoints.',
    },
    loginRateMax: {
        title: 'Login Request Cap',
        content: 'Sets how many login requests are permitted inside the login rate-limit window.',
        affected: 'Users and bots sending repeated login requests.',
        enabledNote: 'Excess requests are throttled and can create abuse alerts.',
        disabledNote: 'Attackers can send more requests before being blocked.',
        bestPractice: 'Keep this aligned with failed-login lockout policy.',
    },
    adminWindow: {
        title: 'Admin Rate Limit Window',
        content: 'Defines the request window for privileged admin endpoints.',
        affected: 'Admins and automated scripts calling admin routes.',
        enabledNote: 'Admin bursts are measured inside this time window.',
        disabledNote: 'Too-wide windows reduce the value of admin throttling.',
        bestPractice: 'Tune this lower than general browsing traffic and monitor abuse.',
    },
    adminRateMax: {
        title: 'Admin Request Cap',
        content: 'Sets how many privileged admin requests are allowed per rate-limit window.',
        affected: 'Admins and automation hitting admin APIs.',
        enabledNote: 'Admin bursts above this cap are throttled.',
        disabledNote: 'Compromised tokens can hit more admin endpoints quickly.',
        bestPractice: 'Use stricter caps for write-heavy or destructive modules.',
    },
    logLevel: {
        title: 'Security Log Level',
        content: 'Controls the verbosity of security and operational logging.',
        affected: 'Operators reading logs and backend storage volume.',
        enabledNote: 'More detailed logs can be written when lower levels are selected.',
        disabledNote: 'Higher levels keep logs quieter but omit troubleshooting detail.',
        bestPractice: 'Use info or warn in production unless investigating an incident.',
    },
    logLoginFailures: {
        title: 'Log Login Failures',
        content: 'Writes failed sign-in attempts into monitoring and audit flows.',
        impact: 'Improves brute-force and suspicious-login detection.',
        affected: 'Security operators reviewing auth incidents.',
        enabledNote: 'Failed logins remain visible for dashboards and alerts.',
        disabledNote: 'Auth abuse becomes harder to investigate later.',
        bestPractice: 'Keep this enabled in all production environments.',
    },
    logAdminActions: {
        title: 'Log Admin Actions',
        content: 'Writes privileged admin changes into the audit trail.',
        impact: 'Provides accountability for changes made in the control plane.',
        affected: 'All privileged operators and auditors.',
        enabledNote: 'Admin actions remain searchable in audit review.',
        disabledNote: 'You lose visibility into who changed what in the admin area.',
        bestPractice: 'Never disable this outside of local development.',
    },
    approvalEnabled: {
        title: 'Two-Person Approval',
        content: 'Requires a second privileged reviewer for configured risky actions.',
        impact: 'Stops a single compromised admin from executing the riskiest actions alone.',
        affected: 'Initiators and approvers on protected workflows.',
        enabledNote: 'Configured actions enter an approval queue before execution.',
        disabledNote: 'The initiating admin can execute those actions immediately.',
        bestPractice: 'Use this for destructive bulk operations, restores, and sensitive exports.',
    },
    approvalExpiry: {
        title: 'Approval Expiry Window',
        content: 'Sets how long a pending approval request stays valid before it expires.',
        affected: 'Admins waiting for secondary approval.',
        enabledNote: 'Approvals must be completed within this time window.',
        disabledNote: 'Long expiry windows leave sensitive actions pending for too long.',
        bestPractice: 'Keep approval windows short enough to prevent stale approvals.',
    },
    panicReadOnly: {
        title: 'Read-Only Mode',
        content: 'Blocks non-superadmin state-changing actions during an incident.',
        impact: 'Reduces blast radius while investigating ongoing risk.',
        affected: 'Most privileged operators attempting writes.',
        enabledNote: 'Mutation-heavy admin actions are blocked for non-superadmins.',
        disabledNote: 'Normal write operations resume immediately.',
        bestPractice: 'Use during incidents, migrations, or suspected compromise.',
    },
    panicStudentLogins: {
        title: 'Disable Student Logins',
        content: 'Temporarily blocks student authentication at the backend.',
        affected: 'All student login attempts.',
        enabledNote: 'Students cannot sign in until the switch is turned off.',
        disabledNote: 'Student authentication remains available.',
        bestPractice: 'Reserve this for abuse spikes or incident containment.',
    },
    testingAccessMode: {
        title: 'Testing Access Mode',
        content: 'Temporarily bypasses login-time blockers so admins, students, and chairmen can test the platform without verification, lockout, or MFA interruptions.',
        impact: 'Improves QA access at the cost of weaker login-time protections.',
        affected: 'Admin, student, and chairman login flows plus sensitive-action OTP step-up.',
        enabledNote: 'Email verification, role-required 2FA, student-login disable, pending-verification login blocks, and active lockouts are bypassed until you turn this off.',
        disabledNote: 'Normal verification, lockout, and MFA requirements are enforced again immediately.',
        bestPractice: 'Use only in test or recovery windows and switch it off before production hardening.',
    },
    panicPaymentWebhooks: {
        title: 'Disable Payment Webhooks',
        content: 'Stops inbound payment webhook processing during incidents or provider issues.',
        affected: 'Payment ingestion and automation flows.',
        enabledNote: 'Payment webhooks stop mutating finance state.',
        disabledNote: 'Payment webhooks continue processing normally.',
        bestPractice: 'Turn this on only when payment integrity is at risk.',
    },
    panicExamStarts: {
        title: 'Disable Exam Starts',
        content: 'Prevents new exam sessions from starting while allowing containment work.',
        affected: 'Students trying to launch exams.',
        enabledNote: 'New exam attempts are blocked until the flag is cleared.',
        disabledNote: 'Exam starts continue normally.',
        bestPractice: 'Use when exam integrity, proctoring, or data sync is under investigation.',
    },
    retentionEnabled: {
        title: 'Retention Archiver',
        content: 'Turns on policy-based cleanup or archival windows for operational records.',
        affected: 'Audit, exam-session, and event-log storage lifecycles.',
        enabledNote: 'Retention schedules become active for configured record classes.',
        disabledNote: 'Operational records keep growing without lifecycle enforcement.',
        bestPractice: 'Enable this with careful retention periods that match incident response needs.',
    },
    retentionExam: {
        title: 'Exam Session Retention',
        content: 'Defines how many days exam session artifacts stay available.',
        affected: 'Exam investigations and storage usage.',
        enabledNote: 'Exam session records are retained for the configured number of days.',
        disabledNote: 'Short windows may remove evidence too quickly.',
        bestPractice: 'Keep this long enough for exam appeals and incident review.',
    },
    retentionAudit: {
        title: 'Audit Log Retention',
        content: 'Defines how many days privileged audit records remain available.',
        affected: 'Security reviews, compliance checks, and incident investigations.',
        enabledNote: 'Audit records stay searchable for the configured retention window.',
        disabledNote: 'Short retention weakens investigations and compliance posture.',
        bestPractice: 'Retain audit logs longer than transient operational telemetry.',
    },
    retentionEvent: {
        title: 'Event Log Retention',
        content: 'Defines how long analytics or event-level telemetry remains stored.',
        affected: 'Operational analytics and abuse investigations.',
        enabledNote: 'Event telemetry stays available for the configured period.',
        disabledNote: 'Short windows can remove abuse traces before review.',
        bestPractice: 'Tune this based on storage cost and investigation needs.',
    },
};

function sectionTitle(label: string, helpKey: keyof typeof SECTION_HELP) {
    return (
        <span className="inline-flex items-center gap-2">
            <span>{label}</span>
            <SecurityHelpButton {...SECTION_HELP[helpKey]} variant="full" />
        </span>
    );
}

function inlineLabel(label: string, helpKey: keyof typeof CONTROL_HELP) {
    return (
        <span className="inline-flex items-center gap-2">
            <span>{label}</span>
            <SecurityHelpButton {...CONTROL_HELP[helpKey]} />
        </span>
    );
}

export default function SecuritySettingsPanel({ section = 'settings' }: { section?: string }) {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<SecurityCenterSettings>(DEFAULT_SETTINGS);
    const [runtimeFlags, setRuntimeFlags] = useState<AdminFeatureFlags>(DEFAULT_RUNTIME_FLAGS);

    const adminPanelLocked = useMemo(() => !settings.adminAccess.adminPanelEnabled, [settings.adminAccess.adminPanelEnabled]);

    const securityQuery = useQuery({
        queryKey: queryKeys.securitySettings,
        queryFn: async () => (await adminGetSecurityCenterSettings()).data.settings,
    });
    const runtimeQuery = useQuery({
        queryKey: queryKeys.runtimeSettings,
        queryFn: async () => (await adminGetRuntimeSettings()).data.featureFlags,
    });
    const approvalsQuery = useQuery({
        queryKey: queryKeys.pendingApprovals,
        queryFn: async () => (await adminGetPendingApprovals({ limit: 100 })).data.items,
        refetchInterval: 30_000,
    });

    useEffect(() => {
        if (!securityQuery.data) return;
        setSettings({ ...DEFAULT_SETTINGS, ...(securityQuery.data || {}) });
    }, [securityQuery.data]);

    useEffect(() => {
        if (!runtimeQuery.data) return;
        setRuntimeFlags({ ...DEFAULT_RUNTIME_FLAGS, ...(runtimeQuery.data || {}) });
    }, [runtimeQuery.data]);

    useEffect(() => {
        if (securityQuery.isError && runtimeQuery.isError) {
            toast.error('Failed to load security settings');
        }
    }, [securityQuery.isError, runtimeQuery.isError]);

    const saveMutation = useMutation({
        mutationFn: async (proof: SensitiveActionProof) => {
            const payload = {
                passwordPolicy: settings.passwordPolicy,
                loginProtection: settings.loginProtection,
                session: settings.session,
                adminAccess: {
                    ...settings.adminAccess,
                    allowedAdminIPs: (settings.adminAccess.allowedAdminIPs || []).filter(Boolean),
                },
                siteAccess: settings.siteAccess,
                examProtection: settings.examProtection,
                logging: settings.logging,
                rateLimit: settings.rateLimit,
                twoPersonApproval: settings.twoPersonApproval,
                retention: settings.retention,
                panic: settings.panic,
                ...(settings.authentication ? { authentication: settings.authentication } : {}),
                ...(settings.passwordPolicies ? { passwordPolicies: settings.passwordPolicies } : {}),
                ...(settings.twoFactor ? { twoFactor: settings.twoFactor } : {}),
                ...(settings.sessions ? { sessions: settings.sessions } : {}),
                ...(settings.accessControl ? { accessControl: settings.accessControl } : {}),
                ...(settings.verificationRecovery ? { verificationRecovery: settings.verificationRecovery } : {}),
                ...(settings.uploadSecurity ? { uploadSecurity: settings.uploadSecurity } : {}),
                ...(settings.alerting ? { alerting: settings.alerting } : {}),
                ...(settings.exportSecurity ? { exportSecurity: settings.exportSecurity } : {}),
                ...(settings.backupRestore ? { backupRestore: settings.backupRestore } : {}),
                ...(settings.runtimeGuards ? { runtimeGuards: settings.runtimeGuards } : {}),
            };
            return adminUpdateSecurityCenterSettings(payload, proof);
        },
        onSuccess: async (response) => {
            setSettings({ ...DEFAULT_SETTINGS, ...(response.data.settings || {}) });
            toast.success('Security Center updated');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.securitySettings }),
                queryClient.invalidateQueries({ queryKey: queryKeys.runtimeSettings }),
                queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals }),
            ]);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to save security settings');
        },
    });

    const runtimeMutation = useMutation({
        mutationFn: async () => adminUpdateRuntimeSettings({ featureFlags: runtimeFlags }),
        onSuccess: async (response) => {
            setRuntimeFlags({ ...DEFAULT_RUNTIME_FLAGS, ...(response.data.featureFlags || {}) });
            toast.success('Runtime flags updated');
            await queryClient.invalidateQueries({ queryKey: queryKeys.runtimeSettings });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to save runtime flags');
        },
    });

    const resetMutation = useMutation({
        mutationFn: async (proof: SensitiveActionProof) => adminResetSecurityCenterSettings(proof),
        onSuccess: async (response) => {
            setSettings({ ...DEFAULT_SETTINGS, ...(response.data.settings || {}) });
            toast.success('Security settings reset to default');
            await queryClient.invalidateQueries({ queryKey: queryKeys.securitySettings });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Reset failed');
        },
    });

    const forceLogoutMutation = useMutation({
        mutationFn: async (proof: SensitiveActionProof) => adminForceLogoutAllUsers('security_center_force_logout_all', proof),
        onSuccess: (response) => {
            toast.success(`Force logout completed (${response.data.terminatedCount} sessions)`);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Force logout failed');
        },
    });

    const toggleLockMutation = useMutation({
        mutationFn: async (proof: SensitiveActionProof) => adminSetAdminPanelLockState(adminPanelLocked, proof),
        onSuccess: async (response) => {
            setSettings((prev) => ({
                ...prev,
                ...(response.data.settings || {}),
            }));
            toast.success(adminPanelLocked ? 'Admin panel unlocked' : 'Admin panel locked');
            await queryClient.invalidateQueries({ queryKey: queryKeys.securitySettings });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Admin lock action failed');
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => adminApprovePendingAction(id),
        onSuccess: async () => {
            toast.success('Approval executed');
            await queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Approval failed');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async (payload: { id: string; reason: string }) => adminRejectPendingAction(payload.id, payload.reason),
        onSuccess: async () => {
            toast.success('Approval rejected');
            await queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Reject failed');
        },
    });

    const requestProof = async (actionLabel: string, defaultReason: string) => {
        return promptForSensitiveActionProof({
            actionLabel,
            defaultReason,
            requireOtpHint: true,
        });
    };

    const saveChanges = async () => {
        const proof = await requestProof('update security settings', 'Update Security Center settings');
        if (!proof) return;
        await saveMutation.mutateAsync(proof);
    };

    const saveRuntime = async () => {
        await runtimeMutation.mutateAsync();
    };

    const resetDefaults = async () => {
        const proof = await requestProof('reset security settings', 'Reset Security Center defaults');
        if (!proof) return;
        await resetMutation.mutateAsync(proof);
    };

    const forceLogoutAll = async () => {
        const proof = await requestProof('force logout all sessions', 'Force logout all active sessions');
        if (!proof) return;
        await forceLogoutMutation.mutateAsync(proof);
    };

    const toggleAdminLock = async () => {
        const proof = await requestProof(
            adminPanelLocked ? 'unlock admin panel' : 'lock admin panel',
            adminPanelLocked ? 'Unlock admin panel access' : 'Lock admin panel access',
        );
        if (!proof) return;
        await toggleLockMutation.mutateAsync(proof);
    };

    const pendingApprovals: AdminActionApproval[] = approvalsQuery.data || [];

    const approveItem = async (id: string) => {
        await approveMutation.mutateAsync(id);
    };

    const rejectItem = async (id: string) => {
        await rejectMutation.mutateAsync({ id, reason: 'Rejected from Security Center queue' });
    };

    if (securityQuery.isLoading || runtimeQuery.isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white">{SECTION_COPY[section]?.title || SECTION_COPY.settings.title}</h2>
                <p className="mt-1 text-sm text-slate-400">
                    {SECTION_COPY[section]?.description || SECTION_COPY.settings.description}
                </p>
            </section>
            <section className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                            <Shield className="h-5 w-5 text-indigo-400" />
                            Security Center
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Configure password policy, session security, admin access, exam guardrails, and rate limits.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => void saveChanges()}
                            disabled={saveMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save changes
                        </button>
                        <button
                            onClick={() => void resetDefaults()}
                            disabled={resetMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 px-4 py-2 text-sm text-slate-200 hover:bg-indigo-500/10 disabled:opacity-60"
                        >
                            {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            Reset defaults
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white">{sectionTitle('Runtime Flags', 'runtime')}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Toggle runtime feature switches and persist them immediately.
                        </p>
                    </div>
                    <button
                        onClick={() => void saveRuntime()}
                        disabled={runtimeMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {runtimeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Runtime
                    </button>
                </div>
                <div className="mt-4 rounded-xl border border-indigo-500/15 bg-slate-950/70 p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                            <span>{inlineLabel('Web Next (Stored)', 'webNext')}</span>
                            <input
                                data-testid="runtime-flag-web-next"
                                type="checkbox"
                                checked={Boolean(runtimeFlags.webNextEnabled)}
                                onChange={(event) => setRuntimeFlags((prev) => ({ ...prev, webNextEnabled: event.target.checked }))}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                            <span>{inlineLabel('Training Mode', 'trainingMode')}</span>
                            <input
                                type="checkbox"
                                checked={Boolean(runtimeFlags.trainingMode)}
                                onChange={(event) => setRuntimeFlags((prev) => ({ ...prev, trainingMode: event.target.checked }))}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                            <span>{inlineLabel('Require "DELETE" Confirm', 'deleteKeyword')}</span>
                            <input
                                type="checkbox"
                                checked={Boolean(runtimeFlags.requireDeleteKeywordConfirm)}
                                onChange={(event) => setRuntimeFlags((prev) => ({ ...prev, requireDeleteKeywordConfirm: event.target.checked }))}
                            />
                        </label>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Password Policy', 'password')}</h3>
                    <label className="text-sm text-slate-300">{inlineLabel('Minimum length', 'passwordMinLength')}
                        {numberInput('Minimum length', settings.passwordPolicy.minLength, (next) => setSettings((prev) => ({
                            ...prev,
                            passwordPolicy: { ...prev.passwordPolicy, minLength: Math.max(8, next) },
                        })), 8, 64)}
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require number', 'passwordNumber')}</span>
                        <input aria-label="Require number" type="checkbox" checked={settings.passwordPolicy.requireNumber} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            passwordPolicy: { ...prev.passwordPolicy, requireNumber: event.target.checked },
                        }))} />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require uppercase', 'passwordUppercase')}</span>
                        <input aria-label="Require uppercase" type="checkbox" checked={settings.passwordPolicy.requireUppercase} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            passwordPolicy: { ...prev.passwordPolicy, requireUppercase: event.target.checked },
                        }))} />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require special char', 'passwordSpecial')}</span>
                        <input aria-label="Require special char" type="checkbox" checked={settings.passwordPolicy.requireSpecial} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            passwordPolicy: { ...prev.passwordPolicy, requireSpecial: event.target.checked },
                        }))} />
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Login & Session Security', 'login')}</h3>
                    <label className="text-sm text-slate-300">{inlineLabel('Max login attempts', 'loginMaxAttempts')}
                        {numberInput('Max login attempts', settings.loginProtection.maxAttempts, (next) => setSettings((prev) => ({
                            ...prev,
                            loginProtection: { ...prev.loginProtection, maxAttempts: Math.max(1, next) },
                        })), 1, 20)}
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Lockout minutes', 'lockoutMinutes')}
                        {numberInput('Lockout minutes', settings.loginProtection.lockoutMinutes, (next) => setSettings((prev) => ({
                            ...prev,
                            loginProtection: { ...prev.loginProtection, lockoutMinutes: Math.max(1, next) },
                        })), 1, 240)}
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Access token TTL (minutes)', 'accessTokenTtl')}
                        {numberInput('Access token TTL', settings.session.accessTokenTTLMinutes, (next) => setSettings((prev) => ({
                            ...prev,
                            session: { ...prev.session, accessTokenTTLMinutes: Math.max(5, next) },
                        })), 5, 180)}
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Refresh token TTL (days)', 'refreshTokenTtl')}
                        {numberInput('Refresh token TTL', settings.session.refreshTokenTTLDays, (next) => setSettings((prev) => ({
                            ...prev,
                            session: { ...prev.session, refreshTokenTTLDays: Math.max(1, next) },
                        })), 1, 120)}
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Idle timeout (minutes)', 'idleTimeout')}
                        {numberInput('Idle timeout', settings.session.idleTimeoutMinutes, (next) => setSettings((prev) => ({
                            ...prev,
                            session: { ...prev.session, idleTimeoutMinutes: Math.max(5, next) },
                        })), 5, 1440)}
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Verification & Recovery', 'verification')}</h3>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require verified email for admin login', 'adminEmailVerification')}</span>
                        <input
                            aria-label="Require verified email for admin login"
                            type="checkbox"
                            checked={Boolean(settings.verificationRecovery?.requireVerifiedEmailForAdmins)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                verificationRecovery: {
                                    ...prev.verificationRecovery!,
                                    requireVerifiedEmailForAdmins: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require verified email for student login', 'studentEmailVerification')}</span>
                        <input
                            aria-label="Require verified email for student login"
                            type="checkbox"
                            checked={Boolean(settings.verificationRecovery?.requireVerifiedEmailForStudents)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                verificationRecovery: {
                                    ...prev.verificationRecovery!,
                                    requireVerifiedEmailForStudents: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Use generic login error messages', 'genericErrors')}</span>
                        <input
                            aria-label="Use generic login error messages"
                            type="checkbox"
                            checked={Boolean(settings.authentication?.genericErrorMessages)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                authentication: {
                                    ...prev.authentication!,
                                    genericErrorMessages: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Alert on new device login', 'newDeviceAlerts')}</span>
                        <input
                            aria-label="Alert on new device login"
                            type="checkbox"
                            checked={Boolean(settings.authentication?.newDeviceAlerts)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                authentication: {
                                    ...prev.authentication!,
                                    newDeviceAlerts: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Admin Access', 'adminAccess')}</h3>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require 2FA for admins', 'admin2fa')}</span>
                        <input aria-label="Require 2FA for admins" type="checkbox" checked={settings.adminAccess.require2FAForAdmins} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            adminAccess: { ...prev.adminAccess, require2FAForAdmins: event.target.checked },
                        }))} />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Admin panel enabled', 'adminPanelEnabled')}</span>
                        <input aria-label="Admin panel enabled" type="checkbox" checked={settings.adminAccess.adminPanelEnabled} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            adminAccess: { ...prev.adminAccess, adminPanelEnabled: event.target.checked },
                        }))} />
                    </label>
                    <label className="text-sm text-slate-300">
                        {inlineLabel('Allowed Admin IPs (comma separated)', 'allowedAdminIps')}
                        <textarea
                            aria-label="Allowed Admin IPs"
                            title="Allowed Admin IPs"
                            value={(settings.adminAccess.allowedAdminIPs || []).join(', ')}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                adminAccess: {
                                    ...prev.adminAccess,
                                    allowedAdminIPs: event.target.value
                                        .split(',')
                                        .map((item) => item.trim())
                                        .filter(Boolean),
                                },
                            }))}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white"
                        />
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Sensitive Actions & Exports', 'sensitive')}</h3>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require reason for sensitive actions', 'sensitiveReason')}</span>
                        <input
                            aria-label="Require reason for sensitive actions"
                            type="checkbox"
                            checked={Boolean(settings.accessControl?.sensitiveActionReasonRequired)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                accessControl: {
                                    ...prev.accessControl!,
                                    sensitiveActionReasonRequired: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Step-up 2FA for sensitive actions', 'sensitiveStepUp')}</span>
                        <input
                            aria-label="Step-up 2FA for sensitive actions"
                            type="checkbox"
                            checked={Boolean(settings.twoFactor?.stepUpForSensitiveActions)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                twoFactor: {
                                    ...prev.twoFactor!,
                                    stepUpForSensitiveActions: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Log all export actions', 'exportLogging')}</span>
                        <input
                            aria-label="Log all export actions"
                            type="checkbox"
                            checked={Boolean(settings.exportSecurity?.logAllExports)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                exportSecurity: {
                                    ...prev.exportSecurity!,
                                    logAllExports: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require approval for exports', 'exportApproval')}</span>
                        <input
                            aria-label="Require approval for exports"
                            type="checkbox"
                            checked={Boolean(settings.exportSecurity?.requireApproval)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                exportSecurity: {
                                    ...prev.exportSecurity!,
                                    requireApproval: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Protected file access enabled', 'protectedUploads')}</span>
                        <input
                            aria-label="Protected file access enabled"
                            type="checkbox"
                            checked={Boolean(settings.uploadSecurity?.protectedAccessEnabled)}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                uploadSecurity: {
                                    ...prev.uploadSecurity!,
                                    protectedAccessEnabled: event.target.checked,
                                },
                            }))}
                        />
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Site & Exam Protection', 'siteExam')}</h3>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Maintenance mode', 'maintenanceMode')}</span>
                        <input aria-label="Maintenance mode" type="checkbox" checked={settings.siteAccess.maintenanceMode} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            siteAccess: { ...prev.siteAccess, maintenanceMode: event.target.checked },
                        }))} />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Block new registrations', 'blockRegistrations')}</span>
                        <input aria-label="Block new registrations" type="checkbox" checked={settings.siteAccess.blockNewRegistrations} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            siteAccess: { ...prev.siteAccess, blockNewRegistrations: event.target.checked },
                        }))} />
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Profile score threshold for exams', 'profileScoreThreshold')}
                        {numberInput('Profile score threshold', settings.examProtection.profileScoreThreshold, (next) => setSettings((prev) => ({
                            ...prev,
                            examProtection: { ...prev.examProtection, profileScoreThreshold: Math.max(0, Math.min(100, next)) },
                        })), 0, 100)}
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Max active sessions per user', 'maxActiveSessions')}
                        {numberInput('Max active sessions', settings.examProtection.maxActiveSessionsPerUser, (next) => setSettings((prev) => ({
                            ...prev,
                            examProtection: { ...prev.examProtection, maxActiveSessionsPerUser: Math.max(1, next) },
                        })), 1, 5)}
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require profile score for exam access', 'requireProfileScore')}</span>
                        <input aria-label="Require profile score" type="checkbox" checked={settings.examProtection.requireProfileScoreForExam} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            examProtection: { ...prev.examProtection, requireProfileScoreForExam: event.target.checked },
                        }))} />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Log tab switch violations', 'logTabSwitch')}</span>
                        <input aria-label="Log tab switch" type="checkbox" checked={settings.examProtection.logTabSwitch} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            examProtection: { ...prev.examProtection, logTabSwitch: event.target.checked },
                        }))} />
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Rate Limiting', 'rateLimit')}</h3>
                    <label className="text-sm text-slate-300">{inlineLabel('Login window (ms)', 'loginWindow')}
                        {numberInput('Login window', settings.rateLimit.loginWindowMs, (next) => setSettings((prev) => ({
                            ...prev,
                            rateLimit: { ...prev.rateLimit, loginWindowMs: Math.max(10000, next) },
                        })), 10000, 86400000)}
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Login max requests', 'loginRateMax')}
                        {numberInput('Login max requests', settings.rateLimit.loginMax, (next) => setSettings((prev) => ({
                            ...prev,
                            rateLimit: { ...prev.rateLimit, loginMax: Math.max(1, next) },
                        })), 1, 500)}
                    </label>
                    <label className="text-sm text-slate-300">Exam submit window (ms)
                        {numberInput('Exam submit window', settings.rateLimit.examSubmitWindowMs, (next) => setSettings((prev) => ({
                            ...prev,
                            rateLimit: { ...prev.rateLimit, examSubmitWindowMs: Math.max(10000, next) },
                        })), 10000, 86400000)}
                    </label>
                    <label className="text-sm text-slate-300">Exam submit max
                        {numberInput('Exam submit max', settings.rateLimit.examSubmitMax, (next) => setSettings((prev) => ({
                            ...prev,
                            rateLimit: { ...prev.rateLimit, examSubmitMax: Math.max(1, next) },
                        })), 1, 2000)}
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Admin window (ms)', 'adminWindow')}
                        {numberInput('Admin window', settings.rateLimit.adminWindowMs, (next) => setSettings((prev) => ({
                            ...prev,
                            rateLimit: { ...prev.rateLimit, adminWindowMs: Math.max(10000, next) },
                        })), 10000, 86400000)}
                    </label>
                    <label className="text-sm text-slate-300">{inlineLabel('Admin max', 'adminRateMax')}
                        {numberInput('Admin max', settings.rateLimit.adminMax, (next) => setSettings((prev) => ({
                            ...prev,
                            rateLimit: { ...prev.rateLimit, adminMax: Math.max(1, next) },
                        })), 1, 5000)}
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Logging & Audit', 'logging')}</h3>
                    <label className="text-sm text-slate-300">
                        {inlineLabel('Log level', 'logLevel')}
                        <select
                            aria-label="Log level"
                            title="Log level"
                            value={settings.logging.logLevel}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                logging: { ...prev.logging, logLevel: event.target.value as SecurityCenterSettings['logging']['logLevel'] },
                            }))}
                            className="mt-1 w-full rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white"
                        >
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warn">Warn</option>
                            <option value="error">Error</option>
                        </select>
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Log login failures', 'logLoginFailures')}</span>
                        <input aria-label="Log login failures" type="checkbox" checked={settings.logging.logLoginFailures} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            logging: { ...prev.logging, logLoginFailures: event.target.checked },
                        }))} />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Log admin actions', 'logAdminActions')}</span>
                        <input aria-label="Log admin actions" type="checkbox" checked={settings.logging.logAdminActions} onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            logging: { ...prev.logging, logAdminActions: event.target.checked },
                        }))} />
                    </label>
                    <p className="rounded-lg border border-indigo-500/15 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
                        Updated at: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'N/A'}
                    </p>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Two-Person Approval', 'approval')}</h3>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Require second approver for risky actions', 'approvalEnabled')}</span>
                        <input
                            type="checkbox"
                            checked={settings.twoPersonApproval.enabled}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                twoPersonApproval: { ...prev.twoPersonApproval, enabled: event.target.checked },
                            }))}
                        />
                    </label>
                    <label className="text-sm text-slate-300">
                        {inlineLabel('Approval expiry (minutes)', 'approvalExpiry')}
                        {numberInput(
                            'Approval expiry',
                            settings.twoPersonApproval.approvalExpiryMinutes,
                            (next) => setSettings((prev) => ({
                                ...prev,
                                twoPersonApproval: {
                                    ...prev.twoPersonApproval,
                                    approvalExpiryMinutes: Math.max(5, next),
                                },
                            })),
                            5,
                            1440,
                        )}
                    </label>
                    <div className="space-y-2 rounded-xl border border-indigo-500/15 bg-slate-950/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Risky actions</p>
                        {RISKY_ACTION_OPTIONS.map((item) => {
                            const checked = settings.twoPersonApproval.riskyActions.includes(item.key);
                            return (
                                <label key={item.key} className="flex items-center justify-between gap-3 text-sm text-slate-200">
                                    <span>{item.label}</span>
                                    <input
                                        aria-label={item.label}
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) => {
                                            const next = event.target.checked
                                                ? [...settings.twoPersonApproval.riskyActions, item.key]
                                                : settings.twoPersonApproval.riskyActions.filter((key) => key !== item.key);
                                            setSettings((prev) => ({
                                                ...prev,
                                                twoPersonApproval: {
                                                    ...prev.twoPersonApproval,
                                                    riskyActions: Array.from(new Set(next)),
                                                },
                                            }));
                                        }}
                                    />
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-rose-300">{sectionTitle('Panic Mode', 'panic')}</h3>
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/8 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">{inlineLabel('Testing access mode', 'testingAccessMode')}</h4>
                                <p className="max-w-2xl text-sm text-amber-50/90">
                                    Turn this on only while testing. It temporarily bypasses email verification, login lockouts, student login disable, required 2FA, and pending-verification login blocks for admin, student, and chairman sign-in.
                                </p>
                            </div>
                            <input
                                aria-label="Testing access mode"
                                type="checkbox"
                                checked={Boolean(settings.runtimeGuards?.testingAccessMode)}
                                onChange={(event) => setSettings((prev) => ({
                                    ...prev,
                                    runtimeGuards: {
                                        ...prev.runtimeGuards!,
                                        testingAccessMode: event.target.checked,
                                    },
                                }))}
                            />
                        </div>
                        <p className="mt-3 text-xs text-amber-100/80">
                            Password checks, blocked or suspended accounts, and route permissions still stay enforced.
                        </p>
                    </div>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Read-only mode (non-superadmin mutations blocked)', 'panicReadOnly')}</span>
                        <input
                            aria-label="Read-only mode"
                            type="checkbox"
                            checked={settings.panic.readOnlyMode}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                panic: { ...prev.panic, readOnlyMode: event.target.checked },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Disable student logins', 'panicStudentLogins')}</span>
                        <input
                            aria-label="Disable student logins"
                            type="checkbox"
                            checked={settings.panic.disableStudentLogins}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                panic: { ...prev.panic, disableStudentLogins: event.target.checked },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Disable payment webhooks', 'panicPaymentWebhooks')}</span>
                        <input
                            aria-label="Disable payment webhooks"
                            type="checkbox"
                            checked={settings.panic.disablePaymentWebhooks}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                panic: { ...prev.panic, disablePaymentWebhooks: event.target.checked },
                            }))}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Disable exam starts', 'panicExamStarts')}</span>
                        <input
                            aria-label="Disable exam starts"
                            type="checkbox"
                            checked={settings.panic.disableExamStarts}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                panic: { ...prev.panic, disableExamStarts: event.target.checked },
                            }))}
                        />
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{sectionTitle('Retention Policy', 'retention')}</h3>
                    <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
                        <span>{inlineLabel('Enable retention archiver', 'retentionEnabled')}</span>
                        <input
                            aria-label="Enable retention archiver"
                            type="checkbox"
                            checked={settings.retention.enabled}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                retention: { ...prev.retention, enabled: event.target.checked },
                            }))}
                        />
                    </label>
                    <label className="text-sm text-slate-300">
                        {inlineLabel('Exam sessions retention (days)', 'retentionExam')}
                        {numberInput(
                            'Exam sessions retention',
                            settings.retention.examSessionsDays,
                            (next) => setSettings((prev) => ({
                                ...prev,
                                retention: { ...prev.retention, examSessionsDays: Math.max(7, next) },
                            })),
                            7,
                            3650,
                        )}
                    </label>
                    <label className="text-sm text-slate-300">
                        {inlineLabel('Audit logs retention (days)', 'retentionAudit')}
                        {numberInput(
                            'Audit logs retention',
                            settings.retention.auditLogsDays,
                            (next) => setSettings((prev) => ({
                                ...prev,
                                retention: { ...prev.retention, auditLogsDays: Math.max(30, next) },
                            })),
                            30,
                            3650,
                        )}
                    </label>
                    <label className="text-sm text-slate-300">
                        {inlineLabel('Event logs retention (days)', 'retentionEvent')}
                        {numberInput(
                            'Event logs retention',
                            settings.retention.eventLogsDays,
                            (next) => setSettings((prev) => ({
                                ...prev,
                                retention: { ...prev.retention, eventLogsDays: Math.max(30, next) },
                            })),
                            30,
                            3650,
                        )}
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-6">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Pending Approvals</h3>
                        <span className="text-xs text-slate-500">{pendingApprovals.length} pending</span>
                    </div>
                    <div className="space-y-2">
                        {approvalsQuery.isLoading ? (
                            <p className="rounded-lg border border-indigo-500/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-400">
                                Loading approval queue...
                            </p>
                        ) : pendingApprovals.length === 0 ? (
                            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                                No pending second approvals.
                            </p>
                        ) : pendingApprovals.slice(0, 10).map((item) => (
                            <div key={item._id} className="rounded-xl border border-indigo-500/15 bg-slate-950/70 p-3">
                                <p className="text-sm font-medium text-white">{item.actionKey}</p>
                                <p className="mt-1 text-xs text-slate-400">
                                    Initiator role: {item.initiatedByRole} · Expires: {new Date(item.expiresAt).toLocaleString()}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => void approveItem(item._id)}
                                        disabled={approveMutation.isPending}
                                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                        Approve & Execute
                                    </button>
                                    <button
                                        onClick={() => void rejectItem(item._id)}
                                        disabled={rejectMutation.isPending}
                                        className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    {sectionTitle('Critical Security Actions', 'critical')}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <button
                        onClick={() => void forceLogoutAll()}
                        disabled={forceLogoutMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                        {forceLogoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                        Force logout all users
                    </button>
                    <button
                        onClick={() => void toggleAdminLock()}
                        disabled={toggleLockMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-400/10 disabled:opacity-60"
                    >
                        {toggleLockMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : adminPanelLocked ? (
                            <Unlock className="h-4 w-4" />
                        ) : (
                            <Lock className="h-4 w-4" />
                        )}
                        {adminPanelLocked ? 'Unlock admin panel' : 'Lock admin panel'}
                    </button>
                </div>
            </section>
        </div>
    );
}
