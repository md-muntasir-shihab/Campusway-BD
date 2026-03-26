import mongoose, { Document, Schema } from 'mongoose';

export interface IBadge extends Document {
    code: string;
    title: string;
    description: string;
    iconUrl?: string;
    criteriaType: 'auto' | 'manual';
    minAvgPercentage?: number;
    minCompletedExams?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>({
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    criteriaType: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    minAvgPercentage: { type: Number, default: 0 },
    minCompletedExams: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

BadgeSchema.index({ isActive: 1, criteriaType: 1 });

export default mongoose.model<IBadge>('Badge', BadgeSchema);
