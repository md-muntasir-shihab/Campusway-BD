/**
 * Unit tests for useScrollReveal hook and scrollRevealClasses utility.
 *
 * Requirements: 14.2
 */
import { describe, it, expect } from 'vitest';
import { scrollRevealClasses } from '../useScrollReveal';

describe('scrollRevealClasses', () => {
    it('returns visible classes when isVisible is true', () => {
        const classes = scrollRevealClasses(true);
        expect(classes).toContain('opacity-100');
        expect(classes).toContain('translate-y-0');
    });

    it('returns fade-up hidden classes by default', () => {
        const classes = scrollRevealClasses(false);
        expect(classes).toContain('opacity-0');
        expect(classes).toContain('translate-y-6');
    });

    it('returns fade-left hidden classes', () => {
        const classes = scrollRevealClasses(false, 'fade-left');
        expect(classes).toContain('opacity-0');
        expect(classes).toContain('-translate-x-6');
    });

    it('returns fade-right hidden classes', () => {
        const classes = scrollRevealClasses(false, 'fade-right');
        expect(classes).toContain('opacity-0');
        expect(classes).toContain('translate-x-6');
    });

    it('returns scale hidden classes', () => {
        const classes = scrollRevealClasses(false, 'scale');
        expect(classes).toContain('opacity-0');
        expect(classes).toContain('scale-95');
    });

    it('always includes transition base classes', () => {
        const visible = scrollRevealClasses(true);
        const hidden = scrollRevealClasses(false);
        expect(visible).toContain('transition-all');
        expect(hidden).toContain('transition-all');
        expect(visible).toContain('duration-700');
        expect(hidden).toContain('duration-700');
    });
});
