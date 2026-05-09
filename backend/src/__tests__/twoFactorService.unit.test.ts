import { describe, it, expect } from 'vitest';
import { generateOtpCode } from '../services/twoFactorService';

describe('twoFactorService', () => {
    describe('generateOtpCode', () => {
        it('should generate a 6 digit code', () => {
            const code = generateOtpCode();
            expect(code).toBeDefined();
            expect(code.length).toBe(6);
            expect(/^[0-9]{6}$/.test(code)).toBe(true);
        });

        it('should generate different codes on subsequent calls', () => {
            const code1 = generateOtpCode();
            const code2 = generateOtpCode();
            expect(code1).not.toBe(code2);
        });
    });
});
