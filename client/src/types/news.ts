export type NewsStatus = 'pending_review' | 'duplicate_review' | 'draft' | 'published' | 'scheduled' | 'rejected';
export type FullArticleFetchMode = 'rss_content' | 'readability_scrape' | 'both';
export type DuplicateReason = 'same_url' | 'same_guid' | 'similar_title';

export interface RssSource {
  _id: string;
  name: string;
  rssUrl: string;
  siteUrl?: string;
  iconType: 'upload' | 'url';
  iconUrl?: string;
  categoryTags: string[];
  enabled: boolean;
  fetchIntervalMinutes: 15 | 30 | 60 | 360;
  priority: number;
  lastFetchedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  count?: number;
}

export interface NewsItem {
  _id: string;
  status: NewsStatus;
  title: string;
  slug: string;
  shortSummary: string;
  fullContent: string;
  coverImageUrl?: string | null;
  coverSource: 'rss' | 'admin' | 'default';
  tags: string[];
  category: string;
  isAiSelected: boolean;
  isAiGenerated: boolean;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  sourceId?: string | null;
  sourceName: string;
  sourceUrl?: string;
  originalArticleUrl: string;
  rssGuid?: string;
  rssPublishedAt?: string | null;
  rssRawTitle?: string;
  rssRawDescription?: string;
  rssRawContent?: string;
  fetchedFullText: boolean;
  fetchedFullTextAt?: string | null;
  aiUsed: boolean;
  aiModel?: string;
  aiLanguage?: 'bn' | 'en' | 'mixed';
  aiGeneratedAt?: string | null;
  aiNotes?: string;
  duplicateKeyHash: string;
  duplicateOfNewsId?: string | null;
  duplicateReasons: DuplicateReason[];
  isManuallyCreated: boolean;
  createdByAdminId?: string | null;
  approvedByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
  shareText?: {
    whatsapp: string;
    facebook: string;
    messenger: string;
    telegram: string;
  };
  shareLinks?: {
    whatsapp: string;
    facebook: string;
    messenger: string;
    telegram: string;
  };
  shareUrl?: string;
}

export interface NewsSettings {
  key: string;
  newsPageTitle: string;
  newsPageSubtitle: string;
  defaultBannerUrl: string;
  defaultThumbUrl: string;
  defaultSourceIconUrl: string;
  fetchFullArticleEnabled: boolean;
  fullArticleFetchMode: FullArticleFetchMode;
  appearance: {
    layoutMode: 'rss_reader' | 'grid' | 'list';
    density: 'compact' | 'comfortable';
    showWidgets: {
      trending: boolean;
      latest: boolean;
      sourceSidebar: boolean;
      tagChips: boolean;
      previewPanel: boolean;
      breakingTicker: boolean;
    };
    animationLevel: 'off' | 'minimal' | 'normal';
    paginationMode: 'infinite' | 'pages';
  };
  shareTemplates: {
    whatsapp: string;
    facebook: string;
    messenger: string;
    telegram: string;
  };
  aiSettings: {
    enabled: boolean;
    language: 'bn' | 'en' | 'mixed';
    stylePreset: 'short' | 'standard' | 'detailed';
    strictNoHallucination: boolean;
    maxLength: number;
    duplicateSensitivity: 'strict' | 'medium' | 'loose';
  };
  workflow: {
    defaultIncomingStatus: 'pending_review';
    allowScheduling: boolean;
    autoExpireDays?: number | null;
  };
}

export interface AuditLogEntry {
  _id: string;
  module: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  beforeAfterDiff?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

