import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentBadge extends Document {
    student: mongoose.Types.ObjectId;
    badge: mongoose.Types.ObjectId;
    awardedBy?: mongoose.Types.ObjectId;
    source: 'auto' | 'manual';
    note?: string;
    awardedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StudentBadgeSchema = new Schema<IStudentBadge>({
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    badge: { type: Schema.Types.ObjectId, ref: 'Badge', required: true },
    awardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    note: { type: String, default: '' },
    awardedAt: { type: Date, default: Date.now },
}, { timestamps: true });

StudentBadgeSchema.index({ student: 1, badge: 1 }, { unique: true });
StudentBadgeSchema.index({ awardedAt: -1 });

export default mongoose.model<IStudentBadge>('StudentBadge', StudentBadgeSchema);
