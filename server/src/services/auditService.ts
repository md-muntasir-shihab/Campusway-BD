import { Request } from 'express';
import { AuditLogModel } from '../models/AuditLog.js';

export const writeNewsAuditLog = async (
  req: Request,
  action: string,
  targetType: string,
  targetId: string,
  beforeAfterDiff: Record<string, unknown> = {}
) => {
  const actorId = (req as Request & { adminActorId?: string }).adminActorId || '';
  await AuditLogModel.create({
    module: 'news',
    actorId,
    action,
    targetType,
    targetId,
    beforeAfterDiff,
    ip: req.ip,
    userAgent: String(req.headers['user-agent'] || '')
  });
};

