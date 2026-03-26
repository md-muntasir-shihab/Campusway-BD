import mongoose, { Schema } from 'mongoose';

export type NewsStatus = 'pending_review' | 'duplicate_review' | 'draft' | 'published' | 'scheduled' | 'rejected';
export type CoverSource = 'rss' | 'admin' | 'default';
export type AiLanguage = 'bn' | 'en' | 'mixed';

export interface NewsItemDoc extends mongoose.Document {
  status: NewsStatus;
  title: string;
  slug: string;
  shortSummary: string;
  fullContent: string;
  coverImageUrl?: string | null;
  coverSource: CoverSource;
  tags: string[];
  category: string;
  isAiSelected: boolean;
  isAiGenerated: boolean;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  sourceId?: mongoose.Types.ObjectId | null;
  sourceName: string;
  sourceUrl?: string;
  originalArticleUrl: string;
  rssGuid?: string;
  rssPublishedAt?: Date | null;
  rssRawTitle?: string;
  rssRawDescription?: string;
  rssRawContent?: string;
  fetchedFullText: boolean;
  fetchedFullTextAt?: Date | null;
  aiUsed: boolean;
  aiModel?: string;
  aiLanguage?: AiLanguage;
  aiGeneratedAt?: Date | null;
  aiNotes?: string;
  duplicateKeyHash: string;
  duplicateOfNewsId?: mongoose.Types.ObjectId | null;
  duplicateReasons: string[];
  isManuallyCreated: boolean;
  createdByAdminId?: string | null;
  approvedByAdminId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const NewsItemSchema = new Schema<NewsItemDoc>(
  {
    status: {
      type: String,
      enum: ['pending_review', 'duplicate_review', 'draft', 'published', 'scheduled', 'rejected'],
      default: 'pending_review',
      required: true
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    shortSummary: { type: String, default: '' },
    fullContent: { type: String, default: '' },
    coverImageUrl: { type: String, default: null },
    coverSource: { type: String, enum: ['rss', 'admin', 'default'], default: 'default' },
    tags: [{ type: String }],
    category: { type: String, default: 'general' },
    isAiSelected: { type: Boolean, default: false },
    isAiGenerated: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },

    sourceId: { type: Schema.Types.ObjectId, ref: 'RssSource', default: null },
    sourceName: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    originalArticleUrl: { type: String, required: true, trim: true },
    rssGuid: { type: String, default: '' },
    rssPublishedAt: { type: Date, default: null },
    rssRawTitle: { type: String, default: '' },
    rssRawDescription: { type: String, default: '' },
    rssRawContent: { type: String, default: '' },
    fetchedFullText: { type: Boolean, default: false },
    fetchedFullTextAt: { type: Date, default: null },

    aiUsed: { type: Boolean, default: false },
    aiModel: { type: String, default: '' },
    aiLanguage: { type: String, enum: ['bn', 'en', 'mixed'], default: 'en' },
    aiGeneratedAt: { type: Date, default: null },
    aiNotes: { type: String, default: '' },

    duplicateKeyHash: { type: String, default: '' },
    duplicateOfNewsId: { type: Schema.Types.ObjectId, ref: 'NewsItem', default: null },
    duplicateReasons: [{ type: String }],

    isManuallyCreated: { type: Boolean, default: false },
    createdByAdminId: { type: String, default: null },
    approvedByAdminId: { type: String, default: null }
  },
  { timestamps: true, collection: 'news_items' }
);

NewsItemSchema.index({ status: 1, createdAt: -1 });
NewsItemSchema.index({ originalArticleUrl: 1 });
NewsItemSchema.index({ rssGuid: 1 });
NewsItemSchema.index({ duplicateKeyHash: 1 });
NewsItemSchema.index({ scheduledAt: 1 });

export const NewsItemModel = mongoose.model<NewsItemDoc>('NewsItem', NewsItemSchema);

