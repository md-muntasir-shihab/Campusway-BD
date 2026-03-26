import mongoose, { Document, Schema } from 'mongoose';

export interface IActiveSession extends Document {
    user_id: mongoose.Types.ObjectId;
    session_id: string;
    jwt_token_hash: string;
    browser_fingerprint: string;
    ip_address: string;
    device_type: string;
    device_name?: string;
    platform?: string;
    browser?: string;
    location_summary?: string;
    risk_score?: number;
    risk_flags?: string[];
    stream_ticket_hash?: string;
    stream_ticket_expires_at?: Date;
    login_time: Date;
    last_activity: Date;
    status: 'active' | 'terminated';
    terminated_reason?: string;
    terminated_at?: Date;
    termination_meta?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const ActiveSessionSchema = new Schema<IActiveSession>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        session_id: { type: String, required: true, unique: true },
        jwt_token_hash: { type: String, required: true },
        browser_fingerprint: { type: String, default: '' },
        ip_address: { type: String, default: '' },
        device_type: { type: String, default: 'unknown' },
        device_name: { type: String, default: '' },
        platform: { type: String, default: '' },
        browser: { type: String, default: '' },
        location_summary: { type: String, default: '' },
        risk_score: { type: Number, default: 0, min: 0, max: 100 },
        risk_flags: { type: [String], default: [] },
        stream_ticket_hash: { type: String, default: '' },
        stream_ticket_expires_at: { type: Date, default: null },
        login_time: { type: Date, default: Date.now },
        last_activity: { type: Date, default: Date.now },
        status: { type: String, enum: ['active', 'terminated'], default: 'active' },
        terminated_reason: { type: String, trim: true },
        terminated_at: { type: Date },
        termination_meta: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

ActiveSessionSchema.index({ user_id: 1, status: 1 });
// Auto-cleanup after 30 days
ActiveSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IActiveSession>('ActiveSession', ActiveSessionSchema);
