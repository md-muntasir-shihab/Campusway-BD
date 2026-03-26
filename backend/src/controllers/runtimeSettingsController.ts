import { Response } from 'express';
import AuditLog from '../models/AuditLog';
import SiteSettings from '../models/Settings';
import { AuthRequest } from '../middlewares/auth';
import {
    RuntimeFeatureFlags,
    getDefaultRuntimeFeatureFlags,
    getRuntimeSettingsSnapshot,
    updateRuntimeSettings,
} from '../services/runtimeSettingsService';
import { SecurityConfig } from '../services/securityConfigService';
import { getClientIp } from '../utils/requestMeta';

type RuntimeSettingsPayload = {
    security?: Partial<SecurityConfig>;
    featureFlags?: Partial<RuntimeFeatureFlags>;
};

type AdminUiLayoutPayload = {
    sidebarOrder?: unknown;
    settingsCardOrder?: unknown;
};

const SECURITY_BOOLEAN_KEYS: Array<keyof SecurityConfig> = [
    'singleBrowserLogin',
    'forceLogoutOnNewLogin',
    'enable2faAdmin',
    'enable2faStudent',
    'force2faSuperAdmin',
    'ipChangeAlert',
    'allowLegacyTokens',
    'strictExamTabLock',
    'strictTokenHashValidation',
    'testingAccessMode',
];

const FEATURE_FLAG_KEYS = Object.keys(getDefaultRuntimeFeatureFlags()) as Array<keyof RuntimeFeatureFlags>;

const ADMIN_UI_LAYOUT_KEYS = ['sidebarOrder', 'settingsCardOrder'] as const;

function sanitizeLayoutKeys(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const raw of value) {
        const key = String(raw || '').trim();
        if (!key || key.length > 80) continue;
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push(key);
        if (normalized.length >= 120) break;
    }
    return normalized;
}

function normalizeAdminUiLayout(raw?: Record<string, unknown> | null): { sidebarOrder: string[]; settingsCardOrder: string[] } {
    return {
        sidebarOrder: sanitizeLayoutKeys(raw?.sidebarOrder),
        settingsCardOrder: sanitizeLayoutKeys(raw?.settingsCardOrder),
    };
}

function validateRuntimeSettingsPayload(payload: RuntimeSettingsPayload): string | null {
    const rootKeys = Object.keys(payload || {});
    const allowedRootKeys = ['security', 'featureFlags'];
    const unknownRoot = rootKeys.filter((key) => !allowedRootKeys.includes(key));
    if (unknownRoot.length) {
        return `Unknown root keys: ${unknownRoot.join(', ')}`;
    }

    if (payload.security !== undefined) {
        if (!payload.security || typeof payload.security !== 'object' || Array.isArray(payload.security)) {
            return 'security must be an object';
        }

        const securityKeys = Object.keys(payload.security);
        const unknownSecurity = securityKeys.filter(
            (key) => ![
                ...SECURITY_BOOLEAN_KEYS,
                'default2faMethod',
                'otpExpiryMinutes',
                'maxOtpAttempts',
            ].includes(key as keyof SecurityConfig)
        );
        if (unknownSecurity.length) {
            return `Unknown security keys: ${unknownSecurity.join(', ')}`;
        }

        for (const key of SECURITY_BOOLEAN_KEYS) {
            const value = payload.security[key];
            if (value !== undefined && typeof value !== 'boolean') {
                return `security.${key} must be a boolean`;
            }
        }

        if (payload.security.default2faMethod !== undefined) {
            const method = String(payload.security.default2faMethod).trim().toLowerCase();
            if (!['email', 'sms', 'authenticator'].includes(method)) {
                return 'security.default2faMethod must be one of email|sms|authenticator';
            }
        }

        if (payload.security.otpExpiryMinutes !== undefined) {
            const value = Number(payload.security.otpExpiryMinutes);
            if (!Number.isInteger(value) || value <= 0) {
                return 'security.otpExpiryMinutes must be a positive integer';
            }
        }

        if (payload.security.maxOtpAttempts !== undefined) {
            const value = Number(payload.security.maxOtpAttempts);
            if (!Number.isInteger(value) || value <= 0) {
                return 'security.maxOtpAttempts must be a positive integer';
            }
        }
    }

    if (payload.featureFlags !== undefined) {
        if (!payload.featureFlags || typeof payload.featureFlags !== 'object' || Array.isArray(payload.featureFlags)) {
            return 'featureFlags must be an object';
        }

        const flagKeys = Object.keys(payload.featureFlags);
        const unknownFlags = flagKeys.filter((key) => !FEATURE_FLAG_KEYS.includes(key as keyof RuntimeFeatureFlags));
        if (unknownFlags.length) {
            return `Unknown featureFlags keys: ${unknownFlags.join(', ')}`;
        }

        for (const key of FEATURE_FLAG_KEYS) {
            const value = payload.featureFlags[key];
            if (value !== undefined && typeof value !== 'boolean') {
                return `featureFlags.${key} must be a boolean`;
            }
        }
    }

    const securityStrict = payload.security?.strictExamTabLock;
    const featureStrict = payload.featureFlags?.strictExamTabLock;
    if (
        securityStrict !== undefined &&
        featureStrict !== undefined &&
        securityStrict !== featureStrict
    ) {
        return 'strictExamTabLock must match in security and featureFlags';
    }

    return null;
}

