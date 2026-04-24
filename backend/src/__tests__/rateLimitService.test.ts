/**
 * Unit tests for RateLimitService.
 *
 * Tests the in-memory fallback path (no Redis) which exercises the core
 * rate-limiting logic: per-identity tracking, window expiry, header values,
 * and route-group presets.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    RateLimitService,
    RateLimitConfig,
    ROUTE_GROUP_CONFIGS,
    defaultKeyGenerator,
    rateLimitMiddleware,
    _resetMemoryStore,
} from '../services/rateLimitService';

// Stub cacheService so Redis is never called — forces in-memory fallback
vi.mock('../services/cacheService', () => ({
    get: vi.fn().mockRejectedValue(new Error('no redis')),
    set: vi.fn().mockRejectedValue(new Error('no redis')),
    del: vi.fn().mockRejectedValue(new Error('no redis')),
    delByPattern: vi.fn().mockRejectedValue(new Error('no redis')),
}));

function makeConfig(overrides: Partial<RateLimitConfig> = {}): RateLimitConfig {
    return {
        windowMs: 60_000,
        maxRequests: 5,
        keyGenerator: () => 'test-key',
        ...overrides,
    };
}

describe('RateLimitService (in-memory fallback)', () => {
    let svc: RateLimitService;

    beforeEach(() => {
        _resetMemoryStore();
        svc = new RateLimitService();
    });

    it('allows the first request and returns correct remaining count', async () => {
        const result = await svc.check('key-a', makeConfig());
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(5);
        expect(result.remaining).toBe(4);
        expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('decrements remaining on each call', async () => {
        const cfg = makeConfig({ maxRequests: 3 });
        const r1 = await svc.check('key-b', cfg);
        const r2 = await svc.check('key-b', cfg);
        const r3 = await svc.check('key-b', cfg);

        expect(r1.remaining).toBe(2);
        expect(r2.remaining).toBe(1);
        expect(r3.remaining).toBe(0);
        expect(r3.allowed).toBe(true);
    });

    it('rejects requests beyond maxRequests', async () => {
        const cfg = makeConfig({ maxRequests: 2 });
        await svc.check('key-c', cfg);
        await svc.check('key-c', cfg);
        const r3 = await svc.check('key-c', cfg);

        expect(r3.allowed).toBe(false);
        expect(r3.remaining).toBe(0);
    });

    it('tracks identities independently (Req 16.1)', async () => {
        const cfg = makeConfig({ maxRequests: 2 });
        await svc.check('user-1', cfg);
        await svc.check('user-1', cfg);
        // user-1 is now at limit

        const r = await svc.check('user-2', cfg);
        expect(r.allowed).toBe(true);
        expect(r.remaining).toBe(1);
    });

    it('resetAt is a future timestamp', async () => {
        const before = Date.now();
        const result = await svc.check('key-d', makeConfig({ windowMs: 30_000 }));
        expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(before + 30_000);
    });
});

describe('ROUTE_GROUP_CONFIGS', () => {
    it('defines auth: 20/15min', () => {
        expect(ROUTE_GROUP_CONFIGS.auth.maxRequests).toBe(20);
        expect(ROUTE_GROUP_CONFIGS.auth.windowMs).toBe(15 * 60 * 1000);
    });

    it('defines admin: 100/15min', () => {
        expect(ROUTE_GROUP_CONFIGS.admin.maxRequests).toBe(100);
        expect(ROUTE_GROUP_CONFIGS.admin.windowMs).toBe(15 * 60 * 1000);
    });

    it('defines public: 500/15min', () => {
        expect(ROUTE_GROUP_CONFIGS.public.maxRequests).toBe(500);
        expect(ROUTE_GROUP_CONFIGS.public.windowMs).toBe(15 * 60 * 1000);
    });

    it('defines upload: 10/1min', () => {
        expect(ROUTE_GROUP_CONFIGS.upload.maxRequests).toBe(10);
        expect(ROUTE_GROUP_CONFIGS.upload.windowMs).toBe(60 * 1000);
    });
});

describe('defaultKeyGenerator', () => {
    it('returns user:<id> for authenticated requests', () => {
        const req = { user: { _id: 'abc123' }, headers: {}, ip: '1.2.3.4' } as any;
        expect(defaultKeyGenerator(req)).toBe('user:abc123');
    });

    it('returns ip:<addr> for unauthenticated requests', () => {
        const req = { headers: {}, ip: '10.0.0.1', socket: { remoteAddress: '10.0.0.1' } } as any;
        expect(defaultKeyGenerator(req)).toBe('ip:10.0.0.1');
    });

    it('uses x-forwarded-for when present', () => {
        const req = { headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }, ip: '10.0.0.1' } as any;
        expect(defaultKeyGenerator(req)).toBe('ip:203.0.113.5');
    });
});

describe('rateLimitMiddleware', () => {
    beforeEach(() => _resetMemoryStore());

    it('sets X-RateLimit-* headers on allowed requests (Req 16.4)', async () => {
        const mw = rateLimitMiddleware('public');
        const req = { headers: {}, ip: '1.1.1.1', socket: { remoteAddress: '1.1.1.1' } } as any;
        const headers: Record<string, string | number> = {};
        const res = {
            setHeader: (k: string, v: string | number) => { headers[k] = v; },
        } as any;
        const next = vi.fn();

        await mw(req, res, next);

        expect(headers['X-RateLimit-Limit']).toBe(500);
        expect(headers['X-RateLimit-Remaining']).toBe(499);
        expect(headers['X-RateLimit-Reset']).toBeDefined();
        expect(next).toHaveBeenCalledWith(); // called with no args = success
    });

    it('returns 429 via AppError when limit exceeded (Req 16.5)', async () => {
        const mw = rateLimitMiddleware('auth');
        const req = { headers: {}, ip: '2.2.2.2', socket: { remoteAddress: '2.2.2.2' } } as any;
        const headers: Record<string, string | number> = {};
        const res = {
            setHeader: (k: string, v: string | number) => { headers[k] = v; },
        } as any;
        const next = vi.fn();

        // Exhaust 20 requests
        for (let i = 0; i < 20; i++) {
            await mw(req, res, next);
        }
        next.mockClear();

        // 21st should be rejected
        await mw(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(429);
        expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(headers['Retry-After']).toBeDefined();
    });
});
