import { NewsItemModel } from "../models/newsItem.model";
import { AuditLogModel } from "../models/auditLog.model";

const writeAudit = async (payload: {
  actorId?: string;
  action: string;
  targetId: string;
  beforeAfterDiff: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) => {
  await AuditLogModel.create({ targetType: "news", ...payload });
};

export const approveAndPublishNow = async (id: string, actorId?: string) => {
  const before = await NewsItemModel.findById(id).lean();
  const after = await NewsItemModel.findByIdAndUpdate(
    id,
    { status: "published", publishedAt: new Date(), approvedByAdminId: actorId, scheduledAt: null },
    { new: true }
  );
  if (after) await writeAudit({ actorId, action: "publish", targetId: id, beforeAfterDiff: { before, after } });
  return after;
};

export const scheduleNews = async (id: string, when: Date, actorId?: string) => {
  const before = await NewsItemModel.findById(id).lean();
  const after = await NewsItemModel.findByIdAndUpdate(
    id,
    { status: "scheduled", scheduledAt: when, approvedByAdminId: actorId },
    { new: true }
  );
  if (after) await writeAudit({ actorId, action: "schedule", targetId: id, beforeAfterDiff: { before, after } });
  return after;
};

export const rejectNews = async (id: string, actorId?: string) => {
  const before = await NewsItemModel.findById(id).lean();
  const after = await NewsItemModel.findByIdAndUpdate(id, { status: "rejected" }, { new: true });
  if (after) await writeAudit({ actorId, action: "reject", targetId: id, beforeAfterDiff: { before, after } });
  return after;
};
