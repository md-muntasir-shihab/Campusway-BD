import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
// Import all models to ensure Mongoose schema registration before populate calls
import '../../src/models/TeamRole';
import '../../src/models/MemberPermissionOverride';
import '../../src/models/ActiveSession';
import User from '../../src/models/User';
import TeamRole from '../../src/models/TeamRole';
import RolePermissionSet from '../../src/models/RolePermissionSet';
import TeamAuditLog from '../../src/models/TeamAuditLog';
import TeamInvite from '../../src/models/TeamInvite';
import {
    ensureDefaultTeamRoles,
    teamGetMembers,
    teamCreateMember,
    teamGetMemberById,
    teamSuspendMember,
    teamActivateMember,
    teamResetPassword,
    teamGetRoles,
    teamCreateRole,
    teamGetRoleById,
    teamUpdateRole,
    teamDuplicateRole,
    teamDeleteRole,
    teamGetPermissions,
    teamUpdateRolePermissions,
    teamUpdateMemberOverride,
    teamGetApprovalRules,
    teamCreateApprovalRule,
    teamUpdateApprovalRule,
    teamDeleteApprovalRule,
} from '../../src/controllers/teamAccessController';
import { TEAM_ACTIONS, TEAM_MODULES } from '../../src/teamAccess/defaults';

/* ---------- Helpers ---------- */

function fakeAuth(req: Request, _res: Response, next: NextFunction) {
    (req as any).user = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'superadmin' };
    next();
}

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(fakeAuth);

    app.get('/admin/team/members', wrap(teamGetMembers));
    app.post('/admin/team/members', wrap(teamCreateMember));
    app.get('/admin/team/members/:id', wrap(teamGetMemberById));
    app.post('/admin/team/members/:id/suspend', wrap(teamSuspendMember));
    app.post('/admin/team/members/:id/activate', wrap(teamActivateMember));
    app.post('/admin/team/members/:id/reset-password', wrap(teamResetPassword));

    app.get('/admin/team/roles', wrap(teamGetRoles));
    app.post('/admin/team/roles', wrap(teamCreateRole));
    app.get('/admin/team/roles/:id', wrap(teamGetRoleById));
    app.put('/admin/team/roles/:id', wrap(teamUpdateRole));
    app.post('/admin/team/roles/:id/duplicate', wrap(teamDuplicateRole));
    app.delete('/admin/team/roles/:id', wrap(teamDeleteRole));

    app.get('/admin/team/permissions', wrap(teamGetPermissions));
    app.put('/admin/team/permissions/roles/:id', wrap(teamUpdateRolePermissions));
    app.put('/admin/team/permissions/members/:id/override', wrap(teamUpdateMemberOverride));
    app.get('/admin/team/approval-rules', wrap(teamGetApprovalRules));
    app.post('/admin/team/approval-rules', wrap(teamCreateApprovalRule));
    app.put('/admin/team/approval-rules/:id', wrap(teamUpdateApprovalRule));
    app.delete('/admin/team/approval-rules/:id', wrap(teamDeleteApprovalRule));

    return app;
}

function wrap(handler: (req: Request, res: Response) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        handler(req, res).catch(next);
    };
}

async function seedAdmin(overrides: Record<string, unknown> = {}) {
    const hash = await bcrypt.hash('testpassword', 4);
    return User.create({
        full_name: overrides.full_name ?? 'Test Admin',
        email: overrides.email ?? `admin-${Date.now()}@test.com`,
        username: overrides.username ?? `admin-${Date.now()}`,
        password: hash,
        role: overrides.role ?? 'admin',
        status: overrides.status ?? 'active',
        ...overrides,
    });
}

/* ---------- Tests ---------- */

