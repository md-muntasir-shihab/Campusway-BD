import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordReset extends Document {
    user_id: mongoose.Types.ObjectId;
    token: string;
    expires_at: Date;
    purpose: 'reset_password' | 'email_verification';
}

const PasswordResetSchema = new Schema<IPasswordReset>({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    purpose: { type: String, enum: ['reset_password', 'email_verification'], default: 'reset_password' }
});

// TTL Index to auto-delete expired tokens
PasswordResetSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
