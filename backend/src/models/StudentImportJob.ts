import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentImportRowError {
    rowNumber: number;
    reason: string;
    payload?: Record<string, unknown>;
}

export interface IStudentImportValidationSummary {
    totalRows: number;
    validRows: number;
    invalidRows: number;
}

export interface IStudentImportCommitSummary {
    inserted: number;
    updated: number;
    failed: number;
}

export interface IStudentImportJob extends Document {
    status: 'initialized' | 'validated' | 'committed' | 'failed';
    sourceFileName: string;
    mimeType: string;
    createdBy?: mongoose.Types.ObjectId | null;
    headers: string[];
    sampleRows: unknown[];
    rawRows: unknown[];
    normalizedRows: unknown[];
    mapping: Record<string, string>;
    defaults: Record<string, unknown>;
    validationSummary?: IStudentImportValidationSummary;
    commitSummary?: IStudentImportCommitSummary;
    failedRows: IStudentImportRowError[];
    createdAt: Date;
    updatedAt: Date;
}

const StudentImportRowErrorSchema = new Schema<IStudentImportRowError>(
    {
        rowNumber: { type: Number, required: true },
        reason: { type: String, required: true },
        payload: { type: Schema.Types.Mixed, default: undefined },
    },
    { _id: false },
);

const StudentImportJobSchema = new Schema<IStudentImportJob>({
    status: { type: String, enum: ['initialized', 'validated', 'committed', 'failed'], default: 'initialized' },
    sourceFileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    headers: { type: [String], default: [] },
    sampleRows: { type: Array, default: [] },
    rawRows: { type: Array, default: [] },
    normalizedRows: { type: Array, default: [] },
    mapping: { type: Schema.Types.Mixed, default: {} },
    defaults: { type: Schema.Types.Mixed, default: {} },
    validationSummary: {
        totalRows: { type: Number, default: 0 },
        validRows: { type: Number, default: 0 },
        invalidRows: { type: Number, default: 0 },
    },
    commitSummary: {
        inserted: { type: Number, default: 0 },
        updated: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
    },
    failedRows: { type: [StudentImportRowErrorSchema], default: [] },
}, { timestamps: true });

StudentImportJobSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IStudentImportJob>('StudentImportJob', StudentImportJobSchema);
