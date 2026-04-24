import { Request, Response } from 'express';
import Banner from '../models/Banner';
import { AuthRequest } from '../middlewares/auth';
import { getSignedUploadForBanner } from '../services/uploadProvider';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';
import { ResponseBuilder } from '../utils/responseBuilder';

function isBannerActive(
    banner: { isActive?: boolean; status?: string; startDate?: Date | null; endDate?: Date | null },
    now = new Date(),
): boolean {
    if (!banner.isActive) return false;
    if (banner.status !== 'published') return false;
    if (banner.startDate && new Date(banner.startDate).getTime() > now.getTime()) return false;
    if (banner.endDate && new Date(banner.endDate).getTime() < now.getTime()) return false;
    return true;
}

export async function getActiveBanners(req: Request, res: Response): Promise<void> {
    try {
        const now = new Date();
        const slotRaw = String(req.query.slot || '').trim().toLowerCase();
        const slot = slotRaw === 'top' || slotRaw === 'middle' || slotRaw === 'footer' || slotRaw === 'home_ads' ? slotRaw : '';
        const query: Record<string, unknown> = {
            isActive: true,
            status: 'published',
        };
        if (slot) query.slot = slot;
        const banners = await Banner.find(query)
            .sort({ slot: 1, priority: -1, order: 1 })
            .lean();

        const activeBanners = banners.filter((banner) => isBannerActive(banner, now));
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ banners: activeBanners }));
    } catch (err) {
        console.error('getActiveBanners error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminGetBanners(_req: Request, res: Response): Promise<void> {
    try {
        const banners = await Banner.find().sort({ slot: 1, priority: -1, order: 1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ banners }));
    } catch (err) {
        console.error('adminGetBanners error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminCreateBanner(req: AuthRequest, res: Response): Promise<void> {
    try {
        const body = (req.body || {}) as Record<string, unknown>;
        const slotRaw = String(body.slot || 'top').trim().toLowerCase();
        const slot = slotRaw === 'middle' || slotRaw === 'footer' || slotRaw === 'home_ads' || slotRaw === 'popup' ? slotRaw : 'top';
        const priority = Number(body.priority || 0);
        const statusRaw = String(body.status || 'draft').trim().toLowerCase();
        const status = statusRaw === 'published' ? 'published' : 'draft';

        const popupConfig = slot === 'popup' && body.popupConfig && typeof body.popupConfig === 'object'
            ? {
                autoCloseAfterSeconds: Number((body.popupConfig as Record<string, unknown>).autoCloseAfterSeconds ?? 0),
                closeButtonDelaySeconds: Number((body.popupConfig as Record<string, unknown>).closeButtonDelaySeconds ?? 0),
                maxViewsPerDay: Number((body.popupConfig as Record<string, unknown>).maxViewsPerDay ?? 1),
                cooldownHours: Number((body.popupConfig as Record<string, unknown>).cooldownHours ?? 24),
                ctaText: String((body.popupConfig as Record<string, unknown>).ctaText ?? ''),
                homePageOnly: (body.popupConfig as Record<string, unknown>).homePageOnly !== false,
                targetAudience: (['all', 'guests', 'logged_in'].includes(String((body.popupConfig as Record<string, unknown>).targetAudience)))
                    ? String((body.popupConfig as Record<string, unknown>).targetAudience)
                    : 'all',
                showOnMobile: (body.popupConfig as Record<string, unknown>).showOnMobile !== false,
                showOnDesktop: (body.popupConfig as Record<string, unknown>).showOnDesktop !== false,
            }
            : undefined;

        const banner = await Banner.create({
            ...body,
            slot,
            priority: Number.isFinite(priority) ? priority : 0,
            status,
            isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
            startDate: body.startDate ? new Date(String(body.startDate)) : undefined,
            endDate: body.endDate ? new Date(String(body.endDate)) : undefined,
            createdBy: req.user?._id,
            popupConfig,
        });
        broadcastHomeStreamEvent({ type: 'banner-updated', meta: { action: 'create', bannerId: String(banner._id) } });
        ResponseBuilder.send(res, 201, ResponseBuilder.created({banner}, 'Banner created'));
    } catch (err) {
        console.error('adminCreateBanner error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateBanner(req: Request, res: Response): Promise<void> {
    try {
        const body = (req.body || {}) as Record<string, unknown>;
        const update: Record<string, unknown> = { ...body };
        if (body.slot !== undefined) {
            const slotRaw = String(body.slot || '').trim().toLowerCase();
            update.slot = slotRaw === 'middle' || slotRaw === 'footer' || slotRaw === 'home_ads' || slotRaw === 'popup' ? slotRaw : 'top';
        }
        if (body.priority !== undefined) update.priority = Number(body.priority || 0);
        if (body.status !== undefined) update.status = String(body.status || '').toLowerCase() === 'published' ? 'published' : 'draft';
        if (body.startDate !== undefined) update.startDate = body.startDate ? new Date(String(body.startDate)) : null;
        if (body.endDate !== undefined) update.endDate = body.endDate ? new Date(String(body.endDate)) : null;

        // Handle popupConfig update
        if (body.popupConfig !== undefined && typeof body.popupConfig === 'object' && body.popupConfig !== null) {
            const pc = body.popupConfig as Record<string, unknown>;
            update.popupConfig = {
                autoCloseAfterSeconds: Number(pc.autoCloseAfterSeconds ?? 0),
                closeButtonDelaySeconds: Number(pc.closeButtonDelaySeconds ?? 0),
                maxViewsPerDay: Number(pc.maxViewsPerDay ?? 1),
                cooldownHours: Number(pc.cooldownHours ?? 24),
                ctaText: String(pc.ctaText ?? ''),
                homePageOnly: pc.homePageOnly !== false,
                targetAudience: (['all', 'guests', 'logged_in'].includes(String(pc.targetAudience))) ? String(pc.targetAudience) : 'all',
                showOnMobile: pc.showOnMobile !== false,
                showOnDesktop: pc.showOnDesktop !== false,
            };
        } else if (body.popupConfig === null) {
            update.popupConfig = undefined;
        }

        const banner = await Banner.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!banner) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Banner not found'));
            return;
        }
        broadcastHomeStreamEvent({ type: 'banner-updated', meta: { action: 'update', bannerId: String(banner._id) } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({banner}, 'Banner updated'));
    } catch (err) {
        console.error('adminUpdateBanner error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminDeleteBanner(req: Request, res: Response): Promise<void> {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Banner not found'));
            return;
        }
        broadcastHomeStreamEvent({ type: 'banner-updated', meta: { action: 'delete', bannerId: req.params.id } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Banner deleted'));
    } catch (err) {
        console.error('adminDeleteBanner error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminPublishBanner(req: Request, res: Response): Promise<void> {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Banner not found'));
            return;
        }
        const publish = req.body?.publish !== undefined ? Boolean(req.body.publish) : true;
        banner.status = publish ? 'published' : 'draft';
        banner.isActive = publish;
        await banner.save();
        broadcastHomeStreamEvent({
            type: 'banner-updated',
            meta: { action: publish ? 'publish' : 'unpublish', bannerId: String(banner._id) },
        });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ banner, message: publish ? 'Banner published' : 'Banner unpublished' }));
    } catch (err) {
        console.error('adminPublishBanner error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminSignBannerUpload(req: Request, res: Response): Promise<void> {
    try {
        const filename = String(req.body?.filename || '').trim();
        const mimeType = String(req.body?.mimeType || 'application/octet-stream');
        if (!filename) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'filename is required.'));
            return;
        }
        const signed = await getSignedUploadForBanner(filename, mimeType);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(signed));
    } catch (err) {
        console.error('adminSignBannerUpload error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
