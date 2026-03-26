import mongoose, { Document, Schema } from 'mongoose';

export interface IResourceSettings extends Document {
    pageTitle: string;
    pageSubtitle: string;
    defaultThumbnailUrl: string;
    showFeatured: boolean;
    trackingEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ResourceSettingsSchema = new Schema<IResourceSettings>({
    pageTitle: { type: String, default: 'Student Resources' },
    pageSubtitle: { type: String, default: 'Access PDFs, question banks, video tutorials, links, and notes — all in one searchable library.' },
    defaultThumbnailUrl: { type: String, default: '' },
    showFeatured: { type: Boolean, default: true },
    trackingEnabled: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IResourceSettings>('ResourceSettings', ResourceSettingsSchema);
