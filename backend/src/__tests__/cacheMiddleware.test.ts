/**
 * Unit tests for cacheMiddleware.
 *
 * Tests cover:
 * - Only GET requests are cached (Req 2.1)
 * - x-cache: HIT / MISS headers (Req 2.2, 2.3)
 * - x-cache-bypass header skips cache (Req 2.4)
 * - Auth-sensitive routes are skipped (Req 2.5)
 * - Route matching with wildcards (Req 2.6)
 * - invalidateCache middleware (Req 3.1)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { cacheMiddleware, invalidateCache } from '../middlewares/cacheMiddleware';

// ---------------------------------------------------------------------------
// Mock cacheService
// ---------------------------------------------------------------------------
vi.mock('../services/cacheService', () => ({
    cacheService: {
        buildKey: vi.fn((_m: string, path: string, _q: Record<string, string>) => `cw:GET::${path}`),
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined),
        delByPattern: vi.fn().mockResolvedValue(0),
    },
}));

vi.mock('../utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

import { cacheService } from '../services/cacheService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockReq(overrides: Partial<Request> = {}): Request {
    return {
        method: 'GET',
        path: '/home',
        originalUrl: '/api/home',
        query: {},
        headers: {},
        ...overrides,
    } as unknown as Request;
}

function createMockRes(): Response & { _headers: Record<string, string>; _status: number; _body: unknown } {
    const res: any = {
        _headers: {} as Record<string, string>,
        _status: 200,
        _body: undefined,
        statusCode: 200,
        setHeader(name: string, value: string) {
            res._headers[name.toLowerCase()] = value;
            return res;
        },
        getHeader(name: string) {
            return res._headers[name.toLowerCase()];
        },
        status(code: number) {
            res._status = code;
            res.statusCode = code;
            return res;
        },
        json(body: unknown) {
            res._body = body;
            return res;
        },
        on: vi.fn(),
    };
    return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cacheMiddleware', () => {
    const middleware = cacheMiddleware({
        ttl: 120,
        routes: ['/home', '/news/*', '/resources/*'],
        skipRoutes: ['/auth/*'],
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call next() for non-GET requests without caching', async () => {
        const req = createMockReq({ method: 'POST', path: '/home' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res._headers['x-cache']).toBeUndefined();
        expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should call next() for routes not in the routes list', async () => {
        const req = createMockReq({ path: '/unknown-route' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res._headers['x-cache']).toBeUndefined();
        expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should set x-cache: HIT and return cached data on cache hit', async () => {
        const cachedPayload = { statusCode: 200, body: { success: true, data: 'cached' } };
        vi.mocked(cacheService.get).mockResolvedValueOnce(cachedPayload);

        const req = createMockReq({ path: '/home', originalUrl: '/api/home' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._headers['x-cache']).toBe('HIT');
        expect(res._status).toBe(200);
        expect(res._body).toEqual({ success: true, data: 'cached' });
    });

    it('should set x-cache: MISS and call next() on cache miss', async () => {
        vi.mocked(cacheService.get).mockResolvedValueOnce(null);

        const req = createMockReq({ path: '/home', originalUrl: '/api/home' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res._headers['x-cache']).toBe('MISS');
    });

    it('should cache the response body on MISS when json() is called', async () => {
        vi.mocked(cacheService.get).mockResolvedValueOnce(null);

        const req = createMockReq({ path: '/home', originalUrl: '/api/home' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        // Simulate controller calling res.json()
        res.json({ success: true, data: 'fresh' });

        expect(cacheService.set).toHaveBeenCalledWith(
            expect.any(String),
            { statusCode: 200, body: { success: true, data: 'fresh' } },
            120,
        );
    });

    it('should skip cache when x-cache-bypass header is present', async () => {
        const req = createMockReq({
            path: '/home',
            headers: { 'x-cache-bypass': '1' },
        });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(cacheService.get).not.toHaveBeenCalled();
        expect(res._headers['x-cache']).toBeUndefined();
    });

    it('should skip cache for auth-sensitive (skipRoutes) routes', async () => {
        const req = createMockReq({ path: '/auth/login' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should match wildcard routes', async () => {
        vi.mocked(cacheService.get).mockResolvedValueOnce(null);

        const req = createMockReq({ path: '/news/some-article', originalUrl: '/api/news/some-article' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(cacheService.get).toHaveBeenCalled();
        expect(res._headers['x-cache']).toBe('MISS');
    });

    it('should gracefully handle cache lookup errors', async () => {
        vi.mocked(cacheService.get).mockRejectedValueOnce(new Error('Redis down'));

        const req = createMockReq({ path: '/home', originalUrl: '/api/home' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        // Should fall through to origin
        expect(next).toHaveBeenCalled();
        expect(res._headers['x-cache']).toBe('MISS');
    });

    it('should not cache non-2xx responses', async () => {
        vi.mocked(cacheService.get).mockResolvedValueOnce(null);

        const req = createMockReq({ path: '/home', originalUrl: '/api/home' });
        const res = createMockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        // Simulate a 404 response
        res.status(404);
        res.json({ success: false, error: 'Not found' });

        expect(cacheService.set).not.toHaveBeenCalled();
    });
});

describe('invalidateCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should register a finish listener and call delByPattern on success', async () => {
        const mw = invalidateCache('news');
        const req = createMockReq({ method: 'POST' });
        const res = createMockRes();
        const next = vi.fn();

        await mw(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

        // Simulate the finish event
        vi.mocked(cacheService.delByPattern).mockResolvedValueOnce(3);
        const finishCb = vi.mocked(res.on).mock.calls[0][1] as () => void;
        res.statusCode = 200;
        finishCb();

        expect(cacheService.delByPattern).toHaveBeenCalledWith(expect.stringContaining('news'));
    });
});
