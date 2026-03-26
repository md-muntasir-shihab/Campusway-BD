import { Schema, model } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: String, default: null },
    action: { type: String, required: true },
    targetType: { type: String, default: "news" },
    targetId: { type: String, required: true },
    beforeAfterDiff: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLogModel = model("audit_logs", auditLogSchema);
