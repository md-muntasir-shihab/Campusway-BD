import { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import UniversitySettingsModel, { ensureUniversitySettings, ALLOWED_CATEGORIES } from '../models/UniversitySettings';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';

function pickString(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) return fallback;
    return String(value).trim() || fallback;
}

export const getUniversitySettings = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const doc = await UniversitySettingsModel.findOne().lean();
        if (!doc) {
            // Return defaults if not yet initialized
            res.json({
                ok: true,
                data: {
                    categoryOrder: [...ALLOWED_CATEGORIES],
                    highlightedCategories: [],
                    defaultCategory: 'Individual Admission',
                    featuredUniversitySlugs: [],
                    maxFeaturedItems: 12,
                    enableClusterFilterOnHome: true,
                    enableClusterFilterOnUniversities: true,
                    defaultUniversityLogoUrl: null,
                    allowCustomCategories: false,
                },
            });
            return;
        }
        res.json({ ok: true, data: doc });
    } catch (error) {
        console.error('getUniversitySettings error:', error);
        res.status(500).json({ ok: false, message: 'Internal Server Error' });
    }
};

export const updateUniversitySettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const body = req.body as Record<string, unknown>;
        const adminId = pickString(req.user?._id);

        // Build the update payload — only allow known fields
        const update: Record<string, unknown> = {};

        if (Array.isArray(body.categoryOrder)) {
            update.categoryOrder = body.categoryOrder.map((c) => pickString(c)).filter(Boolean);
        }
        if (Array.isArray(body.highlightedCategories)) {
            update.highlightedCategories = body.highlightedCategories.map((c) => pickString(c)).filter(Boolean);
        }
        if (body.defaultCategory !== undefined) {
            update.defaultCategory = pickString(body.defaultCategory, 'Individual Admission');
        }
        if (Array.isArray(body.featuredUniversitySlugs)) {
            update.featuredUniversitySlugs = body.featuredUniversitySlugs.map((s) => pickString(s)).filter(Boolean);
        }
        if (body.maxFeaturedItems !== undefined) {
            const max = Number(body.maxFeaturedItems);
            update.maxFeaturedItems = Number.isFinite(max) ? Math.min(50, Math.max(1, Math.floor(max))) : 12;
        }
        if (body.enableClusterFilterOnHome !== undefined) {
            update.enableClusterFilterOnHome = Boolean(body.enableClusterFilterOnHome);
        }
        if (body.enableClusterFilterOnUniversities !== undefined) {
            update.enableClusterFilterOnUniversities = Boolean(body.enableClusterFilterOnUniversities);
        }
        if (body.defaultUniversityLogoUrl !== undefined) {
            update.defaultUniversityLogoUrl = body.defaultUniversityLogoUrl ? pickString(body.defaultUniversityLogoUrl) : null;
        }
        if (body.allowCustomCategories !== undefined) {
            update.allowCustomCategories = Boolean(body.allowCustomCategories);
        }

        if (adminId) {
            update.lastEditedByAdminId = adminId;
        }

        const updated = await UniversitySettingsModel.findOneAndUpdate(
            {},
            { $set: update },
            { new: true, upsert: true, lean: true }
        );

        broadcastHomeStreamEvent({
            type: 'category-updated',
            meta: { section: 'university-settings' },
        });

        res.json({ ok: true, data: updated });
    } catch (error) {
        console.error('updateUniversitySettings error:', error);
        res.status(500).json({ ok: false, message: 'Internal Server Error' });
    }
};

export async function getUniversitySettingsDoc() {
    try {
        const doc = await UniversitySettingsModel.findOne().lean();
        return doc;
    } catch {
        return null;
    }
}
