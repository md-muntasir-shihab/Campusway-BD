import mongoose, { Document, Schema } from 'mongoose';

export interface ILeagueTierHistory {
    tier: string;
    achievedAt: Date;
}

export interface ILeagueProgress extends Document {
    student: mongoose.Types.ObjectId;
    currentTier: 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum';
    mockTestsCompleted: number;
    xpMultiplier: number;
    promotedAt?: Date;
    history: ILeagueTierHistory[];
    createdAt: Date;
    updatedAt: Date;
}

const LeagueTierHistorySchema = new Schema<ILeagueTierHistory>(
    {
        tier: { type: String, required: true },
        achievedAt: { type: Date, required: true, default: Date.now },
    },
    { _id: false },
);

const LeagueProgressSchema = new Schema<ILeagueProgress>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        currentTier: {
            type: String,
            enum: ['iron', 'bronze', 'silver', 'gold', 'diamond', 'platinum'],
            required: true,
            default: 'iron',
        },
        mockTestsCompleted: { type: Number, required: true, default: 0 },
        xpMultiplier: { type: Number, required: true, default: 1 },
        promotedAt: { type: Date, default: null },
        history: { type: [LeagueTierHistorySchema], default: [] },
    },
    { timestamps: true, collection: 'league_progress' },
);

// Fast lookups by tier for leaderboard/analytics queries
LeagueProgressSchema.index({ currentTier: 1 });

export default mongoose.model<ILeagueProgress>('LeagueProgress', LeagueProgressSchema);
