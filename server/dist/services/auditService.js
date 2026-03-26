import { AuditLogModel } from '../models/AuditLog.js';
export const writeNewsAuditLog = async (req, action, targetType, targetId, beforeAfterDiff = {}) => {
    const actorId = req.adminActorId || '';
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
