import { Request, Response } from 'express';
import HomeSettings from '../models/HomeSettings';
import { HomeLinkItem } from '../models/HomeSettings';
import {
    ensureHomeSettings,
    getHomeSettingsDefaults,
    isResettableSection,
    mergeHomeSettings,
} from '../services/homeSettingsService';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';
import { ResponseBuilder } from '../utils/responseBuilder';

/**
 * Validates a single footer link entry.
 * Label must be non-empty after trim; URL must start with `/`, `http://`, or `https://`.
 */
export function isValidFooterLink(link: HomeLinkItem): boolean {
    if (!link || typeof link.label !== 'string' || typeof link.url !== 'string') {
        return false;
    }
    const label = link.label.trim();
    if (label.length === 0) {
        return false;
    }
    const url = link.url.trim();
    if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) {
        return true;
    }
    return false;
}

/**
 * Validates all link arrays in the footer config (quickLinks and legalLinks).
 * Returns true if all links are valid, false otherwise.
 */
export function validateFooterLinks(footer: Record<string, unknown>): boolean {
    const quickLinks = footer.quickLinks as HomeLinkItem[] | undefined;
    const legalLinks = footer.legalLinks as HomeLinkItem[] | undefined;

    if (quickLinks && Array.isArray(quickLinks)) {
        for (const link of quickLinks) {
            if (!isValidFooterLink(link)) {
                return false;
            }
        }
    }

    if (legalLinks && Array.isArray(legalLinks)) {
        for (const link of legalLinks) {
            if (!isValidFooterLink(link)) {
                return false;
            }
        }
    }

    return true;
}

export const adminGetHomeSettings = async (_req: Request, res: Response): Promise<void> => {
    try {
        const settingsDoc = await ensureHomeSettings();
        const normalized = mergeHomeSettings(getHomeSettingsDefaults(), settingsDoc.toObject());

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            homeSettings: normalized,
            updatedAt: settingsDoc.updatedAt,
        }));
    } catch (error) {
        console.error('adminGetHomeSettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const adminGetHomeSettingsDefaults = async (_req: Request, res: Response): Promise<void> => {
    try {
        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            defaults: getHomeSettingsDefaults(),
        }));
    } catch (error) {
        console.error('adminGetHomeSettingsDefaults error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const adminUpdateHomeSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate footer links if footer config is being updated
        const footerUpdate = req.body?.footer as Record<string, unknown> | undefined;
        if (footerUpdate && typeof footerUpdate === 'object') {
            if (!validateFooterLinks(footerUpdate)) {
                ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Each link must have a non-empty label and valid URL'));
                return;
            }
        }

        const settingsDoc = await ensureHomeSettings();
        const current = mergeHomeSettings(getHomeSettingsDefaults(), settingsDoc.toObject());
        const merged = mergeHomeSettings(current, req.body);

        settingsDoc.set(merged);
        await settingsDoc.save();

        broadcastHomeStreamEvent({
            type: 'home-updated',
            meta: { section: 'home-settings' },
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({homeSettings: mergeHomeSettings(getHomeSettingsDefaults(), settingsDoc.toObject()),
            updatedAt: settingsDoc.updatedAt}, 'Home settings updated successfully'));
    } catch (error) {
        console.error('adminUpdateHomeSettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const adminResetHomeSettingsSection = async (req: Request, res: Response): Promise<void> => {
    try {
        const section = String(req.body?.section || '').trim();
        if (!section || !isResettableSection(section)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid section key'));
            return;
        }

        const settingsDoc = await ensureHomeSettings();
        const defaults = getHomeSettingsDefaults();

        settingsDoc.set({ [section]: defaults[section] });
        await settingsDoc.save();

        broadcastHomeStreamEvent({
            type: 'home-updated',
            meta: { section: `reset-${section}` },
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({section,
            value: settingsDoc.get(section),
            updatedAt: settingsDoc.updatedAt}, `Section "${section}" reset successfully`));
    } catch (error) {
        console.error('adminResetHomeSettingsSection error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const adminDeleteHomeSettings = async (_req: Request, res: Response): Promise<void> => {
    try {
        await HomeSettings.deleteMany({});
        const recreated = await ensureHomeSettings();
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'reset-all' } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({homeSettings: recreated}, 'Home settings recreated from defaults'));
    } catch (error) {
        console.error('adminDeleteHomeSettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const getPublicHomeSettings = async (_req: Request, res: Response): Promise<void> => {
    try {
        const settingsDoc = await ensureHomeSettings();
        const normalized = mergeHomeSettings(getHomeSettingsDefaults(), settingsDoc.toObject());

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            homeSettings: normalized,
            updatedAt: settingsDoc.updatedAt,
        }));
    } catch (error) {
        console.error('getPublicHomeSettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};
