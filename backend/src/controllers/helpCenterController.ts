import { Request, Response } from 'express';
import mongoose from 'mongoose';
import HelpCategory from '../models/HelpCategory';
import HelpArticle from '../models/HelpArticle';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/auth';
import { getClientIp } from '../utils/requestMeta';
import { ResponseBuilder } from '../utils/responseBuilder';

/* ── helpers ── */

function asObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .substring(0, 150);
}

async function createAudit(req: AuthRequest, action: string, details?: Record<string, unknown>): Promise<void> {
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user._id)) return;
    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(req.user._id),
        actor_role: req.user.role,
        action,
        target_type: 'help_center',
        ip_address: getClientIp(req),
        details: details || {},
    });
}

/* ═══════════════════════════════════════════════════════════
   PUBLIC  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */

/** GET /api/help-center — list published categories with articles */
export async function getPublicHelpCenter(_req: Request, res: Response): Promise<void> {
    const categories = await HelpCategory.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    const articles = await HelpArticle.find({ isPublished: true })
        .select('title slug categoryId shortDescription tags isFeatured viewsCount createdAt')
        .sort({ isFeatured: -1, createdAt: -1 })
        .lean();
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ categories, articles }));
}

/** GET /api/help-center/search?q=keyword */
export async function searchPublicHelpArticles(req: Request, res: Response): Promise<void> {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) { ResponseBuilder.send(res, 200, ResponseBuilder.success({ articles: [] })); return; }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const articles = await HelpArticle.find({
        isPublished: true,
        $or: [{ title: regex }, { shortDescription: regex }, { tags: regex }],
    })
        .select('title slug categoryId shortDescription tags createdAt')
        .sort({ isFeatured: -1, viewsCount: -1 })
        .limit(20)
        .lean();
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ articles }));
}

/** GET /api/help-center/:slug — single article */
export async function getPublicHelpArticle(req: Request, res: Response): Promise<void> {
    const slug = String(req.params.slug || '').trim();
    if (!slug) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Missing slug')); return; }

    const article = await HelpArticle.findOneAndUpdate(
        { slug, isPublished: true },
        { $inc: { viewsCount: 1 } },
        { new: true },
    )
        .populate('categoryId', 'name slug')
        .populate('relatedArticleIds', 'title slug shortDescription')
        .lean();

    if (!article) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Article not found')); return; }
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ article }));
}

/** POST /api/help-center/:slug/feedback — helpful/not-helpful */
export async function submitHelpArticleFeedback(req: Request, res: Response): Promise<void> {
    const slug = String(req.params.slug || '').trim();
    const { helpful } = req.body as { helpful?: boolean };
    if (!slug || typeof helpful !== 'boolean') { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid request')); return; }

    const inc = helpful ? { helpfulCount: 1 } : { notHelpfulCount: 1 };
    const article = await HelpArticle.findOneAndUpdate({ slug, isPublished: true }, { $inc: inc });
    if (!article) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Article not found')); return; }
    ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Feedback recorded'));
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS — Categories
   ═══════════════════════════════════════════════════════════ */

/** GET /admin/help-center/categories */
export async function adminGetHelpCategories(_req: AuthRequest, res: Response): Promise<void> {
    const categories = await HelpCategory.find().sort({ displayOrder: 1 }).lean();
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ data: categories }));
}

/** POST /admin/help-center/categories */
export async function adminCreateHelpCategory(req: AuthRequest, res: Response): Promise<void> {
    const { name, description, icon } = req.body as { name?: string; description?: string; icon?: string };
    if (!name || !name.trim()) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Name is required')); return; }

    const slug = slugify(name);
    const exists = await HelpCategory.findOne({ slug }).lean();
    if (exists) { ResponseBuilder.send(res, 409, ResponseBuilder.error('CONFLICT', 'Category with this slug already exists')); return; }

    const maxOrder = await HelpCategory.findOne().sort({ displayOrder: -1 }).select('displayOrder').lean();
    const cat = await HelpCategory.create({
        name: name.trim(),
        slug,
        description: description?.trim(),
        icon: icon?.trim(),
        displayOrder: (maxOrder?.displayOrder ?? -1) + 1,
    });
    await createAudit(req, 'help_category_created', { categoryId: cat._id, name: cat.name });
    ResponseBuilder.send(res, 201, ResponseBuilder.created({data: cat}, 'Category created'));
}

/** PUT /admin/help-center/categories/:id */
export async function adminUpdateHelpCategory(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const { name, description, icon, isActive, displayOrder } = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) { update.name = name.trim(); update.slug = slugify(name); }
    if (typeof description === 'string') update.description = description.trim();
    if (typeof icon === 'string') update.icon = icon.trim();
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (typeof displayOrder === 'number') update.displayOrder = displayOrder;

    const cat = await HelpCategory.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!cat) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Category not found')); return; }
    await createAudit(req, 'help_category_updated', { categoryId: id });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({data: cat}, 'Category updated'));
}

/** DELETE /admin/help-center/categories/:id */
export async function adminDeleteHelpCategory(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const articles = await HelpArticle.countDocuments({ categoryId: id });
    if (articles > 0) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Cannot delete: ${articles} articles belong to this category')); return; }

    const deleted = await HelpCategory.findByIdAndDelete(id);
    if (!deleted) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Category not found')); return; }
    await createAudit(req, 'help_category_deleted', { categoryId: id, name: deleted.name });
    ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Category deleted'));
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS — Articles
   ═══════════════════════════════════════════════════════════ */

/** GET /admin/help-center/articles */
export async function adminGetHelpArticles(req: AuthRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.categoryId) {
        const cid = asObjectId(req.query.categoryId);
        if (cid) filter.categoryId = cid;
    }
    if (req.query.isPublished === 'true') filter.isPublished = true;
    if (req.query.isPublished === 'false') filter.isPublished = false;
    const q = String(req.query.q || '').trim();
    if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: regex }, { tags: regex }];
    }

    const [items, total] = await Promise.all([
        HelpArticle.find(filter)
            .populate('categoryId', 'name slug')
            .populate('createdByAdminId', 'username full_name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        HelpArticle.countDocuments(filter),
    ]);
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ items, total, page, pages: Math.ceil(total / limit) }));
}

