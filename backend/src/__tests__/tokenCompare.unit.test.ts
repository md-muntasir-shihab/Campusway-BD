import { describe, it, expect } from 'vitest';
import { safeTokenEqual } from '../utils/tokenCompare';

describe('safeTokenEqual (certificate verify token — fix B-3)', () => {
    it('returns true for matching tokens', () => {
        const token = 'abc123def456ghi789';
        expect(safeTokenEqual(token, token)).toBe(true);
    });

    it('returns false when the provided token is missing (the old PII-leak bug)', () => {
        // This previously passed `if (token && token !== expected)` and leaked
        // the certificate payload. Now it must reject.
        expect(safeTokenEqual(undefined, 'secret-token')).toBe(false);
        expect(safeTokenEqual('', 'secret-token')).toBe(false);
        expect(safeTokenEqual(null, 'secret-token')).toBe(false);
    });

    it('returns false for a wrong token', () => {
        expect(safeTokenEqual('wrong-token', 'secret-token')).toBe(false);
    });

    it('returns false for a prefix of the expected token (no false match)', () => {
        expect(safeTokenEqual('secret', 'secret-token')).toBe(false);
    });

    it('is order-insensitive in the sense that mismatch is symmetric', () => {
        expect(safeTokenEqual('secret-token', 'wrong-token')).toBe(false);
        expect(safeTokenEqual('wrong-token', 'secret-token')).toBe(false);
    });

    it('handles empty expected token', () => {
        expect(safeTokenEqual('anything', '')).toBe(false);
        expect(safeTokenEqual('', '')).toBe(true);
    });

    it('does not throw on unicode / emoji input', () => {
        const t = 'café-🔒-বাংলা';
        expect(safeTokenEqual(t, t)).toBe(true);
        expect(safeTokenEqual(t, 'different')).toBe(false);
    });
});
