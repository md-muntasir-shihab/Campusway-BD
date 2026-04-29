import mongoose, { Document, Schema } from 'mongoose';

export interface IBadge extends Document {
    code: string;
    title: string;
    title_bn?: string;
    description: string;
    iconUrl?: string;
    criteriaType: 'auto' | 'manual';
    category?: 'academic' | 'streak' | 'social' | 'achievement' | 'special';
    minAvgPercentage?: number;
    minCompletedExams?: number;
    xpReward?: number;
    coinReward?: number;
    criteria?: {
        type: string;
        threshold: number;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>({
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    title_bn: { type: String, trim: true },
    description: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    criteriaType: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    category: { type: String, enum: ['academic', 'streak', 'social', 'achievement', 'special'] },
    minAvgPercentage: { type: Number, default: 0 },
    minCompletedExams: { type: Number, default: 0 },
    xpReward: { type: Number, default: 0 },
    coinReward: { type: Number, default: 0 },
    criteria: {
        type: new Schema(
            {
                type: { type: String },
                threshold: { type: Number },
            },
            { _id: false },
        ),
        default: undefined,
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

BadgeSchema.index({ isActive: 1, criteriaType: 1 });

export default mongoose.model<IBadge>('Badge', BadgeSchema);
