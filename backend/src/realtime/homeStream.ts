import { Response } from 'express';

export interface HomeStreamEvent {
    type: 'home-updated' | 'category-updated' | 'cluster-updated' | 'banner-updated' | 'news-updated';
    timestamp: string;
    meta?: Record<string, unknown>;
}

const clients = new Set<Response>();

function writeEvent(res: Response, event: HomeStreamEvent): void {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function addHomeStreamClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    clients.add(res);
    writeEvent(res, {
        type: 'home-updated',
        timestamp: new Date().toISOString(),
        meta: { message: 'connected' },
    });

    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            clients.delete(res);
            return;
        }
        res.write('event: ping\n');
        res.write(`data: {"ts":"${new Date().toISOString()}"}\n\n`);
    }, 20000);

    res.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(res);
    });
}

export function broadcastHomeStreamEvent(event: Omit<HomeStreamEvent, 'timestamp'>): void {
    const payload: HomeStreamEvent = {
        ...event,
        timestamp: new Date().toISOString(),
    };

    clients.forEach((client) => {
        if (client.writableEnded) {
            clients.delete(client);
            return;
        }
        writeEvent(client, payload);
    });
}

