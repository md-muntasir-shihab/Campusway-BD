import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminProfile extends Document {
    user_id: mongoose.Types.ObjectId;
    admin_name: string;
    role_level: 'superadmin' | 'admin' | 'moderator' | 'editor' | 'viewer';
    permissions: {
        canEditExams: boolean;
        canManageStudents: boolean;
        canViewReports: boolean;
        canDeleteData: boolean;
    };
    profile_photo?: string;
    login_history: Array<{ ip: string; device: string; timestamp: Date }>;
    security_logs: Array<{ action: string; timestamp: Date; details?: string }>;
    action_history: Array<{ action: string; timestamp: Date; target_type?: string; target_id?: string }>;
    createdAt: Date;
    updatedAt: Date;
}

const AdminProfileSchema = new Schema<IAdminProfile>({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    admin_name: { type: String, required: true, trim: true },
    role_level: {
        type: String,
        enum: ['superadmin', 'admin', 'moderator', 'editor', 'viewer'],
        required: true
    },
    permissions: {
        canEditExams: { type: Boolean, default: false },
        canManageStudents: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: false },
        canDeleteData: { type: Boolean, default: false },
    },
    profile_photo: { type: String },
    login_history: [{
        ip: { type: String },
        device: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],
    security_logs: [{
        action: { type: String },
        timestamp: { type: Date, default: Date.now },
        details: { type: String }
    }],
    action_history: [{
        action: { type: String },
        timestamp: { type: Date, default: Date.now },
        target_type: { type: String },
        target_id: { type: String },
    }],
}, { timestamps: true });

export default mongoose.model<IAdminProfile>('AdminProfile', AdminProfileSchema);
