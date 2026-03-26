import mongoose from 'mongoose';
import type { Request } from 'express';
import AuditLog from '../models/AuditLog';
import { getClientIp } from '../utils/requestMeta';

export function toObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) {
        return null;
    }
    return new mongoose.Types.ObjectId(raw);
}

export function normalizeEmail(value: unknown): string {
    return String(value || '').trim().toLowerCase();
}

export function normalizePhone(value: unknown): string {
    return String(value || '').replace(/\D+/g, '');
}

export function buildMessagePreview(message: unknown, maxLength = 160): string {
    const cleaned = String(message || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) {
        return cleaned;
    }
    return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function formatContactBundle(input: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
}): string {
    return [
        input.name ? `Name: ${String(input.name).trim()}` : '',
        input.email ? `Email: ${String(input.email).trim()}` : '',
        input.phone ? `Phone: ${String(input.phone).trim()}` : '',
    ]
        .filter(Boolean)
        .join('\n');
}

export async function createCommunicationAuditEntry(input: {
    actorId?: string | mongoose.Types.ObjectId | null;
    actorRole?: string | null;
    action: string;
    targetId?: string | mongoose.Types.ObjectId | null;
    req?: Request | null;
    details?: Record<string, unknown>;
}): Promise<void> {
    const actorId = toObjectId(input.actorId);
    if (!actorId) {
        return;
    }

    await AuditLog.create({
        actor_id: actorId,
        actor_role: String(input.actorRole || '').trim() || undefined,
        action: input.action,
        target_id: toObjectId(input.targetId) || undefined,
        target_type: 'communication',
        ip_address: input.req ? getClientIp(input.req) : undefined,
        details: input.details || {},
    });
}
