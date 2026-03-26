import mongoose, { Document, Schema } from 'mongoose';

export interface ILocalizedText {
    en?: string;
    bn?: string;
}

export interface IBankQuestionOption {
    key: 'A' | 'B' | 'C' | 'D';
    text_en?: string;
    text_bn?: string;
    imageUrl?: string;
}

export interface IQuestionBankQuestion extends Document {
    bankQuestionId?: string;
    subject: string;
    moduleCategory: string;
    topic?: string;
    subtopic?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    languageMode: 'en' | 'bn' | 'both';

    question_en?: string;
    question_bn?: string;
    questionImageUrl?: string;
    questionFormulaLatex?: string;

    options: IBankQuestionOption[];
    correctKey: 'A' | 'B' | 'C' | 'D';

    explanation_en?: string;
    explanation_bn?: string;
    explanationImageUrl?: string;

    marks: number;
    negativeMarks: number;

    tags: string[];
    sourceLabel?: string;
    chapter?: string;
    boardOrPattern?: string;
    yearOrSession?: string;

    isActive: boolean;
    isArchived: boolean;

    createdByAdminId?: string;
    updatedByAdminId?: string;

    contentHash: string;
    versionNo: number;
    parentQuestionId?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const BankQuestionOptionSchema = new Schema<IBankQuestionOption>(
    {
        key: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
        text_en: { type: String, default: '' },
        text_bn: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
    },
    { _id: false },
);

const QuestionBankQuestionSchema = new Schema<IQuestionBankQuestion>(
    {
        bankQuestionId: { type: String, trim: true, sparse: true, unique: true },
        subject: { type: String, required: true, trim: true, index: true },
        moduleCategory: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        topic: { type: String, trim: true, default: '', index: true },
        subtopic: { type: String, trim: true, default: '' },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
            index: true,
        },
        languageMode: {
            type: String,
            enum: ['en', 'bn', 'both'],
            default: 'en',
        },

        question_en: { type: String, default: '' },
        question_bn: { type: String, default: '' },
        questionImageUrl: { type: String, default: '' },
        questionFormulaLatex: { type: String, default: '' },

        options: { type: [BankQuestionOptionSchema], default: [] },
        correctKey: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },

        explanation_en: { type: String, default: '' },
        explanation_bn: { type: String, default: '' },
        explanationImageUrl: { type: String, default: '' },

        marks: { type: Number, default: 1, min: 0 },
        negativeMarks: { type: Number, default: 0, min: 0 },

        tags: { type: [String], default: [], index: true },
        sourceLabel: { type: String, default: '' },
        chapter: { type: String, default: '' },
        boardOrPattern: { type: String, default: '' },
        yearOrSession: { type: String, default: '' },

        isActive: { type: Boolean, default: true, index: true },
        isArchived: { type: Boolean, default: false, index: true },

        createdByAdminId: { type: String, default: '' },
        updatedByAdminId: { type: String, default: '' },

        contentHash: { type: String, default: '' },
        versionNo: { type: Number, default: 1 },
        parentQuestionId: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionBankQuestion',
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'question_bank_questions',
    },
);

QuestionBankQuestionSchema.index({ subject: 1, moduleCategory: 1, topic: 1 });
QuestionBankQuestionSchema.index({ isActive: 1, isArchived: 1 });
QuestionBankQuestionSchema.index({ contentHash: 1 }, { sparse: true });
QuestionBankQuestionSchema.index({ createdAt: -1 });

export default mongoose.model<IQuestionBankQuestion>(
    'QuestionBankQuestion',
    QuestionBankQuestionSchema,
);
