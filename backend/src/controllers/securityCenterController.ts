import { Request, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/auth';
import type { AntiCheatPolicy } from '../types/antiCheat';
import {
    SecuritySettingsUpdateInput,
    getDefaultSecuritySettings,
    getPublicSecurityConfig,
    getSecuritySettingsSnapshot,
    resetSecuritySettingsToDefault,
    updateSecuritySettingsSnapshot,
} from '../services/securityCenterService';
import { invalidateSecurityConfigCache } from '../services/securityConfigService';
import { terminateSessions } from '../services/sessionSecurityService';
import { getClientIp } from '../utils/requestMeta';
import { logAdminAction } from '../services/securityAuditLogger';
import { checkSuspiciousAdminActivity } from '../services/securityAlertService';
import { ResponseBuilder } from '../utils/responseBuilder';

const ALLOWED_ROOT_KEYS = [
    'passwordPolicy',
    'loginProtection',
    'session',
    'adminAccess',
    'siteAccess',
    'examProtection',
    'logging',
    'twoPersonApproval',
    'retention',
    'panic',
    'rateLimit',
    'authentication',
    'passwordPolicies',
    'twoFactor',
    'sessions',
    'accessControl',
    'verificationRecovery',
    'uploadSecurity',
    'alerting',
    'exportSecurity',
    'backupRestore',
    'runtimeGuards',
    'antiCheatPolicy',
];

function isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateUpdatePayload(payload: unknown): string | null {
    if (!isObject(payload)) return 'Payload must be an object.';

    const unknownRoot = Object.keys(payload).filter((key) => !ALLOWED_ROOT_KEYS.includes(key));
    if (unknownRoot.length) {
        return `Unknown settings sections: ${unknownRoot.join(', ')}`;
    }

    const defaults = getDefaultSecuritySettings() as Record<string, unknown>;
    for (const [section, value] of Object.entries(payload)) {
        if (!isObject(value)) return `${section} must be an object`;
        const sectionDefaults = defaults[section] as Record<string, unknown>;
        const unknownFields = Object.keys(value).filter((key) => !(key in sectionDefaults));
        if (unknownFields.length) {
            return `Unknown fields for ${section}: ${unknownFields.join(', ')}`;
        }
    }

    return null;
}

async function logSecurityAudit(req: AuthRequest, action: string, details: Record<string, unknown>): Promise<void> {
    if (!req.user?._id) return;
    await AuditLog.create({
        actor_id: req.user._id,
        actor_role: req.user.role,
        action,
        target_type: 'security_settings',
        ip_address: getClientIp(req),
        details,
    });
}

export async function getAdminSecuritySettings(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const settings = await getSecuritySettingsSnapshot(true);
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings }));
    } catch (error) {
        console.error('getAdminSecuritySettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function updateAdminSecuritySettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const payload = req.body;
        const validation = validateUpdatePayload(payload);
        if (validation) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', validation));
            return;
        }

        const before = await getSecuritySettingsSnapshot(true);
        const updated = await updateSecuritySettingsSnapshot(payload as SecuritySettingsUpdateInput, req.user?._id);
        invalidateSecurityConfigCache();

        await logSecurityAudit(req, 'security_settings_updated', {
            before,
            after: updated,
        });

        // Structured audit log with before/after snapshot (Req 12.5)
        const correlationId = (req as any).requestId || (req.headers['x-request-id'] as string) || '';
        logAdminAction({
            correlationId,
            actorId: String(req.user?._id || ''),
            actorRole: String(req.user?.role || ''),
            ipAddress: getClientIp(req),
            userAgent: req.headers['user-agent'] || '',
            actionType: 'security_settings_updated',
            before: before as unknown as Record<string, unknown>,
            after: updated as unknown as Record<string, unknown>,
        }).catch(() => { /* audit logging must never crash the request pipeline */ });

        // Check for suspicious admin activity (Req 13.3)
        if (req.user?._id) {
            checkSuspiciousAdminActivity(String(req.user._id)).catch(() => { /* alert check must never crash */ });
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({settings: updated}, 'Security settings updated'));
    } catch (error) {
        console.error('updateAdminSecuritySettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function resetAdminSecuritySettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const before = await getSecuritySettingsSnapshot(true);
        const settings = await resetSecuritySettingsToDefault(req.user?._id);
        invalidateSecurityConfigCache();

        await logSecurityAudit(req, 'security_settings_reset', {
            before,
            after: settings,
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({settings}, 'Security settings reset to defaults'));
    } catch (error) {
        console.error('resetAdminSecuritySettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function forceLogoutAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
        const reason = String(req.body?.reason || 'security_center_force_logout').trim() || 'security_center_force_logout';
        const terminated = await terminateSessions({
            filter: {},
            reason,
            initiatedBy: req.user?._id,
            meta: { trigger: 'security_center_force_logout_all' },
        });

        await logSecurityAudit(req, 'security_force_logout_all', {
            reason,
            terminatedCount: terminated.terminatedCount,
            terminatedAt: terminated.terminatedAt,
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({terminatedCount: terminated.terminatedCount,
            terminatedAt: terminated.terminatedAt}, 'Force logout executed for all active sessions'));
    } catch (error) {
        console.error('forceLogoutAllUsers error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function lockAdminPanel(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (typeof req.body?.adminPanelEnabled !== 'boolean') {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'adminPanelEnabled must be boolean'));
            return;
        }
        const enabled = Boolean(req.body?.adminPanelEnabled);
        const settings = await updateSecuritySettingsSnapshot(
            {
                adminAccess: {
                    adminPanelEnabled: enabled,
                },
            },
            req.user?._id,
        );

        invalidateSecurityConfigCache();
        await logSecurityAudit(req, 'security_admin_panel_toggle', { adminPanelEnabled: enabled });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            message: enabled ? 'Admin panel unlocked' : 'Admin panel locked',
            settings,
        }));
    } catch (error) {
        console.error('lockAdminPanel error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getPublicSecurityConfigController(_req: Request, res: Response): Promise<void> {
    try {
        const config = await getPublicSecurityConfig(true);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(config));
    } catch (error) {
        console.error('getPublicSecurityConfigController error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getAntiCheatPolicy(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const settings = await getSecuritySettingsSnapshot(true);
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ policy: settings.antiCheatPolicy }));
    } catch (error) {
        console.error('getAntiCheatPolicy error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function updateAntiCheatPolicy(req: AuthRequest, res: Response): Promise<void> {
    try {
        const policyInput = req.body as Partial<AntiCheatPolicy>;

        const before = await getSecuritySettingsSnapshot(true);
        const updated = await updateSecuritySettingsSnapshot(
            { antiCheatPolicy: policyInput } as SecuritySettingsUpdateInput,
            req.user?._id,
        );
        invalidateSecurityConfigCache();

        await logSecurityAudit(req, 'anti_cheat_policy_updated', {
            before: before.antiCheatPolicy,
            after: updated.antiCheatPolicy,
        });

        // Structured audit log with before/after snapshot (Req 11.3, 12.5)
        const correlationId = (req as any).requestId || (req.headers['x-request-id'] as string) || '';
        logAdminAction({
            correlationId,
            actorId: String(req.user?._id || ''),
            actorRole: String(req.user?.role || ''),
            ipAddress: getClientIp(req),
            userAgent: req.headers['user-agent'] || '',
            actionType: 'anti_cheat_policy_updated',
            before: (before.antiCheatPolicy || {}) as unknown as Record<string, unknown>,
            after: (updated.antiCheatPolicy || {}) as unknown as Record<string, unknown>,
        }).catch(() => { /* audit logging must never crash the request pipeline */ });

        // Check for suspicious admin activity (Req 13.3)
        if (req.user?._id) {
            checkSuspiciousAdminActivity(String(req.user._id)).catch(() => { /* alert check must never crash */ });
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ policy: updated.antiCheatPolicy, updated: true }));
    } catch (error) {
        console.error('updateAntiCheatPolicy error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
