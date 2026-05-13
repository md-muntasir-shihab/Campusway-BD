import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
    namespace Express {
        interface Response {
            locals: {
                cspNonce?: string;
                [key: string]: any;
            };
        }
    }
}

/**
 * Generate a cryptographically random CSP nonce (base64-encoded, 16 bytes).
 * Each request gets a unique nonce to allow specific inline scripts/styles.
 */
export function generateCspNonce(): string {
    return crypto.randomBytes(16).toString('base64');
}

/**
 * Express middleware that generates a per-request CSP nonce
 * and stores it on res.locals.cspNonce for downstream use.
 */
export function cspNonceMiddleware(req: Request, res: Response, next: NextFunction): void {
    res.locals.cspNonce = generateCspNonce();
    next();
}
