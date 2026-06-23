import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPoints extends Document {
    student: mongoose.Types.ObjectId;
    xp: number;
    coins: number;
    lastLoginDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const UserPointsSchema = new Schema<IUserPoints>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        xp: { type: Number, required: true, default: 0 },
        coins: { type: Number, required: true, default: 0 },
        lastLoginDate: { type: Date, default: null },
    },
    { timestamps: true, collection: 'user_points' },
);

// Indexes
UserPointsSchema.index({ student: 1 }, { unique: true });
UserPointsSchema.index({ xp: -1 });

export default mongoose.model<IUserPoints>('UserPoints', UserPointsSchema);
