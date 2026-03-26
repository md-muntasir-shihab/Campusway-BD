import mongoose, { Document, Schema } from 'mongoose';

export type ExamImportJobStatus = 'previewed' | 'committed' | 'partial' | 'failed';
export type ExamImportSyncMode = 'none' | 'fill_missing_only' | 'overwrite_mapped_fields';

export interface IExamImportJob extends Document {
    examId: mongoose.Types.ObjectId;
    templateId?: mongoose.Types.ObjectId | null;
    mappingProfileId?: mongoose.Types.ObjectId | null;
    previewToken: string;
    status: ExamImportJobStatus;
    sourceFileName: string;
    mimeType: string;
    headers: string[];
    resolvedMapping: Record<string, string>;
    matchPriority: string[];
    profileUpdateFields: string[];
    recordOnlyFields: string[];
    syncProfileMode: ExamImportSyncMode;
    previewRows: Array<Record<string, unknown>>;
    summary: {
        totalRows: number;
        matchedRows: number;
        unmatchedRows: number;
        duplicateMatches: number;
        invalidRows: number;
        committedRows: number;
        updatedProfiles: number;
        failedRows: number;
    };
    failedRowsCsv?: string;
    uploadedBy?: mongoose.Types.ObjectId | null;
    committedBy?: mongoose.Types.ObjectId | null;
    committedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExamImportJobSchema = new Schema<IExamImportJob>({
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ExamImportTemplate', default: null },
    mappingProfileId: { type: Schema.Types.ObjectId, ref: 'ExamMappingProfile', default: null },
    previewToken: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['previewed', 'committed', 'partial', 'failed'], default: 'previewed' },
    sourceFileName: { type: String, default: 'import' },
    mimeType: { type: String, default: '' },
    headers: { type: [String], default: [] },
    resolvedMapping: { type: Schema.Types.Mixed, default: {} },
    matchPriority: { type: [String], default: [] },
    profileUpdateFields: { type: [String], default: [] },
    recordOnlyFields: { type: [String], default: [] },
    syncProfileMode: {
        type: String,
        enum: ['none', 'fill_missing_only', 'overwrite_mapped_fields'],
        default: 'overwrite_mapped_fields',
    },
    previewRows: { type: [Schema.Types.Mixed], default: [] } as any,
    summary: {
        totalRows: { type: Number, default: 0 },
        matchedRows: { type: Number, default: 0 },
        unmatchedRows: { type: Number, default: 0 },
        duplicateMatches: { type: Number, default: 0 },
        invalidRows: { type: Number, default: 0 },
        committedRows: { type: Number, default: 0 },
        updatedProfiles: { type: Number, default: 0 },
        failedRows: { type: Number, default: 0 },
    },
    failedRowsCsv: { type: String, default: '' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    committedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    committedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'exam_import_jobs' });

ExamImportJobSchema.index({ examId: 1, createdAt: -1 });

export default mongoose.model<IExamImportJob>('ExamImportJob', ExamImportJobSchema);
