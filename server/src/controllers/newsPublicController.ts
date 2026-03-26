import { Request, Response } from 'express';
import { NewsItemModel } from '../models/NewsItem.js';
import { RssSourceModel } from '../models/RssSource.js';
import { getNewsSettings } from '../services/newsSettingsService.js';
import { buildSharePayload } from '../services/newsUtils.js';
import { sendError, sendSuccess } from '../utils/response.js';

const resolveCover = (item: Record<string, unknown>, defaultBanner: string) => {
  const coverUrl = String(item.coverImageUrl || '').trim();
  const coverSource = String(item.coverSource || '').trim();
  if (!coverUrl || coverSource === 'default') {
    return defaultBanner;
  }
  return coverUrl;
};

export const getPublicNewsList = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12)));
  const sourceId = String(req.query.sourceId || '').trim();
  const tag = String(req.query.tag || '').trim();
  const q = String(req.query.q || '').trim();

  const filter: Record<string, unknown> = { status: 'published' };
  if (sourceId) filter.sourceId = sourceId;
  if (tag) filter.tags = tag;
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { shortSummary: { $regex: q, $options: 'i' } },
      { sourceName: { $regex: q, $options: 'i' } }
    ];
  }

  const [settings, total, items] = await Promise.all([
    getNewsSettings(),
    NewsItemModel.countDocuments(filter),
    NewsItemModel.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
  ]);

  const host = `${req.protocol}://${req.get('host') || 'localhost:4000'}`;
  const mapped = items.map((item) => {
    const url = `${host}/news/${item.slug}`;
    const share = buildSharePayload(settings.shareTemplates || {}, item.title, item.shortSummary, url);
    return {
      ...item,
      coverImageUrl: resolveCover(item as unknown as Record<string, unknown>, settings.defaultBannerUrl || settings.defaultThumbUrl || ''),
      shareText: share.text,
      shareLinks: share.links,
      shareUrl: url
    };
  });

  return sendSuccess(res, { items: mapped, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
};

export const getPublicNewsBySlug = async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').trim();
  const settings = await getNewsSettings();
  const item = await NewsItemModel.findOne({ slug, status: 'published' }).lean();
  if (!item) {
    return sendError(res, 'NOT_FOUND', 'News not found', 404);
  }

  const relatedFilter: Record<string, unknown> = {
    status: 'published',
    _id: { $ne: item._id }
  };
  if (item.tags?.length) {
    relatedFilter.tags = { $in: item.tags.slice(0, 5) };
  } else if (item.sourceId) {
    relatedFilter.sourceId = item.sourceId;
  }

  const related = await NewsItemModel.find(relatedFilter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(5)
    .lean();

  const host = `${req.protocol}://${req.get('host') || 'localhost:4000'}`;
  const detailUrl = `${host}/news/${item.slug}`;
  const share = buildSharePayload(settings.shareTemplates || {}, item.title, item.shortSummary, detailUrl);

  return sendSuccess(res, {
    item: {
      ...item,
      coverImageUrl: resolveCover(item as unknown as Record<string, unknown>, settings.defaultBannerUrl || settings.defaultThumbUrl || ''),
      shareText: share.text,
      shareLinks: share.links,
      shareUrl: detailUrl
    },
    related: related.map((entry) => ({
      ...entry,
      coverImageUrl: resolveCover(entry as unknown as Record<string, unknown>, settings.defaultBannerUrl || settings.defaultThumbUrl || '')
    }))
  });
};

export const getPublicNewsSources = async (_req: Request, res: Response) => {
  const [settings, sources, counts] = await Promise.all([
    getNewsSettings(),
    RssSourceModel.find({ enabled: true }).sort({ priority: 1 }).lean(),
    NewsItemModel.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$sourceId', count: { $sum: 1 } } }
    ])
  ]);
  const countMap = new Map(counts.map((row) => [String(row._id || ''), Number(row.count || 0)]));

  const items = sources.map((source) => ({
    _id: String(source._id),
    name: source.name,
    rssUrl: source.rssUrl,
    siteUrl: source.siteUrl,
    iconUrl: source.iconUrl || settings.defaultSourceIconUrl || '',
    categoryTags: source.categoryTags,
    count: countMap.get(String(source._id)) || 0
  }));
  return sendSuccess(res, { items });
};

export const getPublicNewsSettings = async (_req: Request, res: Response) => {
  const settings = await getNewsSettings();
  return sendSuccess(res, {
    newsPageTitle: settings.newsPageTitle,
    newsPageSubtitle: settings.newsPageSubtitle,
    defaultBannerUrl: settings.defaultBannerUrl,
    defaultThumbUrl: settings.defaultThumbUrl,
    defaultSourceIconUrl: settings.defaultSourceIconUrl,
    appearance: settings.appearance,
    shareTemplates: settings.shareTemplates,
    workflow: { allowScheduling: settings.workflow.allowScheduling }
  });
};

export const trackPublicNewsShare = async (req: Request, res: Response) => {
  const slug = String(req.body?.slug || '').trim();
  const channel = String(req.body?.channel || '').trim();
  if (!slug || !channel) {
    return sendError(res, 'VALIDATION_ERROR', 'slug and channel are required');
  }

  const item = await NewsItemModel.findOne({ slug }).select('_id').lean();
  if (!item) {
    return sendError(res, 'NOT_FOUND', 'News not found', 404);
  }

  return sendSuccess(res, { ok: true, slug, channel });
};

