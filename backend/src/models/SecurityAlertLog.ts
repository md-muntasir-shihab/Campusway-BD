import mongoose, { Document, Schema } from 'mongoose';

export type AlertType =
    | 'failed_login_spike'
    | 'suspicious_exam_activity'
    | 'webhook_failure'
    | 'upload_abuse_attempt'
    | 'backup_failed'
    | 'system_error_spike'
    | 'brute_force_detected'
    | 'unusual_admin_action'
    | 'suspicious_admin_login'
    | 'new_admin_device'
    | 'otp_failure_spike'
    | 'role_permission_changed'
    | 'provider_credentials_changed'
    | 'sensitive_export'
    | 'dangerous_delete'
    | 'rate_limit_abuse'
    | 'verification_anomaly';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface ISecurityAlertLog extends Document {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    requestId?: string;
    actorUserId?: mongoose.Types.ObjectId | null;
    resolvedAt?: Date;
    resolvedByAdminId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SecurityAlertLogSchema = new Schema<ISecurityAlertLog>(
    {
        type: {
            type: String,
            required: true,
            enum: [
                'failed_login_spike',
                'suspicious_exam_activity',
                'webhook_failure',
                'upload_abuse_attempt',
                'backup_failed',
                'system_error_spike',
                'brute_force_detected',
                'unusual_admin_action',
                'suspicious_admin_login',
                'new_admin_device',
                'otp_failure_spike',
                'role_permission_changed',
                'provider_credentials_changed',
                'sensitive_export',
                'dangerous_delete',
                'rate_limit_abuse',
                'verification_anomaly',
            ],
        },
        severity: { type: String, required: true, enum: ['info', 'warning', 'critical'], default: 'warning' },
        title: { type: String, required: true, maxlength: 200 },
        message: { type: String, required: true, maxlength: 2000 },
        metadata: { type: Schema.Types.Mixed, default: {} },
        isRead: { type: Boolean, default: false },
        requestId: { type: String, trim: true, default: '' },
        actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        resolvedAt: { type: Date },
        resolvedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true, collection: 'security_alert_logs' },
);

SecurityAlertLogSchema.index({ severity: 1, isRead: 1, createdAt: -1 });
SecurityAlertLogSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model<ISecurityAlertLog>('SecurityAlertLog', SecurityAlertLogSchema);
