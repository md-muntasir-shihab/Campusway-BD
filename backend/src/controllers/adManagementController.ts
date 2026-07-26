import { Request, Response } from 'express';
import crypto from 'crypto';
import AdCampaign from '../models/AdCampaign';
import AdCreative from '../models/AdCreative';
import AdEvent from '../models/AdEvent';
import AdPlacement from '../models/AdPlacement';
import { AuthRequest } from '../middleware/auth';
import { ResponseBuilder } from '../utils/responseBuilder';

/**
 * Public: Get active ad creative for a given placement/position with A/B variant group selection.
 */
export async function getAdForPlacement(req: Request, res: Response): Promise<void> {
    try {
        const position = String(req.query.position || req.query.slotKey || 'home_top').trim().toLowerCase();
        
        // Find active creatives matching position
        const creatives = await AdCreative.find({
            position,
            status: 'active',
        }).populate('campaignId').lean();

        // Filter creatives whose campaign (if any) is active & within scheduled dates
        const now = new Date();
        const eligibleCreatives = creatives.filter((c: any) => {
            if (!c.campaignId) return true;
            const campaign = c.campaignId;
            if (campaign.status && campaign.status !== 'active') return false;
            if (campaign.startDate && new Date(campaign.startDate) > now) return false;
            if (campaign.endDate && new Date(campaign.endDate) < now) return false;
            return true;
        });

        if (eligibleCreatives.length === 0) {
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ creative: null }));
            return;
        }

        // Random or A/B variant selection among eligible creatives
        const selectedCreative = eligibleCreatives[Math.floor(Math.random() * eligibleCreatives.length)];

        // Anonymized IP hash for fraud prevention check
        const ip = req.ip || req.socket.remoteAddress || '';
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);

        // Async increment impression & log event
        AdCreative.findByIdAndUpdate(selectedCreative._id, { $inc: { impressionsCount: 1 } }).exec();
        
        let cpmRevenue = 0;
        if (selectedCreative.campaignId && (selectedCreative.campaignId as any).cpmRateBDT) {
            cpmRevenue = ((selectedCreative.campaignId as any).cpmRateBDT || 0) / 1000;
        }

        AdEvent.create({
            creativeId: selectedCreative._id,
            campaignId: selectedCreative.campaignId ? (selectedCreative.campaignId as any)._id : undefined,
            placementId: position,
            eventType: 'impression',
            variantGroup: selectedCreative.variantGroup || 'A',
            ipHash,
            userAgent: req.headers['user-agent']?.substring(0, 100),
            revenueBDT: cpmRevenue,
        }).catch(err => console.error('AdEvent impression log error:', err));

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            creative: {
                _id: selectedCreative._id,
                title: selectedCreative.title,
                imageUrl: selectedCreative.imageUrl,
                mobileImageUrl: selectedCreative.mobileImageUrl,
                ctaLink: selectedCreative.ctaLink,
                ctaText: selectedCreative.ctaText,
                position: selectedCreative.position,
                variantGroup: selectedCreative.variantGroup,
            }
        }));
    } catch (err) {
        console.error('getAdForPlacement error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to retrieve ad'));
    }
}

/**
 * Public: Record ad click and return target URL
 */
export async function recordAdClick(req: Request, res: Response): Promise<void> {
    try {
        const { creativeId } = req.params;
        const creative = await AdCreative.findById(creativeId).populate('campaignId');

        if (!creative) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Creative not found'));
            return;
        }

        const ip = req.ip || req.socket.remoteAddress || '';
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);

        // Update click counters
        creative.clicksCount += 1;
        await creative.save();

        let cpcRevenue = 0;
        if (creative.campaignId) {
            const campaign = creative.campaignId as any;
            cpcRevenue = campaign.cpcRateBDT || 0;
            if (cpcRevenue > 0) {
                AdCampaign.findByIdAndUpdate(campaign._id, { $inc: { spentBDT: cpcRevenue } }).exec();
            }
        }

        AdEvent.create({
            creativeId: creative._id,
            campaignId: creative.campaignId ? (creative.campaignId as any)._id : undefined,
            placementId: creative.position,
            eventType: 'click',
            variantGroup: creative.variantGroup || 'A',
            ipHash,
            userAgent: req.headers['user-agent']?.substring(0, 100),
            revenueBDT: cpcRevenue,
        }).catch(err => console.error('AdEvent click log error:', err));

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            ctaLink: creative.ctaLink,
        }));
    } catch (err) {
        console.error('recordAdClick error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to record click'));
    }
}

