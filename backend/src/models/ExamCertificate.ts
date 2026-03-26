import mongoose, { Document, Schema } from 'mongoose';

export interface IExamCertificate extends Document {
    certificateId: string;
    verifyToken: string;
    examId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    attemptNo: number;
    resultId: mongoose.Types.ObjectId;
    issuedAt: Date;
    status: 'active' | 'revoked';
    meta?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const ExamCertificateSchema = new Schema<IExamCertificate>({
    certificateId: { type: String, required: true, unique: true, index: true },
    verifyToken: { type: String, required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attemptNo: { type: Number, required: true, default: 1 },
    resultId: { type: Schema.Types.ObjectId, ref: 'ExamResult', required: true, index: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: 'exam_certificates' });

ExamCertificateSchema.index({ examId: 1, studentId: 1, attemptNo: 1 }, { unique: true });

export default mongoose.model<IExamCertificate>('ExamCertificate', ExamCertificateSchema);
