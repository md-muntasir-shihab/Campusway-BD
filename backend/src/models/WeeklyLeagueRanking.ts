import mongoose, { Document, Schema } from 'mongoose';

export interface IWeeklyLeagueRanking extends Document {
    student: mongoose.Types.ObjectId;
    weekKey: string; // e.g. "2026-W25"
    xpEarned: number;
    tier: 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum';
    createdAt: Date;
    updatedAt: Date;
}

const WeeklyLeagueRankingSchema = new Schema<IWeeklyLeagueRanking>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        weekKey: {
            type: String,
            required: true,
        },
        xpEarned: {
            type: Number,
            required: true,
            default: 0,
        },
        tier: {
            type: String,
            enum: ['iron', 'bronze', 'silver', 'gold', 'diamond', 'platinum'],
            required: true,
            default: 'iron',
        },
    },
    { timestamps: true, collection: 'weekly_league_rankings' },
);

// Indexes for fast lookup by week, tier, and xp (descending)
WeeklyLeagueRankingSchema.index({ weekKey: 1, tier: 1, xpEarned: -1 });
// Unique compound index so a student has exactly one record per week
WeeklyLeagueRankingSchema.index({ student: 1, weekKey: 1 }, { unique: true });

export default mongoose.model<IWeeklyLeagueRanking>('WeeklyLeagueRanking', WeeklyLeagueRankingSchema);
