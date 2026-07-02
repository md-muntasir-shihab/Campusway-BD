import { describe, it, expect } from 'vitest';
import { escapeRegex } from '../src/utils/escapeRegex';

describe('escapeRegex', () => {
    it('escapes standard regex characters to avoid ReDoS', () => {
        const maliciousInput = '(((a+)*)+)+';
        const escaped = escapeRegex(maliciousInput);

        // Assert that special chars are escaped
        expect(escaped).toBe('\\(\\(\\(a\\+\\)\\*\\)\\+\\)\\+');

        // And now test it within a RegExp execution
        const regex = new RegExp(escaped, 'i');

        // This should run safely and NOT match 'aaaaaaaaaaaaaaaaaaaaaaaa'
        // in a way that causes a hang.
        expect(regex.test('aaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
        expect(regex.test(maliciousInput)).toBe(true);
    });
});
