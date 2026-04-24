import { Request, Response } from 'express';
import { escapeRegex } from '../utils/escapeRegex';
import News from '../models/News';
import Service from '../models/Service';
import ServicePageConfig from '../models/ServicePageConfig';
import Resource from '../models/Resource';
import ResourceSettings, { RESOURCE_ALLOWED_TYPES, RESOURCE_SETTINGS_DEFAULTS } from '../models/ResourceSettings';
import ContactMessage from '../models/ContactMessage';
import SiteSettings from '../models/Settings';
import slugify from 'slugify';
import { AuthRequest } from '../middlewares/auth';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';

import NewsCategory from '../models/NewsCategory';

/* ═══════════════════════════════
   NEWS CATEGORY CRUD
═══════════════════════════════ */

export async function adminGetNewsCategories(_req: Request, res: Response): Promise<void> {
    try {
        const categories = await NewsCategory.find().sort({ createdAt: -1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ categories }));
    } catch (err) {
        console.error('adminGetNewsCategories error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminCreateNewsCategory(req: Request, res: Response): Promise<void> {
    try {
        const { name, description } = req.body;
        if (!name) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Category name is required')); return; }
        let slug = slugify(name, { lower: true, strict: true });
        const existing = await NewsCategory.findOne({ slug });
        if (existing) slug = `${slug}-${Date.now()}`;

        const category = await NewsCategory.create({ name, slug, description });
        ResponseBuilder.send(res, 201, ResponseBuilder.created({ category }, 'Category created'));
    } catch (err) {
        console.error('adminCreateNewsCategory error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateNewsCategory(req: Request, res: Response): Promise<void> {
    try {
        const category = await NewsCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Category not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ category }, 'Category updated'));
    } catch (err) {
        console.error('adminUpdateNewsCategory error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminDeleteNewsCategory(req: Request, res: Response): Promise<void> {
    try {
        const category = await NewsCategory.findByIdAndDelete(req.params.id);
        if (!category) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Category not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Category deleted'));
    } catch (err) {
        console.error('adminDeleteNewsCategory error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminToggleNewsCategory(req: Request, res: Response): Promise<void> {
    try {
        const category = await NewsCategory.findById(req.params.id);
        if (!category) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Category not found')); return; }
        category.isActive = !category.isActive;
        await category.save();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ category }, `Category ${category.isActive ? 'activated' : 'deactivated'}`));
    } catch (err) {
        console.error('adminToggleNewsCategory error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════
   NEWS CRUD
═══════════════════════════════ */

export async function adminGetNews(req: Request, res: Response): Promise<void> {
    try {
        const { page = '1', limit = '20', q, category, status } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const filter: Record<string, unknown> = {};
        if (category) filter.category = category;
        if (status) filter.status = status;
        if (q) {
            const safeQ = escapeRegex(String(q));
            filter.$or = [
                { title: { $regex: safeQ, $options: 'i' } },
                { shortDescription: { $regex: safeQ, $options: 'i' } },
            ];
        }
        const total = await News.countDocuments(filter);
        const news = await News.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .populate('createdBy', 'fullName email')
            .lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ news, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } }));
    } catch (err) {
        console.error('adminGetNews error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminCreateNews(req: AuthRequest, res: Response): Promise<void> {
    try {
        const data = req.body;
        if (!data.title) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Title is required')); return; }
        if (!data.slug) data.slug = slugify(data.title, { lower: true, strict: true });
        const existing = await News.findOne({ slug: data.slug });
        if (existing) data.slug = `${data.slug}-${Date.now()}`;
        if (!data.shortDescription) data.shortDescription = data.content?.replace(/<[^>]*>/g, '').slice(0, 200) || '';

        data.createdBy = req.user?._id;
        const news = await News.create(data);
        broadcastHomeStreamEvent({ type: 'news-updated', meta: { action: 'create', newsId: String(news._id) } });
        ResponseBuilder.send(res, 201, ResponseBuilder.created({ news }, 'News article created'));
    } catch (err) {
        console.error('adminCreateNews error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateNews(req: Request, res: Response): Promise<void> {
    try {
        const news = await News.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!news) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'News not found')); return; }
        broadcastHomeStreamEvent({ type: 'news-updated', meta: { action: 'update', newsId: String(news._id) } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ news }, 'News updated'));
    } catch (err) {
        console.error('adminUpdateNews error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminDeleteNews(req: Request, res: Response): Promise<void> {
    try {
        const news = await News.findByIdAndDelete(req.params.id);
        if (!news) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'News not found')); return; }
        broadcastHomeStreamEvent({ type: 'news-updated', meta: { action: 'delete', newsId: String(news._id) } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'News deleted'));
    } catch (err) {
        console.error('adminDeleteNews error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminToggleNewsPublish(req: Request, res: Response): Promise<void> {
    try {
        const news = await News.findById(req.params.id);
        if (!news) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'News not found')); return; }
        news.isPublished = !news.isPublished;
        news.status = news.isPublished ? 'published' : 'draft';
        if (news.isPublished && (!news.publishDate || news.publishDate > new Date())) {
            news.publishDate = new Date();
        }
        await news.save();
        broadcastHomeStreamEvent({
            type: 'news-updated',
            meta: { action: news.isPublished ? 'publish' : 'unpublish', newsId: String(news._id) },
        });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ news }, `News ${news.isPublished ? 'published' : 'unpublished'}`));
    } catch (err) {
        console.error('adminToggleNewsPublish error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════
   NEWS PUBLIC API
═══════════════════════════════ */

export async function getPublicNews(req: Request, res: Response): Promise<void> {
    try {
        const { page = '1', limit = '10', category, search } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const filter: Record<string, unknown> = { status: 'published', isPublished: true };

        if (category && category !== 'All') filter.category = category;
        if (search) {
            const safeSearch = escapeRegex(String(search));
            filter.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { shortDescription: { $regex: safeSearch, $options: 'i' } },
            ];
        }

        const total = await News.countDocuments(filter);
        const news = await News.find(filter)
            .sort({ publishDate: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .select('-content') // exclude content in list route for performance
            .lean();

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ success: true, total, currentPage: pageNum, totalPages: Math.ceil(total / limitNum), data: news }));
    } catch (err) {
        console.error('getPublicNews error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getPublicFeaturedNews(req: Request, res: Response): Promise<void> {
    try {
        const { limit = '3' } = req.query;
        const limitNum = parseInt(limit as string, 10);

        let news = await News.find({ status: 'published', isPublished: true, isFeatured: true })
            .sort({ publishDate: -1 })
            .limit(limitNum)
            .select('-content')
            .lean();

        // If no featured news found, fallback to latest published news
        if (news.length === 0) {
            news = await News.find({ status: 'published', isPublished: true })
                .sort({ publishDate: -1 })
                .limit(limitNum)
                .select('-content')
                .lean();
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ success: true, data: news }));
    } catch (err) {
        console.error('getPublicFeaturedNews error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getPublicNewsBySlug(req: Request, res: Response): Promise<void> {
    try {
        const news = await News.findOneAndUpdate(
            { slug: req.params.slug, status: 'published', isPublished: true },
            { $inc: { views: 1 } },
            { new: true }
        ).populate('createdBy', 'fullName').lean();

        if (!news) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'News article not found')); return; }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ success: true, data: news }));
    } catch (err) {
        console.error('getPublicNewsBySlug error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getTrendingNews(req: Request, res: Response): Promise<void> {
    try {
        const { limit = '5' } = req.query;
        const limitNum = parseInt(limit as string, 10);

        const news = await News.find({ status: 'published', isPublished: true })
            .sort({ views: -1, publishDate: -1 })
            .limit(limitNum)
            .select('title slug featuredImage thumbnail publishDate views category')
            .lean();

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ success: true, data: news }));
    } catch (err) {
        console.error('getTrendingNews error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getPublicNewsCategories(_req: Request, res: Response): Promise<void> {
    try {
        const categories = await NewsCategory.find({ isActive: true }).sort({ name: 1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ success: true, data: categories }));
    } catch (err) {
        console.error('getPublicNewsCategories error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════
   SERVICES PAGE CONFIG
═══════════════════════════════ */

export async function adminGetServiceConfig(req: Request, res: Response): Promise<void> {
    try {
        let config = await ServicePageConfig.findOne();
        if (!config) config = await ServicePageConfig.create({});
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ config }));
    } catch (err) {
        console.error('adminGetServiceConfig error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateServiceConfig(req: Request, res: Response): Promise<void> {
    try {
        let config = await ServicePageConfig.findOne();
        if (!config) config = new ServicePageConfig();
        Object.assign(config, req.body);
        await config.save();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ config }, 'Service page configuration updated'));
    } catch (err) {
        console.error('adminUpdateServiceConfig error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function getPublicServiceConfig(_req: Request, res: Response): Promise<void> {
    try {
        let config = await ServicePageConfig.findOne();
        if (!config) {
            config = await ServicePageConfig.create({});
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ config }));
    } catch (err) {
        console.error('getPublicServiceConfig error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════
   SERVICES CRUD
═══════════════════════════════ */

export async function adminGetServices(req: Request, res: Response): Promise<void> {
    try {
        const services = await Service.find().sort({ display_order: 1, createdAt: -1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ services }));
    } catch (err) {
        console.error('adminGetServices error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminCreateService(req: Request, res: Response): Promise<void> {
    try {
        const ObjectData = req.body;
        if (!ObjectData.service_title) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Service title is required')); return; }

        if (!ObjectData.service_slug) {
            ObjectData.service_slug = slugify(ObjectData.service_title, { lower: true, strict: true });
        }

        let slugExists = await Service.findOne({ service_slug: ObjectData.service_slug });
        if (slugExists) {
            ObjectData.service_slug = `${ObjectData.service_slug}-${Date.now()}`;
        }

        const service = await Service.create(ObjectData);
        ResponseBuilder.send(res, 201, ResponseBuilder.created({ service }, 'Service created'));
    } catch (err) {
        console.error('adminCreateService error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateService(req: Request, res: Response): Promise<void> {
    try {
        const ObjectData = req.body;
        if (ObjectData.service_title && !ObjectData.service_slug) {
            ObjectData.service_slug = slugify(ObjectData.service_title, { lower: true, strict: true });
            let slugExists = await Service.findOne({ service_slug: ObjectData.service_slug, _id: { $ne: req.params.id } });
            if (slugExists) ObjectData.service_slug = `${ObjectData.service_slug}-${Date.now()}`;
        }

        const service = await Service.findByIdAndUpdate(req.params.id, ObjectData, { new: true, runValidators: true });
        if (!service) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Service not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ service }, 'Service updated'));
    } catch (err) {
        console.error('adminUpdateService error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminDeleteService(req: Request, res: Response): Promise<void> {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Service not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Service deleted'));
    } catch (err) {
        console.error('adminDeleteService error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminToggleServiceStatus(req: Request, res: Response): Promise<void> {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Service not found')); return; }
        service.is_active = !service.is_active;
        await service.save();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ service }, `Service marked as ${service.is_active ? 'active' : 'inactive'}`));
    } catch (err) {
        console.error('adminToggleServiceStatus error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminBulkImportServices(req: Request, res: Response): Promise<void> {
    try {
        const servicesData = req.body;
        if (!Array.isArray(servicesData) || servicesData.length === 0) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid or empty array'));
            return;
        }

        // We process sequentially or bulkWrite. bulkWrite is perfectly efficient.
        const bulkOps = servicesData.map((s: any) => {
            if (!s.service_title) {
                s.service_title = 'Untilted Service';
            }
            if (!s.service_slug) {
                s.service_slug = slugify(s.service_title, { lower: true, strict: true }) + '-' + Math.floor(Math.random() * 10000);
            }
            if (!s.category) s.category = 'General';
            if (!s.short_description) s.short_description = 'No description provided';

            return {
                updateOne: {
                    filter: { service_title: s.service_title },
                    update: { $set: s },
                    upsert: true
                }
            };
        });

        const result = await Service.bulkWrite(bulkOps);

        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Successfully imported ${bulkOps.length} services (Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount})'));
    } catch (err) {
        console.error('adminBulkImportServices error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error during bulk import'));
    }
}

