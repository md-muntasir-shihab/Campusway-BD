import mongoose, { Document, Schema } from 'mongoose';

export interface IExamCenter extends Document {
    name: string;
    address: string;
    code?: string;
    note?: string;
    isActive: boolean;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExamCenterSchema = new Schema<IExamCenter>({
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, default: '', trim: true },
    code: { type: String, default: '', trim: true, index: true, sparse: true },
    note: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'exam_centers' });

ExamCenterSchema.index({ isActive: 1, name: 1 });

export default mongoose.model<IExamCenter>('ExamCenter', ExamCenterSchema);
