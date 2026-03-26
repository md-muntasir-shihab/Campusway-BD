import mongoose, { Document, Schema } from 'mongoose';

export interface ISetRules {
    subject?: string;
    moduleCategory?: string;
    topics?: string[];
    tags?: string[];
    difficultyMix?: { easy: number; medium: number; hard: number };
    totalQuestions?: number;
    defaultMarks?: number;
    defaultNegativeMarks?: number;
}

export interface IQuestionBankSet extends Document {
    name: string;
    description?: string;
    mode: 'manual' | 'rule_based';
    rules: ISetRules;
    selectedBankQuestionIds: string[];
    createdByAdminId: string;
    createdAt: Date;
    updatedAt: Date;
}

const SetRulesSchema = new Schema<ISetRules>(
    {
        subject: { type: String, default: '' },
        moduleCategory: { type: String, default: '' },
        topics: { type: [String], default: [] },
        tags: { type: [String], default: [] },
        difficultyMix: {
            type: new Schema(
                {
                    easy: { type: Number, default: 0 },
                    medium: { type: Number, default: 0 },
                    hard: { type: Number, default: 0 },
                },
                { _id: false },
            ),
            default: { easy: 0, medium: 0, hard: 0 },
        },
        totalQuestions: { type: Number, default: 0 },
        defaultMarks: { type: Number, default: 1 },
        defaultNegativeMarks: { type: Number, default: 0 },
    },
    { _id: false },
);

const QuestionBankSetSchema = new Schema<IQuestionBankSet>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        mode: { type: String, enum: ['manual', 'rule_based'], required: true },
        rules: { type: SetRulesSchema, default: {} },
        selectedBankQuestionIds: { type: [String], default: [] },
        createdByAdminId: { type: String, required: true },
    },
    {
        timestamps: true,
        collection: 'question_bank_sets',
    },
);

QuestionBankSetSchema.index({ createdByAdminId: 1, createdAt: -1 });

export default mongoose.model<IQuestionBankSet>(
    'QuestionBankSet',
    QuestionBankSetSchema,
);
