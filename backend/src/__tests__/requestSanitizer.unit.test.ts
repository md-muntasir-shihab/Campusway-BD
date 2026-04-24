import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
    detectViolation,
    sanitizeStringValue,
    sanitizeObject,
    sanitizeRequestPayload,
    validateRequest,
} from '../middlewares/requestSanitizer';
import { AppError, ErrorCode } from '../utils/appError';
import { z } from 'zod';

// ── detectViolation ─────────────────────────────────────────────────────────

describe('detectViolation', () => {
    it('returns null for clean objects', () => {
        expect(detectViolation({ name: 'test', age: 25 })).toBeNull();
    });

    it('detects $gt at top level', () => {
        const v = detectViolation({ $gt: 100 });
        expect(v).toEqual({ type: 'MONGO_OPERATOR', key: '$gt', path: '$gt' });
    });

    it('detects $ne nested inside an object', () => {
        const v = detectViolation({ user: { password: { $ne: '' } } });
        expect(v).toEqual({ type: 'MONGO_OPERATOR', key: '$ne', path: 'user.password.$ne' });
    });

    it('detects $regex in arrays', () => {
        const v = detectViolation({ items: [{ $regex: '.*' }] });
        expect(v).toEqual({ type: 'MONGO_OPERATOR', key: '$regex', path: 'items[0].$regex' });
    });

    it('detects $where operator', () => {
        const v = detectViolation({ $where: 'function() { return true; }' });
        expect(v).toEqual({ type: 'MONGO_OPERATOR', key: '$where', path: '$where' });
    });

    it('detects $exists operator', () => {
        const v = detectViolation({ field: { $exists: true } });
        expect(v).toEqual({ type: 'MONGO_OPERATOR', key: '$exists', path: 'field.$exists' });
    });

    it('detects $lt operator', () => {
        const v = detectViolation({ price: { $lt: 50 } });
        expect(v).toEqual({ type: 'MONGO_OPERATOR', key: '$lt', path: 'price.$lt' });
    });

    it('detects __proto__ key', () => {
        const obj = Object.create(null);
        obj['__proto__'] = { polluted: true };
        const v = detectViolation(obj);
        expect(v).toEqual({ type: 'PROTOTYPE_POLLUTION', key: '__proto__', path: '__proto__' });
    });

    it('detects constructor key', () => {
        const obj = Object.create(null);
        obj['constructor'] = { prototype: {} };
        const v = detectViolation(obj);
        expect(v).toEqual({ type: 'PROTOTYPE_POLLUTION', key: 'constructor', path: 'constructor' });
    });

    it('detects prototype key', () => {
        const obj = Object.create(null);
        obj['prototype'] = {};
        const v = detectViolation(obj);
        expect(v).toEqual({ type: 'PROTOTYPE_POLLUTION', key: 'prototype', path: 'prototype' });
    });

    it('returns null for primitives', () => {
        expect(detectViolation('hello')).toBeNull();
        expect(detectViolation(42)).toBeNull();
        expect(detectViolation(null)).toBeNull();
        expect(detectViolation(undefined)).toBeNull();
    });
});

// ── sanitizeRequestPayload (rejection) ──────────────────────────────────────

describe('sanitizeRequestPayload', () => {
    function mockReq(overrides: Partial<Request> = {}): Request {
        return {
            body: {},
            query: {},
            params: {},
            method: 'POST',
            originalUrl: '/test',
            ...overrides,
        } as unknown as Request;
    }

    const mockRes = {} as Response;
    const mockNext = vi.fn() as NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls next() for clean requests', () => {
        const req = mockReq({ body: { name: 'Alice' } });
        sanitizeRequestPayload(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });

    it('throws AppError with SECURITY_VIOLATION for $gt in body', () => {
        const req = mockReq({ body: { age: { $gt: 0 } } });
        expect(() => sanitizeRequestPayload(req, mockRes, mockNext)).toThrow(AppError);
        try {
            sanitizeRequestPayload(req, mockRes, mockNext);
        } catch (e) {
            const err = e as AppError;
            expect(err.statusCode).toBe(400);
            expect(err.code).toBe(ErrorCode.SECURITY_VIOLATION);
        }
    });

    it('throws AppError for __proto__ in query', () => {
        const query = Object.create(null);
        query['__proto__'] = 'polluted';
        const req = mockReq({ query });
        expect(() => sanitizeRequestPayload(req, mockRes, mockNext)).toThrow(AppError);
    });

    it('throws AppError for $where in params', () => {
        const params = Object.create(null);
        params['$where'] = 'true';
        const req = mockReq({ params: params as any });
        expect(() => sanitizeRequestPayload(req, mockRes, mockNext)).toThrow(AppError);
    });

    it('sanitizes HTML in body strings after passing security check', () => {
        const req = mockReq({ body: { content: '<script>alert("xss")</script>Hello' } });
        sanitizeRequestPayload(req, mockRes, mockNext);
        expect(req.body.content).not.toContain('<script>');
        expect(req.body.content).toContain('Hello');
    });

    it('preserves allowed HTML tags', () => {
        const req = mockReq({ body: { content: '<b>bold</b> and <em>italic</em>' } });
        sanitizeRequestPayload(req, mockRes, mockNext);
        expect(req.body.content).toContain('<b>bold</b>');
        expect(req.body.content).toContain('<em>italic</em>');
    });
});

// ── validateRequest ─────────────────────────────────────────────────────────

describe('validateRequest', () => {
    const schema = z.object({ name: z.string().min(1), age: z.number() });

    function mockReq(overrides: Partial<Request> = {}): Request {
        return {
            body: {},
            query: {},
            params: {},
            ...overrides,
        } as unknown as Request;
    }

    function mockRes(): Response {
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;
        return res;
    }

    it('passes valid body and replaces with parsed data', () => {
        const req = mockReq({ body: { name: 'Alice', age: 30 } });
        const res = mockRes();
        const next = vi.fn();

        validateRequest({ body: schema })(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body).toEqual({ name: 'Alice', age: 30 });
    });

    it('returns 400 for invalid body', () => {
        const req = mockReq({ body: { name: '', age: 'not-a-number' } });
        const res = mockRes();
        const next = vi.fn();

        validateRequest({ body: schema })(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
            }),
        );
    });

    it('validates query params', () => {
        const querySchema = z.object({ page: z.coerce.number().min(1) });
        const req = mockReq({ query: { page: '5' } as any });
        const res = mockRes();
        const next = vi.fn();

        validateRequest({ query: querySchema })(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.query).toEqual({ page: 5 });
    });

    it('validates route params', () => {
        const paramsSchema = z.object({ id: z.string().min(1) });
        const req = mockReq({ params: { id: 'abc123' } as any });
        const res = mockRes();
        const next = vi.fn();

        validateRequest({ params: paramsSchema })(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
