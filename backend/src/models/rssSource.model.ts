import { Schema, model, InferSchemaType } from "mongoose";

/**
 * RssSource model — defines an RSS feed source for automated news ingestion.
 *
 * Key fields:
 * - `name`: Human-readable source name
 * - `rssUrl`: The RSS feed URL to fetch
 * - `siteUrl`: The source website URL
 * - `enabled`: Whether this source is actively fetched
 * - `fetchIntervalMinutes`: How often to poll the feed
 * - `lastFetchedAt` / `lastError`: Fetch status tracking
 *
 * @collection rss_sources
 */
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
