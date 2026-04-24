import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { ResponseBuilder } from './responseBuilder';
import type { ApiResponse } from './responseBuilder';

describe('ResponseBuilder', () => {
    describe('success', () => {
        it('returns a success envelope with data', () => {
            const result = ResponseBuilder.success({ id: 1, name: 'test' });
            expect(result).toEqual({
                success: true,
                data: { id: 1, name: 'test' },
            });
        });

        it('includes message when provided', () => {
            const result = ResponseBuilder.success('ok', 'Operation succeeded');
            expect(result).toEqual({
                success: true,
                data: 'ok',
                message: 'Operation succeeded',
            });
        });

        it('omits message key when not provided', () => {
            const result = ResponseBuilder.success([1, 2, 3]);
            expect(result).not.toHaveProperty('message');
        });
    });

    describe('created', () => {
        it('returns a success envelope for created resources', () => {
            const result = ResponseBuilder.created({ id: 'abc' });
            expect(result).toEqual({ success: true, data: { id: 'abc' } });
        });

        it('includes message when provided', () => {
            const result = ResponseBuilder.created({ id: 'abc' }, 'Created');
            expect(result.message).toBe('Created');
        });
    });

    describe('paginated', () => {
        it('returns data with meta pagination fields', () => {
            const items = [{ id: 1 }, { id: 2 }];
            const result = ResponseBuilder.paginated(items, 1, 10, 25);
            expect(result).toEqual({
                success: true,
                data: items,
                meta: { page: 1, limit: 10, total: 25 },
            });
        });

        it('handles empty data array', () => {
            const result = ResponseBuilder.paginated([], 1, 10, 0);
            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.meta).toEqual({ page: 1, limit: 10, total: 0 });
        });
    });

    describe('error', () => {
        it('returns an error envelope', () => {
            const result = ResponseBuilder.error('NOT_FOUND', 'Resource not found');
            expect(result).toEqual({
                success: false,
                message: 'Resource not found',
                error: { code: 'NOT_FOUND' },
            });
        });

        it('includes details when provided', () => {
            const details = { field: 'email', reason: 'invalid' };
            const result = ResponseBuilder.error('VALIDATION_ERROR', 'Bad input', details);
            expect(result.error).toEqual({
                code: 'VALIDATION_ERROR',
                details: { field: 'email', reason: 'invalid' },
            });
        });

        it('omits details key when not provided', () => {
            const result = ResponseBuilder.error('SERVER_ERROR', 'Oops');
            expect(result.error).not.toHaveProperty('details');
        });
    });

    describe('send', () => {
        it('sets HTTP status and sends JSON body', () => {
            const json = vi.fn();
            const status = vi.fn().mockReturnValue({ json });
            const res = { status, json } as unknown as Response;

            const body: ApiResponse = ResponseBuilder.success({ ok: true });
            ResponseBuilder.send(res, 200, body);

            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(body);
        });

        it('sends 201 for created responses', () => {
            const json = vi.fn();
            const status = vi.fn().mockReturnValue({ json });
            const res = { status, json } as unknown as Response;

            const body = ResponseBuilder.created({ id: '1' }, 'Created');
            ResponseBuilder.send(res, 201, body);

            expect(status).toHaveBeenCalledWith(201);
        });

        it('sends error responses with appropriate status codes', () => {
            const json = vi.fn();
            const status = vi.fn().mockReturnValue({ json });
            const res = { status, json } as unknown as Response;

            const body = ResponseBuilder.error('NOT_FOUND', 'Not found');
            ResponseBuilder.send(res, 404, body);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith(body);
        });
    });
});
