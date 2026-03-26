import { DEFAULT_TEAM_ROLES, TEAM_ACTIONS, TEAM_MODULES } from '../../src/teamAccess/defaults';

describe('teamAccess/defaults', () => {
    describe('TEAM_ACTIONS', () => {
        test('contains expected core actions', () => {
            const required = ['view', 'create', 'edit', 'delete', 'archive', 'publish', 'approve', 'reject'];
            for (const action of required) {
                expect(TEAM_ACTIONS).toContain(action);
            }
        });

        test('has 17 actions total', () => {
            expect(TEAM_ACTIONS).toHaveLength(17);
        });

        test('every action is a non-empty string', () => {
            for (const action of TEAM_ACTIONS) {
                expect(typeof action).toBe('string');
                expect(action.length).toBeGreaterThan(0);
            }
        });
    });

    describe('TEAM_MODULES', () => {
        test('contains expected core modules', () => {
            const required = [
                'dashboard', 'universities', 'news', 'exams',
                'question_bank', 'students', 'finance',
                'team_access_control', 'security_center',
            ];
            for (const mod of required) {
                expect(TEAM_MODULES).toContain(mod);
            }
        });

        test('has 19 modules total', () => {
            expect(TEAM_MODULES).toHaveLength(19);
        });

        test('every module is a non-empty string', () => {
            for (const mod of TEAM_MODULES) {
                expect(typeof mod).toBe('string');
                expect(mod.length).toBeGreaterThan(0);
            }
        });
    });

    describe('DEFAULT_TEAM_ROLES', () => {
        test('defines exactly 13 roles', () => {
            expect(DEFAULT_TEAM_ROLES).toHaveLength(13);
        });

        test('every role has required fields', () => {
            for (const role of DEFAULT_TEAM_ROLES) {
                expect(role).toHaveProperty('name');
                expect(role).toHaveProperty('slug');
                expect(role).toHaveProperty('description');
                expect(role).toHaveProperty('isSystemRole', true);
                expect(role).toHaveProperty('isActive', true);
                expect(role).toHaveProperty('basePlatformRole');
                expect(role).toHaveProperty('modulePermissions');
                expect(typeof role.name).toBe('string');
                expect(typeof role.slug).toBe('string');
            }
        });

        test('every slug is unique', () => {
            const slugs = DEFAULT_TEAM_ROLES.map((r) => r.slug);
            expect(new Set(slugs).size).toBe(slugs.length);
        });

        test('Super Admin has all permissions true', () => {
            const superAdmin = DEFAULT_TEAM_ROLES.find((r) => r.slug === 'super-admin');
            expect(superAdmin).toBeDefined();

            for (const moduleName of TEAM_MODULES) {
                const modPerms = superAdmin!.modulePermissions[moduleName];
                expect(modPerms).toBeDefined();
                for (const action of TEAM_ACTIONS) {
                    expect(modPerms[action]).toBe(true);
                }
            }
        });

        test('Viewer / Read Only has only view=true for every module', () => {
            const viewer = DEFAULT_TEAM_ROLES.find((r) => r.slug === 'viewer-read-only');
            expect(viewer).toBeDefined();

            for (const moduleName of TEAM_MODULES) {
                const modPerms = viewer!.modulePermissions[moduleName];
                expect(modPerms).toBeDefined();
                expect(modPerms['view']).toBe(true);
                for (const action of TEAM_ACTIONS) {
                    if (action !== 'view') {
                        expect(modPerms[action]).toBe(false);
                    }
                }
            }
        });

        test('every role.modulePermissions covers all modules and actions', () => {
            for (const role of DEFAULT_TEAM_ROLES) {
                for (const moduleName of TEAM_MODULES) {
                    const modPerms = role.modulePermissions[moduleName];
                    expect(modPerms).toBeDefined();
                    for (const action of TEAM_ACTIONS) {
                        expect(typeof modPerms[action]).toBe('boolean');
                    }
                }
            }
        });

        test('basePlatformRole values are valid platform roles', () => {
            const validPlatformRoles = ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'];
            for (const role of DEFAULT_TEAM_ROLES) {
                expect(validPlatformRoles).toContain(role.basePlatformRole);
            }
        });

        test('expected role names exist', () => {
            const names = DEFAULT_TEAM_ROLES.map((r) => r.name);
            const expected = [
                'Super Admin', 'Admin', 'Moderator', 'Editor',
                'University Manager', 'Exam Manager', 'Student Manager',
                'Finance Manager', 'Support Manager', 'Campaign Manager',
                'Content Reviewer', 'Data Entry Operator', 'Viewer / Read Only',
            ];
            for (const name of expected) {
                expect(names).toContain(name);
            }
        });
    });
});
