import { Request, Response } from 'express';
import Resource from '../models/Resource';
import mongoose from 'mongoose';
import ResourceSettings, {
    RESOURCE_ALLOWED_TYPES,
    RESOURCE_SETTINGS_DEFAULTS,
    type IResourceSettings,
} from '../models/ResourceSettings';
import { ResponseBuilder } from '../utils/responseBuilder';

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

type PublicResourceSettingsResponse = {
    pageTitle: string;
    pageSubtitle: string;
    heroBadgeLabel: string;
    searchPlaceholder: string;
    defaultThumbnailUrl: string;
    publicPageEnabled: boolean;
    studentHubEnabled: boolean;
    showHero: boolean;
    showStats: boolean;
    showFeatured: boolean;
    featuredLimit: number;
    defaultSort: string;
    defaultType: string;
    defaultCategory: string;
    itemsPerPage: number;
    showSearch: boolean;
    showTypeFilter: boolean;
    showCategoryFilter: boolean;
    trackingEnabled: boolean;
    allowedCategories: string[];
    allowedTypes: string[];
    openLinksInNewTab: boolean;
    featuredSectionTitle: string;
    emptyStateMessage: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImageUrl: string;
};

function sanitizeResourceSettings(raw?: Partial<IResourceSettings> | null): PublicResourceSettingsResponse {
    const allowedTypes = Array.isArray(raw?.allowedTypes) && raw?.allowedTypes.length > 0
        ? raw.allowedTypes
            .map((item) => String(item || '').trim().toLowerCase())
            .filter((item) => RESOURCE_ALLOWED_TYPES.includes(item as typeof RESOURCE_ALLOWED_TYPES[number]))
        : [...RESOURCE_SETTINGS_DEFAULTS.allowedTypes];

    const allowedCategories = Array.isArray(raw?.allowedCategories) && raw?.allowedCategories.length > 0
        ? raw.allowedCategories.map((item) => String(item || '').trim()).filter(Boolean)
        : [...RESOURCE_SETTINGS_DEFAULTS.allowedCategories];

    return {
        pageTitle: String(raw?.pageTitle || RESOURCE_SETTINGS_DEFAULTS.pageTitle).trim() || RESOURCE_SETTINGS_DEFAULTS.pageTitle,
        pageSubtitle: String(raw?.pageSubtitle || RESOURCE_SETTINGS_DEFAULTS.pageSubtitle).trim() || RESOURCE_SETTINGS_DEFAULTS.pageSubtitle,
        heroBadgeLabel: String(raw?.heroBadgeLabel || RESOURCE_SETTINGS_DEFAULTS.heroBadgeLabel).trim() || RESOURCE_SETTINGS_DEFAULTS.heroBadgeLabel,
        searchPlaceholder: String(raw?.searchPlaceholder || RESOURCE_SETTINGS_DEFAULTS.searchPlaceholder).trim() || RESOURCE_SETTINGS_DEFAULTS.searchPlaceholder,
        defaultThumbnailUrl: String(raw?.defaultThumbnailUrl || '').trim(),
        publicPageEnabled: raw?.publicPageEnabled !== false,
        studentHubEnabled: raw?.studentHubEnabled !== false,
        showHero: raw?.showHero !== false,
        showStats: raw?.showStats !== false,
        showFeatured: raw?.showFeatured !== false,
        featuredLimit: Math.max(0, Math.min(24, Number(raw?.featuredLimit || RESOURCE_SETTINGS_DEFAULTS.featuredLimit))),
        defaultSort: ['latest', 'downloads', 'views'].includes(String(raw?.defaultSort || '').trim().toLowerCase())
            ? String(raw?.defaultSort).trim().toLowerCase()
            : RESOURCE_SETTINGS_DEFAULTS.defaultSort,
        defaultType: String(raw?.defaultType || RESOURCE_SETTINGS_DEFAULTS.defaultType).trim().toLowerCase() || RESOURCE_SETTINGS_DEFAULTS.defaultType,
        defaultCategory: String(raw?.defaultCategory || RESOURCE_SETTINGS_DEFAULTS.defaultCategory).trim() || RESOURCE_SETTINGS_DEFAULTS.defaultCategory,
        itemsPerPage: Math.max(4, Math.min(48, Number(raw?.itemsPerPage || RESOURCE_SETTINGS_DEFAULTS.itemsPerPage))),
        showSearch: raw?.showSearch !== false,
        showTypeFilter: raw?.showTypeFilter !== false,
        showCategoryFilter: raw?.showCategoryFilter !== false,
        trackingEnabled: raw?.trackingEnabled !== false,
        allowedCategories,
        allowedTypes,
        openLinksInNewTab: raw?.openLinksInNewTab !== false,
        featuredSectionTitle: String(raw?.featuredSectionTitle || RESOURCE_SETTINGS_DEFAULTS.featuredSectionTitle).trim() || RESOURCE_SETTINGS_DEFAULTS.featuredSectionTitle,
        emptyStateMessage: String(raw?.emptyStateMessage || RESOURCE_SETTINGS_DEFAULTS.emptyStateMessage).trim() || RESOURCE_SETTINGS_DEFAULTS.emptyStateMessage,
        metaTitle: String(raw?.metaTitle ?? '').trim(),
        metaDescription: String(raw?.metaDescription ?? '').trim(),
        metaKeywords: String(raw?.metaKeywords ?? '').trim(),
        ogImageUrl: String(raw?.ogImageUrl ?? '').trim(),
    };
}

