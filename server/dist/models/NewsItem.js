import mongoose, { Schema } from 'mongoose';
const NewsItemSchema = new Schema({
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
}, { timestamps: true, collection: 'news_items' });
NewsItemSchema.index({ status: 1, createdAt: -1 });
NewsItemSchema.index({ originalArticleUrl: 1 });
NewsItemSchema.index({ rssGuid: 1 });
NewsItemSchema.index({ duplicateKeyHash: 1 });
NewsItemSchema.index({ scheduledAt: 1 });
export const NewsItemModel = mongoose.model('NewsItem', NewsItemSchema);
