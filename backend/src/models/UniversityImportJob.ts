import mongoose, { Document, Schema } from 'mongoose';

export interface IUniversityImportRowError {
    rowNumber: number;
    reason: string;
    payload?: Record<string, unknown>;
}

export interface IUniversityImportValidationSummary {
    totalRows: number;
    validRows: number;
    invalidRows: number;
}

export interface IUniversityImportCommitSummary {
    inserted: number;
    updated: number;
    failed: number;
    createdCategories?: number;
    createdClusters?: number;
    failedRowCount?: number;
}

export interface IUniversityImportJob extends Document {
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
    validationSummary?: IUniversityImportValidationSummary;
    commitSummary?: IUniversityImportCommitSummary;
    failedRows: IUniversityImportRowError[];
    createdAt: Date;
    updatedAt: Date;
}

const UniversityImportRowErrorSchema = new Schema<IUniversityImportRowError>(
    {
        rowNumber: { type: Number, required: true },
        reason: { type: String, required: true },
        payload: { type: Schema.Types.Mixed, default: undefined },
    },
    { _id: false },
);

const UniversityImportJobSchema = new Schema<IUniversityImportJob>({
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
        createdCategories: { type: Number, default: 0 },
        createdClusters: { type: Number, default: 0 },
        failedRowCount: { type: Number, default: 0 },
    },
    failedRows: { type: [UniversityImportRowErrorSchema], default: [] },
}, { timestamps: true });

UniversityImportJobSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IUniversityImportJob>('UniversityImportJob', UniversityImportJobSchema);
