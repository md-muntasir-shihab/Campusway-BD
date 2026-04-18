import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    shouldTriggerAlert,
    createSecurityAlert,
    ALERT_THRESHOLDS,
    checkAuthFailureSpike,
    checkOtpAbuse,
    checkSuspiciousAdminActivity,
    checkAntiCheatSpike,
} from '../services/securityAlertService';
import type { AlertType } from '../services/securityAlertService';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../models/SecurityAlert', () => {
    const create = vi.fn().mockResolvedValue({});
    return { default: { create } };
});

vi.mock('../models/SecurityAuditLog', () => {
    const countDocuments = vi.fn().mockResolvedValue(0);
    return { default: { countDocuments } };
});

import SecurityAlert from '../models/SecurityAlert';
import SecurityAuditLog from '../models/SecurityAuditLog';

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── ALERT_THRESHOLDS constant ───────────────────────────────────────────────

describe('ALERT_THRESHOLDS — threshold configuration', () => {
    it('has auth_failure_spike: count 10, windowMs 5 min', () => {
        expect(ALERT_THRESHOLDS.auth_failure_spike).toEqual({ count: 10, windowMs: 5 * 60 * 1000 });
    });

    it('has otp_abuse: count 20, windowMs 5 min', () => {
        expect(ALERT_THRESHOLDS.otp_abuse).toEqual({ count: 20, windowMs: 5 * 60 * 1000 });
    });

    it('has suspicious_admin_activity: count 5, windowMs 1 hour', () => {
        expect(ALERT_THRESHOLDS.suspicious_admin_activity).toEqual({ count: 5, windowMs: 60 * 60 * 1000 });
    });

    it('has anti_cheat_spike: count 5, windowMs 10 min', () => {
        expect(ALERT_THRESHOLDS.anti_cheat_spike).toEqual({ count: 5, windowMs: 10 * 60 * 1000 });
    });
});

// ─── shouldTriggerAlert pure function ────────────────────────────────────────

describe('shouldTriggerAlert — threshold comparison (Req 13.1-13.4)', () => {
    it('returns false when eventCount is below threshold', () => {
        expect(shouldTriggerAlert('auth_failure_spike', 5, 10)).toBe(false);
    });

    it('returns true when eventCount equals threshold', () => {
        expect(shouldTriggerAlert('auth_failure_spike', 10, 10)).toBe(true);
    });

    it('returns true when eventCount exceeds threshold', () => {
        expect(shouldTriggerAlert('otp_abuse', 25, 20)).toBe(true);
    });

    it('returns false when eventCount is 0', () => {
        expect(shouldTriggerAlert('anti_cheat_spike', 0, 5)).toBe(false);
    });

    it('returns true when threshold is 1 and eventCount is 1', () => {
        expect(shouldTriggerAlert('suspicious_admin_activity', 1, 1)).toBe(true);
    });

    it('works for all alert types at their configured thresholds', () => {
        const alertTypes: AlertType[] = ['auth_failure_spike', 'otp_abuse', 'suspicious_admin_activity', 'anti_cheat_spike'];
        for (const alertType of alertTypes) {
            const { count } = ALERT_THRESHOLDS[alertType];
            expect(shouldTriggerAlert(alertType, count - 1, count)).toBe(false);
            expect(shouldTriggerAlert(alertType, count, count)).toBe(true);
        }
    });
});


// ─── createSecurityAlert ─────────────────────────────────────────────────────

describe('createSecurityAlert — alert persistence (Req 13.5)', () => {
    it('creates a SecurityAlert document with alertType, severity, and details', async () => {
        await createSecurityAlert({
            alertType: 'auth_failure_spike',
            severity: 'critical',
            details: { ipAddress: '10.0.0.1', failureCount: 15 },
        });

        expect(SecurityAlert.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAlert.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.alertType).toBe('auth_failure_spike');
        expect(arg.severity).toBe('critical');
        expect(arg.details).toEqual({ ipAddress: '10.0.0.1', failureCount: 15 });
    });

    it('does not throw when SecurityAlert.create fails', async () => {
        (SecurityAlert.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB down'));
        await expect(
            createSecurityAlert({ alertType: 'otp_abuse', severity: 'critical', details: {} }),
        ).resolves.toBeUndefined();
    });
});

// ─── checkAuthFailureSpike ───────────────────────────────────────────────────

describe('checkAuthFailureSpike — auth failure detection (Req 13.1)', () => {
    it('creates alert when auth failures exceed threshold', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(12);

        await checkAuthFailureSpike('192.168.1.1');

        expect(SecurityAuditLog.countDocuments).toHaveBeenCalledTimes(1);
        expect(SecurityAlert.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAlert.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.alertType).toBe('auth_failure_spike');
        expect(arg.severity).toBe('critical');
        expect(arg.details.ipAddress).toBe('192.168.1.1');
        expect(arg.details.failureCount).toBe(12);
    });

    it('does not create alert when auth failures are below threshold', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(5);

        await checkAuthFailureSpike('192.168.1.1');

        expect(SecurityAlert.create).not.toHaveBeenCalled();
    });

    it('does not throw when DB query fails', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB down'));
        await expect(checkAuthFailureSpike('10.0.0.1')).resolves.toBeUndefined();
    });
});

// ─── checkOtpAbuse ───────────────────────────────────────────────────────────

describe('checkOtpAbuse — OTP abuse detection (Req 13.2)', () => {
    it('creates alert when OTP attempts exceed threshold', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(25);

        await checkOtpAbuse('10.0.0.5');

        expect(SecurityAlert.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAlert.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.alertType).toBe('otp_abuse');
        expect(arg.severity).toBe('critical');
        expect(arg.details.ipAddress).toBe('10.0.0.5');
    });

    it('does not create alert when OTP attempts are below threshold', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(10);

        await checkOtpAbuse('10.0.0.5');

        expect(SecurityAlert.create).not.toHaveBeenCalled();
    });
});

// ─── checkSuspiciousAdminActivity ────────────────────────────────────────────

describe('checkSuspiciousAdminActivity — admin activity detection (Req 13.3)', () => {
    it('creates alert when admin changes exceed threshold', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(7);

        await checkSuspiciousAdminActivity('admin-001');

        expect(SecurityAlert.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAlert.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.alertType).toBe('suspicious_admin_activity');
        expect(arg.severity).toBe('warning');
        expect(arg.details.actorId).toBe('admin-001');
    });

    it('does not create alert when admin changes are below threshold', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(3);

        await checkSuspiciousAdminActivity('admin-001');

        expect(SecurityAlert.create).not.toHaveBeenCalled();
    });
});

// ─── checkAntiCheatSpike ─────────────────────────────────────────────────────

describe('checkAntiCheatSpike — anti-cheat spike detection (Req 13.4)', () => {
    it('creates alert when session locks exceed threshold', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(6);

        await checkAntiCheatSpike('exam-001');

        expect(SecurityAlert.create).toHaveBeenCalledTimes(1);
        const arg = (SecurityAlert.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.alertType).toBe('anti_cheat_spike');
        expect(arg.severity).toBe('warning');
        expect(arg.details.examId).toBe('exam-001');
        expect(arg.details.lockCount).toBe(6);
    });

    it('does not create alert when session locks are below threshold', async () => {
        (SecurityAuditLog.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(2);

        await checkAntiCheatSpike('exam-001');

        expect(SecurityAlert.create).not.toHaveBeenCalled();
    });
});
