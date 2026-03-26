import { Schema, model, InferSchemaType } from "mongoose";

const rssSourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    rssUrl: { type: String, required: true, trim: true },
    siteUrl: { type: String, required: true, trim: true },
    iconType: { type: String, enum: ["upload", "url"], default: "url" },
    iconUrl: { type: String, default: null },
    categoryTags: [{ type: String, trim: true }],
    enabled: { type: Boolean, default: true },
    fetchIntervalMinutes: { type: Number, default: 30 },
    priority: { type: Number, default: 0 },
    lastFetchedAt: { type: Date, default: null },
    lastError: { type: String, default: null }
  },
  { timestamps: true }
);

export type RssSource = InferSchemaType<typeof rssSourceSchema>;
export const RssSourceModel = model("rss_sources", rssSourceSchema);
