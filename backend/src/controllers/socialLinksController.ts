import { Request, Response } from 'express';
import SiteSettings from '../models/Settings';
import WebsiteSettings from '../models/WebsiteSettings';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';
import { ResponseBuilder } from '../utils/responseBuilder';

type Placement = 'header' | 'footer' | 'home' | 'news' | 'contact';

const allowedPlacements: Placement[] = ['header', 'footer', 'home', 'news', 'contact'];
const knownPlatforms = ['facebook', 'whatsapp', 'messenger', 'telegram', 'twitter', 'youtube', 'instagram'] as const;

function normalizePlacements(value: unknown): Placement[] {
    if (!Array.isArray(value)) return [...allowedPlacements];
    const placements = value
        .map((item) => String(item || '').trim().toLowerCase())
        .filter((item): item is Placement => allowedPlacements.includes(item as Placement));
    return placements.length ? placements : [...allowedPlacements];
}

function normalizePlatformKey(value: unknown): typeof knownPlatforms[number] | '' {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (!raw) return '';
    if (raw === 'x') return 'twitter';
    if (raw === 'yt') return 'youtube';
    if ((knownPlatforms as readonly string[]).includes(raw)) {
        return raw as typeof knownPlatforms[number];
    }
    return '';
}

async function syncWebsiteSettingsSocialLinks(items: Array<any>): Promise<void> {
    const merged = {
        facebook: '',
        whatsapp: '',
        messenger: '',
        telegram: '',
        twitter: '',
        youtube: '',
        instagram: '',
    };

    for (const item of items) {
        if (!item || item.enabled === false) continue;
        const key = normalizePlatformKey(item.platform);
        const url = String(item.url || '').trim();
        if (!key || !url) continue;
        merged[key] = url;
    }

    let websiteSettings = await WebsiteSettings.findOne();
    if (!websiteSettings) websiteSettings = await WebsiteSettings.create({});
    websiteSettings.socialLinks = merged;
    await websiteSettings.save();
}

export const adminGetSocialLinks = async (_req: Request, res: Response): Promise<void> => {
    try {
        let settings = await SiteSettings.findOne();
        if (!settings) settings = await SiteSettings.create({});
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items: settings.socialLinks || [] }));
    } catch (error) {
        console.error('adminGetSocialLinks error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const adminCreateSocialLink = async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await SiteSettings.findOne();
        if (!settings) settings = await SiteSettings.create({});

        const payload = {
            platform: String(req.body?.platformName || req.body?.platform || '').trim(),
            url: String(req.body?.targetUrl || req.body?.url || '').trim(),
            icon: String(req.body?.iconUploadOrUrl || req.body?.icon || '').trim(),
            description: String(req.body?.description || '').trim(),
            enabled: Boolean(req.body?.enabled !== false),
            placements: normalizePlacements(req.body?.placements),
        };

        if (!payload.platform || !payload.url) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'platformName and targetUrl are required'));
            return;
        }

        settings.socialLinks.push(payload as any);
        await settings.save();
        await syncWebsiteSettingsSocialLinks(settings.socialLinks as any[]);
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'social-links' } });

        ResponseBuilder.send(res, 201, ResponseBuilder.created({ items: settings.socialLinks || [] }, 'Social link created'));
    } catch (error) {
        console.error('adminCreateSocialLink error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const adminUpdateSocialLink = async (req: Request, res: Response): Promise<void> => {
    try {
        const settings = await SiteSettings.findOne();
        if (!settings) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Site settings not found'));
            return;
        }

        const index = settings.socialLinks.findIndex((item: any) => String(item?._id || '') === String(req.params.id));
        if (index < 0) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Social link not found'));
            return;
        }
        const link: any = settings.socialLinks[index];

        if (req.body?.platformName !== undefined || req.body?.platform !== undefined) {
            link.platform = String(req.body?.platformName || req.body?.platform || '').trim();
        }
        if (req.body?.targetUrl !== undefined || req.body?.url !== undefined) {
            link.url = String(req.body?.targetUrl || req.body?.url || '').trim();
        }
        if (req.body?.iconUploadOrUrl !== undefined || req.body?.icon !== undefined) {
            link.icon = String(req.body?.iconUploadOrUrl || req.body?.icon || '').trim();
        }
        if (req.body?.description !== undefined) {
            link.description = String(req.body?.description || '').trim();
        }
        if (req.body?.enabled !== undefined) {
            link.enabled = Boolean(req.body.enabled);
        }
        if (req.body?.placements !== undefined) {
            link.placements = normalizePlacements(req.body.placements);
        }
        settings.socialLinks[index] = link;

        await settings.save();
        await syncWebsiteSettingsSocialLinks(settings.socialLinks as any[]);
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'social-links' } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items: settings.socialLinks || [] }, 'Social link updated'));
    } catch (error) {
        console.error('adminUpdateSocialLink error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const adminDeleteSocialLink = async (req: Request, res: Response): Promise<void> => {
    try {
        const settings = await SiteSettings.findOne();
        if (!settings) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Site settings not found'));
            return;
        }

        const before = settings.socialLinks.length;
        settings.socialLinks = settings.socialLinks.filter((item: any) => String(item?._id || '') !== String(req.params.id));
        if (settings.socialLinks.length === before) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Social link not found'));
            return;
        }
        await settings.save();
        await syncWebsiteSettingsSocialLinks(settings.socialLinks as any[]);
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'social-links' } });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items: settings.socialLinks || [] }, 'Social link deleted'));
    } catch (error) {
        console.error('adminDeleteSocialLink error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};

export const getPublicSocialLinks = async (_req: Request, res: Response): Promise<void> => {
    try {
        const settings = await SiteSettings.findOne().lean();
        const items = Array.isArray(settings?.socialLinks) ? settings.socialLinks : [];
        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            items: items
                .filter((item: any) => item?.enabled !== false && item?.url)
                .map((item: any) => ({
                    id: String(item?._id || ''),
                    platformName: String(item?.platform || ''),
                    targetUrl: String(item?.url || ''),
                    iconUploadOrUrl: String(item?.icon || ''),
                    description: String(item?.description || ''),
                    enabled: item?.enabled !== false,
                    placements: normalizePlacements(item?.placements),
                })),
        }));
    } catch (error) {
        console.error('getPublicSocialLinks error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal Server Error'));
    }
};
