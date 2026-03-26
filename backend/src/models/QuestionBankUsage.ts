import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionBankUsage extends Document {
    bankQuestionId: mongoose.Types.ObjectId;
    examId: string;
    usedAtUTC: Date;
    snapshotQuestionId?: string;
}

const QuestionBankUsageSchema = new Schema<IQuestionBankUsage>(
    {
        bankQuestionId: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionBankQuestion',
            required: true,
            index: true,
        },
        examId: { type: String, required: true, index: true },
        usedAtUTC: { type: Date, default: Date.now },
        snapshotQuestionId: { type: String, default: '' },
    },
    {
        timestamps: false,
        collection: 'question_bank_usage',
    },
);

QuestionBankUsageSchema.index({ bankQuestionId: 1, examId: 1 });

export default mongoose.model<IQuestionBankUsage>(
    'QuestionBankUsage',
    QuestionBankUsageSchema,
);
