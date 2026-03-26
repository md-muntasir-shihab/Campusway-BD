import mongoose, { Schema } from 'mongoose';

export interface AuditLogDoc extends mongoose.Document {
  module: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  beforeAfterDiff?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDoc>(
  {
    module: { type: String, required: true, default: 'news' },
    actorId: { type: String, default: '' },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, default: '' },
    beforeAfterDiff: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' }
);

AuditLogSchema.index({ module: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });

export const AuditLogModel = mongoose.model<AuditLogDoc>('AuditLog', AuditLogSchema);

