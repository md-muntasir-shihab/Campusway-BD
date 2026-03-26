import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamAuditLog extends Document {
    actorId?: mongoose.Types.ObjectId;
    module: string;
    action: string;
    targetType?: string;
    targetId?: string;
    oldValueSummary?: Record<string, unknown>;
    newValueSummary?: Record<string, unknown>;
    status: 'success' | 'failed' | 'blocked';
    ip?: string;
    device?: string;
}

const TeamAuditLogSchema = new Schema<ITeamAuditLog>(
    {
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        module: { type: String, required: true, trim: true, lowercase: true, index: true },
        action: { type: String, required: true, trim: true, lowercase: true, index: true },
        targetType: { type: String, trim: true },
        targetId: { type: String, trim: true },
        oldValueSummary: { type: Schema.Types.Mixed, default: undefined },
        newValueSummary: { type: Schema.Types.Mixed, default: undefined },
        status: { type: String, enum: ['success', 'failed', 'blocked'], default: 'success', index: true },
        ip: { type: String, trim: true },
        device: { type: String, trim: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'team_audit_logs' },
);

TeamAuditLogSchema.index({ createdAt: -1 });

export default mongoose.model<ITeamAuditLog>('TeamAuditLog', TeamAuditLogSchema);
