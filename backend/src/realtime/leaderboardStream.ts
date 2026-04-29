/**
 * Leaderboard SSE Stream
 *
 * Provides live leaderboard updates during ongoing exams via
 * Server-Sent Events. Clients subscribe to a specific exam's
 * leaderboard and receive rank updates as new results come in.
 *
 * Event types:
 *   - leaderboard-connected: Initial connection confirmation
 *   - rank-update: New/updated rank entry
 *   - leaderboard-refresh: Full leaderboard data refresh
 *   - ping: Heartbeat to keep connection alive
 *
 * Requirement 8.5, 21.3
 */
import { Response } from 'express';

export type LeaderboardStreamEventName =
    | 'leaderboard-connected'
    | 'rank-update'
    | 'leaderboard-refresh'
    | 'ping';

interface StreamClientMeta {
    examId: string;
    studentId?: string;
}

interface StreamClient {
    res: Response;
    meta: StreamClientMeta;
}

const clients = new Map<string, Set<StreamClient>>();

function getBucket(examId: string): Set<StreamClient> {
    if (!clients.has(examId)) {
        clients.set(examId, new Set());
    }
    return clients.get(examId)!;
}

function writeEvent(res: Response, eventName: LeaderboardStreamEventName, payload: Record<string, unknown>): void {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function removeClient(client: StreamClient): void {
    const bucket = clients.get(client.meta.examId);
    if (!bucket) return;
    bucket.delete(client);
    if (bucket.size === 0) clients.delete(client.meta.examId);
}

/**
 * Register a new SSE client for an exam's live leaderboard.
 */
export function addLeaderboardStreamClient(params: StreamClientMeta & { res: Response }): void {
    const { examId, studentId, res } = params;
    const client: StreamClient = {
        res,
        meta: { examId, studentId },
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const bucket = getBucket(examId);
    bucket.add(client);

    writeEvent(res, 'leaderboard-connected', {
        examId,
        studentId: studentId ?? null,
        connectedAt: new Date().toISOString(),
    });

    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            removeClient(client);
            return;
        }
        writeEvent(res, 'ping', { ts: new Date().toISOString(), examId });
    }, 20_000);

    res.on('close', () => {
        clearInterval(heartbeat);
        removeClient(client);
    });
}

/**
 * Broadcast a leaderboard event to all clients watching a specific exam.
 * Returns the number of clients that received the event.
 */
export function broadcastLeaderboardEvent(
    examId: string,
    eventName: LeaderboardStreamEventName,
    payload: Record<string, unknown>,
): number {
    const bucket = clients.get(examId);
    if (!bucket || bucket.size === 0) return 0;

    let delivered = 0;
    for (const client of Array.from(bucket)) {
        if (client.res.writableEnded) {
            bucket.delete(client);
            continue;
        }
        writeEvent(client.res, eventName, {
            ...payload,
            examId,
            timestamp: new Date().toISOString(),
        });
        delivered += 1;
    }

    if (bucket.size === 0) clients.delete(examId);
    return delivered;
}

/**
 * Broadcast a rank update for a specific student on an exam leaderboard.
 */
export function broadcastRankUpdate(
    examId: string,
    entry: {
        studentId: string;
        displayName: string;
        score: number;
        percentage: number;
        rank: number;
        timeTaken: number;
    },
): number {
    return broadcastLeaderboardEvent(examId, 'rank-update', entry);
}
