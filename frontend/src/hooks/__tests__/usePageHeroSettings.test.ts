/**
 * Unit tests for mergeHeroConfig from usePageHeroSettings.
 *
 * Requirements: 14.2
 */
import { describe, it, expect } from 'vitest';
import { mergeHeroConfig, DEFAULT_HERO_CONFIGS } from '../usePageHeroSettings';

describe('mergeHeroConfig', () => {
    const defaults = DEFAULT_HERO_CONFIGS.home;

    it('returns defaults when serverConfig is null', () => {
        const result = mergeHeroConfig(defaults, null);
        expect(result).toEqual(defaults);
    });

    it('returns defaults when serverConfig is undefined', () => {
        const result = mergeHeroConfig(defaults, undefined);
        expect(result).toEqual(defaults);
    });

    it('overrides title from server config', () => {
        const result = mergeHeroConfig(defaults, { title: 'Custom Title' });
        expect(result.title).toBe('Custom Title');
        expect(result.subtitle).toBe(defaults.subtitle); // unchanged
    });

    it('overrides multiple fields', () => {
        const result = mergeHeroConfig(defaults, {
            title: 'New Title',
            subtitle: 'New Subtitle',
            vantaEffect: 'net',
        });
        expect(result.title).toBe('New Title');
        expect(result.subtitle).toBe('New Subtitle');
        expect(result.vantaEffect).toBe('net');
    });

    it('handles boolean enabled field correctly', () => {
        const result = mergeHeroConfig(defaults, { enabled: false });
        expect(result.enabled).toBe(false);
    });

    it('falls back to defaults for empty string overrides', () => {
        const result = mergeHeroConfig(defaults, { title: '', subtitle: '' });
        expect(result.title).toBe(defaults.title);
        expect(result.subtitle).toBe(defaults.subtitle);
    });

    it('merges CTA objects partially', () => {
        const result = mergeHeroConfig(defaults, {
            primaryCTA: { label: 'Custom CTA', url: '' },
        });
        expect(result.primaryCTA.label).toBe('Custom CTA');
        expect(result.primaryCTA.url).toBe(defaults.primaryCTA.url); // fallback
    });

    it('preserves all default hero configs for known pages', () => {
        const pageKeys = Object.keys(DEFAULT_HERO_CONFIGS);
        expect(pageKeys.length).toBeGreaterThanOrEqual(8);

        for (const key of pageKeys) {
            const config = DEFAULT_HERO_CONFIGS[key as keyof typeof DEFAULT_HERO_CONFIGS];
            expect(config.title).toBeTruthy();
            expect(config.vantaEffect).toBeTruthy();
        }
    });
});
