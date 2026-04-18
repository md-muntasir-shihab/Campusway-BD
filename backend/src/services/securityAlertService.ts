import SecurityAlert from '../models/SecurityAlert';
import SecurityAuditLog from '../models/SecurityAuditLog';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertType = 'auth_failure_spike' | 'otp_abuse' | 'suspicious_admin_activity' | 'anti_cheat_spike';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertThreshold {
    count: number;
    windowMs: number;
}

export interface CreateSecurityAlertParams {
    alertType: AlertType;
    severity: AlertSeverity;
    details: Record<string, unknown>;
}

// ─── Threshold Configuration ─────────────────────────────────────────────────

export const ALERT_THRESHOLDS: Record<AlertType, AlertThreshold> = {
    auth_failure_spike: { count: 10, windowMs: 5 * 60 * 1000 },       // 10 in 5 min
    otp_abuse: { count: 20, windowMs: 5 * 60 * 1000 },                // 20 in 5 min
    suspicious_admin_activity: { count: 5, windowMs: 60 * 60 * 1000 }, // 5 in 1 hour
    anti_cheat_spike: { count: 5, windowMs: 10 * 60 * 1000 },         // 5 in 10 min
};

// ─── Pure Function: Threshold Comparison ─────────────────────────────────────

/**
 * Determine whether an alert should be triggered based on event count vs threshold.
 * Pure function — no side effects.
 *
 * Returns true if eventCount >= threshold (i.e. the threshold has been met or exceeded).
 */
export function shouldTriggerAlert(
    _alertType: AlertType,
    eventCount: number,
    threshold: number,
): boolean {
    return eventCount >= threshold;
}

// ─── Alert Creation (DB side effect) ─────────────────────────────────────────

/**
 * Persist a security alert to the SecurityAlert collection.
 */
export async function createSecurityAlert(params: CreateSecurityAlertParams): Promise<void> {
    try {
        await SecurityAlert.create({
            alertType: params.alertType,
            severity: params.severity,
            details: params.details,
        });
    } catch {
        console.error('[SecurityAlertService] Failed to create alert:', params.alertType);
    }
}

// ─── Severity Mapping ────────────────────────────────────────────────────────

const ALERT_SEVERITY_MAP: Record<AlertType, AlertSeverity> = {
    auth_failure_spike: 'critical',
    otp_abuse: 'critical',
    suspicious_admin_activity: 'warning',
    anti_cheat_spike: 'warning',
};

// ─── Detection Logic ─────────────────────────────────────────────────────────

/**
 * Check for auth failure spike from a specific IP within the configured window.
 * Counts recent auth failure audit log entries and triggers alert if threshold met.
 */
export async function checkAuthFailureSpike(ipAddress: string): Promise<void> {
    const alertType: AlertType = 'auth_failure_spike';
    const { count: threshold, windowMs } = ALERT_THRESHOLDS[alertType];
    const windowStart = new Date(Date.now() - windowMs);

    try {
        const eventCount = await SecurityAuditLog.countDocuments({
            eventCategory: 'auth',
            eventType: { $regex: /^auth_failure_/ },
            ipAddress,
            createdAt: { $gte: windowStart },
        });

        if (shouldTriggerAlert(alertType, eventCount, threshold)) {
            await createSecurityAlert({
                alertType,
                severity: ALERT_SEVERITY_MAP[alertType],
                details: {
                    ipAddress,
                    failureCount: eventCount,
                    windowMs,
                    detectedAt: new Date().toISOString(),
                },
            });
        }
    } catch {
        console.error('[SecurityAlertService] Failed to check auth failure spike');
    }
}

/**
 * Check for OTP abuse from a specific IP within the configured window.
 */
export async function checkOtpAbuse(ipAddress: string): Promise<void> {
    const alertType: AlertType = 'otp_abuse';
    const { count: threshold, windowMs } = ALERT_THRESHOLDS[alertType];
    const windowStart = new Date(Date.now() - windowMs);

    try {
        const eventCount = await SecurityAuditLog.countDocuments({
            eventCategory: 'auth',
            eventType: 'auth_failure_invalid_otp',
            ipAddress,
            createdAt: { $gte: windowStart },
        });

        if (shouldTriggerAlert(alertType, eventCount, threshold)) {
            await createSecurityAlert({
                alertType,
                severity: ALERT_SEVERITY_MAP[alertType],
                details: {
                    ipAddress,
                    attemptCount: eventCount,
                    windowMs,
                    detectedAt: new Date().toISOString(),
                },
            });
        }
    } catch {
        console.error('[SecurityAlertService] Failed to check OTP abuse');
    }
}

/**
 * Check for suspicious admin activity — too many security settings changes
 * by a single admin within the configured window.
 */
export async function checkSuspiciousAdminActivity(actorId: string): Promise<void> {
    const alertType: AlertType = 'suspicious_admin_activity';
    const { count: threshold, windowMs } = ALERT_THRESHOLDS[alertType];
    const windowStart = new Date(Date.now() - windowMs);

    try {
        const eventCount = await SecurityAuditLog.countDocuments({
            eventCategory: 'admin',
            actorId,
            createdAt: { $gte: windowStart },
        });

        if (shouldTriggerAlert(alertType, eventCount, threshold)) {
            await createSecurityAlert({
                alertType,
                severity: ALERT_SEVERITY_MAP[alertType],
                details: {
                    actorId,
                    changeCount: eventCount,
                    windowMs,
                    detectedAt: new Date().toISOString(),
                },
            });
        }
    } catch {
        console.error('[SecurityAlertService] Failed to check suspicious admin activity');
    }
}

/**
 * Check for anti-cheat spike — too many session locks in a single exam
 * within the configured window.
 */
export async function checkAntiCheatSpike(examId: string): Promise<void> {
    const alertType: AlertType = 'anti_cheat_spike';
    const { count: threshold, windowMs } = ALERT_THRESHOLDS[alertType];
    const windowStart = new Date(Date.now() - windowMs);

    try {
        const eventCount = await SecurityAuditLog.countDocuments({
            eventCategory: 'anti_cheat',
            eventType: 'anti_cheat_lock',
            'details.examId': examId,
            createdAt: { $gte: windowStart },
        });

        if (shouldTriggerAlert(alertType, eventCount, threshold)) {
            await createSecurityAlert({
                alertType,
                severity: ALERT_SEVERITY_MAP[alertType],
                details: {
                    examId,
                    lockCount: eventCount,
                    windowMs,
                    detectedAt: new Date().toISOString(),
                },
            });
        }
    } catch {
        console.error('[SecurityAlertService] Failed to check anti-cheat spike');
    }
}
