import mongoose, { Document, Schema } from 'mongoose';

export interface IApplicationData {
    institutionName?: string;
    experience?: string;
    subjects?: string[];
    reason: string;
}

export interface IExaminerApplication extends Document {
    user: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    applicationData: IApplicationData;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    commissionRate: number;
    createdAt: Date;
    updatedAt: Date;
}

const ApplicationDataSchema = new Schema<IApplicationData>(
    {
        institutionName: { type: String, default: '', trim: true },
        experience: { type: String, default: '', trim: true },
        subjects: { type: [String], default: [] },
        reason: { type: String, required: true, trim: true },
    },
    { _id: false },
);

const ExaminerApplicationSchema = new Schema<IExaminerApplication>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            required: true,
            default: 'pending',
        },
        applicationData: { type: ApplicationDataSchema, required: true },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewedAt: { type: Date, default: null },
        commissionRate: { type: Number, required: true, default: 20 },
    },
    { timestamps: true, collection: 'examiner_applications' },
);

// Fast lookup by status for admin review queue
ExaminerApplicationSchema.index({ status: 1 });
// Unique application per user (prevent duplicate applications)
ExaminerApplicationSchema.index({ user: 1, status: 1 });

export default mongoose.model<IExaminerApplication>('ExaminerApplication', ExaminerApplicationSchema);
