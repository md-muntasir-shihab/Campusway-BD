import { Request, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/auth';
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
        res.json({ settings });
    } catch (error) {
        console.error('getAdminSecuritySettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function updateAdminSecuritySettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const payload = req.body;
        const validation = validateUpdatePayload(payload);
        if (validation) {
            res.status(400).json({ message: validation });
            return;
        }

        const before = await getSecuritySettingsSnapshot(true);
        const updated = await updateSecuritySettingsSnapshot(payload as SecuritySettingsUpdateInput, req.user?._id);
        invalidateSecurityConfigCache();

        await logSecurityAudit(req, 'security_settings_updated', {
            before,
            after: updated,
        });

        res.json({ message: 'Security settings updated', settings: updated });
    } catch (error) {
        console.error('updateAdminSecuritySettings error:', error);
        res.status(500).json({ message: 'Server error' });
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

        res.json({ message: 'Security settings reset to defaults', settings });
    } catch (error) {
        console.error('resetAdminSecuritySettings error:', error);
        res.status(500).json({ message: 'Server error' });
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

        res.json({
            message: 'Force logout executed for all active sessions',
            terminatedCount: terminated.terminatedCount,
            terminatedAt: terminated.terminatedAt,
        });
    } catch (error) {
        console.error('forceLogoutAllUsers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function lockAdminPanel(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (typeof req.body?.adminPanelEnabled !== 'boolean') {
            res.status(400).json({ message: 'adminPanelEnabled must be boolean' });
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

        res.json({
            message: enabled ? 'Admin panel unlocked' : 'Admin panel locked',
            settings,
        });
    } catch (error) {
        console.error('lockAdminPanel error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getPublicSecurityConfigController(_req: Request, res: Response): Promise<void> {
    try {
        const config = await getPublicSecurityConfig(true);
        res.json(config);
    } catch (error) {
        console.error('getPublicSecurityConfigController error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
