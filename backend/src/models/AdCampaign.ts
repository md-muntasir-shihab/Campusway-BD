import mongoose, { Schema, Document } from 'mongoose';

export interface IAdCampaign extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    advertiserName: string;
    budgetBDT: number;
    spentBDT: number;
    startDate?: Date;
    endDate?: Date;
    status: 'draft' | 'active' | 'paused' | 'completed';
    targetPlacements: string[];
    cpmRateBDT: number;
    cpcRateBDT: number;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AdCampaignSchema = new Schema<IAdCampaign>({
    name: { type: String, required: true },
    advertiserName: { type: String, required: true },
    budgetBDT: { type: Number, default: 0 },
    spentBDT: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['draft', 'active', 'paused', 'completed'], default: 'draft' },
    targetPlacements: [{ type: String }],
    cpmRateBDT: { type: Number, default: 0 },
    cpcRateBDT: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AdCampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });

export default mongoose.model<IAdCampaign>('AdCampaign', AdCampaignSchema);
