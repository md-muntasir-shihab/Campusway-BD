import { describe, it, expect } from 'vitest';
import { Request } from 'express';
import { getClientIp, getDeviceInfo } from './requestMeta';

describe('requestMeta', () => {
    describe('getClientIp', () => {
        it('returns the IP from a string x-forwarded-for header', () => {
            const req = {
                headers: {
                    'x-forwarded-for': '192.168.1.1',
                },
                socket: {},
            } as unknown as Request;
            expect(getClientIp(req)).toBe('192.168.1.1');
        });

        it('returns the first IP from a comma-separated string x-forwarded-for header', () => {
            const req = {
                headers: {
                    'x-forwarded-for': '192.168.1.1, 10.0.0.1',
                },
                socket: {},
            } as unknown as Request;
            expect(getClientIp(req)).toBe('192.168.1.1');
        });

        it('returns the first IP from an array x-forwarded-for header', () => {
            const req = {
                headers: {
                    'x-forwarded-for': ['192.168.1.1', '10.0.0.1'],
                },
                socket: {},
            } as unknown as Request;
            expect(getClientIp(req)).toBe('192.168.1.1');
        });

        it('falls back to req.ip if x-forwarded-for is missing', () => {
            const req = {
                headers: {},
                ip: '10.0.0.2',
                socket: {},
            } as unknown as Request;
            expect(getClientIp(req)).toBe('10.0.0.2');
        });

        it('falls back to req.socket.remoteAddress if x-forwarded-for and req.ip are missing', () => {
            const req = {
                headers: {},
                socket: {
                    remoteAddress: '10.0.0.3',
                },
            } as unknown as Request;
            expect(getClientIp(req)).toBe('10.0.0.3');
        });

        it('returns unknown if all IP sources are missing', () => {
            const req = {
                headers: {},
                socket: {},
            } as unknown as Request;
            expect(getClientIp(req)).toBe('unknown');
        });

        it('handles empty string x-forwarded-for header by falling back', () => {
            const req = {
                headers: {
                    'x-forwarded-for': '',
                },
                ip: '10.0.0.2',
                socket: {},
            } as unknown as Request;
            expect(getClientIp(req)).toBe('10.0.0.2');
        });

        it('handles empty array x-forwarded-for header by falling back', () => {
            const req = {
                headers: {
                    'x-forwarded-for': [],
                },
                ip: '10.0.0.2',
                socket: {},
            } as unknown as Request;
            expect(getClientIp(req)).toBe('10.0.0.2');
        });
    });

    describe('getDeviceInfo', () => {
        it('returns the user-agent header', () => {
            const req = {
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
            } as unknown as Request;
            expect(getDeviceInfo(req)).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        });

        it('truncates a user-agent header longer than 512 characters', () => {
            const longUserAgent = 'a'.repeat(600);
            const req = {
                headers: {
                    'user-agent': longUserAgent,
                },
            } as unknown as Request;
            expect(getDeviceInfo(req)).toBe('a'.repeat(512));
            expect(getDeviceInfo(req).length).toBe(512);
        });

        it('returns unknown if user-agent header is missing', () => {
            const req = {
                headers: {},
            } as unknown as Request;
            expect(getDeviceInfo(req)).toBe('unknown');
        });

        it('returns unknown if user-agent header is an array', () => {
            const req = {
                headers: {
                    'user-agent': ['Mozilla/5.0', 'Chrome/91.0'],
                },
            } as unknown as Request;
            expect(getDeviceInfo(req)).toBe('unknown');
        });
    });
});
