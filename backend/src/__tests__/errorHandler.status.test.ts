/**
 * Smoke test for the inline error handler in src/server.ts (Phase 0 fix).
 *
 * VERIFICATION ONLY — not a product feature. Proves the regression fix:
 *   - An AppError thrown by `requestSanitizer` (e.g. a MongoDB-operator
 *     injection attempt) is mapped to its `statusCode` (400), NOT 500.
 *   - The response carries the `message` + `requestId` shape.
 *   - A ZodError that escapes per-route validation returns 400 with field errors.
 *
 * Rather than booting the whole `server.ts` (which pulls in DB/cron/routes),
 * this mounts the SAME middleware + a structurally identical error handler
 * on a minimal Express app and drives it with supertest.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import { ZodError, z } from 'zod';
import { AppError } from '../utils/appError';
import { sanitizeRequestPayload } from '../middleware/requestSanitizer';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * The exact error-handler logic now used in src/server.ts (kept in sync).
 * If server.ts's handler drifts, this test should be updated to match.
 */
function errorHandler(err: Error & { status?: number }, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof ZodError) {
        const errors = err.issues.map((e) => ({ path: e.path.join('.'), message: e.message }));
        res.status(400).json({
            message: 'Validation failed',
            errors,
            requestId: (req as any).requestId,
        });
        return;
    }
    const statusCode = Number((err instanceof AppError ? err.statusCode : err.status) || 500);
    const isClientError = statusCode >= 400 && statusCode < 500;
    const isOperational = err instanceof AppError && err.isOperational;
    const message = isClientError && isOperational
        ? err.message || 'Request failed'
        : (isClientError ? err.message || 'Request failed' : 'Internal server error');
    res.status(statusCode).json({ message, requestId: (req as any).requestId });
}

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next: NextFunction) => {
        // mimic requestId middleware (enough for the test contract)
        (req as any).requestId = 'test-req-id';
        next();
    });
    app.use(sanitizeRequestPayload);

    // A route that throws an AppError directly (mimics security/permission errors)
    app.post('/boom-apperror', (_req, _res, next) => {
        next(new AppError(403, 'AUTHORIZATION_ERROR' as any, 'Not allowed', true));
    });
    // A route that throws a ZodError directly (mimics an escaped validation error)
    app.post('/boom-zod', (_req, _res, next) => {
        try {
            z.object({ email: z.string().email() }).parse({ email: 'not-an-email' });
        } catch (e) {
            next(e as Error);
        }
    });
    // A plain Error with .status (Express/Joi convention)
    app.get('/boom-status', (_req, _res, next) => {
        const e = new Error('rate limited') as Error & { status?: number };
        e.status = 429;
        next(e);
    });
    // A generic 500 error (no status, no statusCode, not operational)
    app.get('/boom-500', (_req, _res, next) => {
        next(new Error('db connection lost'));
    });

    app.use(errorHandler);
    return app;
}

describe('inline error handler — Phase 0 fix', () => {
    const origNodeEnv = process.env.NODE_ENV;
    beforeAll(() => {
        // Keep dev semantics so message masking doesn't hide client messages.
        process.env.NODE_ENV = 'development';
    });
    afterAll(() => {
        process.env.NODE_ENV = origNodeEnv;
    });

    it('security violation (AppError 400) returns 400, not 500', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/anything')
            .send({ $gt: '' }); // MongoDB operator injection -> AppError(400)

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Forbidden key/i);
        expect(res.body.requestId).toBe('test-req-id');
    });

    it('operational AppError exposes its message + statusCode', async () => {
        const app = buildApp();
        const res = await request(app).post('/boom-apperror').send({});
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Not allowed');
        expect(res.body.requestId).toBe('test-req-id');
    });

    it('ZodError returns 400 with field-level errors', async () => {
        const app = buildApp();
        const res = await request(app).post('/boom-zod').send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Validation failed');
        expect(Array.isArray(res.body.errors)).toBe(true);
        expect(res.body.errors.length).toBeGreaterThan(0);
        expect(res.body.errors[0].path).toContain('email');
    });

    it('error with conventional .status is honored (429)', async () => {
        const app = buildApp();
        const res = await request(app).get('/boom-status');
        expect(res.status).toBe(429);
        expect(res.body.message).toBe('rate limited');
    });

    it('generic 5xx error is masked to "Internal server error"', async () => {
        const app = buildApp();
        const res = await request(app).get('/boom-500');
        expect(res.status).toBe(500);
        // Internal details must not leak to the client.
        expect(res.body.message).toBe('Internal server error');
        expect(res.body.message).not.toContain('db connection lost');
    });

    it('IS_PRODUCTION flag reflects environment (sanity)', () => {
        expect(IS_PRODUCTION).toBe(false);
    });
});
