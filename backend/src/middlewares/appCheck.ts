import { NextFunction, Request, Response } from 'express';
import { getFirebaseAppCheckService, isFirebaseAdminEnabled } from '../config/firebaseAdmin';
import { logger } from '../utils/logger';
import { getClientIp } from '../utils/requestMeta';

const APP_CHECK_HEADER = 'x-firebase-appcheck';
const ENFORCED_VALUES = new Set(['1', 'true', 'yes', 'on']);

function isTruthyEnv(value: string | undefined): boolean {
    return ENFORCED_VALUES.has(String(value || '').trim().toLowerCase());
}

function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

function shouldEnforceAppCheck(): boolean {
    if (!isTruthyEnv(process.env.APP_CHECK_ENFORCED)) {
        return false;
    }

    // In production, NEVER bypass App Check — E2E flags are ignored (Req 6.6)
    if (!isProduction()) {
        if (process.env.E2E === 'true' || process.env.PLAYWRIGHT === 'true') {
            return false;
        }

        if (isTruthyEnv(process.env.E2E_DISABLE_RATE_LIMIT) || isTruthyEnv(process.env.DISABLE_SECURITY_RATE_LIMIT)) {
            return false;
        }
    }

    return true;
}

/**
 * Log abuse telemetry for failed App Check verifications.
 * Records IP, user agent, endpoint, and timestamp for security monitoring.
 */
function logAppCheckAbuse(req: Request, reason: string): void {
    const ip = getClientIp(req);
    const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 512);
    const endpoint = `${req.method} ${req.originalUrl || req.url}`;

    logger.warn('[app-check] failed verification', req, {
        reason,
        ip,
        userAgent,
        endpoint,
        timestamp: new Date().toISOString(),
    });
}

function extractAppCheckToken(req: Request): string {
    const rawHeader = req.header(APP_CHECK_HEADER) || req.header(APP_CHECK_HEADER.toUpperCase()) || '';
    const normalized = String(rawHeader || '').trim();
    if (!normalized) return '';
    if (normalized.toLowerCase().startsWith('bearer ')) {
        return normalized.slice(7).trim();
    }
    return normalized;
}

export async function requireAppCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!shouldEnforceAppCheck()) {
        next();
        return;
    }

    if (!isFirebaseAdminEnabled()) {
        res.status(503).json({
            message: 'App Check enforcement is enabled but Firebase Admin is not configured.',
        });
        return;
    }

    const token = extractAppCheckToken(req);
    if (!token) {
        logAppCheckAbuse(req, 'missing_token');
        res.status(401).json({
            message: 'App Check token is required for this request.',
            code: 'APP_CHECK_REQUIRED',
        });
        return;
    }

    try {
        const appCheck = getFirebaseAppCheckService();
        if (!appCheck) {
            res.status(503).json({
                message: 'Firebase App Check service is unavailable.',
            });
            return;
        }

        const verification = await appCheck.verifyToken(token);
        (req as Request & { appCheck?: typeof verification.token }).appCheck = verification.token;
        next();
    } catch (error) {
        logAppCheckAbuse(req, 'invalid_or_expired_token');
        res.status(401).json({
            message: 'Invalid or expired App Check token.',
            code: 'APP_CHECK_INVALID',
            ...(process.env.NODE_ENV !== 'production'
                ? { detail: String((error as Error | undefined)?.message || error || 'verification_failed') }
                : {}),
        });
    }
}
