import mongoose, { Document, Schema } from 'mongoose';

export interface ILocalizedText {
    en: string;
    bn: string;
}

export interface IQuestionGroup extends Document {
    code: string;
    title: ILocalizedText;
    description?: ILocalizedText;
    iconUrl?: string;
    color?: string;
    order: number;
    isActive: boolean;
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

const QuestionGroupSchema = new Schema<IQuestionGroup>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: /^[a-z0-9][a-z0-9-_]*$/,
        },
        title: { type: LocalizedTextSchema, required: true },
        description: { type: LocalizedTextSchema, default: () => ({ en: '', bn: '' }) },
        iconUrl: { type: String, default: '' },
        color: { type: String, default: '' },
        order: { type: Number, default: 0, index: true },
        isActive: { type: Boolean, default: true, index: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'question_groups' },
);

QuestionGroupSchema.index({ isActive: 1, order: 1 });

export default mongoose.model<IQuestionGroup>('QuestionGroup', QuestionGroupSchema);
