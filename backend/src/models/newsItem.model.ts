import { Schema, model, InferSchemaType, Types } from "mongoose";

export const NEWS_STATUS = [
  "pending_review",
  "duplicate_review",
  "draft",
  "published",
  "scheduled",
  "rejected"
] as const;

const newsItemSchema = new Schema(
  {
    status: { type: String, enum: NEWS_STATUS, default: "pending_review", index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    shortSummary: { type: String, default: "" },
    fullContent: { type: String, default: "" },
    coverImageUrl: { type: String, default: null },
    coverSource: { type: String, enum: ["rss", "admin", "default"], default: "rss" },
    tags: [{ type: String, trim: true }],
    category: { type: String, default: "general" },
    isAiGenerated: { type: Boolean, default: false },
    aiNotes: { type: String, default: null },
    isManuallyCreated: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },

    sourceId: { type: Types.ObjectId, ref: "rss_sources", required: false },
    sourceName: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    originalArticleUrl: { type: String, required: true, index: true },
    rssGuid: { type: String, default: null, index: true },
    rssPublishedAt: { type: Date, default: null },
    rssRawTitle: { type: String, default: "" },
    rssRawDescription: { type: String, default: "" },
    rssRawContent: { type: String, default: "" },
    fetchedFullText: { type: Boolean, default: false },
    fetchedFullTextAt: { type: Date, default: null },

    duplicateKeyHash: { type: String, default: null, index: true },
    duplicateOfNewsId: { type: Types.ObjectId, ref: "news_items", default: null },
    duplicateReasons: [{ type: String }],

    createdByAdminId: { type: Types.ObjectId, default: null },
    approvedByAdminId: { type: Types.ObjectId, default: null }
  },
  { timestamps: true }
);

export type NewsItem = InferSchemaType<typeof newsItemSchema>;
export const NewsItemModel = model("news_items", newsItemSchema);
