import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionMedia extends Document {
    sourceType: 'upload' | 'external_link';
    url: string;
    mimeType?: string;
    sizeBytes?: number;
    status: 'pending' | 'approved' | 'rejected';
    approvalNote?: string;
    alt_text_bn?: string;
    createdBy?: mongoose.Types.ObjectId | null;
    approvedBy?: mongoose.Types.ObjectId | null;
    approvedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const QuestionMediaSchema = new Schema<IQuestionMedia>(
    {
        sourceType: { type: String, enum: ['upload', 'external_link'], required: true },
        url: { type: String, required: true, trim: true },
        mimeType: { type: String, default: '' },
        sizeBytes: { type: Number, default: 0 },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        approvalNote: { type: String, default: '' },
        alt_text_bn: { type: String, default: '' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'question_media' },
);

QuestionMediaSchema.index({ status: 1, createdAt: -1 });
QuestionMediaSchema.index({ sourceType: 1, createdAt: -1 });

export default mongoose.model<IQuestionMedia>('QuestionMedia', QuestionMediaSchema);
