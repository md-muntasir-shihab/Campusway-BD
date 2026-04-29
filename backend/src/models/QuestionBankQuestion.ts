import mongoose, { Document, Schema } from 'mongoose';

export interface ILocalizedText {
    en?: string;
    bn?: string;
}

export type QuestionType = 'mcq' | 'written_cq' | 'fill_blank' | 'true_false' | 'image_mcq';
export type QuestionStatus = 'draft' | 'published' | 'archived' | 'flagged';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface IBankQuestionOption {
    key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    text_en?: string;
    text_bn?: string;
    imageUrl?: string;
    isCorrect?: boolean;
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

    // New fields for exam management system
    question_type: QuestionType;
    ai_explanation?: ILocalizedText;
    images: string[];
    group_id?: mongoose.Types.ObjectId;
    sub_group_id?: mongoose.Types.ObjectId;
    subject_id?: mongoose.Types.ObjectId;
    chapter_id?: mongoose.Types.ObjectId;
    topic_id?: mongoose.Types.ObjectId;
    status: QuestionStatus;
    review_status: ReviewStatus;
    times_attempted: number;
    correct_rate: number;
    reported_count: number;
    created_by?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const BankQuestionOptionSchema = new Schema<IBankQuestionOption>(
    {
        key: { type: String, required: true, enum: ['A', 'B', 'C', 'D', 'E', 'F'] },
        text_en: { type: String, default: '' },
        text_bn: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        isCorrect: { type: Boolean, default: false },
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

        // New fields for exam management system
        question_type: {
            type: String,
            enum: ['mcq', 'written_cq', 'fill_blank', 'true_false', 'image_mcq'],
            default: 'mcq',
            index: true,
        },
        ai_explanation: {
            en: { type: String, default: '' },
            bn: { type: String, default: '' },
        },
        images: { type: [String], default: [] },
        group_id: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionGroup',
            default: null,
            index: true,
        },
        sub_group_id: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionSubGroup',
            default: null,
            index: true,
        },
        subject_id: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionCategory',
            default: null,
            index: true,
        },
        chapter_id: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionChapter',
            default: null,
            index: true,
        },
        topic_id: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionTopic',
            default: null,
            index: true,
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived', 'flagged'],
            default: 'draft',
            index: true,
        },
        review_status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true,
        },
        times_attempted: { type: Number, default: 0, min: 0 },
        correct_rate: { type: Number, default: 0, min: 0, max: 100 },
        reported_count: { type: Number, default: 0, min: 0 },
        created_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
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

// New compound indexes for hierarchy-based filtering
QuestionBankQuestionSchema.index({ group_id: 1, sub_group_id: 1, subject_id: 1, chapter_id: 1, topic_id: 1 });
QuestionBankQuestionSchema.index({ status: 1, review_status: 1 });
QuestionBankQuestionSchema.index({ question_type: 1, difficulty: 1 });

export default mongoose.model<IQuestionBankQuestion>(
    'QuestionBankQuestion',
    QuestionBankQuestionSchema,
);