async function loadSanitizedResourceSettings(): Promise<PublicResourceSettingsResponse> {
    const settings = await ResourceSettings.findOne().lean();
    return sanitizeResourceSettings(settings as unknown as Partial<IResourceSettings> | null);
}

export async function getPublicResourceSettings(_req: Request, res: Response): Promise<void> {
    try {
        const settings = await loadSanitizedResourceSettings();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings, lastUpdatedAt: new Date().toISOString() }));
    } catch (err) {
        console.error('getPublicResourceSettings error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
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
        if (['true', '1', 'yes'].includes(String(req.query.featured || '').trim().toLowerCase())) {
            andFilters.push({ isFeatured: true });
        }

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
                    sort === 'title' ? { title: 1 } :
                        { publishDate: -1 };

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

        const [resources, total, categories, statsRows] = await Promise.all([
            Resource.find(filter)
                .sort(sortObj)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Resource.countDocuments(filter),
            Resource.distinct('category', andFilters[1] ? { isPublic: true, $and: [andFilters[1]] } : { isPublic: true }),
            Resource.aggregate([
                { $match: andFilters[1] ? { isPublic: true, $and: [andFilters[1]] } : { isPublic: true } },
                { $group: { _id: '$_id', type: { $first: '$type' }, isFeatured: { $first: '$isFeatured' } } },
                { $group: { _id: { type: '$type', featured: '$isFeatured' }, count: { $sum: 1 } } },
            ]),
        ]);

        const stats = { total: 0, pdfs: 0, videos: 0, featured: 0 };
        statsRows.forEach((row: { _id: { type?: string; featured?: boolean }; count: number }) => {
            const count = Number(row?.count || 0);
            stats.total += count;
            if (row?._id?.featured) stats.featured += count;
            if (row?._id?.type === 'pdf') stats.pdfs += count;
            if (row?._id?.type === 'video') stats.videos += count;
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            resources: resources.map((item) => withPublicSlug(item as Record<string, any>)),
            total,
            page: pageNum,
            pages: Math.max(1, Math.ceil(total / limitNum)),
            categories: categories.map((item: unknown) => String(item || '').trim()).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b)),
            stats,
        }));
    } catch (err) {
        console.error('getPublicResources error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function incrementResourceView(req: Request, res: Response): Promise<void> {
    try {
        const settings = await loadSanitizedResourceSettings();
        if (!settings.trackingEnabled) {
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ ok: true, trackingEnabled: false }));
            return;
        }
        if (!mongoose.Types.ObjectId.isValid(String(req.params.id || ''))) {
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ ok: false }));
            return;
        }
        await Resource.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ ok: true }));
    } catch {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function incrementResourceDownload(req: Request, res: Response): Promise<void> {
    try {
        const settings = await loadSanitizedResourceSettings();
        if (!settings.trackingEnabled) {
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ ok: true, trackingEnabled: false }));
            return;
        }
        if (!mongoose.Types.ObjectId.isValid(String(req.params.id || ''))) {
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ ok: false }));
            return;
        }
        await Resource.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ ok: true }));
    } catch {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
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
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Resource not found'));
            return;
        }

        // Respect tracking toggle before incrementing detail-page views.
        loadSanitizedResourceSettings()
            .then((settings) => {
                if (!settings.trackingEnabled) return;
                return Resource.findByIdAndUpdate(resource!._id, { $inc: { views: 1 } }).catch(() => undefined);
            })
            .catch(() => undefined);

        // Fetch up to 4 related resources from same category,
        // backfilled with same-type items when the category is thin.
        const relatedResources = await Resource.find({
            _id: { $ne: resource._id },
            category: resource.category,
            ...activeFilter,
        })
            .sort({ publishDate: -1 })
            .limit(4)
            .lean();

        if (relatedResources.length < 4) {
            const fallbackRows = await Resource.find({
                _id: { $nin: [resource._id, ...relatedResources.map((item) => item._id)] },
                type: resource.type,
                ...activeFilter,
            })
                .sort({ publishDate: -1 })
                .limit(4 - relatedResources.length)
                .lean();
            relatedResources.push(...fallbackRows);
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ resource: withPublicSlug(resource as Record<string, any>), relatedResources: relatedResources.map((item) => withPublicSlug(item as Record<string, any>)) }));
    } catch (err) {
        console.error('getPublicResourceBySlug error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