/**
 * Admin: Get all ad campaigns
 */
export async function adminGetAdCampaigns(_req: Request, res: Response): Promise<void> {
    try {
        const campaigns = await AdCampaign.find().sort({ createdAt: -1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ campaigns }));
    } catch (err) {
        console.error('adminGetAdCampaigns error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch campaigns'));
    }
}

/**
 * Admin: Create ad campaign
 */
export async function adminCreateAdCampaign(req: AuthRequest, res: Response): Promise<void> {
    try {
        const campaign = await AdCampaign.create({
            ...req.body,
            createdBy: req.user?._id,
        });
        ResponseBuilder.send(res, 201, ResponseBuilder.created({ campaign }));
    } catch (err) {
        console.error('adminCreateAdCampaign error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to create campaign'));
    }
}

/**
 * Admin: Update ad campaign
 */
export async function adminUpdateAdCampaign(req: Request, res: Response): Promise<void> {
    try {
        const campaign = await AdCampaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!campaign) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Campaign not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ campaign }));
    } catch (err) {
        console.error('adminUpdateAdCampaign error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to update campaign'));
    }
}

/**
 * Admin: Delete ad campaign
 */
export async function adminDeleteAdCampaign(req: Request, res: Response): Promise<void> {
    try {
        const campaign = await AdCampaign.findByIdAndDelete(req.params.id);
        if (!campaign) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Campaign not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Campaign deleted'));
    } catch (err) {
        console.error('adminDeleteAdCampaign error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to delete campaign'));
    }
}

/**
 * Admin: Get all creatives
 */
export async function adminGetAdCreatives(_req: Request, res: Response): Promise<void> {
    try {
        const creatives = await AdCreative.find().populate('campaignId').sort({ createdAt: -1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ creatives }));
    } catch (err) {
        console.error('adminGetAdCreatives error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch creatives'));
    }
}

/**
 * Admin: Create creative
 */
export async function adminCreateAdCreative(req: Request, res: Response): Promise<void> {
    try {
        const creative = await AdCreative.create(req.body);
        ResponseBuilder.send(res, 201, ResponseBuilder.created({ creative }));
    } catch (err) {
        console.error('adminCreateAdCreative error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to create creative'));
    }
}

/**
 * Admin: Update creative
 */
export async function adminUpdateAdCreative(req: Request, res: Response): Promise<void> {
    try {
        const creative = await AdCreative.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!creative) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Creative not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ creative }));
    } catch (err) {
        console.error('adminUpdateAdCreative error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to update creative'));
    }
}

/**
 * Admin: Delete creative
 */
export async function adminDeleteAdCreative(req: Request, res: Response): Promise<void> {
    try {
        const creative = await AdCreative.findByIdAndDelete(req.params.id);
        if (!creative) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Creative not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Creative deleted'));
    } catch (err) {
        console.error('adminDeleteAdCreative error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to delete creative'));
    }
}

/**
 * Admin: Get ad performance and revenue statistics
 */
export async function adminGetAdRevenueStats(_req: Request, res: Response): Promise<void> {
    try {
        const totalImpressions = await AdEvent.countDocuments({ eventType: 'impression' });
        const totalClicks = await AdEvent.countDocuments({ eventType: 'click' });
        
        const revenueResult = await AdEvent.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: '$revenueBDT' } } }
        ]);

        const totalRevenue = revenueResult[0]?.totalRevenue || 0;
        const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            totalImpressions,
            totalClicks,
            totalRevenue,
            ctr: `${ctr}%`,
        }));
    } catch (err) {
        console.error('adminGetAdRevenueStats error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch ad revenue stats'));
    }
}