/** GET /admin/help-center/articles/:id */
export async function adminGetHelpArticle(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const article = await HelpArticle.findById(id)
        .populate('categoryId', 'name slug')
        .populate('createdByAdminId', 'username full_name')
        .populate('relatedArticleIds', 'title slug')
        .lean();
    if (!article) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Article not found')); return; }
    ResponseBuilder.send(res, 200, ResponseBuilder.success({ data: article }));
}

/** POST /admin/help-center/articles */
export async function adminCreateHelpArticle(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Unauthorized')); return; }

    const { title, categoryId, shortDescription, fullContent, tags, isPublished, isFeatured, relatedArticleIds } = req.body as Record<string, unknown>;
    if (!title || !categoryId || !shortDescription || !fullContent) {
        ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'title, categoryId, shortDescription, and fullContent are required'));
        return;
    }

    const catId = asObjectId(categoryId);
    if (!catId) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid categoryId')); return; }
    const cat = await HelpCategory.findById(catId).lean();
    if (!cat) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Category not found')); return; }

    const slug = slugify(String(title));
    const existing = await HelpArticle.findOne({ slug }).lean();
    if (existing) { ResponseBuilder.send(res, 409, ResponseBuilder.error('CONFLICT', 'Article with this slug already exists')); return; }

    const article = await HelpArticle.create({
        title: String(title).trim(),
        slug,
        categoryId: catId,
        shortDescription: String(shortDescription).trim(),
        fullContent: String(fullContent),
        tags: Array.isArray(tags) ? tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
        isPublished: isPublished === true,
        isFeatured: isFeatured === true,
        relatedArticleIds: Array.isArray(relatedArticleIds) ? relatedArticleIds.map(asObjectId).filter(Boolean) : [],
        createdByAdminId: new mongoose.Types.ObjectId(String(req.user._id)),
        publishedAt: isPublished === true ? new Date() : undefined,
    });

    await HelpCategory.findByIdAndUpdate(catId, { $inc: { articleCount: 1 } });
    await createAudit(req, 'help_article_created', { articleId: article._id, title: article.title });
    ResponseBuilder.send(res, 201, ResponseBuilder.created({data: article}, 'Article created'));
}

/** PUT /admin/help-center/articles/:id */
export async function adminUpdateHelpArticle(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Unauthorized')); return; }

    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (typeof body.title === 'string') { update.title = body.title.trim(); update.slug = slugify(body.title); }
    if (body.categoryId) {
        const cid = asObjectId(body.categoryId);
        if (cid) update.categoryId = cid;
    }
    if (typeof body.shortDescription === 'string') update.shortDescription = body.shortDescription.trim();
    if (typeof body.fullContent === 'string') update.fullContent = body.fullContent;
    if (Array.isArray(body.tags)) update.tags = body.tags.map((t: unknown) => String(t).trim()).filter(Boolean);
    if (typeof body.isPublished === 'boolean') {
        update.isPublished = body.isPublished;
        if (body.isPublished) update.publishedAt = new Date();
    }
    if (typeof body.isFeatured === 'boolean') update.isFeatured = body.isFeatured;
    if (Array.isArray(body.relatedArticleIds)) {
        update.relatedArticleIds = body.relatedArticleIds.map(asObjectId).filter(Boolean);
    }
    update.lastEditedByAdminId = new mongoose.Types.ObjectId(String(req.user._id));

    const article = await HelpArticle.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!article) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Article not found')); return; }
    await createAudit(req, 'help_article_updated', { articleId: id });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({data: article}, 'Article updated'));
}

/** DELETE /admin/help-center/articles/:id */
export async function adminDeleteHelpArticle(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const article = await HelpArticle.findByIdAndDelete(id);
    if (!article) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Article not found')); return; }
    await HelpCategory.findByIdAndUpdate(article.categoryId, { $inc: { articleCount: -1 } });
    await createAudit(req, 'help_article_deleted', { articleId: id, title: article.title });
    ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Article deleted'));
}

/** POST /admin/help-center/articles/:id/publish */
export async function adminPublishHelpArticle(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const article = await HelpArticle.findByIdAndUpdate(
        id,
        { $set: { isPublished: true, publishedAt: new Date() } },
        { new: true },
    );
    if (!article) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Article not found')); return; }
    await createAudit(req, 'help_article_published', { articleId: id });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({data: article}, 'Article published'));
}

/** POST /admin/help-center/articles/:id/unpublish */
export async function adminUnpublishHelpArticle(req: AuthRequest, res: Response): Promise<void> {
    const id = asObjectId(req.params.id);
    if (!id) { ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid id')); return; }

    const article = await HelpArticle.findByIdAndUpdate(
        id,
        { $set: { isPublished: false } },
        { new: true },
    );
    if (!article) { ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Article not found')); return; }
    await createAudit(req, 'help_article_unpublished', { articleId: id });
    ResponseBuilder.send(res, 200, ResponseBuilder.success({data: article}, 'Article unpublished'));
}
