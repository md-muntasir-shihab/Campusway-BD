import News from "../models/News";
import AuditLog from "../models/AuditLog";

const writeAudit = async (payload: {
  actorId?: string;
  action: string;
  targetId: string;
  beforeAfterDiff: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) => {
  await AuditLog.create({ targetType: "news", ...payload });
};

export const approveAndPublishNow = async (id: string, actorId?: string) => {
  const before = await News.findById(id).lean();
  const after = await News.findByIdAndUpdate(
    id,
    { status: "published", publishedAt: new Date(), approvedByAdminId: actorId, scheduledAt: null },
    { new: true }
  );
  if (after) await writeAudit({ actorId, action: "publish", targetId: id, beforeAfterDiff: { before, after } });
  return after;
};

export const scheduleNews = async (id: string, when: Date, actorId?: string) => {
  const before = await News.findById(id).lean();
  const after = await News.findByIdAndUpdate(
    id,
    { status: "scheduled", scheduledAt: when, approvedByAdminId: actorId },
    { new: true }
  );
  if (after) await writeAudit({ actorId, action: "schedule", targetId: id, beforeAfterDiff: { before, after } });
  return after;
};

export const rejectNews = async (id: string, actorId?: string) => {
  const before = await News.findById(id).lean();
  const after = await News.findByIdAndUpdate(id, { status: "rejected" }, { new: true });
  if (after) await writeAudit({ actorId, action: "reject", targetId: id, beforeAfterDiff: { before, after } });
  return after;
};
