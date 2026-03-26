import mongoose, { Schema } from 'mongoose';

export type SourceIconType = 'upload' | 'url';

export interface RssSourceDoc extends mongoose.Document {
  name: string;
  rssUrl: string;
  siteUrl?: string;
  iconType: SourceIconType;
  iconUrl?: string;
  categoryTags: string[];
  enabled: boolean;
  fetchIntervalMinutes: number;
  priority: number;
  lastFetchedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RssSourceSchema = new Schema<RssSourceDoc>(
  {
    name: { type: String, required: true, trim: true },
    rssUrl: { type: String, required: true, trim: true, unique: true },
    siteUrl: { type: String, default: '', trim: true },
    iconType: { type: String, enum: ['upload', 'url'], default: 'url' },
    iconUrl: { type: String, default: '', trim: true },
    categoryTags: [{ type: String }],
    enabled: { type: Boolean, default: true },
    fetchIntervalMinutes: { type: Number, enum: [15, 30, 60, 360], default: 30 },
    priority: { type: Number, default: 0 },
    lastFetchedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: 'rss_sources' }
);

RssSourceSchema.index({ enabled: 1, priority: 1 });
RssSourceSchema.index({ updatedAt: -1 });

export const RssSourceModel = mongoose.model<RssSourceDoc>('RssSource', RssSourceSchema);

