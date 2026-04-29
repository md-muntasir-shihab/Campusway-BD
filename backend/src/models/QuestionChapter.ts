import mongoose, { Document, Schema } from 'mongoose';

export interface ILocalizedText {
    en: string;
    bn: string;
}

export interface IQuestionChapter extends Document {
    subject_id: mongoose.Types.ObjectId;
    group_id: mongoose.Types.ObjectId;
    code: string;
    title: ILocalizedText;
    description?: ILocalizedText;
    order: number;
    isActive: boolean;
    questionCount?: number;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const LocalizedTextSchema = new Schema<ILocalizedText>(
    {
        en: { type: String, default: '', trim: true },
        bn: { type: String, default: '', trim: true },
    },
    { _id: false },
);

const QuestionChapterSchema = new Schema<IQuestionChapter>(
    {
        subject_id: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionCategory',
            required: true,
            index: true,
        },
        group_id: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionGroup',
            required: true,
            index: true,
        },
        code: { type: String, required: true, trim: true, lowercase: true },
        title: { type: LocalizedTextSchema, required: true },
        description: { type: LocalizedTextSchema, default: () => ({ en: '', bn: '' }) },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        questionCount: { type: Number, default: 0 },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'question_chapters' },
);

// Unique code within a subject
QuestionChapterSchema.index({ subject_id: 1, code: 1 }, { unique: true });
// Ordering within a subject
QuestionChapterSchema.index({ subject_id: 1, order: 1 });
// Fast queries by group + active status
QuestionChapterSchema.index({ group_id: 1, isActive: 1 });

export default mongoose.model<IQuestionChapter>('QuestionChapter', QuestionChapterSchema);
