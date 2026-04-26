import { Request, Response } from 'express';
import Testimonial from '../models/Testimonial';
import Partner from '../models/Partner';
import { ResponseBuilder } from '../utils/responseBuilder';

// ── Public ──
export async function getPublicTestimonials(_req: Request, res: Response): Promise<void> {
    try {
        const items = await Testimonial.find({ isActive: true }).sort({ order: 1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(items));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to load testimonials')); }
}

export async function getPublicPartners(_req: Request, res: Response): Promise<void> {
    try {
        const items = await Partner.find({ isActive: true }).sort({ order: 1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(items));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to load partners')); }
}

// ── Admin Testimonials ──
export async function adminGetTestimonials(_req: Request, res: Response): Promise<void> {
    try {
        const items = await Testimonial.find({}).sort({ order: 1, createdAt: -1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(items));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to load testimonials')); }
}

export async function adminCreateTestimonial(req: Request, res: Response): Promise<void> {
    try {
        const { name, role, university, avatarUrl, quote, rating, isActive, order } = req.body;
        const item = await Testimonial.create({
            name: String(name || '').trim(),
            role: String(role || 'Student').trim(),
            university: String(university || '').trim(),
            avatarUrl: String(avatarUrl || '').trim(),
            quote: String(quote || '').trim(),
            rating: Math.min(5, Math.max(1, Number(rating) || 5)),
            isActive: isActive !== false,
            order: Number(order) || 0,
        });
        ResponseBuilder.send(res, 201, ResponseBuilder.created(item));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Create failed')); }
}

export async function adminUpdateTestimonial(req: Request, res: Response): Promise<void> {
    try {
        const item = await Testimonial.findByIdAndUpdate(req.params.id, {
            $set: {
                name: String(req.body.name || '').trim(),
                role: String(req.body.role || 'Student').trim(),
                university: String(req.body.university || '').trim(),
                avatarUrl: String(req.body.avatarUrl || '').trim(),
                quote: String(req.body.quote || '').trim(),
                rating: Math.min(5, Math.max(1, Number(req.body.rating) || 5)),
                isActive: req.body.isActive !== false,
                order: Number(req.body.order) || 0,
            },
        }, { new: true });
        if (!item) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Testimonial not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(item));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Update failed')); }
}

export async function adminDeleteTestimonial(req: Request, res: Response): Promise<void> {
    try {
        const item = await Testimonial.findByIdAndDelete(req.params.id);
        if (!item) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Testimonial not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ message: 'Deleted' }));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Delete failed')); }
}

// ── Admin Partners ──
export async function adminGetPartners(_req: Request, res: Response): Promise<void> {
    try {
        const items = await Partner.find({}).sort({ order: 1, createdAt: -1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(items));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to load partners')); }
}

export async function adminCreatePartner(req: Request, res: Response): Promise<void> {
    try {
        const { name, logoUrl, websiteUrl, tier, isActive, order } = req.body;
        const item = await Partner.create({
            name: String(name || '').trim(),
            logoUrl: String(logoUrl || '').trim(),
            websiteUrl: String(websiteUrl || '').trim(),
            tier: ['platinum', 'gold', 'silver', 'bronze', 'partner'].includes(tier) ? tier : 'partner',
            isActive: isActive !== false,
            order: Number(order) || 0,
        });
        ResponseBuilder.send(res, 201, ResponseBuilder.created(item));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Create failed')); }
}

export async function adminUpdatePartner(req: Request, res: Response): Promise<void> {
    try {
        const item = await Partner.findByIdAndUpdate(req.params.id, {
            $set: {
                name: String(req.body.name || '').trim(),
                logoUrl: String(req.body.logoUrl || '').trim(),
                websiteUrl: String(req.body.websiteUrl || '').trim(),
                tier: ['platinum', 'gold', 'silver', 'bronze', 'partner'].includes(req.body.tier) ? req.body.tier : 'partner',
                isActive: req.body.isActive !== false,
                order: Number(req.body.order) || 0,
            },
        }, { new: true });
        if (!item) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Partner not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(item));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Update failed')); }
}

export async function adminDeletePartner(req: Request, res: Response): Promise<void> {
    try {
        const item = await Partner.findByIdAndDelete(req.params.id);
        if (!item) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Partner not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ message: 'Deleted' }));
    } catch { ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Delete failed')); }
}
