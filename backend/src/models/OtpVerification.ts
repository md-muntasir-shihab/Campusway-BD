import mongoose, { Document, Schema } from 'mongoose';

export interface IOtpVerification extends Document {
    user_id: mongoose.Types.ObjectId;
    otp_code: string; // hashed
    method: 'email' | 'sms' | 'authenticator';
    contact_type: 'phone' | 'email';
    contact_value: string;
    expires_at: Date;
    attempt_count: number;
    verified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OtpVerificationSchema = new Schema<IOtpVerification>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        otp_code: { type: String, required: true },
        method: { type: String, enum: ['email', 'sms', 'authenticator'], default: 'email' },
        contact_type: { type: String, enum: ['phone', 'email'], required: true },
        contact_value: { type: String, required: true },
        expires_at: { type: Date, required: true },
        attempt_count: { type: Number, default: 0 },
        verified: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Auto-cleanup expired OTPs after 10 minutes
OtpVerificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
OtpVerificationSchema.index({ user_id: 1, verified: 1 });
// Compound index for rate limiting queries (cooldown + hourly limit)
OtpVerificationSchema.index({ user_id: 1, contact_type: 1, createdAt: -1 });

export default mongoose.model<IOtpVerification>('OtpVerification', OtpVerificationSchema);
