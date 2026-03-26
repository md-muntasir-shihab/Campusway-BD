import mongoose, { Document, Schema } from 'mongoose';

export type ExamImportIssueType =
    | 'missing_required'
    | 'invalid_value'
    | 'unmatched'
    | 'duplicate_match'
    | 'save_failed';

export interface IExamImportRowIssue extends Document {
    jobId: mongoose.Types.ObjectId;
    examId: mongoose.Types.ObjectId;
    rowNumber: number;
    issueType: ExamImportIssueType;
    identifier?: string;
    reason: string;
    blocking: boolean;
    payload?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const ExamImportRowIssueSchema = new Schema<IExamImportRowIssue>({
    jobId: { type: Schema.Types.ObjectId, ref: 'ExamImportJob', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    rowNumber: { type: Number, required: true },
    issueType: {
        type: String,
        enum: ['missing_required', 'invalid_value', 'unmatched', 'duplicate_match', 'save_failed'],
        required: true,
    },
    identifier: { type: String, default: '' },
    reason: { type: String, required: true },
    blocking: { type: Boolean, default: true },
    payload: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: 'exam_import_row_issues' });

ExamImportRowIssueSchema.index({ jobId: 1, rowNumber: 1 });

export default mongoose.model<IExamImportRowIssue>('ExamImportRowIssue', ExamImportRowIssueSchema);
