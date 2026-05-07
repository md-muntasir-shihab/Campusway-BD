import { describe, it, expect } from 'vitest';
import { hashKey } from './content';

describe('content utils', () => {
  describe('hashKey', () => {
    it('returns the correct sha256 hash for a standard string', () => {
      const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      expect(hashKey('hello world')).toBe(expected);
    });

    it('returns the correct sha256 hash for an empty string', () => {
      const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      expect(hashKey('')).toBe(expected);
    });

    it('returns consistent hash for identical inputs', () => {
      const input = 'consistent-input-string-123';
      const hash1 = hashKey(input);
      const hash2 = hashKey(input);
      expect(hash1).toBe(hash2);
    });

    it('returns the correct sha256 hash for non-ascii characters', () => {
      const expected = 'a09aa22c76a22cef5ed819e47c736330d419e565cdf3d4eddd084f0ffe30dd0d';
      expect(hashKey('👋 earth')).toBe(expected);
    });
  });
});
