import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { generateCsrfToken, csrfProtection, csrfTokenEndpoint } from '../middlewares/csrfGuard';

/**
 * Unit tests for CSRF Guard middleware.
 * Validates: Requirements 3.2, 3.5, 3.7
 */

function mockReq(overrides: Partial<Request> & { cookies?: Record<string, string>; headers?: Record<string, string> } = {}): Request {
    return {
        cookies: {},
        headers: {},
        ...overrides,
    } as unknown as Request;
}

function mockRes(): Response & { _status: number; _json: any; _cookies: Array<{ name: string; value: string; options: any }> } {
    const res: any = {
        _status: 200,
        _json: null,
        _cookies: [] as Array<{ name: string; value: string; options: any }>,
        status(code: number) {
            res._status = code;
            return res;
        },
        json(body: any) {
            res._json = body;
            return res;
        },
        cookie(name: string, value: string, options: any) {
            res._cookies.push({ name, value, options });
            return res;
        },
    };
    return res as any;
}

describe('CSRF Guard — generateCsrfToken()', () => {
    it('returns a 64-char hex string (32 bytes)', () => {
        const token = generateCsrfToken();
        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces distinct tokens on consecutive calls', () => {
        const a = generateCsrfToken();
        const b = generateCsrfToken();
        expect(a).not.toBe(b);
    });
});

describe('CSRF Guard — csrfProtection() middleware (Req 3.2, 3.7)', () => {
    it('returns 403 CSRF_TOKEN_INVALID when cookie is missing', () => {
        const req = mockReq({ cookies: {}, headers: { 'x-csrf-token': 'some-token' } });
        const res = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        csrfProtection(req, res, next);

        expect(res._status).toBe(403);
        expect(res._json.code).toBe('CSRF_TOKEN_INVALID');
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 CSRF_TOKEN_INVALID when header is missing', () => {
        const req = mockReq({ cookies: { _csrf: 'some-token' }, headers: {} });
        const res = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        csrfProtection(req, res, next);

        expect(res._status).toBe(403);
        expect(res._json.code).toBe('CSRF_TOKEN_INVALID');
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 CSRF_TOKEN_INVALID when both cookie and header are missing', () => {
        const req = mockReq({ cookies: {}, headers: {} });
        const res = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        csrfProtection(req, res, next);

        expect(res._status).toBe(403);
        expect(res._json.code).toBe('CSRF_TOKEN_INVALID');
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 CSRF_TOKEN_INVALID when tokens do not match', () => {
        const token1 = generateCsrfToken();
        const token2 = generateCsrfToken();
        const req = mockReq({ cookies: { _csrf: token1 }, headers: { 'x-csrf-token': token2 } });
        const res = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        csrfProtection(req, res, next);

        expect(res._status).toBe(403);
        expect(res._json.code).toBe('CSRF_TOKEN_INVALID');
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when tokens have different lengths', () => {
        const req = mockReq({ cookies: { _csrf: 'short' }, headers: { 'x-csrf-token': 'a-much-longer-token-value' } });
        const res = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        csrfProtection(req, res, next);

        expect(res._status).toBe(403);
        expect(res._json.code).toBe('CSRF_TOKEN_INVALID');
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when cookie and header tokens match', () => {
        const token = generateCsrfToken();
        const req = mockReq({ cookies: { _csrf: token }, headers: { 'x-csrf-token': token } });
        const res = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        csrfProtection(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});

describe('CSRF Guard — csrfTokenEndpoint() (Req 3.5)', () => {
    it('sets _csrf cookie and returns token in body', () => {
        const req = mockReq();
        const res = mockRes();

        csrfTokenEndpoint(req, res);

        // Cookie should be set
        expect(res._cookies.length).toBe(1);
        const cookie = res._cookies[0];
        expect(cookie.name).toBe('_csrf');
        expect(cookie.value).toHaveLength(64);
        expect(cookie.value).toMatch(/^[0-9a-f]{64}$/);

        // Body should contain the same token
        expect(res._json.csrfToken).toBe(cookie.value);
    });

    it('sets cookie with httpOnly: false so JS can read it', () => {
        const req = mockReq();
        const res = mockRes();

        csrfTokenEndpoint(req, res);

        const cookie = res._cookies[0];
        expect(cookie.options.httpOnly).toBe(false);
    });

    it('sets cookie with sameSite: lax', () => {
        const req = mockReq();
        const res = mockRes();

        csrfTokenEndpoint(req, res);

        const cookie = res._cookies[0];
        expect(cookie.options.sameSite).toBe('lax');
    });

    it('sets cookie path to /', () => {
        const req = mockReq();
        const res = mockRes();

        csrfTokenEndpoint(req, res);

        const cookie = res._cookies[0];
        expect(cookie.options.path).toBe('/');
    });
});
