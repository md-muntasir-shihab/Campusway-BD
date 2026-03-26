import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceAuditLog extends Document {
    service_id: mongoose.Types.ObjectId;
    action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
    actor_id: mongoose.Types.ObjectId;
    diff: any;
    timestamp: Date;
}

const ServiceAuditLogSchema = new Schema<IServiceAuditLog>({
    service_id: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    action: { type: String, enum: ['create', 'update', 'delete', 'publish', 'unpublish'], required: true },
    actor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    diff: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export default mongoose.model<IServiceAuditLog>('ServiceAuditLog', ServiceAuditLogSchema);