/* ═══════════════════════════════
   RESOURCES CRUD
═══════════════════════════════ */

export async function adminGetResources(req: Request, res: Response): Promise<void> {
    try {
        const { page = '1', limit = '20', type, category } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const filter: Record<string, unknown> = {};
        if (type) filter.type = type;
        if (category) filter.category = category;
        const total = await Resource.countDocuments(filter);
        const resources = await Resource.find(filter)
            .sort({ order: 1, createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ resources, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } }));
    } catch (err) {
        console.error('adminGetResources error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminCreateResource(req: Request, res: Response): Promise<void> {
    try {
        const data = req.body;
        if (!data.title || !data.type) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Title and type are required')); return; }
        // Auto-generate slug from title
        let slug = slugify(String(data.title), { lower: true, strict: true });
        const existing = await Resource.findOne({ slug });
        if (existing) slug = `${slug}-${Date.now()}`;
        data.slug = slug;
        const resource = await Resource.create(data);
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'resources', action: 'create', resourceId: String(resource._id) } });
        ResponseBuilder.send(res, 201, ResponseBuilder.created({ resource }, 'Resource created'));
    } catch (err) {
        console.error('adminCreateResource error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateResource(req: Request, res: Response): Promise<void> {
    try {
        const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!resource) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Resource not found')); return; }
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'resources', action: 'update', resourceId: String(resource._id) } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ resource }, 'Resource updated'));
    } catch (err) {
        console.error('adminUpdateResource error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminDeleteResource(req: Request, res: Response): Promise<void> {
    try {
        const resource = await Resource.findByIdAndDelete(req.params.id);
        if (!resource) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Resource not found')); return; }
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'resources', action: 'delete', resourceId: String(resource._id) } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Resource deleted'));
    } catch (err) {
        console.error('adminDeleteResource error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminToggleResourcePublish(req: Request, res: Response): Promise<void> {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Resource not found')); return; }
        resource.isPublic = !resource.isPublic;
        await resource.save();
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'resources', action: 'toggle-publish', resourceId: String(resource._id) } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ resource }, `Resource marked as ${resource.isPublic ? 'public' : 'private'}`));
    } catch (err) {
        console.error('adminToggleResourcePublish error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminToggleResourceFeatured(req: Request, res: Response): Promise<void> {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Resource not found')); return; }
        resource.isFeatured = !resource.isFeatured;
        await resource.save();
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { section: 'resources', action: 'toggle-featured', resourceId: String(resource._id) } });
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ resource }, `Resource ${resource.isFeatured ? 'featured' : 'unfeatured'}`));
    } catch (err) {
        console.error('adminToggleResourceFeatured error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminGetResourceSettings(_req: Request, res: Response): Promise<void> {
    try {
        const existing = await ResourceSettings.findOne();
        if (!existing) {
            const created = await ResourceSettings.create({});
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings: created.toObject() }));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings: existing.toObject() }));
    } catch (err) {
        console.error('adminGetResourceSettings error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateResourceSettings(req: Request, res: Response): Promise<void> {
    try {
        const input = (req.body || {}) as Record<string, unknown>;
        const allowedKeys = new Set([
            'pageTitle',
            'pageSubtitle',
            'heroBadgeLabel',
            'searchPlaceholder',
            'defaultThumbnailUrl',
            'publicPageEnabled',
            'studentHubEnabled',
            'showHero',
            'showStats',
            'showFeatured',
            'featuredLimit',
            'defaultSort',
            'defaultType',
            'defaultCategory',
            'itemsPerPage',
            'showSearch',
            'showTypeFilter',
            'showCategoryFilter',
            'trackingEnabled',
            'allowUserUploads',
            'requireAdminApproval',
            'maxFileSizeMB',
            'allowedCategories',
            'allowedTypes',
            'openLinksInNewTab',
            'featuredSectionTitle',
            'emptyStateMessage',
        ]);
        const safeUpdate: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(input)) {
            if (allowedKeys.has(k)) safeUpdate[k] = v;
        }
        if (Array.isArray(safeUpdate.allowedCategories)) {
            safeUpdate.allowedCategories = safeUpdate.allowedCategories
                .map((item) => String(item || '').trim())
                .filter(Boolean);
        }
        if (Array.isArray(safeUpdate.allowedTypes)) {
            safeUpdate.allowedTypes = safeUpdate.allowedTypes
                .map((item) => String(item || '').trim().toLowerCase())
                .filter((item) => RESOURCE_ALLOWED_TYPES.includes(item as typeof RESOURCE_ALLOWED_TYPES[number]));
        }
        if (!Array.isArray(safeUpdate.allowedTypes) || (safeUpdate.allowedTypes as string[]).length === 0) {
            delete safeUpdate.allowedTypes;
        }
        if (safeUpdate.defaultType !== undefined) {
            const nextDefaultType = String(safeUpdate.defaultType || '').trim().toLowerCase();
            safeUpdate.defaultType =
                nextDefaultType === 'all' || RESOURCE_ALLOWED_TYPES.includes(nextDefaultType as typeof RESOURCE_ALLOWED_TYPES[number])
                    ? nextDefaultType
                    : RESOURCE_SETTINGS_DEFAULTS.defaultType;
        }
        if (safeUpdate.defaultSort !== undefined) {
            const nextDefaultSort = String(safeUpdate.defaultSort || '').trim().toLowerCase();
            safeUpdate.defaultSort = ['latest', 'downloads', 'views'].includes(nextDefaultSort)
                ? nextDefaultSort
                : RESOURCE_SETTINGS_DEFAULTS.defaultSort;
        }
        const settings = await ResourceSettings.findOneAndUpdate(
            {},
            { $set: safeUpdate },
            { new: true, upsert: true, runValidators: true },
        );
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings }, 'Resource settings updated'));
    } catch (err) {
        console.error('adminUpdateResourceSettings error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════
   CONTACT MESSAGES
═══════════════════════════════ */

export async function adminGetContactMessages(req: Request, res: Response): Promise<void> {
    try {
        const { page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const total = await ContactMessage.countDocuments();
        const messages = await ContactMessage.find()
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ messages, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } }));
    } catch (err) {
        console.error('adminGetContactMessages error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminDeleteContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const msg = await ContactMessage.findByIdAndDelete(req.params.id);
        if (!msg) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Message not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Message deleted'));
    } catch (err) {
        console.error('adminDeleteContactMessage error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateContactMessage(req: Request, res: Response): Promise<void> {
    try {
        const update: Record<string, unknown> = {};
        if ((req.body as Record<string, unknown>).isRead !== undefined) {
            update.isRead = Boolean((req.body as Record<string, unknown>).isRead);
        }
        if ((req.body as Record<string, unknown>).isReplied !== undefined) {
            update.isReplied = Boolean((req.body as Record<string, unknown>).isReplied);
        }

        const msg = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
        if (!msg) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Message not found'));
            return;
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ item: msg }, 'Contact message updated'));
    } catch (err) {
        console.error('adminUpdateContactMessage error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════
   SITE SETTINGS
═══════════════════════════════ */

export async function getSiteSettings(_req: Request, res: Response): Promise<void> {
    try {
        const existing = await SiteSettings.findOne();
        if (!existing) {
            const created = await SiteSettings.create({});
            ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings: created.toObject() }));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings: existing.toObject() }));
    } catch (err) {
        console.error('getSiteSettings error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function updateSiteSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const input = (req.body || {}) as Record<string, unknown>;
        const allowedKeys = new Set([
            'siteName',
            'tagline',
            'metaTitle',
            'metaDescription',
            'logoUrl',
            'faviconUrl',
            'footerText',
            'contactEmail',
            'contactPhone',
            'contactAddress',
            'socialLinks',
            'maintenanceMode',
        ]);

        const unknownKeys = Object.keys(input).filter((key) => !allowedKeys.has(key));
        if (unknownKeys.length) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', `Unknown settings keys: ${unknownKeys.join(', ')}`));
            return;
        }

        if (input.socialLinks !== undefined && !Array.isArray(input.socialLinks)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'socialLinks must be an array'));
            return;
        }

        const updatePayload: Record<string, unknown> = { updatedBy: req.user?._id };
        for (const key of allowedKeys) {
            if (input[key] !== undefined) {
                updatePayload[key] = input[key];
            }
        }

        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = await SiteSettings.create(updatePayload);
        } else {
            Object.assign(settings, updatePayload);
            await settings.save();
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings }, 'Settings updated successfully'));
    } catch (err) {
        console.error('updateSiteSettings error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════
   ROLE MANAGEMENT
═══════════════════════════════ */

import User from '../models/User';
import bcrypt from 'bcryptjs';
import { ResponseBuilder } from '../utils/responseBuilder';

export async function adminUpdateUserRole(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const validRoles = ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent', 'student', 'chairman'];
        if (!validRoles.includes(role)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', `Invalid role. Must be one of: ${validRoles.join(', ')}`));
            return;
        }
        // Only superadmin can set superadmin role
        if (role === 'superadmin' && req.user?.role !== 'superadmin') {
            ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Only superadmin can assign superadmin role'));
            return;
        }
        const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
        if (!user) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'User not found')); return; }
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ user }, `User role updated to ${role}`));
    } catch (err) {
        console.error('adminUpdateUserRole error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminCreateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { username, email, password, fullName, role } = req.body;
        if (!username || !email || !password || !fullName) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'username, email, password, fullName are required'));
            return;
        }
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'User with this email or username already exists')); return; }
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            username, email, password: hashedPassword, full_name: fullName,
            role: role || 'student',
        });
        ResponseBuilder.send(res, 201, ResponseBuilder.created({
            user: { _id: user._id, username: user.username, email: user.email, role: user.role, fullName: user.full_name },
        }, 'User created successfully'));
    } catch (err) {
        console.error('adminCreateUser error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminResetUserPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Password must be at least 8 characters'));
            return;
        }
        const user = await User.findById(userId);
        if (!user) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'User not found')); return; }
        user.password = await bcrypt.hash(newPassword, 12);
        user.mustChangePassword = true;
        await user.save();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Password reset successfully. User must change password on next login.'));
    } catch (err) {
        console.error('adminResetUserPassword error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

/* ═══════════════════════════════
   DATA EXPORT
═══════════════════════════════ */

export async function adminExportNews(_req: Request, res: Response): Promise<void> {
    try {
        const news = await News.find().lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=news_export.json');
        ResponseBuilder.send(res, 200, ResponseBuilder.success(news));
    } catch (err) {
        console.error('adminExportNews error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminExportSubscriptionPlans(_req: Request, res: Response): Promise<void> {
    try {
        const services = await Service.find().lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=subscription_plans_export.json');
        ResponseBuilder.send(res, 200, ResponseBuilder.success(services));
    } catch (err) {
        console.error('adminExportSubscriptionPlans error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminExportUniversities(_req: Request, res: Response): Promise<void> {
    try {
        const { default: University } = await import('../models/University');
        const universities = await University.find().lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=universities_export.json');
        ResponseBuilder.send(res, 200, ResponseBuilder.success(universities));
    } catch (err) {
        console.error('adminExportUniversities error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminExportStudents(_req: Request, res: Response): Promise<void> {
    try {
        const students = await User.find({ role: 'student' }).select('-password -twoFactorSecret').lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=students_export.json');
        ResponseBuilder.send(res, 200, ResponseBuilder.success(students));
    } catch (err) {
        console.error('adminExportStudents error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
