import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaderboardEntry extends Document {
    student: mongoose.Types.ObjectId;
    exam?: mongoose.Types.ObjectId;
    group?: mongoose.Types.ObjectId;
    subject?: mongoose.Types.ObjectId;
    leaderboardType: 'exam' | 'group' | 'weekly' | 'global' | 'subject';
    periodKey?: string;
    score: number;
    percentage: number;
    rank: number;
    timeTaken: number;
    displayName: string;
    createdAt: Date;
    updatedAt: Date;
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        exam: {
            type: Schema.Types.ObjectId,
            ref: 'Exam',
            default: null,
        },
        group: {
            type: Schema.Types.ObjectId,
            ref: 'StudentGroup',
            default: null,
        },
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionCategory',
            default: null,
        },
        leaderboardType: {
            type: String,
            enum: ['exam', 'group', 'weekly', 'global', 'subject'],
            required: true,
        },
        periodKey: { type: String, default: null },
        score: { type: Number, required: true, default: 0 },
        percentage: { type: Number, required: true, default: 0 },
        rank: { type: Number, required: true, default: 0 },
        timeTaken: { type: Number, required: true, default: 0 },
        displayName: { type: String, required: true, trim: true },
    },
    { timestamps: true, collection: 'leaderboard_entries' },
);

// Fast leaderboard queries per design spec
LeaderboardEntrySchema.index({ leaderboardType: 1, exam: 1, rank: 1 });
LeaderboardEntrySchema.index({ leaderboardType: 1, periodKey: 1, rank: 1 });
LeaderboardEntrySchema.index({ student: 1, leaderboardType: 1 });
LeaderboardEntrySchema.index({ leaderboardType: 1, subject: 1, rank: 1 });

export default mongoose.model<ILeaderboardEntry>('LeaderboardEntry', LeaderboardEntrySchema);
