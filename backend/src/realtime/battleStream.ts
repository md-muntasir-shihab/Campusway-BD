/**
 * Battle Mode SSE Stream
 *
 * Provides real-time score updates during Brain Clash battles via
 * Server-Sent Events. Each battle session has its own client bucket
 * so both challenger and opponent receive live updates.
 *
 * Event types:
 *   - battle-connected: Initial connection confirmation
 *   - score-update: Real-time score change for a player
 *   - battle-completed: Battle finished with final results
 *   - opponent-joined: Opponent accepted the challenge
 *   - ping: Heartbeat to keep connection alive
 *
 * Requirement 21.3
 */
import { Response } from 'express';

export type BattleStreamEventName =
    | 'battle-connected'
    | 'score-update'
    | 'battle-completed'
    | 'opponent-joined'
    | 'ping';

interface StreamClientMeta {
    battleId: string;
    studentId: string;
}

interface StreamClient {
    res: Response;
    meta: StreamClientMeta;
}

const clients = new Map<string, Set<StreamClient>>();

function getBucket(battleId: string): Set<StreamClient> {
    if (!clients.has(battleId)) {
        clients.set(battleId, new Set());
    }
    return clients.get(battleId)!;
}

function writeEvent(res: Response, eventName: BattleStreamEventName, payload: Record<string, unknown>): void {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function removeClient(client: StreamClient): void {
    const bucket = clients.get(client.meta.battleId);
    if (!bucket) return;
    bucket.delete(client);
    if (bucket.size === 0) clients.delete(client.meta.battleId);
}

/**
 * Register a new SSE client for a battle session.
 * Sets up headers, sends initial connection event, and starts heartbeat.
 */
export function addBattleStreamClient(params: StreamClientMeta & { res: Response }): void {
    const { battleId, studentId, res } = params;
    const client: StreamClient = {
        res,
        meta: { battleId, studentId },
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const bucket = getBucket(battleId);
    bucket.add(client);

    writeEvent(res, 'battle-connected', {
        battleId,
        studentId,
        connectedAt: new Date().toISOString(),
    });

    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            removeClient(client);
            return;
        }
        writeEvent(res, 'ping', { ts: new Date().toISOString(), battleId });
    }, 20_000);

    res.on('close', () => {
        clearInterval(heartbeat);
        removeClient(client);
    });
}

/**
 * Broadcast an event to all clients connected to a specific battle.
 * Returns the number of clients that received the event.
 */
export function broadcastBattleEvent(
    battleId: string,
    eventName: BattleStreamEventName,
    payload: Record<string, unknown>,
): number {
    const bucket = clients.get(battleId);
    if (!bucket || bucket.size === 0) return 0;

    let delivered = 0;
    for (const client of Array.from(bucket)) {
        if (client.res.writableEnded) {
            bucket.delete(client);
            continue;
        }
        writeEvent(client.res, eventName, {
            ...payload,
            battleId,
            timestamp: new Date().toISOString(),
        });
        delivered += 1;
    }

    if (bucket.size === 0) clients.delete(battleId);
    return delivered;
}

/**
 * Broadcast a score update to all participants in a battle.
 * Convenience wrapper around broadcastBattleEvent.
 */
export function broadcastBattleScoreUpdate(
    battleId: string,
    studentId: string,
    score: number,
    answeredCount: number,
    totalQuestions: number,
): number {
    return broadcastBattleEvent(battleId, 'score-update', {
        studentId,
        score,
        answeredCount,
        totalQuestions,
    });
}

/**
 * Broadcast battle completion to all participants.
 */
export function broadcastBattleCompleted(
    battleId: string,
    result: {
        winnerId?: string;
        challengerScore: number;
        opponentScore: number;
        result: string;
    },
): number {
    return broadcastBattleEvent(battleId, 'battle-completed', result);
}
