import { Response } from 'express';

type SessionConnectedPayload = {
    sessionId: string;
    connectedAt: string;
};

type ForceLogoutPayload = {
    reason: string;
    terminatedAt: string;
};

const clientsBySession = new Map<string, Set<Response>>();

function writeEvent(res: Response, eventName: string, payload: Record<string, unknown>): void {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function cleanupClient(sessionId: string, res: Response): void {
    const bucket = clientsBySession.get(sessionId);
    if (!bucket) return;

    bucket.delete(res);
    if (bucket.size === 0) {
        clientsBySession.delete(sessionId);
    }
}

export function addAuthSessionStreamClient(params: { sessionId: string; userId: string; res: Response }): void {
    const { sessionId, userId, res } = params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const bucket = clientsBySession.get(sessionId) || new Set<Response>();
    bucket.add(res);
    clientsBySession.set(sessionId, bucket);

    const connectedPayload: SessionConnectedPayload = {
        sessionId,
        connectedAt: new Date().toISOString(),
    };
    writeEvent(res, 'session-connected', connectedPayload);
    console.info('[auth-stream] connected', { userId, sessionId, clientsForSession: bucket.size });

    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            cleanupClient(sessionId, res);
            return;
        }
        writeEvent(res, 'ping', { ts: new Date().toISOString() });
    }, 20_000);

    res.on('close', () => {
        clearInterval(heartbeat);
        cleanupClient(sessionId, res);
        console.info('[auth-stream] disconnected', { userId, sessionId });
    });
}

export function broadcastForceLogoutBySessionIds(
    sessionIds: string[],
    payload?: Partial<ForceLogoutPayload>
): number {
    if (!sessionIds.length) return 0;

    const reason = String(payload?.reason || 'session_replaced');
    const terminatedAt = String(payload?.terminatedAt || new Date().toISOString());
    const body: ForceLogoutPayload = { reason, terminatedAt };
    let delivered = 0;

    for (const sessionId of sessionIds) {
        const bucket = clientsBySession.get(sessionId);
        if (!bucket || bucket.size === 0) continue;

        for (const client of bucket) {
            if (client.writableEnded) continue;
            writeEvent(client, 'force-logout', body);
            delivered += 1;
            client.end();
        }

        clientsBySession.delete(sessionId);
    }

    if (delivered > 0) {
        console.info('[auth-stream] force-logout broadcast', { sessionCount: sessionIds.length, delivered });
    }

    return delivered;
}

