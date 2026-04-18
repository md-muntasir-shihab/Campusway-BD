import { describe, it, expect, beforeEach } from 'vitest';
import { decodeJwtPayload, isJwtExpired, getJwtRemainingTime } from '../jwtDecode';
import { generateMockJWT, generateExpiredMockJWT, generateMalformedJWT } from '../../test-utils/authMocks';

function encodeBase64Url(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

describe('jwtDecode', () => {
    describe('decodeJwtPayload', () => {
        it('should decode a valid JWT token and return payload with exp', () => {
            const token = generateMockJWT(900, { userId: 'test-123', role: 'student' });
            const payload = decodeJwtPayload(token);

            expect(payload).not.toBeNull();
            expect(payload).toHaveProperty('exp');
            expect(payload).toHaveProperty('iat');
            expect(payload).toHaveProperty('userId', 'test-123');
            expect(payload).toHaveProperty('role', 'student');
            expect(typeof payload!.exp).toBe('number');
        });

        it('should decode an expired JWT token and return payload', () => {
            const token = generateExpiredMockJWT(60, { userId: 'test-456' });
            const payload = decodeJwtPayload(token);

            expect(payload).not.toBeNull();
            expect(payload).toHaveProperty('exp');
            expect(payload).toHaveProperty('userId', 'test-456');
            expect(typeof payload!.exp).toBe('number');
        });

        it('should return null for malformed token with missing parts', () => {
            const token = generateMalformedJWT('missing-parts');
            const payload = decodeJwtPayload(token);

            expect(payload).toBeNull();
        });

        it('should return null for malformed token with invalid JSON', () => {
            const token = generateMalformedJWT('invalid-json');
            const payload = decodeJwtPayload(token);

            expect(payload).toBeNull();
        });

        it('should return null for malformed token with invalid base64', () => {
            const token = generateMalformedJWT('invalid-base64');
            const payload = decodeJwtPayload(token);

            expect(payload).toBeNull();
        });

        it('should return null for empty string', () => {
            const payload = decodeJwtPayload('');

            expect(payload).toBeNull();
        });

        it('should return null for non-string input', () => {
            const payload = decodeJwtPayload(null as any);

            expect(payload).toBeNull();
        });

        it('should handle tokens with special characters in payload', () => {
            const token = generateMockJWT(900, {
                email: 'test+user@example.com',
                name: 'Test User (Admin)',
            });
            const payload = decodeJwtPayload(token);

            expect(payload).not.toBeNull();
            expect(payload).toHaveProperty('email', 'test+user@example.com');
            expect(payload).toHaveProperty('name', 'Test User (Admin)');
        });
    });

    describe('isJwtExpired', () => {
        it('should return false for a valid non-expired token', () => {
            const token = generateMockJWT(900); // 15 minutes from now
            const expired = isJwtExpired(token);

            expect(expired).toBe(false);
        });

        it('should return true for an expired token', () => {
            const token = generateExpiredMockJWT(60); // Expired 60 seconds ago
            const expired = isJwtExpired(token);

            expect(expired).toBe(true);
        });

        it('should return null for malformed token', () => {
            const token = generateMalformedJWT('missing-parts');
            const expired = isJwtExpired(token);

            expect(expired).toBeNull();
        });

        it('should return null for token without exp field', () => {
            // Create a token without exp by manually constructing it
            const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = encodeBase64Url(JSON.stringify({ userId: 'test' }));
            const token = `${header}.${payload}.signature`;

            const expired = isJwtExpired(token);

            expect(expired).toBeNull();
        });

        it('should return true for token that just expired', () => {
            const token = generateExpiredMockJWT(1); // Expired 1 second ago
            const expired = isJwtExpired(token);

            expect(expired).toBe(true);
        });

        it('should return false for token that expires in 1 second', () => {
            const token = generateMockJWT(1); // Expires in 1 second
            const expired = isJwtExpired(token);

            expect(expired).toBe(false);
        });
    });

    describe('getJwtRemainingTime', () => {
        it('should return remaining time in milliseconds for valid token', () => {
            const expiresInSeconds = 900; // 15 minutes
            const token = generateMockJWT(expiresInSeconds);
            const remaining = getJwtRemainingTime(token);

            expect(remaining).not.toBeNull();
            expect(remaining).toBeGreaterThan(0);
            // Allow some tolerance for execution time (within 5 seconds)
            expect(remaining).toBeLessThanOrEqual(expiresInSeconds * 1000);
            expect(remaining).toBeGreaterThan((expiresInSeconds - 5) * 1000);
        });

        it('should return 0 for expired token', () => {
            const token = generateExpiredMockJWT(60);
            const remaining = getJwtRemainingTime(token);

            expect(remaining).toBe(0);
        });

        it('should return null for malformed token', () => {
            const token = generateMalformedJWT('missing-parts');
            const remaining = getJwtRemainingTime(token);

            expect(remaining).toBeNull();
        });

        it('should return null for token without exp field', () => {
            const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = encodeBase64Url(JSON.stringify({ userId: 'test' }));
            const token = `${header}.${payload}.signature`;

            const remaining = getJwtRemainingTime(token);

            expect(remaining).toBeNull();
        });

        it('should return approximately correct time for token expiring soon', () => {
            const expiresInSeconds = 10; // 10 seconds
            const token = generateMockJWT(expiresInSeconds);
            const remaining = getJwtRemainingTime(token);

            expect(remaining).not.toBeNull();
            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(expiresInSeconds * 1000);
            expect(remaining).toBeGreaterThan((expiresInSeconds - 2) * 1000);
        });

        it('should return 0 for token that just expired', () => {
            const token = generateExpiredMockJWT(1);
            const remaining = getJwtRemainingTime(token);

            expect(remaining).toBe(0);
        });
    });
});
