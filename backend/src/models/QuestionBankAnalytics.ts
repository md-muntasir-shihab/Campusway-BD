import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionBankAnalytics extends Document {
    bankQuestionId: mongoose.Types.ObjectId;
    totalAppearances: number;
    totalCorrect: number;
    totalWrong: number;
    totalSkipped: number;
    accuracyPercent: number;
    lastUpdatedAtUTC: Date;
}

const QuestionBankAnalyticsSchema = new Schema<IQuestionBankAnalytics>(
    {
        bankQuestionId: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionBankQuestion',
            required: true,
            unique: true,
            index: true,
        },
        totalAppearances: { type: Number, default: 0 },
        totalCorrect: { type: Number, default: 0 },
        totalWrong: { type: Number, default: 0 },
        totalSkipped: { type: Number, default: 0 },
        accuracyPercent: { type: Number, default: 0 },
        lastUpdatedAtUTC: { type: Date, default: Date.now },
    },
    {
        timestamps: false,
        collection: 'question_bank_analytics',
    },
);

export default mongoose.model<IQuestionBankAnalytics>(
    'QuestionBankAnalytics',
    QuestionBankAnalyticsSchema,
);
