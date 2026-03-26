import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionBankSettings extends Document {
    versioningOnEditIfUsed: boolean;
    duplicateDetectionSensitivity: number;
    defaultMarks: number;
    defaultNegativeMarks: number;
    archiveInsteadOfDelete: boolean;
    allowImageUploads: boolean;
    allowBothLanguages: boolean;
    importSizeLimit: number;
}

const QuestionBankSettingsSchema = new Schema<IQuestionBankSettings>(
    {
        versioningOnEditIfUsed: { type: Boolean, default: true },
        duplicateDetectionSensitivity: { type: Number, default: 0.85, min: 0, max: 1 },
        defaultMarks: { type: Number, default: 1, min: 0 },
        defaultNegativeMarks: { type: Number, default: 0, min: 0 },
        archiveInsteadOfDelete: { type: Boolean, default: true },
        allowImageUploads: { type: Boolean, default: true },
        allowBothLanguages: { type: Boolean, default: true },
        importSizeLimit: { type: Number, default: 5000 },
    },
    {
        timestamps: true,
        collection: 'question_bank_settings',
    },
);

export default mongoose.model<IQuestionBankSettings>(
    'QuestionBankSettings',
    QuestionBankSettingsSchema,
);
