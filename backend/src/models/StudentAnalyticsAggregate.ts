import mongoose, { Document, Schema } from 'mongoose';

export interface IAccuracyEntry {
    correct: number;
    total: number;
    percentage: number;
}

export interface IRecentScore {
    examId: mongoose.Types.ObjectId;
    score: number;
    percentage: number;
    date: Date;
}

export interface IStudentAnalyticsAggregate extends Document {
    student: mongoose.Types.ObjectId;
    totalExamsTaken: number;
    averageScore: number;
    averagePercentage: number;
    topicAccuracy: Map<string, IAccuracyEntry>;
    chapterAccuracy: Map<string, IAccuracyEntry>;
    subjectAccuracy: Map<string, IAccuracyEntry>;
    recentScores: IRecentScore[];
    avgTimePerQuestion: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date;
    xpTotal: number;
    leagueTier: 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum';
    weakestTopics: string[];
    createdAt: Date;
    updatedAt: Date;
}

const AccuracyEntrySchema = new Schema<IAccuracyEntry>(
    {
        correct: { type: Number, required: true, default: 0 },
        total: { type: Number, required: true, default: 0 },
        percentage: { type: Number, required: true, default: 0 },
    },
    { _id: false },
);

const RecentScoreSchema = new Schema<IRecentScore>(
    {
        examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
        score: { type: Number, required: true },
        percentage: { type: Number, required: true },
        date: { type: Date, required: true },
    },
    { _id: false },
);

const StudentAnalyticsAggregateSchema = new Schema<IStudentAnalyticsAggregate>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        totalExamsTaken: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        averagePercentage: { type: Number, default: 0 },
        topicAccuracy: {
            type: Map,
            of: AccuracyEntrySchema,
            default: () => new Map(),
        },
        chapterAccuracy: {
            type: Map,
            of: AccuracyEntrySchema,
            default: () => new Map(),
        },
        subjectAccuracy: {
            type: Map,
            of: AccuracyEntrySchema,
            default: () => new Map(),
        },
        recentScores: { type: [RecentScoreSchema], default: [] },
        avgTimePerQuestion: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        lastActivityDate: { type: Date, default: null },
        xpTotal: { type: Number, default: 0 },
        leagueTier: {
            type: String,
            enum: ['iron', 'bronze', 'silver', 'gold', 'diamond', 'platinum'],
            default: 'iron',
        },
        weakestTopics: { type: [String], default: [] },
    },
    { timestamps: true, collection: 'student_analytics' },
);

// Unique index on student for fast lookups
StudentAnalyticsAggregateSchema.index({ student: 1 }, { unique: true });

export default mongoose.model<IStudentAnalyticsAggregate>(
    'StudentAnalyticsAggregate',
    StudentAnalyticsAggregateSchema,
);
