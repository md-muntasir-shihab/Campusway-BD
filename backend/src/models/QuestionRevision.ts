import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionRevision extends Document {
    questionId: mongoose.Types.ObjectId;
    revisionNo: number;
    snapshot: Record<string, unknown>;
    changedBy?: mongoose.Types.ObjectId;
    changedAt: Date;
}

const QuestionRevisionSchema = new Schema<IQuestionRevision>({
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    revisionNo: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
}, { timestamps: false, collection: 'question_revisions' });

QuestionRevisionSchema.index({ questionId: 1, revisionNo: -1 }, { unique: true });

export default mongoose.model<IQuestionRevision>('QuestionRevision', QuestionRevisionSchema);

