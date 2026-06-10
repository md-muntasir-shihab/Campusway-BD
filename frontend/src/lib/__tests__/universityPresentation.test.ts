import { describe, it, expect } from 'vitest';
import {
    pickText,
    parseUniversityDate,
    formatUniversityDate,
    toUniversityIsoDate,
    daysUntilUniversityDate,
    toUniversitySlug,
    buildUniversityLogoFallback,
    getUniversityFallbackTextSizeClass,
    getUniversityNameSizeClass,
    getUniversityShortFormClass,
    normalizeUniversitySeat,
    shortenUniversityAddress,
    pickUniversityExamDates,
    pickNearestUniversityExamDate
} from '../universityPresentation';

describe('universityPresentation - Date Parsing & Formatting', () => {
    describe('parseUniversityDate', () => {
        it('returns null for falsy values', () => {
            expect(parseUniversityDate(null)).toBeNull();
            expect(parseUniversityDate(undefined)).toBeNull();
            expect(parseUniversityDate('')).toBeNull();
            expect(parseUniversityDate(0)).toBeNull();
        });

        it('handles valid Date objects', () => {
            const validDate = new Date('2023-01-01T00:00:00Z');
            expect(parseUniversityDate(validDate)).toEqual(validDate);
        });

        it('returns null for invalid Date objects', () => {
            const invalidDate = new Date('invalid');
            expect(parseUniversityDate(invalidDate)).toBeNull();
        });

        it('returns null for out-of-range dates (before 1900 or after 2100)', () => {
            expect(parseUniversityDate(new Date('1899-12-31T00:00:00Z'))).toBeNull();
            expect(parseUniversityDate(new Date('2101-01-01T00:00:00Z'))).toBeNull();
        });

        it('parses Excel serial dates', () => {
            // 44927 is 2023-01-01
            const parsed = parseUniversityDate(44927);
            expect(parsed?.getUTCFullYear()).toBe(2023);
            expect(parsed?.getUTCMonth()).toBe(0); // Jan
            expect(parsed?.getUTCDate()).toBe(1);
        });

        it('returns null for non-finite values', () => {
            expect(parseUniversityDate(NaN)).toBeNull();
            expect(parseUniversityDate(Infinity)).toBeNull();
        });

        it('handles different epoch magnitutes', () => {
            expect(parseUniversityDate(16725312000000)?.toISOString()).toBe('2023-01-01T00:00:00.000Z');
            expect(parseUniversityDate(167253120000000)?.toISOString()).toBe('2023-01-01T00:00:00.000Z');
        });

        it('parses epoch timestamps (seconds and milliseconds)', () => {
            const epochSecs = 1672531200; // 2023-01-01T00:00:00Z
            expect(parseUniversityDate(epochSecs)?.toISOString()).toBe('2023-01-01T00:00:00.000Z');

            const epochMs = 1672531200000;
            expect(parseUniversityDate(epochMs)?.toISOString()).toBe('2023-01-01T00:00:00.000Z');
        });

        it('parses string numbers as Excel or Epoch', () => {
            expect(parseUniversityDate('44927')?.getUTCFullYear()).toBe(2023);
            expect(parseUniversityDate('1672531200')?.toISOString()).toBe('2023-01-01T00:00:00.000Z');
            expect(parseUniversityDate('1672531200000')?.toISOString()).toBe('2023-01-01T00:00:00.000Z');
        });

        it('parses standard ISO date strings', () => {
            expect(parseUniversityDate('2023-12-25')?.toISOString().startsWith('2023-12-25')).toBe(true);
        });

        it('returns null for invalid strings', () => {
            expect(parseUniversityDate('not a date')).toBeNull();
            expect(parseUniversityDate('   ')).toBeNull();
        });
    });

    describe('formatUniversityDate', () => {
        it('formats a valid date string', () => {
            const dateStr = '2023-05-15T00:00:00Z';
            const formatted = formatUniversityDate(dateStr, 'en-GB');
            expect(formatted).toBe('15 May 2023');
        });

        it('returns N/A for invalid or missing dates', () => {
            expect(formatUniversityDate(null)).toBe('N/A');
            expect(formatUniversityDate('invalid')).toBe('N/A');
        });

        it('accepts custom format options', () => {
             const dateStr = '2023-05-15T00:00:00Z';
             const formatted = formatUniversityDate(dateStr, 'en-US', { year: 'numeric', month: 'long' });
             expect(formatted).toBe('May 2023');
        });
    });

    describe('toUniversityIsoDate', () => {
        it('returns ISO string for a valid date', () => {
            expect(toUniversityIsoDate(1672531200000)).toBe('2023-01-01T00:00:00.000Z');
        });

        it('returns empty string for invalid dates', () => {
            expect(toUniversityIsoDate(null)).toBe('');
            expect(toUniversityIsoDate('invalid')).toBe('');
        });
    });

    describe('daysUntilUniversityDate', () => {
        it('calculates days correctly in the future', () => {
            const target = new Date('2023-01-10T00:00:00Z');
            const base = new Date('2023-01-01T00:00:00Z');
            expect(daysUntilUniversityDate(target, base)).toBe(9);
        });

        it('calculates days correctly in the past', () => {
            const target = new Date('2023-01-01T00:00:00Z');
            const base = new Date('2023-01-10T00:00:00Z');
            expect(daysUntilUniversityDate(target, base)).toBe(-9);
        });

        it('uses current date as default base', () => {
             const target = new Date(Date.now() + 86400000 * 2);
             expect(daysUntilUniversityDate(target)).toBeGreaterThanOrEqual(1);
        });

        it('returns null for invalid target dates', () => {
            expect(daysUntilUniversityDate(null, new Date())).toBeNull();
            expect(daysUntilUniversityDate('invalid', new Date())).toBeNull();
        });
    });

    describe('pickUniversityExamDates', () => {
        it('extracts and sorts exam dates from item', () => {
            const item = {
                scienceExamDate: '2023-05-10T00:00:00Z',
                examDateArts: 1672531200000, // 2023-01-01
                businessExamDate: 'invalid',
                unrelatedField: '2024-01-01T00:00:00Z'
            };
            const dates = pickUniversityExamDates(item);
            expect(dates).toHaveLength(2);
            expect(dates).toContain('2023-05-10T00:00:00.000Z');
            expect(dates).toContain('2023-01-01T00:00:00.000Z');
        });
    });

    describe('formatUniversityDate coverage details', () => {
        it('uses default options when omitted', () => {
             const dateStr = '2023-05-15T00:00:00Z';
             const formatted = formatUniversityDate(dateStr);
             expect(formatted).toBeTruthy(); // exact string varies by locale
        });
    });

    describe('pickNearestUniversityExamDate', () => {
        it('returns the earliest valid exam date', () => {
            const item = {
                scienceExamDate: '2024-05-10T00:00:00Z',
                examDateArts: '2023-01-01T00:00:00Z',
                businessExamDate: '2025-01-01T00:00:00Z',
            };
            expect(pickNearestUniversityExamDate(item)).toBe('2023-01-01T00:00:00.000Z');
        });

        it('returns empty string if no valid dates', () => {
            expect(pickNearestUniversityExamDate({ invalid: '2023-01-01', scienceExamDate: 'invalid' })).toBe('');
        });
    });
});

