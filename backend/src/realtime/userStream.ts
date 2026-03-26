import { Response } from 'express';

export interface UserStreamEvent {
    type: 'user_created' | 'user_updated' | 'user_deleted' | 'user_status_changed' | 'user_role_changed' | 'user_permissions_changed' | 'bulk_user_action' | 'students_imported';
    userId?: string;
    actorId?: string;
    timestamp: string;
    meta?: Record<string, unknown>;
}

const clients = new Set<Response>();

function writeEvent(res: Response, event: UserStreamEvent): void {
    res.write(`event: user-event\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function addUserStreamClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    clients.add(res);

    writeEvent(res, {
        type: 'user_updated',
        timestamp: new Date().toISOString(),
        meta: { heartbeat: true, message: 'connected' },
    });

    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            clients.delete(res);
            return;
        }
        res.write(`event: ping\n`);
        res.write(`data: {"ts":"${new Date().toISOString()}"}\n\n`);
    }, 20000);

    res.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(res);
    });
}

export function broadcastUserEvent(event: Omit<UserStreamEvent, 'timestamp'>): void {
    const payload: UserStreamEvent = {
        ...event,
        timestamp: new Date().toISOString(),
    };

    for (const client of clients) {
        if (client.writableEnded) {
            clients.delete(client);
            continue;
        }
        writeEvent(client, payload);
    }
}
