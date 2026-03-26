import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginActivity extends Document {
    user_id: mongoose.Types.ObjectId;
    role: string;
    success: boolean;
    ip_address?: string;
    device_info?: string;
    user_agent?: string;
    login_identifier?: string;
    suspicious: boolean;
    reason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const LoginActivitySchema = new Schema<ILoginActivity>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, required: true, trim: true },
        success: { type: Boolean, required: true },
        ip_address: { type: String, trim: true },
        device_info: { type: String, trim: true },
        user_agent: { type: String, trim: true },
        login_identifier: { type: String, trim: true },
        suspicious: { type: Boolean, default: false },
        reason: { type: String, trim: true },
    },
    { timestamps: true }
);

LoginActivitySchema.index({ user_id: 1, createdAt: -1 });
LoginActivitySchema.index({ suspicious: 1, createdAt: -1 });
LoginActivitySchema.index({ success: 1, createdAt: -1 });

export default mongoose.model<ILoginActivity>('LoginActivity', LoginActivitySchema);
