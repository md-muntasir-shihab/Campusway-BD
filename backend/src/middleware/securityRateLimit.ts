import { NextFunction, Request, Response } from 'express';
import { getClientIp } from '../utils/requestMeta';
import { getSecuritySettingsSnapshot } from '../services/securityCenterService';

type BucketState = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, BucketState>();

/** @internal Exported for property-based testing only */
export { consume as _consumeForTesting, buckets as _bucketsForTesting };
export type { BucketState as _BucketStateForTesting };

function shouldBypassRateLimit(req: Request): boolean {
    if (process.env.DISABLE_SECURITY_RATE_LIMIT === 'true' || process.env.E2E_DISABLE_RATE_LIMIT === 'true') {
        return true;
    }

    if (process.env.NODE_ENV === 'production') return false;
    const ip = getClientIp(req);
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function consume(bucketKey: string, max: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    const existing = buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
        buckets.set(bucketKey, {
            count: 1,
            resetAt: now + windowMs,
        });
        return { allowed: true, retryAfterSec: Math.ceil(windowMs / 1000) };
    }

    if (existing.count >= max) {
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
    }

    existing.count += 1;
    buckets.set(bucketKey, existing);
    return { allowed: true, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
}

function limiterResponse(res: Response, message: string, retryAfterSec: number): void {
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({ message, retryAfterSec });
}

export async function loginRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) {
            next();
            return;
        }
        const security = await getSecuritySettingsSnapshot(false);
        const key = `login:${getClientIp(req)}:${String(req.body?.identifier || req.body?.email || req.body?.username || '')}`;
        const result = consume(key, security.rateLimit.loginMax, security.rateLimit.loginWindowMs);
        if (!result.allowed) {
            limiterResponse(res, 'Too many login attempts. Please wait before retrying.', result.retryAfterSec);
            return;
        }
        next();
    } catch {
        next();
    }
}

export async function adminLoginRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) {
            next();
            return;
        }
        const security = await getSecuritySettingsSnapshot(false);
        const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || '');
        const key = `admin_login:${getClientIp(req)}:${identifier}`;
        const max = Math.max(3, Math.min(Number(security.rateLimit.adminMax || 20), 20));
        const windowMs = Math.max(60_000, Number(security.rateLimit.adminWindowMs || 15 * 60 * 1000));
        const result = consume(key, max, windowMs);
        if (!result.allowed) {
            limiterResponse(res, 'Too many admin login attempts. Please wait before retrying.', result.retryAfterSec);
            return;
        }
        next();
    } catch {
        next();
    }
}

export async function examSubmitRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) {
            next();
            return;
        }
        const security = await getSecuritySettingsSnapshot(false);
        const userScope = (req as { user?: { _id?: string } }).user?._id || getClientIp(req);
        const key = `exam_submit:${String(userScope)}:${String(req.params.id || req.params.examId || '')}`;
        const result = consume(key, security.rateLimit.examSubmitMax, security.rateLimit.examSubmitWindowMs);
        if (!result.allowed) {
            limiterResponse(res, 'Too many exam submission requests. Please wait and retry.', result.retryAfterSec);
            return;
        }
        next();
    } catch {
        next();
    }
}

export async function examStartRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) {
            next();
            return;
        }
        const security = await getSecuritySettingsSnapshot(false);
        const userScope = (req as { user?: { _id?: string } }).user?._id || getClientIp(req);
        const key = `exam_start:${String(userScope)}:${String(req.params.id || req.params.examId || '')}`;
        const result = consume(key, security.rateLimit.loginMax, security.rateLimit.loginWindowMs);
        if (!result.allowed) {
            limiterResponse(res, 'Too many exam start attempts. Please wait and retry.', result.retryAfterSec);
            return;
        }
        next();
    } catch {
        next();
    }
}

export async function adminRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) {
            next();
            return;
        }
        const security = await getSecuritySettingsSnapshot(false);
        const key = `admin:${getClientIp(req)}:${String((req as { user?: { _id?: string } }).user?._id || '')}`;
        const result = consume(key, security.rateLimit.adminMax, security.rateLimit.adminWindowMs);
        if (!result.allowed) {
            limiterResponse(res, 'Too many admin requests. Please wait and retry.', result.retryAfterSec);
            return;
        }
        next();
    } catch {
        next();
    }
}

export async function uploadRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) {
            next();
            return;
        }
        const security = await getSecuritySettingsSnapshot(false);
        const key = `upload:${getClientIp(req)}:${String((req as { user?: { _id?: string } }).user?._id || '')}`;
        const result = consume(key, security.rateLimit.uploadMax, security.rateLimit.uploadWindowMs);
        if (!result.allowed) {
            limiterResponse(res, 'Too many upload requests. Please wait and retry.', result.retryAfterSec);
            return;
        }
        next();
    } catch {
        next();
    }
}

export async function contactRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) {
            next();
            return;
        }
        // Strict limit for contact form to prevent spam
        const key = `contact:${getClientIp(req)}`;
        const result = consume(key, 5, 60 * 60 * 1000); // 5 messages per hour per IP
        if (!result.allowed) {
            limiterResponse(res, 'Too many contact messages. Please try again after an hour.', result.retryAfterSec);
            return;
        }
        next();
    } catch {
        next();
    }
}

export async function subscriptionActionRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) {
            next();
            return;
        }
        const userScope = (req as { user?: { _id?: string } }).user?._id || getClientIp(req);
        const key = `subscription_action:${String(userScope)}:${req.path}`;
        const result = consume(key, 20, 60 * 60 * 1000); // 20 actions per hour
        if (!result.allowed) {
            limiterResponse(res, 'Too many subscription actions. Please try again later.', result.retryAfterSec);
            return;
        }
        next();
    } catch {
        next();
    }
}

export async function financeExportRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) { next(); return; }
        const userScope = (req as { user?: { _id?: string } }).user?._id || getClientIp(req);
        const key = `finance_export:${String(userScope)}`;
        const result = consume(key, 10, 60 * 1000); // 10 per minute
        if (!result.allowed) {
            limiterResponse(res, 'Too many export requests. Please wait before retrying.', result.retryAfterSec);
            return;
        }
        next();
    } catch { next(); }
}

export async function financeImportRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) { next(); return; }
        const userScope = (req as { user?: { _id?: string } }).user?._id || getClientIp(req);
        const key = `finance_import:${String(userScope)}`;
        const result = consume(key, 5, 60 * 1000); // 5 per minute
        if (!result.allowed) {
            limiterResponse(res, 'Too many import requests. Please wait before retrying.', result.retryAfterSec);
            return;
        }
        next();
    } catch { next(); }
}

export async function otpVerificationLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) { next(); return; }
        const key = `otp_verify:${getClientIp(req)}`;
        const result = consume(key, 10, 5 * 60 * 1000); // 10 req per 5 min per IP
        if (!result.allowed) {
            limiterResponse(res, 'Too many OTP verification attempts. Please wait before retrying.', result.retryAfterSec);
            return;
        }
        next();
    } catch { next(); }
}

export async function antiCheatSignalLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (shouldBypassRateLimit(req)) { next(); return; }
        const sessionId = String(req.params.sessionId || req.params.attemptId || '');
        const key = `anti_cheat_signal:${sessionId || getClientIp(req)}`;
        const result = consume(key, 60, 60 * 1000); // 60 req per min per session
        if (!result.allowed) {
            limiterResponse(res, 'Too many anti-cheat signals. Please wait before retrying.', result.retryAfterSec);
            return;
        }
        next();
    } catch { next(); }
}
