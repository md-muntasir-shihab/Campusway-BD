import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    actor_id: mongoose.Types.ObjectId;
    actor_role?: string;
    action: string;
    module?: string;
    status?: 'success' | 'warning' | 'failed' | 'pending';
    target_id?: mongoose.Types.ObjectId;
    target_type?: string;
    requestId?: string;
    sessionId?: string;
    device?: string;
    reason?: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    timestamp: Date;
    ip_address?: string;
    details?: Record<string, unknown> | string;
}

const AuditLogSchema = new Schema<IAuditLog>({
    actor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor_role: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    module: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['success', 'warning', 'failed', 'pending'], default: 'success' },
    target_id: { type: Schema.Types.ObjectId },
    target_type: { type: String, trim: true },
    requestId: { type: String, trim: true, default: '' },
    sessionId: { type: String, trim: true, default: '' },
    device: { type: String, trim: true, default: '' },
    reason: { type: String, trim: true, default: '' },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
    ip_address: { type: String },
    details: { type: Schema.Types.Mixed }
});

AuditLogSchema.index({ actor_id: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ module: 1, status: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
