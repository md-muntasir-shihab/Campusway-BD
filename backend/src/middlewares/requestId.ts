import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

/**
 * Attach a unique X-Request-Id to every request/response.
 * If the client provides one, reuse it (capped at 64 chars).
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const id = (typeof incoming === 'string' && incoming.trim().length > 0 && incoming.length <= 64)
        ? incoming.trim()
        : crypto.randomUUID();

    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
}
