import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    logSecurityEvent,
    logAntiCheatAction,
    logAuthFailure,
    logAdminAction,
    shouldLog,
    _resetLogLevelCache,
} from '../services/securityAuditLogger';
import type { SecurityAuditEntry, AntiCheatActionParams, AuthFailureParams, AdminActionParams } from '../services/securityAuditLogger';
import type { SecurityLogLevel } from '../models/SecuritySettings';
import { SAFE_DEFAULTS } from '../types/antiCheat';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../models/SecurityAuditLog', () => {
    const create = vi.fn().mockResolvedValue({});
    return { default: { create } };
});

vi.mock('../models/SecuritySettings', () => {
    const findOne = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ logging: { logLevel: 'info' } }),
    });
    return { default: { findOne } };
});

import SecurityAuditLog from '../models/SecurityAuditLog';
import SecuritySettings from '../models/SecuritySettings';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<SecurityAuditEntry> = {}): SecurityAuditEntry {
    return {
        correlationId: 'req-abc-123',
        timestamp: new Date('2025-01-01T00:00:00Z'),
        eventCategory: 'auth',
        eventType: 'auth_failure_wrong_password',
        actorId: 'user-001',
        actorRole: 'student',
        ipAddress: '192.168.1.1',
        userAgent: 'vitest-agent',
        details: { reason: 'wrong password' },
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    _resetLogLevelCache();
    // Default: logLevel = 'info'
    (SecuritySettings.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ logging: { logLevel: 'info' } }),
    });
});

// ─── shouldLog pure function ─────────────────────────────────────────────────

describe('shouldLog — log level filtering', () => {
    it('allows events at or above the configured level', () => {
        expect(shouldLog('info', 'info')).toBe(true);
        expect(shouldLog('info', 'warn')).toBe(true);
        expect(shouldLog('info', 'error')).toBe(true);
    });

    it('blocks events below the configured level', () => {
        expect(shouldLog('warn', 'info')).toBe(false);
        expect(shouldLog('warn', 'debug')).toBe(false);
        expect(shouldLog('error', 'warn')).toBe(false);
    });

    it('debug level allows everything', () => {
        expect(shouldLog('debug', 'debug')).toBe(true);
        expect(shouldLog('debug', 'info')).toBe(true);
        expect(shouldLog('debug', 'warn')).toBe(true);
        expect(shouldLog('debug', 'error')).toBe(true);
    });

    it('error level only allows error', () => {
        expect(shouldLog('error', 'debug')).toBe(false);
        expect(shouldLog('error', 'info')).toBe(false);
        expect(shouldLog('error', 'warn')).toBe(false);
        expect(shouldLog('error', 'error')).toBe(true);
    });
});

// ─── logSecurityEvent ────────────────────────────────────────────────────────

describe('logSecurityEvent — structured log entry format (Req 12.2)', () => {
    it('creates a SecurityAuditLog document with all required fields', async () => {
        const entry = makeEntry();
        await logSecurityEvent(entry);

        expect(SecurityAuditLog.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.correlationId).toBe('req-abc-123');
        expect(arg.eventCategory).toBe('auth');
        expect(arg.eventType).toBe('auth_failure_wrong_password');
        expect(arg.actorId).toBe('user-001');
        expect(arg.actorRole).toBe('student');
        expect(arg.ipAddress).toBe('192.168.1.1');
        expect(arg.userAgent).toBe('vitest-agent');
        expect(arg.details).toEqual({ reason: 'wrong password' });
    });

    it('includes correlation ID from requestId middleware (Req 12.1)', async () => {
        const entry = makeEntry({ correlationId: 'corr-xyz-789' });
        await logSecurityEvent(entry);

        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.correlationId).toBe('corr-xyz-789');
    });

    it('sets actorId to null when not provided', async () => {
        const entry = makeEntry({ actorId: undefined });
        await logSecurityEvent(entry);

        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.actorId).toBeNull();
    });
});

// ─── Log level filtering (Req 12.6) ─────────────────────────────────────────

describe('logSecurityEvent — log level filtering (Req 12.6)', () => {
    it('drops auth events when logLevel is error', async () => {
        _resetLogLevelCache();
        (SecuritySettings.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
            lean: vi.fn().mockResolvedValue({ logging: { logLevel: 'error' } }),
        });

        await logSecurityEvent(makeEntry({ eventCategory: 'auth' }));
        expect(SecurityAuditLog.create).not.toHaveBeenCalled();
    });

    it('logs auth events when logLevel is debug', async () => {
        _resetLogLevelCache();
        (SecuritySettings.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
            lean: vi.fn().mockResolvedValue({ logging: { logLevel: 'debug' } }),
        });

        await logSecurityEvent(makeEntry({ eventCategory: 'auth' }));
        expect(SecurityAuditLog.create).toHaveBeenCalledTimes(1);
    });

    it('logs anti_cheat events at info level', async () => {
        _resetLogLevelCache();
        (SecuritySettings.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
            lean: vi.fn().mockResolvedValue({ logging: { logLevel: 'info' } }),
        });

        await logSecurityEvent(makeEntry({ eventCategory: 'anti_cheat', eventType: 'anti_cheat_warn' }));
        expect(SecurityAuditLog.create).toHaveBeenCalledTimes(1);
    });

    it('drops anti_cheat events when logLevel is warn', async () => {
        _resetLogLevelCache();
        (SecuritySettings.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
            lean: vi.fn().mockResolvedValue({ logging: { logLevel: 'warn' } }),
        });

        await logSecurityEvent(makeEntry({ eventCategory: 'anti_cheat', eventType: 'anti_cheat_warn' }));
        expect(SecurityAuditLog.create).not.toHaveBeenCalled();
    });
});

