import mongoose, { Document, Schema } from 'mongoose';

export interface IMistakeVaultEntry extends Document {
    student: mongoose.Types.ObjectId;
    question: mongoose.Types.ObjectId;
    exam?: mongoose.Types.ObjectId;
    selectedAnswer: string;
    correctAnswer: string;
    subject?: string;
    chapter?: string;
    topic?: string;
    attemptDate: Date;
    retryCount: number;
    masteryStatus: 'weak' | 'still_weak' | 'mastered';
    lastRetryDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const MistakeVaultEntrySchema = new Schema<IMistakeVaultEntry>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        question: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionBankQuestion',
            required: true,
        },
        exam: {
            type: Schema.Types.ObjectId,
            ref: 'Exam',
            default: null,
        },
        selectedAnswer: { type: String, required: true },
        correctAnswer: { type: String, required: true },
        subject: { type: String, default: null },
        chapter: { type: String, default: null },
        topic: { type: String, default: null },
        attemptDate: { type: Date, required: true },
        retryCount: { type: Number, default: 0 },
        masteryStatus: {
            type: String,
            enum: ['weak', 'still_weak', 'mastered'],
            default: 'weak',
        },
        lastRetryDate: { type: Date, default: null },
    },
    { timestamps: true, collection: 'mistake_vault_entries' },
);

// One entry per student-question pair
MistakeVaultEntrySchema.index({ student: 1, question: 1 }, { unique: true });
// Filtering by mastery status
MistakeVaultEntrySchema.index({ student: 1, masteryStatus: 1 });
// Filtering by subject
MistakeVaultEntrySchema.index({ student: 1, subject: 1 });
// Filtering by topic
MistakeVaultEntrySchema.index({ student: 1, topic: 1 });

export default mongoose.model<IMistakeVaultEntry>('MistakeVaultEntry', MistakeVaultEntrySchema);
