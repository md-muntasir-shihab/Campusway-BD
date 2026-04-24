/**
 * Unit tests for useModuleAccess hook.
 *
 * Requirements: 14.2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock useAuth before importing useModuleAccess
const mockUser = {
    role: 'editor' as const,
    permissionsV2: {
        home_control: { view: true, edit: true },
        students_groups: { view: true },
        finance_center: { view: false },
    } as Record<string, Record<string, boolean>>,
};

vi.mock('../useAuth', () => ({
    useAuth: () => ({ user: mockUser }),
}));

import { useModuleAccess } from '../useModuleAccess';

describe('useModuleAccess', () => {
    beforeEach(() => {
        mockUser.role = 'editor';
        mockUser.permissionsV2 = {
            home_control: { view: true, edit: true },
            students_groups: { view: true },
            finance_center: { view: false },
        };
    });

    it('returns true for a module+action the user has permission for', () => {
        const { result } = renderHook(() => useModuleAccess());
        expect(result.current.hasAccess('home_control', 'view')).toBe(true);
        expect(result.current.hasAccess('home_control', 'edit')).toBe(true);
    });

    it('returns false for a module+action the user lacks', () => {
        const { result } = renderHook(() => useModuleAccess());
        expect(result.current.hasAccess('home_control', 'delete')).toBe(false);
    });

    it('defaults action to "view" when not specified', () => {
        const { result } = renderHook(() => useModuleAccess());
        expect(result.current.hasAccess('students_groups')).toBe(true);
    });

    it('resolves module aliases (banner_manager → home_control)', () => {
        const { result } = renderHook(() => useModuleAccess());
        // banner_manager is an alias for home_control
        expect(result.current.hasAccess('home_control', 'view')).toBe(true);
    });

    it('superadmin always has access', () => {
        mockUser.role = 'superadmin';
        const { result } = renderHook(() => useModuleAccess());
        expect(result.current.hasAccess('anything', 'delete')).toBe(true);
    });

    it('returns false when user has no permissionsV2 for the module', () => {
        const { result } = renderHook(() => useModuleAccess());
        expect(result.current.hasAccess('nonexistent_module', 'view')).toBe(false);
    });

    it('hasAnyAccess returns true when any action is permitted', () => {
        const { result } = renderHook(() => useModuleAccess());
        expect(result.current.hasAnyAccess('home_control')).toBe(true);
    });

    it('hasAnyAccess returns false when all actions are false', () => {
        const { result } = renderHook(() => useModuleAccess());
        expect(result.current.hasAnyAccess('finance_center')).toBe(false);
    });

    it('returns false when user is null', () => {
        (mockUser as any).role = undefined;
        // Simulate null user
        const originalUser = { ...mockUser };
        Object.assign(mockUser, { role: undefined, permissionsV2: undefined });

        const { result } = renderHook(() => useModuleAccess());
        // With no role and no permissionsV2, should return false
        expect(result.current.hasAccess('home_control', 'view')).toBe(false);

        // Restore
        Object.assign(mockUser, originalUser);
    });
});
