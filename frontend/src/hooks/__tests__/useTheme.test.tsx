/**
 * Unit tests for useTheme hook and ThemeProvider.
 *
 * Requirements: 14.2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../useTheme';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
);

describe('useTheme', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
    });

    it('defaults to system theme when no stored preference', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.theme).toBe('system');
    });

    it('setTheme("dark") applies dark class and persists to localStorage', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        act(() => result.current.setTheme('dark'));

        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
        expect(result.current.darkMode).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('campusway_theme')).toBe('dark');
    });

    it('setTheme("light") removes dark class', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        act(() => result.current.setTheme('light'));

        expect(result.current.resolvedTheme).toBe('light');
        expect(result.current.darkMode).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('toggleDarkMode cycles through light → dark → system', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        // Start at system, toggle to light
        act(() => result.current.setTheme('light'));
        expect(result.current.theme).toBe('light');

        // light → dark
        act(() => result.current.toggleDarkMode());
        expect(result.current.theme).toBe('dark');

        // dark → system
        act(() => result.current.toggleDarkMode());
        expect(result.current.theme).toBe('system');
    });

    it('reads stored theme from localStorage on mount', () => {
        localStorage.setItem('campusway_theme', 'dark');

        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
    });

    it('ignores invalid stored theme values', () => {
        localStorage.setItem('campusway_theme', 'invalid-value');

        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.theme).toBe('system');
    });
});
