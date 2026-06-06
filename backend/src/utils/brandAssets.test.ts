import { describe, it, expect } from 'vitest';
import { normalizeStoredBrandAsset, PUBLIC_BRAND_ASSETS } from './brandAssets';

describe('normalizeStoredBrandAsset', () => {
    it('returns the normalized value for a valid, non-retired path', () => {
        expect(normalizeStoredBrandAsset('/uploads/my-valid-logo.png', 'logo')).toBe('/uploads/my-valid-logo.png');
    });

    it('trims whitespace from the value', () => {
        expect(normalizeStoredBrandAsset('  /uploads/spaced-logo.png  ', 'logo')).toBe('/uploads/spaced-logo.png');
    });

    it('returns the public default for empty string', () => {
        expect(normalizeStoredBrandAsset('', 'logo')).toBe(PUBLIC_BRAND_ASSETS.logo);
    });

    it('returns the public default for null', () => {
        expect(normalizeStoredBrandAsset(null, 'logo')).toBe(PUBLIC_BRAND_ASSETS.logo);
    });

    it('returns the public default for undefined', () => {
        expect(normalizeStoredBrandAsset(undefined, 'logo')).toBe(PUBLIC_BRAND_ASSETS.logo);
    });

    it('returns the public default for a retired path', () => {
        expect(normalizeStoredBrandAsset('/logo.svg', 'logo')).toBe(PUBLIC_BRAND_ASSETS.logo);
        expect(normalizeStoredBrandAsset('/uploads/logo-1773555868748-118876447.webp', 'logo')).toBe(PUBLIC_BRAND_ASSETS.logo);
    });

    it('returns the correct default for favicon', () => {
        expect(normalizeStoredBrandAsset('', 'favicon')).toBe(PUBLIC_BRAND_ASSETS.favicon);
    });
});
