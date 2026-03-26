import mongoose, { Document, Schema } from 'mongoose';

export type ExamProfileSyncSource = 'external_import' | 'internal_result' | 'manual_resync';
export type ExamProfileSyncStatus = 'synced' | 'skipped' | 'failed';

export interface IExamProfileSyncLog extends Document {
    examId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    resultId?: mongoose.Types.ObjectId | null;
    importJobId?: mongoose.Types.ObjectId | null;
    source: ExamProfileSyncSource;
    status: ExamProfileSyncStatus;
    syncMode: 'none' | 'fill_missing_only' | 'overwrite_mapped_fields';
    examMode: 'external_link' | 'internal_system';
    attemptNo: number;
    changedFields: string[];
    message: string;
    snapshot?: Record<string, unknown>;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExamProfileSyncLogSchema = new Schema<IExamProfileSyncLog>({
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resultId: { type: Schema.Types.ObjectId, ref: 'ExamResult', default: null },
    importJobId: { type: Schema.Types.ObjectId, ref: 'ExamImportJob', default: null },
    source: { type: String, enum: ['external_import', 'internal_result', 'manual_resync'], required: true },
    status: { type: String, enum: ['synced', 'skipped', 'failed'], required: true },
    syncMode: {
        type: String,
        enum: ['none', 'fill_missing_only', 'overwrite_mapped_fields'],
        default: 'overwrite_mapped_fields',
    },
    examMode: { type: String, enum: ['external_link', 'internal_system'], default: 'internal_system' },
    attemptNo: { type: Number, default: 1 },
    changedFields: { type: [String], default: [] },
    message: { type: String, default: '' },
    snapshot: { type: Schema.Types.Mixed, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'exam_profile_sync_logs' });

ExamProfileSyncLogSchema.index({ examId: 1, createdAt: -1 });
ExamProfileSyncLogSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.model<IExamProfileSyncLog>('ExamProfileSyncLog', ExamProfileSyncLogSchema);
