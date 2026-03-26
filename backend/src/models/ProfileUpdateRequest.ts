import mongoose, { Document, Schema } from 'mongoose';

export interface IProfileUpdateRequest extends Document {
    student_id: mongoose.Types.ObjectId;
    requested_changes: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected';
    admin_feedback?: string;
    reviewed_at?: Date;
    reviewed_by?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ProfileUpdateRequestSchema = new Schema<IProfileUpdateRequest>(
    {
        student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        requested_changes: { type: Schema.Types.Mixed, required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        admin_feedback: { type: String, trim: true },
        reviewed_at: { type: Date },
        reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

ProfileUpdateRequestSchema.index({ student_id: 1, status: 1 });
ProfileUpdateRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IProfileUpdateRequest>('ProfileUpdateRequest', ProfileUpdateRequestSchema);
