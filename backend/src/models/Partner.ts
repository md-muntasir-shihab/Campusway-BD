import mongoose, { Schema, Document } from 'mongoose';

export interface IPartner extends Document {
    name: string;
    logoUrl: string;
    websiteUrl?: string;
    tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'partner';
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
    {
        name: { type: String, required: true, trim: true },
        logoUrl: { type: String, required: true, trim: true },
        websiteUrl: { type: String, trim: true, default: '' },
        tier: { type: String, enum: ['platinum', 'gold', 'silver', 'bronze', 'partner'], default: 'partner' },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true },
);

PartnerSchema.index({ isActive: 1, order: 1 });

export default mongoose.model<IPartner>('Partner', PartnerSchema);
