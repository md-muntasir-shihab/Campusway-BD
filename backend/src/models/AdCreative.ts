import mongoose, { Schema, Document } from 'mongoose';

export interface IAdCreative extends Document {
    _id: mongoose.Types.ObjectId;
    campaignId?: mongoose.Types.ObjectId;
    title: string;
    imageUrl: string;
    mobileImageUrl?: string;
    ctaLink: string;
    ctaText?: string;
    position: 'home_top' | 'home_middle' | 'sidebar' | 'university_header' | 'exam_runner' | 'footer' | 'popup';
    targetCategories?: string[];
    variantGroup: 'A' | 'B' | 'control';
    status: 'active' | 'inactive';
    impressionsCount: number;
    clicksCount: number;
    conversionsCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const AdCreativeSchema = new Schema<IAdCreative>({
    campaignId: { type: Schema.Types.ObjectId, ref: 'AdCampaign' },
    title: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    mobileImageUrl: String,
    ctaLink: { type: String, default: '' },
    ctaText: { type: String, default: 'Learn More' },
    position: { type: String, enum: ['home_top', 'home_middle', 'sidebar', 'university_header', 'exam_runner', 'footer', 'popup'], default: 'home_top' },
    targetCategories: [{ type: String }],
    variantGroup: { type: String, enum: ['A', 'B', 'control'], default: 'A' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    impressionsCount: { type: Number, default: 0 },
    clicksCount: { type: Number, default: 0 },
    conversionsCount: { type: Number, default: 0 },
}, { timestamps: true });

AdCreativeSchema.index({ position: 1, status: 1 });

export default mongoose.model<IAdCreative>('AdCreative', AdCreativeSchema);
