import SecurityAuditLog from '../models/SecurityAuditLog';
import SecuritySettings from '../models/SecuritySettings';
import type { SecurityLogLevel } from '../models/SecuritySettings';
import type { AntiCheatDecisionAction, AntiCheatPolicy } from '../types/antiCheat';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SecurityAuditEntry {
    correlationId: string;
    timestamp: Date;
    eventCategory: 'auth' | 'anti_cheat' | 'admin' | 'security';
    eventType: string;
    actorId?: string;
    actorRole?: string;
    ipAddress: string;
    userAgent: string;
    details: Record<string, unknown>;
}

export interface AntiCheatActionParams {
    correlationId: string;
    sessionId: string;
    examId: string;
    studentId: string;
    signalType: string;
    decision: AntiCheatDecisionAction;
    counters: Record<string, number>;
    policySnapshot: AntiCheatPolicy;
    ip: string;
    userAgent: string;
}

export interface AdminActionParams {
    correlationId: string;
    actorId: string;
    actorRole: string;
    ipAddress: string;
    userAgent: string;
    actionType: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
}

export interface AuthFailureParams {
    correlationId: string;
    eventType: 'wrong_password' | 'expired_token' | 'invalid_otp';
    actorId?: string;
    ipAddress: string;
    userAgent: string;
    details?: Record<string, unknown>;
}

// ─── Log Level Ordering ──────────────────────────────────────────────────────

const LOG_LEVEL_ORDER: Record<SecurityLogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Map event categories to their minimum log level.
 * - auth failures → 'warn'
 * - anti_cheat non-logged decisions → 'info'
 * - admin actions → 'info'
 * - security events → 'warn'
 */
const EVENT_CATEGORY_LOG_LEVEL: Record<string, SecurityLogLevel> = {
    auth: 'warn',
    anti_cheat: 'info',
    admin: 'info',
    security: 'warn',
};

// ─── Cached log level ────────────────────────────────────────────────────────

let cachedLogLevel: SecurityLogLevel | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

async function getConfiguredLogLevel(): Promise<SecurityLogLevel> {
    const now = Date.now();
    if (cachedLogLevel && now - cacheTimestamp <= CACHE_TTL_MS) {
        return cachedLogLevel;
    }
    try {
        const settings = await SecuritySettings.findOne({ key: 'global' }).lean();
        cachedLogLevel = settings?.logging?.logLevel ?? 'info';
        cacheTimestamp = now;
        return cachedLogLevel;
    } catch {
        return cachedLogLevel ?? 'info';
    }
}

/**
 * Check whether an event at `eventLevel` should be logged given the
 * configured `logLevel` threshold from SecuritySettings.
 */
export function shouldLog(configuredLevel: SecurityLogLevel, eventLevel: SecurityLogLevel): boolean {
    return LOG_LEVEL_ORDER[eventLevel] >= LOG_LEVEL_ORDER[configuredLevel];
}

// ─── Core Logging ────────────────────────────────────────────────────────────

/**
 * Persist a structured security audit entry to the SecurityAuditLog collection.
 * Respects SecuritySettings `logging.logLevel` — events below the configured
 * threshold are silently dropped.
 */
export async function logSecurityEvent(entry: SecurityAuditEntry): Promise<void> {
    try {
        const configuredLevel = await getConfiguredLogLevel();
        const eventLevel = EVENT_CATEGORY_LOG_LEVEL[entry.eventCategory] ?? 'info';

        if (!shouldLog(configuredLevel, eventLevel)) return;

        await SecurityAuditLog.create({
            correlationId: entry.correlationId,
            eventCategory: entry.eventCategory,
            eventType: entry.eventType,
            actorId: entry.actorId || null,
            actorRole: entry.actorRole || null,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
            details: entry.details,
        });
    } catch {
        // Audit logging must never crash the request pipeline
        console.error('[SecurityAuditLogger] Failed to log security event:', entry.eventType);
    }
}

// ─── Anti-Cheat Action Logging ───────────────────────────────────────────────

/**
 * Log an anti-cheat decision with full context: session, exam, student,
 * signal type, decision, current counters, and the policy snapshot that
 * was active at evaluation time.
 */
export async function logAntiCheatAction(params: AntiCheatActionParams): Promise<void> {
    await logSecurityEvent({
        correlationId: params.correlationId,
        timestamp: new Date(),
        eventCategory: 'anti_cheat',
        eventType: `anti_cheat_${params.decision}`,
        actorId: params.studentId,
        actorRole: 'student',
        ipAddress: params.ip,
        userAgent: params.userAgent,
        details: {
            sessionId: params.sessionId,
            examId: params.examId,
            signalType: params.signalType,
            decision: params.decision,
            counters: params.counters,
            policySnapshot: params.policySnapshot,
        },
    });
}

// ─── Auth Failure Logging ────────────────────────────────────────────────────

/**
 * Log authentication failures: wrong password, expired token, invalid OTP.
 * eventCategory is always 'auth'.
 */
export async function logAuthFailure(params: AuthFailureParams): Promise<void> {
    await logSecurityEvent({
        correlationId: params.correlationId,
        timestamp: new Date(),
        eventCategory: 'auth',
        eventType: `auth_failure_${params.eventType}`,
        actorId: params.actorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: params.details ?? {},
    });
}

// ─── Admin Action Logging ────────────────────────────────────────────────────

/**
 * Log admin actions (security settings change, student suspend, etc.)
 * with before/after snapshot for forensic traceability.
 */
export async function logAdminAction(params: AdminActionParams): Promise<void> {
    await logSecurityEvent({
        correlationId: params.correlationId,
        timestamp: new Date(),
        eventCategory: 'admin',
        eventType: params.actionType,
        actorId: params.actorId,
        actorRole: params.actorRole,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: {
            before: params.before,
            after: params.after,
        },
    });
}

// ─── Cache Reset (for testing) ───────────────────────────────────────────────

/** @internal — exposed for tests only */
export function _resetLogLevelCache(): void {
    cachedLogLevel = null;
    cacheTimestamp = 0;
}
