import mongoose, { Schema, Document } from 'mongoose';

export interface IAdEvent extends Document {
    _id: mongoose.Types.ObjectId;
    creativeId: mongoose.Types.ObjectId;
    campaignId?: mongoose.Types.ObjectId;
    placementId: string;
    eventType: 'impression' | 'click' | 'conversion';
    variantGroup: 'A' | 'B' | 'control';
    userRef?: mongoose.Types.ObjectId;
    ipHash?: string;
    userAgent?: string;
    revenueBDT: number;
    timestamp: Date;
}

const AdEventSchema = new Schema<IAdEvent>({
    creativeId: { type: Schema.Types.ObjectId, ref: 'AdCreative', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'AdCampaign' },
    placementId: { type: String, required: true },
    eventType: { type: String, enum: ['impression', 'click', 'conversion'], required: true },
    variantGroup: { type: String, enum: ['A', 'B', 'control'], default: 'A' },
    userRef: { type: Schema.Types.ObjectId, ref: 'User' },
    ipHash: String,
    userAgent: String,
    revenueBDT: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
});

AdEventSchema.index({ creativeId: 1, eventType: 1, timestamp: -1 });
AdEventSchema.index({ campaignId: 1, timestamp: -1 });
AdEventSchema.index({ timestamp: -1 });

export default mongoose.model<IAdEvent>('AdEvent', AdEventSchema);
