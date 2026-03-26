import { Request, Response } from 'express';
import Resource from '../models/Resource';
import mongoose from 'mongoose';

function isAllToken(value: unknown): boolean {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'all' || normalized === 'all resources';
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toSlug(value: unknown): string {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function toPublicSlug(resource: Record<string, any>): string {
    const rawSlug = String(resource.slug || '').trim();
    if (rawSlug) return rawSlug;
    const id = String(resource._id || '').trim();
    const base = toSlug(resource.title || 'resource') || 'resource';
    return id ? `${base}-${id}` : base;
}

function withPublicSlug<T extends Record<string, any>>(resource: T): T {
    return { ...resource, slug: toPublicSlug(resource) };
}

function extractObjectIdFromSlug(value: string): string | null {
    const match = String(value || '').trim().match(/([a-f\d]{24})$/i);
    if (!match) return null;
    const id = match[1];
    return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

export async function getPublicResources(req: Request, res: Response): Promise<void> {
    try {
        const { type, category, q, sort = 'publishDate', limit = '50', page = '1' } = req.query;

        const now = new Date();
        const andFilters: Record<string, unknown>[] = [
            { isPublic: true },
            { $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }] },
        ];

        if (type && !isAllToken(type)) andFilters.push({ type });
        if (category && !isAllToken(category)) andFilters.push({ category });

        const queryText = String(q || '').trim();
        if (queryText) {
            const regexSafe = escapeRegex(queryText);
            andFilters.push({
                $or: [
                    { title: { $regex: regexSafe, $options: 'i' } },
                    { description: { $regex: regexSafe, $options: 'i' } },
                    { category: { $regex: regexSafe, $options: 'i' } },
                    { tags: { $regex: regexSafe, $options: 'i' } },
                ],
            });
        }

        const filter: Record<string, unknown> = andFilters.length === 1 ? andFilters[0] : { $and: andFilters };

        const sortObj: Record<string, 1 | -1> =
            sort === 'downloads' ? { downloads: -1 } :
                sort === 'views' ? { views: -1 } :
                    { publishDate: -1 };

        const pageNum = parseInt(page as string, 10) || 1;
        const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

        const [resources, total] = await Promise.all([
            Resource.find(filter)
                .sort(sortObj)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Resource.countDocuments(filter),
        ]);

        res.json({ resources: resources.map((item) => withPublicSlug(item as Record<string, any>)), total, page: pageNum, pages: Math.ceil(total / limitNum) });
    } catch (err) {
        console.error('getPublicResources error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function incrementResourceView(req: Request, res: Response): Promise<void> {
    try {
        await Resource.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.json({ ok: true });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function incrementResourceDownload(req: Request, res: Response): Promise<void> {
    try {
        await Resource.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
        res.json({ ok: true });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getPublicResourceBySlug(req: Request, res: Response): Promise<void> {
    try {
        const now = new Date();
        const activeFilter: Record<string, unknown> = {
            isPublic: true,
            $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }],
        };
        const slug = String(req.params.slug || '').trim();

        let resource = await Resource.findOne({
            slug,
            ...activeFilter,
        }).lean();

        if (!resource) {
            const fallbackId = extractObjectIdFromSlug(slug);
            if (fallbackId) {
                resource = await Resource.findOne({
                    _id: fallbackId,
                    ...activeFilter,
                }).lean();
            }
        }

        if (!resource) {
            res.status(404).json({ message: 'Resource not found' });
            return;
        }

        // Fire-and-forget view increment
        Resource.findByIdAndUpdate(resource._id, { $inc: { views: 1 } }).catch(() => undefined);

        // Fetch up to 4 related resources from same category
        const relatedResources = await Resource.find({
            _id: { $ne: resource._id },
            category: resource.category,
            ...activeFilter,
        })
            .sort({ publishDate: -1 })
            .limit(4)
            .lean();

        res.json({ resource: withPublicSlug(resource as Record<string, any>), relatedResources: relatedResources.map((item) => withPublicSlug(item as Record<string, any>)) });
    } catch (err) {
        console.error('getPublicResourceBySlug error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
