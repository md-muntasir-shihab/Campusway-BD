import mongoose, { Document, Schema } from 'mongoose';

export type JobRunStatus = 'running' | 'success' | 'failed';

export interface IJobRunLog extends Document {
    jobName: string;
    startedAt: Date;
    endedAt?: Date | null;
    durationMs?: number | null;
    status: JobRunStatus;
    retryCount?: number;
    summary?: Record<string, unknown>;
    errorMessage?: string;
    errorStackSnippet?: string;
    createdAt: Date;
    updatedAt: Date;
}

const JobRunLogSchema = new Schema<IJobRunLog>(
    {
        jobName: { type: String, required: true, index: true, trim: true },
        startedAt: { type: Date, required: true, default: Date.now, index: true },
        endedAt: { type: Date, default: null },
        durationMs: { type: Number, default: null },
        retryCount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['running', 'success', 'failed'],
            default: 'running',
            index: true,
        },
        summary: { type: Schema.Types.Mixed, default: {} },
        errorMessage: { type: String, default: '' },
        errorStackSnippet: { type: String, default: '' },
    },
    { timestamps: true, collection: 'job_run_logs' },
);

JobRunLogSchema.index({ jobName: 1, startedAt: -1 });
JobRunLogSchema.index({ status: 1, startedAt: -1 });

export default mongoose.model<IJobRunLog>('JobRunLog', JobRunLogSchema);
