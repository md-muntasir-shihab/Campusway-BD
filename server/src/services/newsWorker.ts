import slugifyPackage from 'slugify';
import mongoose from 'mongoose';
import { NewsItemModel } from '../models/NewsItem.js';
import { RssSourceModel } from '../models/RssSource.js';
import { getNewsSettings } from './newsSettingsService.js';
import { canonicalizeUrl, normalizedHash, sanitizeNewsHtml, textFromHtml, titleSimilarity } from './newsUtils.js';
import { generateStrictExtractiveDraft } from './newsAiService.js';
import { getFullArticleContent, parseFeedItems } from './rssService.js';

let tickRunning = false;

const DUPLICATE_THRESHOLD: Record<'strict' | 'medium' | 'loose', number> = {
  strict: 0.92,
  medium: 0.85,
  loose: 0.75
};
const slugify = slugifyPackage as unknown as (value: string, options?: { lower?: boolean; strict?: boolean; trim?: boolean }) => string;

const buildSlug = async (title: string) => {
  const base = slugify(title || 'news-item', { lower: true, strict: true, trim: true }) || 'news-item';
  let candidate = base;
  let index = 1;
  while (await NewsItemModel.findOne({ slug: candidate }).select('_id').lean()) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
};

const computeDuplicateKeyHash = (guid: string, url: string, title: string) => {
  if (guid) return normalizedHash(`guid:${guid.trim().toLowerCase()}`);
  const canonical = canonicalizeUrl(url);
  if (canonical) return normalizedHash(`url:${canonical}`);
  return normalizedHash(`title:${title.trim().toLowerCase()}`);
};

const detectDuplicate = async (args: {
  guid: string;
  url: string;
  title: string;
  duplicateSensitivity: 'strict' | 'medium' | 'loose';
}) => {
  const reasons: string[] = [];
  const canonicalUrl = canonicalizeUrl(args.url);
  const exactCandidates = await NewsItemModel.find({
    $or: [
      { originalArticleUrl: canonicalUrl },
      { rssGuid: args.guid || '__none__' },
      { duplicateKeyHash: computeDuplicateKeyHash(args.guid, canonicalUrl, args.title) }
    ]
  })
    .select('_id title originalArticleUrl rssGuid status')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const byUrl = exactCandidates.find((item) => canonicalizeUrl(item.originalArticleUrl || '') === canonicalUrl);
  if (byUrl) reasons.push('same_url');

  if (args.guid && exactCandidates.some((item) => String(item.rssGuid || '').trim() === args.guid.trim())) {
    reasons.push('same_guid');
  }

  const titleCandidates = exactCandidates.length > 0
    ? exactCandidates
    : await NewsItemModel.find({})
      .select('_id title originalArticleUrl rssGuid status')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

  const threshold = DUPLICATE_THRESHOLD[args.duplicateSensitivity] ?? DUPLICATE_THRESHOLD.medium;
  const byTitle = titleCandidates.find((item) => titleSimilarity(item.title || '', args.title || '') >= threshold);
  if (byTitle) reasons.push('similar_title');

  const duplicateOf = byUrl?._id || byTitle?._id || exactCandidates[0]?._id || titleCandidates[0]?._id;

  return {
    isDuplicate: reasons.length > 0,
    duplicateOfNewsId: duplicateOf ? String(duplicateOf) : null,
    reasons: Array.from(new Set(reasons))
  };
};

