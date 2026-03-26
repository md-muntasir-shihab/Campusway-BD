import { Request, Response } from 'express';
import HomeSettings from '../models/HomeSettings';
import {
    ensureHomeSettings,
    getHomeSettingsDefaults,
    isResettableSection,
    mergeHomeSettings,
} from '../services/homeSettingsService';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';

export const adminGetHomeSettings = async (_req: Request, res: Response): Promise<void> => {
    try {
        const settingsDoc = await ensureHomeSettings();
        const normalized = mergeHomeSettings(getHomeSettingsDefaults(), settingsDoc.toObject());

        res.json({
            homeSettings: normalized,
            updatedAt: settingsDoc.updatedAt,
        });
    } catch (error) {
        console.error('adminGetHomeSettings error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const adminGetHomeSettingsDefaults = async (_req: Request, res: Response): Promise<void> => {
    try {
        res.json({
            defaults: getHomeSettingsDefaults(),
        });
    } catch (error) {
        console.error('adminGetHomeSettingsDefaults error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const adminUpdateHomeSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const settingsDoc = await ensureHomeSettings();
        const current = mergeHomeSettings(getHomeSettingsDefaults(), settingsDoc.toObject());
        const merged = mergeHomeSettings(current, req.body);

        settingsDoc.set(merged);
        await settingsDoc.save();

        broadcastHomeStreamEvent({
            type: 'home-updated',
            meta: { section: 'home-settings' },
        });

        res.json({
            message: 'Home settings updated successfully',
            homeSettings: mergeHomeSettings(getHomeSettingsDefaults(), settingsDoc.toObject()),
            updatedAt: settingsDoc.updatedAt,
        });
    } catch (error) {
        console.error('adminUpdateHomeSettings error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const adminResetHomeSettingsSection = async (req: Request, res: Response): Promise<void> => {
    try {
        const section = String(req.body?.section || '').trim();
        if (!section || !isResettableSection(section)) {
            res.status(400).json({
                message: 'Invalid section key',
            });
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

        res.json({
            message: `Section "${section}" reset successfully`,
            section,
            value: settingsDoc.get(section),
            updatedAt: settingsDoc.updatedAt,
        });
    } catch (error) {
        console.error('adminResetHomeSettingsSection error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const adminDeleteHomeSettings = async (_req: Request, res: Response): Promise<void> => {
    try {
        await HomeSettings.deleteMany({});
        const recreated = await ensureHomeSettings();
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'reset-all' } });
        res.json({
            message: 'Home settings recreated from defaults',
            homeSettings: recreated,
        });
    } catch (error) {
        console.error('adminDeleteHomeSettings error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getPublicHomeSettings = async (_req: Request, res: Response): Promise<void> => {
    try {
        const settingsDoc = await ensureHomeSettings();
        const normalized = mergeHomeSettings(getHomeSettingsDefaults(), settingsDoc.toObject());

        res.json({
            homeSettings: normalized,
            updatedAt: settingsDoc.updatedAt,
        });
    } catch (error) {
        console.error('getPublicHomeSettings error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