export async function getRuntimeSettings(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const snapshot = await getRuntimeSettingsSnapshot(true);
        res.json({
            security: snapshot.security,
            featureFlags: snapshot.featureFlags,
            updatedAt: snapshot.updatedAt,
            updatedBy: snapshot.updatedBy,
            runtimeVersion: snapshot.runtimeVersion,
        });
    } catch (error) {
        console.error('getRuntimeSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function updateRuntimeSettingsController(req: AuthRequest, res: Response): Promise<void> {
    try {
        const payload = (req.body || {}) as RuntimeSettingsPayload;
        const validationError = validateRuntimeSettingsPayload(payload);
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }

        const before = await getRuntimeSettingsSnapshot(true);
        const after = await updateRuntimeSettings({
            security: payload.security,
            featureFlags: payload.featureFlags,
            updatedBy: req.user?._id,
        });

        await AuditLog.create({
            actor_id: req.user?._id,
            actor_role: req.user?.role,
            action: 'update_runtime_settings',
            target_type: 'settings',
            ip_address: getClientIp(req),
            details: {
                before: {
                    security: before.security,
                    featureFlags: before.featureFlags,
                    runtimeVersion: before.runtimeVersion,
                },
                after: {
                    security: after.security,
                    featureFlags: after.featureFlags,
                    runtimeVersion: after.runtimeVersion,
                },
            },
        });

        res.json({
            security: after.security,
            featureFlags: after.featureFlags,
            updatedAt: after.updatedAt,
            updatedBy: after.updatedBy,
            runtimeVersion: after.runtimeVersion,
        });
    } catch (error) {
        console.error('updateRuntimeSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getAdminUiLayoutSettings(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const settings = await SiteSettings.findOne()
            .select('adminUiLayout updatedAt updatedBy')
            .lean();

        const layout = normalizeAdminUiLayout(settings?.adminUiLayout as Record<string, unknown> | undefined);
        res.json({
            layout,
            updatedAt: settings?.updatedAt || null,
            updatedBy: settings?.updatedBy ? String(settings.updatedBy) : null,
        });
    } catch (error) {
        console.error('getAdminUiLayoutSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function updateAdminUiLayoutSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const payload = (req.body || {}) as AdminUiLayoutPayload;
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            res.status(400).json({ message: 'Body must be an object' });
            return;
        }

        const unknownKeys = Object.keys(payload).filter(
            (key) => !(ADMIN_UI_LAYOUT_KEYS as readonly string[]).includes(key),
        );
        if (unknownKeys.length > 0) {
            res.status(400).json({ message: `Unknown keys: ${unknownKeys.join(', ')}` });
            return;
        }

        const hasSidebarOrder = Object.prototype.hasOwnProperty.call(payload, 'sidebarOrder');
        const hasSettingsCardOrder = Object.prototype.hasOwnProperty.call(payload, 'settingsCardOrder');
        if (!hasSidebarOrder && !hasSettingsCardOrder) {
            res.status(400).json({ message: 'At least one of sidebarOrder or settingsCardOrder is required' });
            return;
        }

        const beforeDoc = await SiteSettings.findOne().select('adminUiLayout').lean();
        const beforeLayout = normalizeAdminUiLayout(beforeDoc?.adminUiLayout as Record<string, unknown> | undefined);

        const updateSet: Record<string, unknown> = {};
        if (hasSidebarOrder) {
            updateSet['adminUiLayout.sidebarOrder'] = sanitizeLayoutKeys(payload.sidebarOrder);
        }
        if (hasSettingsCardOrder) {
            updateSet['adminUiLayout.settingsCardOrder'] = sanitizeLayoutKeys(payload.settingsCardOrder);
        }
        if (req.user?._id) {
            updateSet.updatedBy = req.user._id;
        }

        const updated = await SiteSettings.findOneAndUpdate(
            {},
            { $set: updateSet },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        ).lean();

        const afterLayout = normalizeAdminUiLayout(updated?.adminUiLayout as Record<string, unknown> | undefined);

        await AuditLog.create({
            actor_id: req.user?._id,
            actor_role: req.user?.role,
            action: 'update_admin_ui_layout',
            target_type: 'settings',
            ip_address: getClientIp(req),
            details: {
                before: beforeLayout,
                after: afterLayout,
            },
        });

        res.json({
            layout: afterLayout,
            updatedAt: updated?.updatedAt || null,
            updatedBy: updated?.updatedBy ? String(updated.updatedBy) : null,
        });
    } catch (error) {
        console.error('updateAdminUiLayoutSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