describe('universityPresentation - Presentation Logic', () => {
    describe('pickText', () => {
        it('returns trimmed string for standard values', () => {
            expect(pickText('  hello  ')).toBe('hello');
            expect(pickText(123)).toBe('123');
            expect(pickText(false)).toBe('false');
        });

        it('returns fallback for null/undefined or empty after trim', () => {
            expect(pickText(null)).toBe('');
            expect(pickText(undefined, 'N/A')).toBe('N/A');
            expect(pickText('   ', 'fallback')).toBe('fallback');
        });
    });

    describe('toUniversitySlug', () => {
        it('converts to lowercase, replaces non-alphanumeric with dashes, and trims dashes', () => {
            expect(toUniversitySlug('Hello World 123!')).toBe('hello-world-123');
            expect(toUniversitySlug('---Test---')).toBe('test');
            expect(toUniversitySlug(null as any)).toBe('');
        });
    });

    describe('buildUniversityLogoFallback', () => {
        it('uses normalized shortform if valid', () => {
            expect(buildUniversityLogoFallback('University of Technology', 'UoT!')).toBe('UOT');
            expect(buildUniversityLogoFallback('University of Technology', 'N/A')).not.toBe('NA');
        });

        it('falls back to initials ignoring stop words', () => {
            expect(buildUniversityLogoFallback('University of the Philippines')).toBe('UP');
            expect(buildUniversityLogoFallback('Massachusetts Institute of Technology')).toBe('MIT');
            expect(buildUniversityLogoFallback('School for Advanced Studies')).toBe('SAS');
        });

        it('returns UNI if no initials generated', () => {
            expect(buildUniversityLogoFallback('   ')).toBe('UNI');
            expect(buildUniversityLogoFallback('of the and for ')).toBe('UNI');
        });
    });

    describe('toUniversitySlug details', () => {
        it('handles undefined value', () => {
             expect(toUniversitySlug(undefined as any)).toBe('');
        });
    });

    describe('getUniversityFallbackTextSizeClass', () => {
        it('returns correct class based on length', () => {
            expect(getUniversityFallbackTextSizeClass('123456789012')).toBe('text-[0.42rem] sm:text-[0.48rem]'); // 12
            expect(getUniversityFallbackTextSizeClass('1234567890')).toBe('text-[0.5rem] sm:text-[0.58rem]'); // 10
            expect(getUniversityFallbackTextSizeClass('12345678')).toBe('text-[0.58rem] sm:text-[0.66rem]'); // 8
            expect(getUniversityFallbackTextSizeClass('123456')).toBe('text-[0.7rem] sm:text-[0.82rem]'); // 6
            expect(getUniversityFallbackTextSizeClass('1234')).toBe('text-[0.9rem] sm:text-[1rem]'); // 4
            expect(getUniversityFallbackTextSizeClass('12')).toBe('text-xl sm:text-2xl'); // 2
        });
    });

    describe('getUniversityNameSizeClass', () => {
        it('returns correct class based on overall length and longest word', () => {
            const longString110 = 'A'.repeat(110);
            expect(getUniversityNameSizeClass(longString110)).toBe('text-[0.62rem] sm:text-[0.68rem] leading-[1.14]');

            const longWord20 = 'A'.repeat(20) + ' short';
            expect(getUniversityNameSizeClass(longWord20)).toBe('text-[0.62rem] sm:text-[0.68rem] leading-[1.14]');

            expect(getUniversityNameSizeClass('A'.repeat(10) + ' A'.repeat(41))).toBe('text-[0.68rem] sm:text-[0.74rem] leading-[1.14]');
            expect(getUniversityNameSizeClass('A'.repeat(10) + ' A'.repeat(33))).toBe('text-[0.74rem] sm:text-[0.8rem] leading-[1.15]');
            expect(getUniversityNameSizeClass('A'.repeat(10) + ' A'.repeat(25))).toBe('text-[0.8rem] sm:text-[0.86rem] leading-[1.16]');
            expect(getUniversityNameSizeClass('A'.repeat(10) + ' A'.repeat(18))).toBe('text-[0.88rem] sm:text-[0.94rem] leading-[1.18]');
            expect(getUniversityNameSizeClass('A'.repeat(10) + ' A'.repeat(12))).toBe('text-[0.96rem] sm:text-[1rem] leading-[1.18]');
            expect(getUniversityNameSizeClass('A'.repeat(10))).toBe('text-[1.04rem] sm:text-[1.08rem] leading-[1.18]');
        });
    });

    describe('getUniversityShortFormClass', () => {
        it('returns correct class based on length', () => {
            expect(getUniversityShortFormClass('123456789')).toBe('text-[10px] sm:text-[11px]'); // 9
            expect(getUniversityShortFormClass('123456')).toBe('text-[11px] sm:text-xs'); // 6
            expect(getUniversityShortFormClass('123')).toBe('text-xs'); // 3
        });
    });

    describe('normalizeUniversitySeat', () => {
        it('strips non-digits and returns locale string', () => {
            expect(normalizeUniversitySeat('1,234 seats')).toBe('1,234');
            expect(normalizeUniversitySeat('abc 5000 def')).toBe('5,000');
        });

        it('returns N/A for invalid inputs', () => {
            expect(normalizeUniversitySeat(null)).toBe('N/A');
            expect(normalizeUniversitySeat('N/A')).toBe('N/A');
            expect(normalizeUniversitySeat('no numbers here')).toBe('N/A');
            expect(normalizeUniversitySeat('-500')).toBe('500');
            expect(normalizeUniversitySeat('0')).toBe('N/A');
        });
    });

    describe('shortenUniversityAddress', () => {
        it('returns first two segments if comma separated', () => {
            expect(shortenUniversityAddress('123 Main St, Springfield, IL, 62701')).toBe('123 Main St, Springfield');
        });

        it('truncates with ellipsis if no commas and exceeds max length', () => {
            const longAddress = 'This is a very long address that definitely exceeds the default maximum length of 44 characters';
            expect(shortenUniversityAddress(longAddress)).toBe('This is a very long address that definite...');
        });

        it('returns full string if no commas and within max length', () => {
            expect(shortenUniversityAddress('Short Address')).toBe('Short Address');
        });

        it('returns N/A for empty values', () => {
            expect(shortenUniversityAddress('')).toBe('N/A');
            expect(shortenUniversityAddress(null as any)).toBe('N/A');
        });
    });
});
