import mongoose, { Document, Schema } from 'mongoose';

export interface ILocalizedText {
    en: string;
    bn: string;
}

export interface IQuestionSubGroup extends Document {
    group_id: mongoose.Types.ObjectId;
    code: string;
    title: ILocalizedText;
    description?: ILocalizedText;
    iconUrl?: string;
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

const QuestionSubGroupSchema = new Schema<IQuestionSubGroup>(
    {
        group_id: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionGroup',
            required: true,
            index: true,
        },
        code: { type: String, required: true, trim: true, lowercase: true },
        title: { type: LocalizedTextSchema, required: true },
        description: { type: LocalizedTextSchema, default: () => ({ en: '', bn: '' }) },
        iconUrl: { type: String, default: '' },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'question_sub_groups' },
);

// Unique code within a group
QuestionSubGroupSchema.index({ group_id: 1, code: 1 }, { unique: true });
// Ordering within a group
QuestionSubGroupSchema.index({ group_id: 1, order: 1 });
// Active filtering
QuestionSubGroupSchema.index({ isActive: 1 });

export default mongoose.model<IQuestionSubGroup>('QuestionSubGroup', QuestionSubGroupSchema);
