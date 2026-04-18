import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityAlert extends Document {
    alertType: 'auth_failure_spike' | 'otp_abuse' | 'suspicious_admin_activity' | 'anti_cheat_spike';
    severity: 'info' | 'warning' | 'critical';
    details: Record<string, unknown>;
    acknowledged: boolean;
    acknowledgedBy?: mongoose.Types.ObjectId;
    acknowledgedAt?: Date;
    createdAt: Date;
}

const SecurityAlertSchema = new Schema<ISecurityAlert>(
    {
        alertType: {
            type: String,
            enum: ['auth_failure_spike', 'otp_abuse', 'suspicious_admin_activity', 'anti_cheat_spike'],
            required: true,
        },
        severity: {
            type: String,
            enum: ['info', 'warning', 'critical'],
            required: true,
        },
        details: { type: Schema.Types.Mixed, default: {} },
        acknowledged: { type: Boolean, default: false },
        acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        acknowledgedAt: { type: Date, default: null },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        collection: 'security_alerts',
    },
);

SecurityAlertSchema.index({ acknowledged: 1, createdAt: -1 });
SecurityAlertSchema.index({ alertType: 1, createdAt: -1 });

export default mongoose.model<ISecurityAlert>('SecurityAlert', SecurityAlertSchema);
