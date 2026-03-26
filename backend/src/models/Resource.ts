import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
    title: string;
    slug?: string;
    description: string;
    type: 'pdf' | 'link' | 'video' | 'audio' | 'image' | 'note';
    category: string;
    tags: string[];
    fileUrl?: string;
    externalUrl?: string;
    thumbnailUrl?: string;
    isPublic: boolean;
    isFeatured: boolean;
    views: number;
    downloads: number;
    order: number;
    publishDate: Date;
    expiryDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>({
    title: { type: String, required: true, trim: true },
    slug: { type: String },
    description: { type: String },
    type: { type: String, enum: ['pdf', 'link', 'video', 'audio', 'image', 'note'], required: true },
    category: { type: String, default: 'General' },
    tags: [String],
    fileUrl: String,
    externalUrl: String,
    thumbnailUrl: String,
    isPublic: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    publishDate: { type: Date, default: Date.now },
    expiryDate: Date,
}, { timestamps: true });

ResourceSchema.index({ type: 1, category: 1 });
ResourceSchema.index({ slug: 1 }, { unique: true, sparse: true });

export default mongoose.model<IResource>('Resource', ResourceSchema);
