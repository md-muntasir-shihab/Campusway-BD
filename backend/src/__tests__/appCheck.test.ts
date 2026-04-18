import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

/**
 * Unit tests for App Check middleware.
 * Validates: Requirements 6.1, 6.2, 6.6
 *
 * We test the requireAppCheck middleware by controlling environment variables
 * and mocking the Firebase Admin SDK dependencies.
 */

// Mock firebase admin config before importing appCheck
vi.mock('../config/firebaseAdmin', () => ({
    isFirebaseAdminEnabled: vi.fn(() => true),
    getFirebaseAppCheckService: vi.fn(() => ({
        verifyToken: vi.fn().mockResolvedValue({ token: { sub: 'test-app' } }),
    })),
}));

// Mock logger to avoid side effects
vi.mock('../utils/logger', () => ({
    logger: {
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock getClientIp
vi.mock('../utils/requestMeta', () => ({
    getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { requireAppCheck } from '../middlewares/appCheck';
import { isFirebaseAdminEnabled, getFirebaseAppCheckService } from '../config/firebaseAdmin';

function mockReq(overrides: Record<string, any> = {}): Request {
    return {
        headers: {},
        method: 'GET',
        originalUrl: '/api/test',
        url: '/api/test',
        header(name: string) {
            const lower = name.toLowerCase();
            return (this as any).headers[lower] || (this as any).headers[name];
        },
        ...overrides,
    } as unknown as Request;
}

function mockRes(): Response & { _status: number; _json: any } {
    const res: any = {
        _status: 200,
        _json: null,
        status(code: number) {
            res._status = code;
            return res;
        },
        json(body: any) {
            res._json = body;
            return res;
        },
    };
    return res as any;
}

const originalEnv = { ...process.env };

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    // Restore env
    process.env = { ...originalEnv };
});

describe('App Check — enforcement disabled (Req 6.1)', () => {
    it('calls next() when APP_CHECK_ENFORCED is not set', async () => {
        delete process.env.APP_CHECK_ENFORCED;
        const next = vi.fn() as unknown as NextFunction;

        await requireAppCheck(mockReq(), mockRes(), next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it('calls next() when APP_CHECK_ENFORCED is "false"', async () => {
        process.env.APP_CHECK_ENFORCED = 'false';
        const next = vi.fn() as unknown as NextFunction;

        await requireAppCheck(mockReq(), mockRes(), next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});

describe('App Check — E2E bypass in non-production (Req 6.2)', () => {
    it('bypasses when E2E=true in non-production', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        process.env.NODE_ENV = 'test';
        process.env.E2E = 'true';
        const next = vi.fn() as unknown as NextFunction;

        await requireAppCheck(mockReq(), mockRes(), next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it('bypasses when PLAYWRIGHT=true in non-production', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        process.env.NODE_ENV = 'test';
        process.env.PLAYWRIGHT = 'true';
        const next = vi.fn() as unknown as NextFunction;

        await requireAppCheck(mockReq(), mockRes(), next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});

describe('App Check — production hardening, E2E bypass ignored (Req 6.6)', () => {
    it('does NOT bypass when E2E=true in production', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        process.env.NODE_ENV = 'production';
        process.env.E2E = 'true';
        const next = vi.fn() as unknown as NextFunction;
        const res = mockRes();

        // No token → should return 401
        await requireAppCheck(mockReq(), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(401);
        expect(res._json.code).toBe('APP_CHECK_REQUIRED');
    });

    it('does NOT bypass when PLAYWRIGHT=true in production', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        process.env.NODE_ENV = 'production';
        process.env.PLAYWRIGHT = 'true';
        const next = vi.fn() as unknown as NextFunction;
        const res = mockRes();

        await requireAppCheck(mockReq(), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(401);
    });
});

describe('App Check — missing token (Req 6.4)', () => {
    it('returns 401 APP_CHECK_REQUIRED when token is missing', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        process.env.NODE_ENV = 'production';
        delete process.env.E2E;
        delete process.env.PLAYWRIGHT;
        const next = vi.fn() as unknown as NextFunction;
        const res = mockRes();

        await requireAppCheck(mockReq({ headers: {} }), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(401);
        expect(res._json.code).toBe('APP_CHECK_REQUIRED');
    });
});

describe('App Check — invalid token (Req 6.3)', () => {
    it('returns 401 APP_CHECK_INVALID when verification fails', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        process.env.NODE_ENV = 'production';
        delete process.env.E2E;
        delete process.env.PLAYWRIGHT;

        // Make verifyToken throw
        vi.mocked(getFirebaseAppCheckService).mockReturnValue({
            verifyToken: vi.fn().mockRejectedValue(new Error('invalid token')),
        } as any);

        const next = vi.fn() as unknown as NextFunction;
        const res = mockRes();
        const req = mockReq({ headers: { 'x-firebase-appcheck': 'bad-token' } });

        await requireAppCheck(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(401);
        expect(res._json.code).toBe('APP_CHECK_INVALID');
    });
});

describe('App Check — valid token', () => {
    it('calls next() when token verification succeeds', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        process.env.NODE_ENV = 'production';
        delete process.env.E2E;
        delete process.env.PLAYWRIGHT;

        vi.mocked(getFirebaseAppCheckService).mockReturnValue({
            verifyToken: vi.fn().mockResolvedValue({ token: { sub: 'test-app' } }),
        } as any);

        const next = vi.fn() as unknown as NextFunction;
        const res = mockRes();
        const req = mockReq({ headers: { 'x-firebase-appcheck': 'valid-token-here' } });

        await requireAppCheck(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});

describe('App Check — Firebase Admin not configured', () => {
    it('returns 503 when Firebase Admin is not enabled', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        process.env.NODE_ENV = 'production';
        delete process.env.E2E;
        delete process.env.PLAYWRIGHT;

        vi.mocked(isFirebaseAdminEnabled).mockReturnValue(false);

        const next = vi.fn() as unknown as NextFunction;
        const res = mockRes();

        await requireAppCheck(mockReq(), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(503);
    });
});
