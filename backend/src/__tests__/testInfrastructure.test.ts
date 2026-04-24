/**
 * Test infrastructure validation — verifies mongodb-memory-server setup
 * and factory functions work correctly.
 *
 * Requirements: 14.3, 14.4
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, clearTestDb, getTestDbUri } from './helpers/mongoTestSetup';
import {
    buildUser,
    buildAdminUser,
    buildExam,
    buildStudent,
    buildSubscription,
    createUser,
    createExam,
    createStudent,
    createSubscription,
    resetFactoryCounters,
} from './helpers/factories';

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

describe('Test Infrastructure', () => {
    beforeAll(() => setupTestDb());
    afterEach(async () => {
        resetFactoryCounters();
        await clearTestDb();
    });
    afterAll(() => teardownTestDb());

    describe('mongodb-memory-server setup', () => {
        it('connects to an in-memory MongoDB instance', () => {
            expect(mongoose.connection.readyState).toBe(1); // connected
        });

        it('provides a valid URI', () => {
            const uri = getTestDbUri();
            expect(uri).toMatch(/^mongodb:\/\//);
        });

        it('clearTestDb removes all documents', async () => {
            await createUser();
            await createUser();
            await clearTestDb();

            const { default: UserModel } = await import('../models/User');
            const count = await UserModel.countDocuments();
            expect(count).toBe(0);
        });
    });

    describe('buildUser factory', () => {
        it('returns a user with default fields', () => {
            const user = buildUser();
            expect(user.full_name).toMatch(/^Test User/);
            expect(user.email).toMatch(/@example\.com$/);
            expect(user.role).toBe('student');
            expect(user.status).toBe('active');
        });

        it('generates unique usernames across calls', () => {
            const u1 = buildUser();
            const u2 = buildUser();
            expect(u1.username).not.toBe(u2.username);
            expect(u1.email).not.toBe(u2.email);
        });

        it('accepts overrides', () => {
            const user = buildUser({ role: 'admin', status: 'suspended' });
            expect(user.role).toBe('admin');
            expect(user.status).toBe('suspended');
        });
    });

    describe('buildAdminUser factory', () => {
        it('returns a user with admin role and elevated permissions', () => {
            const admin = buildAdminUser();
            expect(admin.role).toBe('admin');
            expect(admin.permissions.canEditExams).toBe(true);
            expect(admin.permissions.canManageStudents).toBe(true);
        });
    });

    describe('buildExam factory', () => {
        it('returns an exam with default fields', () => {
            const exam = buildExam();
            expect(exam.title).toMatch(/^Test Exam/);
            expect(exam.duration).toBe(60);
            expect(exam.status).toBe('draft');
            expect(exam.deliveryMode).toBe('internal');
            expect(exam.scheduleWindows).toHaveLength(1);
        });

        it('accepts overrides', () => {
            const exam = buildExam({ status: 'live', duration: 120 });
            expect(exam.status).toBe('live');
            expect(exam.duration).toBe(120);
        });
    });

    describe('buildStudent factory', () => {
        it('returns a student with default fields', () => {
            const student = buildStudent();
            expect(student.full_name).toMatch(/^Test Student/);
            expect(student.department).toBe('science');
            expect(student.country).toBe('Bangladesh');
            expect(student.user_id).toBeInstanceOf(mongoose.Types.ObjectId);
        });
    });

    describe('buildSubscription factory', () => {
        it('returns a subscription with default fields', () => {
            const sub = buildSubscription();
            expect(sub.status).toBe('active');
            expect(sub.startAtUTC).toBeInstanceOf(Date);
            expect(sub.expiresAtUTC.getTime()).toBeGreaterThan(sub.startAtUTC.getTime());
        });
    });

    describe('database-persisting factories', () => {
        it('createUser persists a user document', async () => {
            const doc = await createUser({ role: 'admin' });
            expect(doc).toBeDefined();
            expect((doc as any).role).toBe('admin');
            expect((doc as any)._id).toBeDefined();
        });

        it('createExam persists an exam document', async () => {
            const doc = await createExam({ title: 'Physics Final' });
            expect(doc).toBeDefined();
            expect((doc as any).title).toBe('Physics Final');
        });

        it('createStudent persists a student document', async () => {
            const doc = await createStudent({ full_name: 'Rahim Ahmed' });
            expect(doc).toBeDefined();
            expect((doc as any).full_name).toBe('Rahim Ahmed');
        });

        it('createSubscription persists a subscription document', async () => {
            const doc = await createSubscription({ status: 'pending' });
            expect(doc).toBeDefined();
            expect((doc as any).status).toBe('pending');
        });
    });
});
