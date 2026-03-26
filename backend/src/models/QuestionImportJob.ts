import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionImportRowError {
    rowNumber: number;
    reason: string;
    payload?: Record<string, unknown>;
}

export interface IQuestionImportJob extends Document {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    sourceFileName?: string;
    createdBy?: mongoose.Types.ObjectId | null;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    failedRows: number;
    duplicateRows: number;
    rowErrors: IQuestionImportRowError[];
    options?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const QuestionImportRowErrorSchema = new Schema<IQuestionImportRowError>(
    {
        rowNumber: { type: Number, required: true },
        reason: { type: String, required: true },
        payload: { type: Schema.Types.Mixed, default: undefined },
    },
    { _id: false },
);

const QuestionImportJobSchema = new Schema<IQuestionImportJob>(
    {
        status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
        sourceFileName: { type: String, default: '' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        startedAt: { type: Date, default: null },
        finishedAt: { type: Date, default: null },
        totalRows: { type: Number, default: 0 },
        importedRows: { type: Number, default: 0 },
        skippedRows: { type: Number, default: 0 },
        failedRows: { type: Number, default: 0 },
        duplicateRows: { type: Number, default: 0 },
        rowErrors: { type: [QuestionImportRowErrorSchema], default: [] },
        options: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'question_import_jobs' },
);

QuestionImportJobSchema.index({ createdBy: 1, createdAt: -1 });
QuestionImportJobSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IQuestionImportJob>('QuestionImportJob', QuestionImportJobSchema);
