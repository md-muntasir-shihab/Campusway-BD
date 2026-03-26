import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentApplication extends Document {
    student_id: mongoose.Types.ObjectId;
    university_id: mongoose.Types.ObjectId; // References the existing University model
    program: string;
    status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected';
    applied_at?: Date;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentApplicationSchema = new Schema<IStudentApplication>({
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    university_id: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    program: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'under_review', 'accepted', 'rejected'],
        default: 'draft'
    },
    applied_at: { type: Date },
    remarks: { type: String, trim: true }
}, { timestamps: true });

StudentApplicationSchema.index({ student_id: 1 });
StudentApplicationSchema.index({ university_id: 1 });
StudentApplicationSchema.index({ status: 1 });

export default mongoose.model<IStudentApplication>('StudentApplication', StudentApplicationSchema);
