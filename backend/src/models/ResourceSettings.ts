import mongoose, { Document, Schema } from 'mongoose';

export interface IResourceSettings extends Document {
    pageTitle: string;
    pageSubtitle: string;
    defaultThumbnailUrl: string;
    showFeatured: boolean;
    trackingEnabled: boolean;
    allowUserUploads: boolean;
    requireAdminApproval: boolean;
    maxFileSizeMB: number;
    allowedCategories: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ResourceSettingsSchema = new Schema<IResourceSettings>({
    pageTitle: { type: String, default: 'Student Resources' },
    pageSubtitle: { type: String, default: 'Access PDFs, question banks, video tutorials, links, and notes — all in one searchable library.' },
    defaultThumbnailUrl: { type: String, default: '' },
    showFeatured: { type: Boolean, default: true },
    trackingEnabled: { type: Boolean, default: true },
    allowUserUploads: { type: Boolean, default: false },
    requireAdminApproval: { type: Boolean, default: true },
    maxFileSizeMB: { type: Number, default: 50 },
    allowedCategories: { type: [String], default: ['PDF', 'Video', 'Note', 'Link', 'Archive', 'Code'] },
}, { timestamps: true });

export default mongoose.model<IResourceSettings>('ResourceSettings', ResourceSettingsSchema);
