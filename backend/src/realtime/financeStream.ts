import { Response } from 'express';

export type FinanceEventName =
    | 'finance-connected'
    | 'finance-updated'
    | 'payment-recorded'
    | 'expense-recorded'
    | 'payout-recorded'
    | 'due-updated'
    | 'payment-updated'
    | 'ping';

const clients = new Set<Response>();

function writeEvent(res: Response, eventName: FinanceEventName, payload: Record<string, unknown>): void {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function addFinanceStreamClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    clients.add(res);
    writeEvent(res, 'finance-connected', { connectedAt: new Date().toISOString() });

    const pingInterval = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(pingInterval);
            clients.delete(res);
            return;
        }
        writeEvent(res, 'ping', { ts: new Date().toISOString() });
    }, 20_000);

    res.on('close', () => {
        clearInterval(pingInterval);
        clients.delete(res);
    });
}

export function broadcastFinanceEvent(eventName: FinanceEventName, payload: Record<string, unknown>): number {
    let delivered = 0;
    for (const client of Array.from(clients)) {
        if (client.writableEnded) {
            clients.delete(client);
            continue;
        }
        writeEvent(client, eventName, { ...payload, timestamp: new Date().toISOString() });
        delivered += 1;
    }
    return delivered;
}
