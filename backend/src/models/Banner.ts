import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
    title?: string;
    subtitle?: string;
    imageUrl: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
    isActive: boolean;
    status: 'draft' | 'published';
    slot: 'top' | 'middle' | 'footer' | 'home_ads';
    priority: number;
    order: number;
    /* ── Scheduled visibility ── */
    startDate?: Date;
    endDate?: Date;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    mobileImageUrl: String,
    linkUrl: { type: String, default: '' },
    altText: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    slot: { type: String, enum: ['top', 'middle', 'footer', 'home_ads'], default: 'top' },
    priority: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

BannerSchema.index({ isActive: 1, order: 1 });
BannerSchema.index({ slot: 1, status: 1, startDate: 1, endDate: 1, priority: -1 });

export default mongoose.model<IBanner>('Banner', BannerSchema);
