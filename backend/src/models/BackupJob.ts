import mongoose, { Document, Schema } from 'mongoose';

export type BackupType = 'full' | 'incremental';
export type BackupStorage = 'local' | 's3' | 'both';
export type BackupStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface IBackupJob extends Document {
    type: BackupType;
    storage: BackupStorage;
    status: BackupStatus;
    localPath?: string;
    s3Key?: string;
    checksum?: string;
    requestedBy: mongoose.Types.ObjectId;
    restoreMeta?: Record<string, unknown>;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

const BackupJobSchema = new Schema<IBackupJob>(
    {
        type: { type: String, enum: ['full', 'incremental'], default: 'full' },
        storage: { type: String, enum: ['local', 's3', 'both'], default: 'local' },
        status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued', index: true },
        localPath: { type: String, default: '' },
        s3Key: { type: String, default: '' },
        checksum: { type: String, default: '' },
        requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        restoreMeta: { type: Schema.Types.Mixed, default: {} },
        error: { type: String, default: '' },
    },
    { timestamps: true, collection: 'backup_jobs' }
);

BackupJobSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IBackupJob>('BackupJob', BackupJobSchema);
