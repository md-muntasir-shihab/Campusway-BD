import { resolvePermissionsV2 } from '../../src/utils/permissions';
import {
    ROLE_PERMISSION_MATRIX,
    PERMISSION_MODULES,
    PERMISSION_ACTIONS,
    PermissionModule
} from '../../src/security/permissionsMatrix';
import { UserRole } from '../../src/models/User';

describe('resolvePermissionsV2', () => {
    it('should return correct permission mapping for a known role (superadmin)', () => {
        const payload = resolvePermissionsV2('superadmin' as UserRole);
        const moduleMap = ROLE_PERMISSION_MATRIX['superadmin'];

        PERMISSION_MODULES.forEach(moduleName => {
            expect(payload).toHaveProperty(moduleName);
            PERMISSION_ACTIONS.forEach(action => {
                const expected = moduleMap[moduleName].includes(action);
                expect(payload[moduleName]).toHaveProperty(action, expected);
            });
        });
    });

    it('should return correct permission mapping for a restricted role (student)', () => {
        const payload = resolvePermissionsV2('student' as UserRole);
        const moduleMap = ROLE_PERMISSION_MATRIX['student'];

        PERMISSION_MODULES.forEach(moduleName => {
            expect(payload).toHaveProperty(moduleName);
            PERMISSION_ACTIONS.forEach(action => {
                const expected = moduleMap[moduleName].includes(action);
                expect(payload[moduleName]).toHaveProperty(action, expected);
            });
        });
    });

    it('should fallback to student role if an unknown role is provided', () => {
        // Cast unknown string to UserRole to test the fallback mechanism
        const payload = resolvePermissionsV2('unknown_role' as UserRole);
        const studentModuleMap = ROLE_PERMISSION_MATRIX['student'];

        PERMISSION_MODULES.forEach(moduleName => {
            expect(payload).toHaveProperty(moduleName);
            PERMISSION_ACTIONS.forEach(action => {
                const expected = studentModuleMap[moduleName].includes(action);
                expect(payload[moduleName]).toHaveProperty(action, expected);
            });
        });
    });

    it('should ensure the returned structure contains all modules and actions', () => {
        const payload = resolvePermissionsV2('moderator' as UserRole);

        const moduleKeys = Object.keys(payload);
        expect(moduleKeys.length).toBe(PERMISSION_MODULES.length);
        expect(moduleKeys.sort()).toEqual([...PERMISSION_MODULES].sort());

        moduleKeys.forEach(moduleName => {
            const actionMap = payload[moduleName as PermissionModule];
            const actionKeys = Object.keys(actionMap!);
            expect(actionKeys.length).toBe(PERMISSION_ACTIONS.length);
            expect(actionKeys.sort()).toEqual([...PERMISSION_ACTIONS].sort());
        });
    });
});
