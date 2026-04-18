import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityAuditLog extends Document {
    correlationId: string;
    eventCategory: 'auth' | 'anti_cheat' | 'admin' | 'security';
    eventType: string;
    actorId?: mongoose.Types.ObjectId;
    actorRole?: string;
    ipAddress: string;
    userAgent: string;
    details: Record<string, unknown>;
    createdAt: Date;
}

const SecurityAuditLogSchema = new Schema<ISecurityAuditLog>(
    {
        correlationId: { type: String, required: true },
        eventCategory: {
            type: String,
            enum: ['auth', 'anti_cheat', 'admin', 'security'],
            required: true,
        },
        eventType: { type: String, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        actorRole: { type: String, default: null },
        ipAddress: { type: String, default: '' },
        userAgent: { type: String, default: '' },
        details: { type: Schema.Types.Mixed, default: {} },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        collection: 'security_audit_logs',
    },
);

SecurityAuditLogSchema.index({ eventCategory: 1, createdAt: -1 });
SecurityAuditLogSchema.index({ correlationId: 1 });
SecurityAuditLogSchema.index({ actorId: 1, createdAt: -1 });

export default mongoose.model<ISecurityAuditLog>('SecurityAuditLog', SecurityAuditLogSchema);
