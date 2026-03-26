import mongoose, { Document, Schema } from 'mongoose';

export interface INewsFetchJob extends Document {
    sourceIds: mongoose.Types.ObjectId[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: Date;
    endedAt?: Date;
    fetchedCount: number;
    createdCount: number;
    duplicateCount: number;
    failedCount: number;
    jobErrors: Array<{ sourceId?: string; message: string }>;
    trigger: 'manual' | 'scheduled' | 'test';
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const NewsFetchJobSchema = new Schema<INewsFetchJob>(
    {
        sourceIds: [{ type: Schema.Types.ObjectId, ref: 'NewsSource' }],
        status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
        startedAt: { type: Date },
        endedAt: { type: Date },
        fetchedCount: { type: Number, default: 0 },
        createdCount: { type: Number, default: 0 },
        duplicateCount: { type: Number, default: 0 },
        failedCount: { type: Number, default: 0 },
        jobErrors: [
            {
                sourceId: { type: String, default: '' },
                message: { type: String, required: true },
            },
        ],
        trigger: { type: String, enum: ['manual', 'scheduled', 'test'], default: 'manual' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
        collection: 'news_fetch_jobs',
    }
);

NewsFetchJobSchema.index({ createdAt: -1, status: 1 });

export default mongoose.model<INewsFetchJob>('NewsFetchJob', NewsFetchJobSchema);
