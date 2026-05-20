import { normalizePhoneNumber, phoneLookupKeys } from '../src/utils/examCenterPhone';

describe('examCenterPhone utilities', () => {
    it('normalizes phone numbers to digits only', () => {
        expect(normalizePhoneNumber('+880 17-1234-5678')).toBe('8801712345678');
    });

    it('returns raw and normalized lookup keys', () => {
        expect(phoneLookupKeys('+880 17-1234-5678')).toEqual(
            expect.arrayContaining([
                '+880 17-1234-5678',
                '8801712345678',
                '01712345678',
                '1712345678',
            ]),
        );
    });

    it('deduplicates repeated key variants', () => {
        expect(phoneLookupKeys('01712345678').length).toBeGreaterThanOrEqual(2);
        expect(new Set(phoneLookupKeys('01712345678')).size).toBe(phoneLookupKeys('01712345678').length);
    });
});