// ─── logAntiCheatAction ──────────────────────────────────────────────────────

describe('logAntiCheatAction — anti-cheat specific logging (Req 12.4)', () => {
    it('logs anti-cheat decision with session, exam, counters, and policy snapshot', async () => {
        const params: AntiCheatActionParams = {
            correlationId: 'corr-ac-001',
            sessionId: 'sess-001',
            examId: 'exam-001',
            studentId: 'student-001',
            signalType: 'tab_switch',
            decision: 'warn',
            counters: { tabSwitchCount: 4, copyAttemptCount: 0, fullscreenExitCount: 0 },
            policySnapshot: SAFE_DEFAULTS,
            ip: '10.0.0.1',
            userAgent: 'Chrome/120',
        };

        await logAntiCheatAction(params);

        expect(SecurityAuditLog.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.eventCategory).toBe('anti_cheat');
        expect(arg.eventType).toBe('anti_cheat_warn');
        expect(arg.correlationId).toBe('corr-ac-001');
        expect(arg.details.sessionId).toBe('sess-001');
        expect(arg.details.examId).toBe('exam-001');
        expect(arg.details.signalType).toBe('tab_switch');
        expect(arg.details.decision).toBe('warn');
        expect(arg.details.counters).toEqual({ tabSwitchCount: 4, copyAttemptCount: 0, fullscreenExitCount: 0 });
        expect(arg.details.policySnapshot).toEqual(SAFE_DEFAULTS);
    });
});

// ─── logAuthFailure ──────────────────────────────────────────────────────────

describe('logAuthFailure — auth failure logging (Req 12.3)', () => {
    it('logs wrong_password failure with auth eventCategory', async () => {
        const params: AuthFailureParams = {
            correlationId: 'corr-auth-001',
            eventType: 'wrong_password',
            actorId: 'user-fail-001',
            ipAddress: '172.16.0.1',
            userAgent: 'Firefox/119',
        };

        await logAuthFailure(params);

        expect(SecurityAuditLog.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.eventCategory).toBe('auth');
        expect(arg.eventType).toBe('auth_failure_wrong_password');
        expect(arg.correlationId).toBe('corr-auth-001');
    });

    it('logs expired_token failure', async () => {
        await logAuthFailure({
            correlationId: 'corr-auth-002',
            eventType: 'expired_token',
            ipAddress: '10.0.0.2',
            userAgent: 'Safari/17',
        });

        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.eventType).toBe('auth_failure_expired_token');
    });

    it('logs invalid_otp failure', async () => {
        await logAuthFailure({
            correlationId: 'corr-auth-003',
            eventType: 'invalid_otp',
            ipAddress: '10.0.0.3',
            userAgent: 'Edge/120',
        });

        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.eventType).toBe('auth_failure_invalid_otp');
    });
});

// ─── logAdminAction ──────────────────────────────────────────────────────────

describe('logAdminAction — admin action logging with before/after snapshot (Req 12.5)', () => {
    it('logs admin action with before/after snapshot', async () => {
        const params: AdminActionParams = {
            correlationId: 'corr-admin-001',
            actorId: 'admin-001',
            actorRole: 'superadmin',
            ipAddress: '192.168.0.100',
            userAgent: 'Chrome/120',
            actionType: 'security_settings_change',
            before: { tabSwitchLimit: 5 },
            after: { tabSwitchLimit: 10 },
        };

        await logAdminAction(params);

        expect(SecurityAuditLog.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.eventCategory).toBe('admin');
        expect(arg.eventType).toBe('security_settings_change');
        expect(arg.actorId).toBe('admin-001');
        expect(arg.actorRole).toBe('superadmin');
        expect(arg.details.before).toEqual({ tabSwitchLimit: 5 });
        expect(arg.details.after).toEqual({ tabSwitchLimit: 10 });
    });

    it('logs student_suspend admin action', async () => {
        await logAdminAction({
            correlationId: 'corr-admin-002',
            actorId: 'admin-002',
            actorRole: 'admin',
            ipAddress: '192.168.0.101',
            userAgent: 'Chrome/120',
            actionType: 'student_suspend',
            before: { status: 'active' },
            after: { status: 'suspended' },
        });

        const arg = (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.eventCategory).toBe('admin');
        expect(arg.eventType).toBe('student_suspend');
        expect(arg.details.before).toEqual({ status: 'active' });
        expect(arg.details.after).toEqual({ status: 'suspended' });
    });
});

// ─── Error resilience ────────────────────────────────────────────────────────

describe('logSecurityEvent — error resilience', () => {
    it('does not throw when SecurityAuditLog.create fails', async () => {
        (SecurityAuditLog.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB down'));

        await expect(logSecurityEvent(makeEntry())).resolves.toBeUndefined();
    });

    it('does not throw when SecuritySettings.findOne fails', async () => {
        _resetLogLevelCache();
        (SecuritySettings.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
            lean: vi.fn().mockRejectedValue(new Error('DB down')),
        });

        await expect(logSecurityEvent(makeEntry())).resolves.toBeUndefined();
    });
});
