import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Generate a cryptographically random CSRF token (hex-encoded, 32 bytes).
 */
export function generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Double-submit cookie CSRF protection middleware.
 * Compares the `_csrf` cookie value with the `X-CSRF-Token` header.
 * Returns 403 with `CSRF_TOKEN_INVALID` if they don't match or are missing.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
    const cookieToken = req.cookies?._csrf;
    const headerToken = req.headers['x-csrf-token'] as string | undefined;

    if (!cookieToken || !headerToken) {
        res.status(403).json({
            message: 'CSRF token missing',
            code: 'CSRF_TOKEN_INVALID',
        });
        return;
    }

    // Constant-time comparison to prevent timing attacks
    if (cookieToken.length !== headerToken.length) {
        res.status(403).json({
            message: 'CSRF token invalid',
            code: 'CSRF_TOKEN_INVALID',
        });
        return;
    }

    const valid = crypto.timingSafeEqual(
        Buffer.from(cookieToken, 'utf8'),
        Buffer.from(headerToken, 'utf8'),
    );

    if (!valid) {
        res.status(403).json({
            message: 'CSRF token invalid',
            code: 'CSRF_TOKEN_INVALID',
        });
        return;
    }

    next();
}

/**
 * GET /api/auth/csrf-token endpoint handler.
 * Generates a new CSRF token, sets it as a cookie (HttpOnly: false so JS can read it),
 * and returns it in the response body.
 */
export function csrfTokenEndpoint(_req: Request, res: Response): void {
    const token = generateCsrfToken();

    res.cookie('_csrf', token, {
        httpOnly: false,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
        path: '/',
    });

    res.json({ csrfToken: token });
}
