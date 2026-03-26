import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import slugifyPackage from 'slugify';
import { NewsItemModel } from '../models/NewsItem.js';
import { RssSourceModel } from '../models/RssSource.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { parseFeedItems } from '../services/rssService.js';
import { getNewsSettings, updateNewsSettings } from '../services/newsSettingsService.js';
import { runRssIngestionForSources, runScheduledPublishing } from '../services/newsWorker.js';
import { sanitizeNewsHtml } from '../services/newsUtils.js';
import { writeNewsAuditLog } from '../services/auditService.js';
import { sendError, sendSuccess } from '../utils/response.js';
const NEWS_STATUSES = new Set(['pending_review', 'duplicate_review', 'draft', 'published', 'scheduled', 'rejected']);
const ALLOWED_TRANSITIONS = {
    pending_review: ['published', 'scheduled', 'draft', 'rejected'],
    duplicate_review: ['published', 'draft', 'rejected'],
    draft: ['published', 'scheduled', 'rejected'],
    published: [],
    scheduled: ['published'],
    rejected: []
};
const slugify = slugifyPackage;
const ensureStatus = (status, fallback = 'draft') => {
    const value = String(status || '').trim();
    return NEWS_STATUSES.has(value) ? value : fallback;
};
const canTransition = (from, to) => (ALLOWED_TRANSITIONS[from] || []).includes(to);
const buildUniqueSlug = async (title, currentId) => {
    const base = slugify(title || 'news-item', { lower: true, strict: true, trim: true }) || 'news-item';
    let slug = base;
    let count = 1;
    while (true) {
        const found = await NewsItemModel.findOne({ slug }).select('_id').lean();
        if (!found || String(found._id) === String(currentId || ''))
            break;
        slug = `${base}-${count}`;
        count += 1;
    }
    return slug;
};
const getActorId = (req) => req.adminActorId || '';
const resolveEditPayload = async (req, itemId) => {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const slug = await buildUniqueSlug(String(body.slug || title || 'news-item'), itemId);
    const status = ensureStatus(body.status, 'draft');
    const shortSummary = String(body.shortSummary || '').trim();
    const content = sanitizeNewsHtml(String(body.fullContent || ''));
    const coverChoice = String(body.coverSource || '').trim();
    const coverImageUrl = String(body.coverImageUrl || '').trim() || null;
    const coverSource = (coverChoice === 'rss' || coverChoice === 'admin' || coverChoice === 'default')
        ? coverChoice
        : (coverImageUrl ? 'admin' : 'default');
    const normalizedCoverImageUrl = coverSource === 'default' ? null : coverImageUrl;
    const tags = Array.isArray(body.tags)
        ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : String(body.tags || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
    const scheduledAtRaw = String(body.scheduledAt || '').trim();
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
    return {
        title,
        slug,
        status,
        shortSummary,
        fullContent: content,
        coverImageUrl: normalizedCoverImageUrl,
        coverSource,
        tags,
        category: String(body.category || 'education').trim(),
        isAiSelected: Boolean(body.isAiSelected),
        scheduledAt: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
        originalArticleUrl: String(body.originalArticleUrl || '').trim() || `manual://${slug}`,
        sourceName: String(body.sourceName || 'CampusWay').trim(),
        sourceUrl: String(body.sourceUrl || '').trim(),
        isManuallyCreated: true,
        createdByAdminId: getActorId(req) || null
    };
};
const pushCsvOrXlsx = (res, filename, rows, type) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'news');
    if (type === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.send(csv);
        return;
    }
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
};
export const getAdminNewsList = async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const status = String(req.query.status || '').trim();
    const sourceId = String(req.query.sourceId || '').trim();
    const q = String(req.query.q || '').trim();
    const filter = {};
    if (status && status !== 'all') {
        filter.status = ensureStatus(status, 'pending_review');
    }
    if (sourceId && mongoose.isValidObjectId(sourceId)) {
        filter.sourceId = new mongoose.Types.ObjectId(sourceId);
    }
    if (String(req.query.isAiSelected || '') === 'true')
        filter.isAiSelected = true;
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { shortSummary: { $regex: q, $options: 'i' } },
            { sourceName: { $regex: q, $options: 'i' } }
        ];
    }
    const [total, items] = await Promise.all([
        NewsItemModel.countDocuments(filter),
        NewsItemModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
    ]);
    return sendSuccess(res, { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
};
export const getAdminNewsById = async (req, res) => {
    const item = await NewsItemModel.findById(req.params.id).lean();
    if (!item)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    return sendSuccess(res, { item });
};
export const createAdminNews = async (req, res) => {
    const payload = await resolveEditPayload(req);
    if (!payload.title)
        return sendError(res, 'VALIDATION_ERROR', 'title is required');
    const created = await NewsItemModel.create(payload);
    await writeNewsAuditLog(req, 'create', 'news', String(created._id), { after: { title: created.title, status: created.status } });
    return sendSuccess(res, created, 201);
};
export const updateAdminNews = async (req, res) => {
    const before = await NewsItemModel.findById(req.params.id).lean();
    if (!before)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    const payload = await resolveEditPayload(req, req.params.id);
    const updated = await NewsItemModel.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).lean();
    await writeNewsAuditLog(req, 'edit', 'news', String(req.params.id), {
        before: { title: before.title, status: before.status },
        after: { title: updated?.title, status: updated?.status }
    });
    return sendSuccess(res, updated);
};
export const deleteAdminNews = async (req, res) => {
    const deleted = await NewsItemModel.findByIdAndDelete(req.params.id).lean();
    if (!deleted)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    await writeNewsAuditLog(req, 'delete', 'news', String(req.params.id), { before: { title: deleted.title, status: deleted.status } });
    return sendSuccess(res, { deleted: true });
};
const publishItem = async (req, res, itemId) => {
    const item = await NewsItemModel.findById(itemId).lean();
    if (!item)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    if (!canTransition(ensureStatus(item.status, 'draft'), 'published')) {
        return sendError(res, 'INVALID_TRANSITION', `Cannot publish item from status "${item.status}"`, 400);
    }
    const settings = await getNewsSettings();
    const now = new Date();
    const updated = await NewsItemModel.findByIdAndUpdate(itemId, {
        $set: {
            status: 'published',
            publishedAt: now,
            scheduledAt: null,
            approvedByAdminId: getActorId(req) || null,
            isAiSelected: Boolean(item.isAiGenerated && settings.aiSettings.enabled)
        }
    }, { new: true }).lean();
    await writeNewsAuditLog(req, 'publish', 'news', itemId, { before: { status: item.status }, after: { status: 'published' } });
    return sendSuccess(res, updated);
};
export const approvePublishAdminNews = async (req, res) => publishItem(req, res, req.params.id);
export const rejectAdminNews = async (req, res) => {
    const item = await NewsItemModel.findById(req.params.id).lean();
    if (!item)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    if (!canTransition(ensureStatus(item.status, 'draft'), 'rejected')) {
        return sendError(res, 'INVALID_TRANSITION', `Cannot reject item from status "${item.status}"`, 400);
    }
    const updated = await NewsItemModel.findByIdAndUpdate(req.params.id, { $set: { status: 'rejected', approvedByAdminId: getActorId(req) || null } }, { new: true }).lean();
    await writeNewsAuditLog(req, 'reject', 'news', req.params.id, { before: { status: item.status }, after: { status: 'rejected' } });
    return sendSuccess(res, updated);
};
export const scheduleAdminNews = async (req, res) => {
    const settings = await getNewsSettings();
    if (!settings.workflow.allowScheduling) {
        return sendError(res, 'SCHEDULING_DISABLED', 'Scheduling is disabled by workflow settings', 400);
    }
    const scheduleAtRaw = String(req.body?.scheduledAt || req.body?.scheduleAt || '').trim();
    if (!scheduleAtRaw)
        return sendError(res, 'VALIDATION_ERROR', 'scheduledAt is required');
    const scheduledAt = new Date(scheduleAtRaw);
    if (Number.isNaN(scheduledAt.getTime()))
        return sendError(res, 'VALIDATION_ERROR', 'invalid scheduledAt');
    const item = await NewsItemModel.findById(req.params.id).lean();
    if (!item)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    if (!canTransition(ensureStatus(item.status, 'draft'), 'scheduled')) {
        return sendError(res, 'INVALID_TRANSITION', `Cannot schedule item from status "${item.status}"`, 400);
    }
    const updated = await NewsItemModel.findByIdAndUpdate(req.params.id, {
        $set: {
            status: 'scheduled',
            scheduledAt,
            approvedByAdminId: getActorId(req) || null
        }
    }, { new: true }).lean();
    await writeNewsAuditLog(req, 'schedule', 'news', req.params.id, {
        before: { status: item.status, scheduledAt: item.scheduledAt },
        after: { status: 'scheduled', scheduledAt }
    });
    return sendSuccess(res, updated);
};
export const moveNewsToDraft = async (req, res) => {
    const item = await NewsItemModel.findById(req.params.id).lean();
    if (!item)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    if (!canTransition(ensureStatus(item.status, 'draft'), 'draft')) {
        return sendError(res, 'INVALID_TRANSITION', `Cannot move item to draft from status "${item.status}"`, 400);
    }
    const updated = await NewsItemModel.findByIdAndUpdate(req.params.id, { $set: { status: 'draft' } }, { new: true }).lean();
    await writeNewsAuditLog(req, 'edit', 'news', req.params.id, { before: { status: item.status }, after: { status: 'draft' } });
    return sendSuccess(res, updated);
};
export const duplicatePublishAnyway = async (req, res) => {
    const item = await NewsItemModel.findById(req.params.id).select('status').lean();
    if (!item)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    if (item.status !== 'duplicate_review') {
        return sendError(res, 'INVALID_TRANSITION', 'Only duplicate_review items can use publish-anyway', 400);
    }
    return publishItem(req, res, req.params.id);
};
export const duplicateMerge = async (req, res) => {
    const sourceItem = await NewsItemModel.findById(req.params.id).lean();
    if (!sourceItem)
        return sendError(res, 'NOT_FOUND', 'News item not found', 404);
    if (sourceItem.status !== 'duplicate_review') {
        return sendError(res, 'INVALID_TRANSITION', 'Only duplicate_review items can be merged', 400);
    }
    const targetNewsId = String(req.body?.targetNewsId || sourceItem.duplicateOfNewsId || '').trim();
    if (!targetNewsId || !mongoose.isValidObjectId(targetNewsId)) {
        return sendError(res, 'VALIDATION_ERROR', 'targetNewsId is required');
    }
    const targetItem = await NewsItemModel.findById(targetNewsId).lean();
    if (!targetItem)
        return sendError(res, 'NOT_FOUND', 'Target news not found', 404);
    const mergedTags = Array.from(new Set([...(targetItem.tags || []), ...(sourceItem.tags || [])]));
    const sourceLinkSnippet = `<p><strong>Additional source:</strong> <a href="${sourceItem.originalArticleUrl}">${sourceItem.originalArticleUrl}</a></p>`;
    const mergedContent = sanitizeNewsHtml(`${targetItem.fullContent || ''}${sourceLinkSnippet}`);
    const updatedTarget = await NewsItemModel.findByIdAndUpdate(targetNewsId, {
        $set: { tags: mergedTags, fullContent: mergedContent }
    }, { new: true }).lean();
    await NewsItemModel.findByIdAndUpdate(req.params.id, {
        $set: {
            status: 'rejected',
            duplicateOfNewsId: targetNewsId,
            duplicateReasons: Array.from(new Set([...(sourceItem.duplicateReasons || []), 'merged']))
        }
    });
    await writeNewsAuditLog(req, 'mark_duplicate', 'news', req.params.id, {
        before: { status: sourceItem.status },
        after: { status: 'rejected', mergedInto: targetNewsId }
    });
    return sendSuccess(res, { merged: true, target: updatedTarget });
};
export const listRssSources = async (_req, res) => {
    const items = await RssSourceModel.find().sort({ priority: 1, createdAt: -1 }).lean();
    return sendSuccess(res, { items });
};
export const createRssSource = async (req, res) => {
    const payload = {
        name: String(req.body?.name || '').trim(),
        rssUrl: String(req.body?.rssUrl || '').trim(),
        siteUrl: String(req.body?.siteUrl || '').trim(),
        iconType: String(req.body?.iconType || 'url'),
        iconUrl: String(req.body?.iconUrl || '').trim(),
        categoryTags: Array.isArray(req.body?.categoryTags) ? req.body.categoryTags.map((x) => String(x).trim()).filter(Boolean) : [],
        enabled: Boolean(req.body?.enabled ?? true),
        fetchIntervalMinutes: Number(req.body?.fetchIntervalMinutes || 30),
        priority: Number(req.body?.priority || 0)
    };
    if (!payload.name || !payload.rssUrl)
        return sendError(res, 'VALIDATION_ERROR', 'name and rssUrl are required');
    const item = await RssSourceModel.create(payload);
    await writeNewsAuditLog(req, 'create', 'rss_source', String(item._id), { after: payload });
    return sendSuccess(res, item, 201);
};
export const updateRssSource = async (req, res) => {
    const before = await RssSourceModel.findById(req.params.id).lean();
    if (!before)
        return sendError(res, 'NOT_FOUND', 'Source not found', 404);
    const patch = {};
    const fields = ['name', 'rssUrl', 'siteUrl', 'iconType', 'iconUrl', 'enabled', 'fetchIntervalMinutes', 'priority'];
    fields.forEach((field) => {
        if (req.body?.[field] !== undefined) {
            patch[field] = req.body[field];
        }
    });
    if (req.body?.categoryTags !== undefined) {
        patch.categoryTags = Array.isArray(req.body.categoryTags)
            ? req.body.categoryTags.map((x) => String(x).trim()).filter(Boolean)
            : [];
    }
    const updated = await RssSourceModel.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true }).lean();
    await writeNewsAuditLog(req, 'edit', 'rss_source', req.params.id, { before, after: updated || {} });
    return sendSuccess(res, updated);
};
export const deleteRssSource = async (req, res) => {
    const deleted = await RssSourceModel.findByIdAndDelete(req.params.id).lean();
    if (!deleted)
        return sendError(res, 'NOT_FOUND', 'Source not found', 404);
    await writeNewsAuditLog(req, 'delete', 'rss_source', req.params.id, { before: deleted });
    return sendSuccess(res, { deleted: true });
};
export const testRssSource = async (req, res) => {
    const source = await RssSourceModel.findById(req.params.id).lean();
    if (!source)
        return sendError(res, 'NOT_FOUND', 'Source not found', 404);
    try {
        const items = await parseFeedItems(source.rssUrl);
        return sendSuccess(res, { ok: true, preview: items.slice(0, 5) });
    }
    catch (error) {
        return sendError(res, 'RSS_PARSE_ERROR', error instanceof Error ? error.message : 'Feed parse failed');
    }
};
export const fetchRssNow = async (req, res) => {
    const sourceIds = Array.isArray(req.body?.sourceIds) ? req.body.sourceIds.map((id) => String(id)) : [];
    const stats = await runRssIngestionForSources(sourceIds, true);
    await runScheduledPublishing();
    await writeNewsAuditLog(req, 'publish', 'rss_fetch_job', 'manual', { stats, sourceIds });
    return sendSuccess(res, { message: 'fetch complete', stats });
};
export const putNewsSettings = async (req, res) => {
    const settings = await updateNewsSettings(req.body || {});
    await writeNewsAuditLog(req, 'edit', 'news_settings', 'default', { after: settings });
    return sendSuccess(res, settings);
};
export const exportNews = async (req, res) => {
    const type = String(req.query.type || 'xlsx').toLowerCase() === 'csv' ? 'csv' : 'xlsx';
    const status = String(req.query.status || '').trim();
    const sourceId = String(req.query.sourceId || '').trim();
    const dateRange = String(req.query.dateRange || '').trim();
    const filter = {};
    if (status && status !== 'all')
        filter.status = ensureStatus(status, 'published');
    if (sourceId && mongoose.isValidObjectId(sourceId))
        filter.sourceId = new mongoose.Types.ObjectId(sourceId);
    if (dateRange) {
        const [fromRaw, toRaw] = dateRange.split(',').map((x) => x.trim());
        const range = {};
        if (fromRaw) {
            const from = new Date(fromRaw);
            if (!Number.isNaN(from.getTime()))
                range.$gte = from;
        }
        if (toRaw) {
            const to = new Date(toRaw);
            if (!Number.isNaN(to.getTime()))
                range.$lte = to;
        }
        if (Object.keys(range).length) {
            filter.createdAt = range;
        }
    }
    const items = await NewsItemModel.find(filter).sort({ createdAt: -1 }).limit(10000).lean();
    const rows = items.map((item) => ({
        id: String(item._id),
        status: item.status,
        title: item.title,
        slug: item.slug,
        category: item.category,
        tags: item.tags.join(', '),
        sourceName: item.sourceName,
        originalArticleUrl: item.originalArticleUrl,
        publishedAt: item.publishedAt || '',
        scheduledAt: item.scheduledAt || '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
    }));
    await writeNewsAuditLog(req, 'export', 'news', 'list', { type, count: rows.length, filter });
    return pushCsvOrXlsx(res, `news_export_${Date.now()}`, rows, type);
};
export const getAdminAuditLogs = async (req, res) => {
    const module = String(req.query.module || '').trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const filter = {};
    if (module)
        filter.module = module;
    const [total, items] = await Promise.all([
        AuditLogModel.countDocuments(filter),
        AuditLogModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
    ]);
    return sendSuccess(res, { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
};
export const uploadMedia = async (req, res) => {
    const file = req.file;
    if (!file) {
        return sendError(res, 'VALIDATION_ERROR', 'file is required');
    }
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);
    const relative = `/uploads/${fileName}`;
    await writeNewsAuditLog(req, 'create', 'media', fileName, { relative, size: file.size });
    return sendSuccess(res, { url: relative, filename: fileName, size: file.size }, 201);
};
export const getAdminNewsSettings = async (_req, res) => {
    const settings = await getNewsSettings();
    return sendSuccess(res, settings);
};