describe('Team Access API', () => {
    let app: ReturnType<typeof buildApp>;

    beforeAll(() => {
        mongoose.set('strictPopulate', false);
    });

    beforeEach(async () => {
        app = buildApp();
    });

    /* -------- Default Roles Seeding -------- */

    describe('ensureDefaultTeamRoles()', () => {
        test('creates 13 default roles in the database', async () => {
            await ensureDefaultTeamRoles();
            const roles = await TeamRole.find({}).lean();
            expect(roles.length).toBe(13);
        });

        test('creates permission sets for every role', async () => {
            await ensureDefaultTeamRoles();
            const roles = await TeamRole.find({}).lean();
            const sets = await RolePermissionSet.find({}).lean();
            expect(sets.length).toBe(roles.length);
        });

        test('is idempotent — calling twice produces no duplicates', async () => {
            await ensureDefaultTeamRoles();
            await ensureDefaultTeamRoles();
            const roles = await TeamRole.find({}).lean();
            expect(roles.length).toBe(13);
        });
    });

    /* -------- Roles API -------- */

    describe('GET /admin/team/roles', () => {
        test('returns all 13 default roles', async () => {
            const res = await request(app).get('/admin/team/roles').expect(200);
            expect(res.body.items).toHaveLength(13);
        });

        test('each role has required fields', async () => {
            const res = await request(app).get('/admin/team/roles').expect(200);
            for (const role of res.body.items) {
                expect(role).toHaveProperty('_id');
                expect(role).toHaveProperty('name');
                expect(role).toHaveProperty('slug');
                expect(role).toHaveProperty('totalUsers');
                expect(role).toHaveProperty('modulePermissions');
            }
        });
    });

    describe('POST /admin/team/roles', () => {
        test('creates a custom role and returns 201', async () => {
            await ensureDefaultTeamRoles();
            const res = await request(app)
                .post('/admin/team/roles')
                .send({ name: 'QA Tester', basePlatformRole: 'viewer' })
                .expect(201);

            expect(res.body.item).toHaveProperty('name', 'QA Tester');
            expect(res.body.item.isSystemRole).toBe(false);
        });

        test('returns 400 when name is missing', async () => {
            await ensureDefaultTeamRoles();
            const res = await request(app)
                .post('/admin/team/roles')
                .send({})
                .expect(400);

            expect(res.body.message).toMatch(/name/i);
        });

        test('returns 409 for duplicate slug', async () => {
            await ensureDefaultTeamRoles();
            await request(app)
                .post('/admin/team/roles')
                .send({ name: 'Unique Role' })
                .expect(201);

            const res = await request(app)
                .post('/admin/team/roles')
                .send({ name: 'Unique Role' })
                .expect(409);

            expect(res.body.message).toMatch(/slug/i);
        });
    });

    describe('GET /admin/team/roles/:id', () => {
        test('returns role details with permissions', async () => {
            await ensureDefaultTeamRoles();
            const roles = await TeamRole.find({}).lean();
            const role = roles[0];

            const res = await request(app).get(`/admin/team/roles/${role._id}`).expect(200);
            expect(res.body.item).toHaveProperty('name', role.name);
            expect(res.body).toHaveProperty('permissions');
            expect(res.body).toHaveProperty('users');
        });

        test('returns 404 for non-existent role', async () => {
            await request(app).get('/admin/team/roles/aaaaaaaaaaaaaaaaaaaaaaaa').expect(404);
        });
    });

    describe('PUT /admin/team/roles/:id', () => {
        test('updates role name and description', async () => {
            await ensureDefaultTeamRoles();
            const created = await request(app)
                .post('/admin/team/roles')
                .send({ name: 'Temp Role' })
                .expect(201);

            const roleId = created.body.item._id;
            const res = await request(app)
                .put(`/admin/team/roles/${roleId}`)
                .send({ name: 'Updated Role', description: 'New desc' })
                .expect(200);

            expect(res.body.item.name).toBe('Updated Role');
        });
    });

    describe('POST /admin/team/roles/:id/duplicate', () => {
        test('duplicates a role with "Copy" suffix', async () => {
            await ensureDefaultTeamRoles();
            const roles = await TeamRole.find({ slug: 'editor' }).lean();
            const roleId = roles[0]._id;

            const res = await request(app)
                .post(`/admin/team/roles/${roleId}/duplicate`)
                .expect(201);

            expect(res.body.item.name).toContain('Copy');
            expect(res.body.item.isSystemRole).toBe(false);

            // Verify permission set was cloned
            const permSet = await RolePermissionSet.findOne({ roleId: res.body.item._id }).lean();
            expect(permSet).toBeDefined();
        });
    });

    describe('DELETE /admin/team/roles/:id', () => {
        test('deletes a custom role with no members', async () => {
            await ensureDefaultTeamRoles();
            const created = await request(app)
                .post('/admin/team/roles')
                .send({ name: 'Disposable' })
                .expect(201);

            const res = await request(app)
                .delete(`/admin/team/roles/${created.body.item._id}`)
                .expect(200);

            expect(res.body.message).toMatch(/deleted/i);
        });

        test('rejects deletion of a system role', async () => {
            await ensureDefaultTeamRoles();
            const role = await TeamRole.findOne({ isSystemRole: true }).lean();

            const res = await request(app)
                .delete(`/admin/team/roles/${role!._id}`)
                .expect(400);

            expect(res.body.message).toMatch(/system/i);
        });
    });

    /* -------- Members API -------- */

    describe('GET /admin/team/members', () => {
        test('returns empty list when no team members exist', async () => {
            const res = await request(app).get('/admin/team/members').expect(200);
            expect(res.body.items).toHaveLength(0);
        });

        test('returns seeded admin members', async () => {
            await ensureDefaultTeamRoles();
            const role = await TeamRole.findOne({ slug: 'admin' }).lean();
            await seedAdmin({ role: 'admin', teamRoleId: role!._id });
            await seedAdmin({ role: 'editor', email: 'editor@test.com', username: 'editor1', teamRoleId: role!._id });

            const res = await request(app).get('/admin/team/members').expect(200);
            expect(res.body.items.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('POST /admin/team/members', () => {
        test('creates a new team member with role assignment', async () => {
            await ensureDefaultTeamRoles();
            const role = await TeamRole.findOne({ slug: 'editor' }).lean();

            const res = await request(app)
                .post('/admin/team/members')
                .send({
                    fullName: 'Jane Doe',
                    email: 'jane@test.com',
                    username: 'janedoe',
                    roleId: role!._id,
                    mode: 'without_send',
                })
                .expect(201);

            expect(res.body.item).toHaveProperty('fullName', 'Jane Doe');
            expect(res.body.item).toHaveProperty('inviteSent');

            // Verify invite was created
            const invite = await TeamInvite.findOne({ email: 'jane@test.com' }).lean();
            expect(invite).toBeDefined();
            expect(invite!.status).toBe('pending');
        });

        test('returns 400 when required fields are missing', async () => {
            await request(app)
                .post('/admin/team/members')
                .send({ fullName: 'Missing Fields' })
                .expect(400);
        });

        test('returns 409 for duplicate email', async () => {
            await ensureDefaultTeamRoles();
            const role = await TeamRole.findOne({ slug: 'viewer-read-only' }).lean();

            await request(app)
                .post('/admin/team/members')
                .send({ fullName: 'User One', email: 'dup@test.com', username: 'user1', roleId: role!._id })
                .expect(201);

            await request(app)
                .post('/admin/team/members')
                .send({ fullName: 'User Two', email: 'dup@test.com', username: 'user2', roleId: role!._id })
                .expect(409);
        });
    });

    describe('GET /admin/team/members/:id', () => {
        test('returns member details with logs', async () => {
            await ensureDefaultTeamRoles();
            const role = await TeamRole.findOne({ slug: 'admin' }).lean();
            const createRes = await request(app)
                .post('/admin/team/members')
                .send({ fullName: 'Detail User', email: 'detail@test.com', username: 'detailuser', roleId: role!._id })
                .expect(201);

            const memberId = createRes.body.item._id;
            const res = await request(app).get(`/admin/team/members/${memberId}`).expect(200);

            expect(res.body.item).toHaveProperty('full_name', 'Detail User');
            expect(res.body).toHaveProperty('logs');
        });

        test('returns 404 for non-existent member', async () => {
            await request(app).get('/admin/team/members/aaaaaaaaaaaaaaaaaaaaaaaa').expect(404);
        });
    });

    describe('POST /admin/team/members/:id/suspend', () => {
        test('suspends an active member', async () => {
            const member = await seedAdmin();
            const res = await request(app)
                .post(`/admin/team/members/${member._id}/suspend`)
                .expect(200);

            expect(res.body.message).toMatch(/suspended/i);

            const updated = await User.findById(member._id).lean();
            expect(updated!.status).toBe('suspended');
        });
    });

    describe('POST /admin/team/members/:id/activate', () => {
        test('activates a suspended member', async () => {
            const member = await seedAdmin({ status: 'suspended' });
            const res = await request(app)
                .post(`/admin/team/members/${member._id}/activate`)
                .expect(200);

            expect(res.body.message).toMatch(/active/i);
        });
    });

    describe('POST /admin/team/members/:id/reset-password', () => {
        test('resets password and forces a password change', async () => {
            const member = await seedAdmin();
            const res = await request(app)
                .post(`/admin/team/members/${member._id}/reset-password`)
                .expect(200);

            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('inviteSent');

            const updated = await User.findById(member._id).lean() as any;
            expect(updated!.forcePasswordResetRequired).toBe(true);
            expect(updated!.mustChangePassword).toBe(true);
        });
    });

    /* -------- Permissions API -------- */

    describe('GET /admin/team/permissions', () => {
        test('returns modules, actions and role permissions', async () => {
            const res = await request(app).get('/admin/team/permissions').expect(200);
            expect(res.body).toHaveProperty('modules');
            expect(res.body).toHaveProperty('actions');
            expect(res.body).toHaveProperty('roles');
            expect(res.body.modules).toEqual(expect.arrayContaining([...TEAM_MODULES]));
            expect(res.body.actions).toEqual(expect.arrayContaining([...TEAM_ACTIONS]));
        });
    });

    describe('PUT /admin/team/permissions/roles/:id', () => {
        test('updates role permissions', async () => {
            await ensureDefaultTeamRoles();
            const created = await request(app)
                .post('/admin/team/roles')
                .send({ name: 'Perm Test Role' })
                .expect(201);

            const roleId = created.body.item._id;
            const modulePermissions: Record<string, Record<string, boolean>> = {};
            for (const mod of TEAM_MODULES) {
                modulePermissions[mod] = {};
                for (const action of TEAM_ACTIONS) {
                    modulePermissions[mod][action] = mod === 'dashboard';
                }
            }

            await request(app)
                .put(`/admin/team/permissions/roles/${roleId}`)
                .send({ modulePermissions })
                .expect(200);

            const permSet = await RolePermissionSet.findOne({ roleId }).lean();
            expect(permSet!.modulePermissions['dashboard']['view']).toBe(true);
            expect(permSet!.modulePermissions['dashboard']['create']).toBe(true);
        });
    });

    describe('PUT /admin/team/permissions/members/:id/override', () => {
        test('rejects malformed override payloads', async () => {
            const member = await seedAdmin();
            const res = await request(app)
                .put(`/admin/team/permissions/members/${member._id}/override`)
                .send({ overrides: [{ module: 'team_access_control', action: 'view', enabled: true }] })
                .expect(400);

            expect(res.body.message).toMatch(/allow or deny/i);
        });
    });

    describe('Approval rules', () => {
        test('creates approval rule with metadata and approver role aliases', async () => {
            await ensureDefaultTeamRoles();
            const res = await request(app)
                .post('/admin/team/approval-rules')
                .send({
                    module: 'payments',
                    action: 'approve',
                    requiresApproval: true,
                    requiredApprovals: 1,
                    description: 'Finance approval for refunds',
                    approverRoles: ['admin'],
                })
                .expect(201);

            expect(res.body.item.description).toBe('Finance approval for refunds');
            expect(res.body.item.requiredApprovals).toBe(1);
            expect(Array.isArray(res.body.item.approverRoleIds)).toBe(true);
            expect(res.body.item.approverRoleIds.length).toBeGreaterThan(0);
        });

        test('updates approval rule metadata fields', async () => {
            await ensureDefaultTeamRoles();
            const created = await request(app)
                .post('/admin/team/approval-rules')
                .send({
                    module: 'news',
                    action: 'publish',
                    description: 'Initial rule',
                })
                .expect(201);

            const res = await request(app)
                .put(`/admin/team/approval-rules/${created.body.item._id}`)
                .send({
                    requiredApprovals: 2,
                    description: 'Updated rule',
                    requiresApproval: false,
                })
                .expect(200);

            expect(res.body.item.requiredApprovals).toBe(2);
            expect(res.body.item.description).toBe('Updated rule');
            expect(res.body.item.requiresApproval).toBe(false);
        });
    });

    /* -------- Audit Trail -------- */

    describe('Audit logging', () => {
        test('member creation writes an audit log entry', async () => {
            await ensureDefaultTeamRoles();
            const role = await TeamRole.findOne({ slug: 'editor' }).lean();

            await request(app)
                .post('/admin/team/members')
                .send({ fullName: 'Audit User', email: 'audit@test.com', username: 'audituser', roleId: role!._id })
                .expect(201);

            const logs = await TeamAuditLog.find({ action: 'member_created' }).lean();
            expect(logs.length).toBeGreaterThanOrEqual(1);
            expect(logs[0]).toHaveProperty('targetType', 'team_member');
        });

        test('role creation writes an audit log entry', async () => {
            await ensureDefaultTeamRoles();
            await request(app)
                .post('/admin/team/roles')
                .send({ name: 'Audit Role' })
                .expect(201);

            const logs = await TeamAuditLog.find({ action: 'role_created' }).lean();
            expect(logs.length).toBeGreaterThanOrEqual(1);
        });
    });
});