export const runRssIngestionForSources = async (sourceIds?: string[], forceNow = false) => {
  const settings = await getNewsSettings();
  const filter: Record<string, unknown> = { enabled: true };
  if (sourceIds && sourceIds.length > 0) {
    const validSourceIds = sourceIds
      .map((id) => String(id || '').trim())
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (validSourceIds.length > 0) {
      filter._id = { $in: validSourceIds };
    }
  }

  const sources = await RssSourceModel.find(filter).sort({ priority: 1 }).lean();
  const now = Date.now();

  let fetchedCount = 0;
  let createdCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  const errors: Array<{ sourceId?: string; message: string }> = [];

  for (const source of sources) {
    try {
      const intervalMs = Math.max(15, Number(source.fetchIntervalMinutes || 30)) * 60_000;
      const last = source.lastFetchedAt ? new Date(source.lastFetchedAt).getTime() : 0;
      const isManual = forceNow || Boolean(sourceIds && sourceIds.length > 0);
      if (!isManual && last && now - last < intervalMs) {
        continue;
      }

      const feedItems = await parseFeedItems(source.rssUrl);
      fetchedCount += feedItems.length;

      for (const feedItem of feedItems) {
        if (!feedItem.title || !feedItem.link) {
          continue;
        }

        const canonicalUrl = canonicalizeUrl(feedItem.link);
        const ingestHash = computeDuplicateKeyHash(feedItem.guid, canonicalUrl, feedItem.title);
        const sameSourceExists = await NewsItemModel.findOne({
          sourceId: source._id,
          $or: [
            { rssGuid: feedItem.guid || '__none__' },
            { originalArticleUrl: canonicalUrl },
            { duplicateKeyHash: ingestHash }
          ]
        }).select('_id').lean();
        if (sameSourceExists) {
          continue;
        }

        const duplicate = await detectDuplicate({
          guid: feedItem.guid,
          url: canonicalUrl,
          title: feedItem.title,
          duplicateSensitivity: settings.aiSettings.duplicateSensitivity
        });

        const fullContentResult = settings.fetchFullArticleEnabled
          ? await getFullArticleContent(settings.fullArticleFetchMode, canonicalUrl, feedItem.rawContent)
          : { content: sanitizeNewsHtml(feedItem.rawDescription), fetchedFullText: false };

        let title = feedItem.title;
        let shortSummary = textFromHtml(feedItem.rawDescription || fullContentResult.content).slice(0, 300);
        let fullContent = fullContentResult.content;
        let tags = [...(source.categoryTags || [])];
        let category = source.categoryTags?.[0] || 'education';
        let isAiGenerated = false;
        let aiUsed = false;
        let aiModel = '';
        let aiGeneratedAt: Date | null = null;
        let aiNotes = '';

        if (settings.aiSettings.enabled) {
          const draft = generateStrictExtractiveDraft({
            sourceName: source.name,
            originalArticleUrl: canonicalUrl,
            rawTitle: feedItem.title,
            rawDescription: feedItem.rawDescription,
            rawContent: feedItem.rawContent,
            language: settings.aiSettings.language,
            maxLength: settings.aiSettings.maxLength
          });
          title = draft.title || title;
          shortSummary = draft.shortSummary || shortSummary;
          fullContent = draft.fullContent || fullContent;
          tags = draft.tags.length > 0 ? draft.tags : tags;
          category = draft.category || category;
          isAiGenerated = true;
          aiUsed = true;
          aiModel = draft.aiModel;
          aiGeneratedAt = new Date();
          aiNotes = draft.aiNotes || '';
        }

        const slug = await buildSlug(title);
        const duplicateKeyHash = computeDuplicateKeyHash(feedItem.guid, canonicalUrl, title);

        await NewsItemModel.create({
          status: duplicate.isDuplicate ? 'duplicate_review' : settings.workflow.defaultIncomingStatus,
          title,
          slug,
          shortSummary,
          fullContent,
          coverImageUrl: feedItem.imageUrl || null,
          coverSource: feedItem.imageUrl ? 'rss' : 'default',
          tags,
          category,
          isAiSelected: false,
          isAiGenerated,
          publishedAt: null,
          scheduledAt: null,
          sourceId: source._id,
          sourceName: source.name,
          sourceUrl: source.siteUrl,
          originalArticleUrl: canonicalUrl,
          rssGuid: feedItem.guid,
          rssPublishedAt: feedItem.publishedAt || null,
          rssRawTitle: feedItem.title,
          rssRawDescription: feedItem.rawDescription,
          rssRawContent: feedItem.rawContent,
          fetchedFullText: fullContentResult.fetchedFullText,
          fetchedFullTextAt: fullContentResult.fetchedFullText ? new Date() : null,
          aiUsed,
          aiModel,
          aiLanguage: settings.aiSettings.language,
          aiGeneratedAt,
          aiNotes,
          duplicateKeyHash,
          duplicateOfNewsId: duplicate.duplicateOfNewsId,
          duplicateReasons: duplicate.reasons,
          isManuallyCreated: false
        });

        if (duplicate.isDuplicate) {
          duplicateCount += 1;
        }
        createdCount += 1;
      }

      await RssSourceModel.findByIdAndUpdate(source._id, { $set: { lastFetchedAt: new Date() } });
    } catch (error) {
      failedCount += 1;
      errors.push({ sourceId: String(source._id), message: error instanceof Error ? error.message : 'RSS fetch error' });
    }
  }

  return { fetchedCount, createdCount, duplicateCount, failedCount, errors };
};

export const runScheduledPublishing = async () => {
  const now = new Date();
  const dueItems = await NewsItemModel.find({
    status: 'scheduled',
    scheduledAt: { $lte: now }
  }).select('_id').lean();

  if (dueItems.length === 0) {
    return 0;
  }

  const ids = dueItems.map((item) => item._id);
  const result = await NewsItemModel.updateMany(
    { _id: { $in: ids } },
    { $set: { status: 'published', publishedAt: now, scheduledAt: null } }
  );
  return result.modifiedCount || 0;
};

export const runNewsWorkerTick = async () => {
  if (tickRunning) {
    return;
  }
  tickRunning = true;
  try {
    await runRssIngestionForSources();
    await runScheduledPublishing();
  } finally {
    tickRunning = false;
  }
};

