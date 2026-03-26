import { Response } from 'express';

export type ExamAttemptStreamEventName =
    | 'attempt-connected'
    | 'timer-sync'
    | 'policy-warning'
    | 'forced-submit'
    | 'attempt-locked'
    | 'revision-update'
    | 'ping';

type StreamClientMeta = {
    attemptId: string;
    studentId: string;
    examId: string;
};

type StreamClient = {
    res: Response;
    meta: StreamClientMeta;
};

const clients = new Map<string, Set<StreamClient>>();

function getBucket(attemptId: string): Set<StreamClient> {
    if (!clients.has(attemptId)) {
        clients.set(attemptId, new Set());
    }
    return clients.get(attemptId)!;
}

function writeEvent(res: Response, eventName: ExamAttemptStreamEventName, payload: Record<string, unknown>): void {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function removeClient(client: StreamClient): void {
    const bucket = clients.get(client.meta.attemptId);
    if (!bucket) return;
    bucket.delete(client);
    if (bucket.size === 0) clients.delete(client.meta.attemptId);
}

export function addExamAttemptStreamClient(params: StreamClientMeta & { res: Response }): void {
    const { attemptId, studentId, examId, res } = params;
    const client: StreamClient = {
        res,
        meta: { attemptId, studentId, examId },
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const bucket = getBucket(attemptId);
    bucket.add(client);

    writeEvent(res, 'attempt-connected', {
        attemptId,
        studentId,
        examId,
        connectedAt: new Date().toISOString(),
    });

    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            removeClient(client);
            return;
        }
        writeEvent(res, 'ping', { ts: new Date().toISOString(), attemptId });
    }, 20_000);

    res.on('close', () => {
        clearInterval(heartbeat);
        removeClient(client);
    });
}

export function broadcastExamAttemptEvent(
    attemptId: string,
    eventName: ExamAttemptStreamEventName,
    payload: Record<string, unknown>
): number {
    const bucket = clients.get(attemptId);
    if (!bucket || bucket.size === 0) return 0;

    let delivered = 0;
    for (const client of Array.from(bucket)) {
        if (client.res.writableEnded) {
            bucket.delete(client);
            continue;
        }
        writeEvent(client.res, eventName, {
            ...payload,
            attemptId,
            timestamp: new Date().toISOString(),
        });
        delivered += 1;
    }

    if (bucket.size === 0) clients.delete(attemptId);
    return delivered;
}

export function broadcastExamAttemptEventByMeta(
    filter: { studentId?: string; examId?: string },
    eventName: ExamAttemptStreamEventName,
    payload: Record<string, unknown>
): number {
    let delivered = 0;
    for (const [attemptId, bucket] of clients.entries()) {
        for (const client of Array.from(bucket)) {
            if (client.res.writableEnded) {
                bucket.delete(client);
                continue;
            }

            if (filter.studentId && String(client.meta.studentId) !== String(filter.studentId)) continue;
            if (filter.examId && String(client.meta.examId) !== String(filter.examId)) continue;

            writeEvent(client.res, eventName, {
                ...payload,
                attemptId,
                studentId: client.meta.studentId,
                examId: client.meta.examId,
                timestamp: new Date().toISOString(),
            });
            delivered += 1;
        }
        if (bucket.size === 0) clients.delete(attemptId);
    }
    return delivered;
}
