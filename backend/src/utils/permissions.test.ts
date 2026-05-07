import { describe, it, expect } from 'vitest';
import { resolvePermissions, ROLE_PERMISSION_PRESETS } from './permissions';
import { UserRole } from '../models/User';

describe('permissions utility', () => {
    describe('resolvePermissions', () => {
        it('returns exact presets when no overrides are requested', () => {
            const studentBase = resolvePermissions('student' as UserRole);
            expect(studentBase).toEqual(ROLE_PERMISSION_PRESETS.student);

            const superadminBase = resolvePermissions('superadmin' as UserRole);
            expect(superadminBase).toEqual(ROLE_PERMISSION_PRESETS.superadmin);
        });

        it('applies requested overrides while keeping base values for unspecified keys', () => {
            const studentWithOverride = resolvePermissions('student' as UserRole, {
                canEditExams: true,
                canViewReports: true,
            });
            expect(studentWithOverride).toEqual({
                ...ROLE_PERMISSION_PRESETS.student,
                canEditExams: true,
                canViewReports: true,
            });

            const superadminWithOverride = resolvePermissions('superadmin' as UserRole, {
                canDeleteData: false,
                canManageFinance: false,
            });
            expect(superadminWithOverride).toEqual({
                ...ROLE_PERMISSION_PRESETS.superadmin,
                canDeleteData: false,
                canManageFinance: false,
            });
        });

        it('falls back to student permissions if an unknown role is provided', () => {
            const unknownRoleResult = resolvePermissions('unknown_role' as unknown as UserRole);
            expect(unknownRoleResult).toEqual(ROLE_PERMISSION_PRESETS.student);
        });

        it('falls back to student permissions if an unknown role is provided with overrides', () => {
            const unknownRoleResultWithOverride = resolvePermissions('unknown_role' as unknown as UserRole, {
                canManagePlans: true
            });
            expect(unknownRoleResultWithOverride).toEqual({
                ...ROLE_PERMISSION_PRESETS.student,
                canManagePlans: true
            });
        });
    });
});
