import mongoose, { Schema, Document } from 'mongoose';

export interface IAdPlacement extends Document {
    _id: mongoose.Types.ObjectId;
    slotKey: string;
    name: string;
    description?: string;
    allowedPositions: string[];
    maxAds: number;
    pricingCPM: number;
    pricingCPC: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AdPlacementSchema = new Schema<IAdPlacement>({
    slotKey: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    allowedPositions: [{ type: String }],
    maxAds: { type: Number, default: 1 },
    pricingCPM: { type: Number, default: 0 },
    pricingCPC: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IAdPlacement>('AdPlacement', AdPlacementSchema);
