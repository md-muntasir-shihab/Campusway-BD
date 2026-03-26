import { Request } from 'express';
import { FilterQuery } from 'mongoose';
import ActiveSession, { IActiveSession } from '../models/ActiveSession';
import { broadcastForceLogoutBySessionIds } from '../realtime/authSessionStream';

export function getBrowserFingerprint(req: Request): string {
    const incoming = req.headers['x-browser-fingerprint'];
    const fromHeader = Array.isArray(incoming) ? incoming[0] : incoming;
    if (typeof fromHeader === 'string' && fromHeader.trim()) {
        return fromHeader.trim().slice(0, 512);
    }

    const fallback = req.headers['user-agent'];
    if (typeof fallback === 'string' && fallback.trim()) {
        return fallback.trim().slice(0, 512);
    }
    return 'unknown';
}

type TerminateSessionOptions = {
    filter: FilterQuery<IActiveSession>;
    reason: string;
    initiatedBy?: string;
    meta?: Record<string, unknown>;
};

export type TerminateSessionResult = {
    terminatedCount: number;
    sessionIds: string[];
    terminatedAt: Date;
};

export async function terminateSessions(options: TerminateSessionOptions): Promise<TerminateSessionResult> {
    const terminatedAt = new Date();
    const query: FilterQuery<IActiveSession> = {
        ...options.filter,
        status: 'active',
    };

    const activeSessions = await ActiveSession.find(query).select('session_id').lean();
    const sessionIds = activeSessions.map((item) => String(item.session_id)).filter(Boolean);

    if (!sessionIds.length) {
        return { terminatedCount: 0, sessionIds: [], terminatedAt };
    }

    await ActiveSession.updateMany(
        { session_id: { $in: sessionIds }, status: 'active' },
        {
            $set: {
                status: 'terminated',
                terminated_reason: options.reason,
                terminated_at: terminatedAt,
                termination_meta: {
                    initiatedBy: options.initiatedBy || null,
                    ...(options.meta || {}),
                },
            },
        }
    );

    broadcastForceLogoutBySessionIds(sessionIds, {
        reason: options.reason,
        terminatedAt: terminatedAt.toISOString(),
    });

    return {
        terminatedCount: sessionIds.length,
        sessionIds,
        terminatedAt,
    };
}

export async function terminateSessionsForUser(
    userId: string,
    reason: string,
    options?: { initiatedBy?: string; meta?: Record<string, unknown> }
): Promise<TerminateSessionResult> {
    return terminateSessions({
        filter: { user_id: userId },
        reason,
        initiatedBy: options?.initiatedBy,
        meta: options?.meta,
    });
}

export async function terminateSessionById(
    sessionId: string,
    reason: string,
    options?: { initiatedBy?: string; meta?: Record<string, unknown> }
): Promise<TerminateSessionResult> {
    return terminateSessions({
        filter: { session_id: sessionId },
        reason,
        initiatedBy: options?.initiatedBy,
        meta: options?.meta,
    });
}

