import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IExamCenter extends Document {
    name: string;
    address: string;
    code?: string;
    note?: string;
    capacity: number;
    seatingLayout?: string;
    supportedExams: Types.ObjectId[];
    universityRef?: Types.ObjectId | null;
    isActive: boolean;
    createdBy?: Types.ObjectId | null;
    updatedBy?: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExamCenterSchema = new Schema<IExamCenter>({
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, default: '', trim: true },
    code: { type: String, default: '', trim: true, unique: true, sparse: true },
    note: { type: String, default: '', trim: true },
    capacity: { type: Number, required: true, default: 0 },
    seatingLayout: { type: String, default: '', trim: true },
    supportedExams: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
    universityRef: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'exam_centers' });

ExamCenterSchema.index({ isActive: 1, name: 1 });
ExamCenterSchema.index({ universityRef: 1 }, { sparse: true });
ExamCenterSchema.index({ updatedAt: -1 });

export default mongoose.model<IExamCenter>('ExamCenter', ExamCenterSchema);
