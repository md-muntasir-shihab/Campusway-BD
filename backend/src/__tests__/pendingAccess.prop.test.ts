// Feature: student-verification-approval, Property 6: Pending students are restricted to read-only access

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 6: Pending students are restricted to read-only access
 *
 * **Validates: Requirements 5.2**
 *
 * For any authenticated user with role `student` and status `pending`, requests to
 * restricted endpoints (exams, resources, payments, support ticket creation) SHALL
 * return HTTP 403, while requests to permitted endpoints (view profile, view
 * announcements, view dashboard) SHALL succeed.
 */

// ---------------------------------------------------------------------------
// Mock bcrypt with simple passthrough (NOT real bcrypt)
// ---------------------------------------------------------------------------
vi.spyOn(bcrypt, 'hash').mockImplementation(async (data: string) => `hashed:${data}`);
vi.spyOn(bcrypt, 'compare').mockImplementation(async (data: string, hash: string) => hash === `hashed:${data}`);

// ---------------------------------------------------------------------------
// Mock notification provider service
// ---------------------------------------------------------------------------
vi.mock('../services/notificationProviderService', () => ({
    sendSMS: vi.fn().mockResolvedValue({ success: true }),
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
    sendNotificationToStudent: vi.fn().mockResolvedValue(undefined),
    getActiveProvider: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        type: 'sms',
        provider: 'twilio',
        isEnabled: true,
    }),
}));

import User from '../models/User';
import { restrictPendingStudent } from '../middlewares/restrictPendingStudent';
import type { Request, Response, NextFunction } from 'express';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
});

// ---------------------------------------------------------------------------
// Helpers — build mock Express req/res/next
// ---------------------------------------------------------------------------

function buildMockReq(overrides: { userId: string; role: string; path: string; method?: string }): Request {
    return {
        user: { _id: overrides.userId, id: overrides.userId, username: 'test', email: 'test@test.com', role: overrides.role, fullName: 'Test' },
        path: overrides.path,
        method: overrides.method || 'GET',
    } as unknown as Request;
}

function buildMockRes(): Response & { _status: number | null; _json: unknown } {
    const res: any = {
        _status: null as number | null,
        _json: null as unknown,
        status(code: number) {
            res._status = code;
            return res;
        },
        json(body: unknown) {
            res._json = body;
            return res;
        },
    };
    return res;
}

// ---------------------------------------------------------------------------
// Endpoint definitions
// ---------------------------------------------------------------------------

const RESTRICTED_ENDPOINTS = [
    '/me/exams',
    '/me/exams/abc123',
    '/me/results',
    '/me/results/abc123',
    '/me/payments',
    '/me/resources',
    '/me/weak-topics',
    '/upcoming-exams',
    '/exam-history',
    '/resources',
    '/payments',
    '/support-tickets',
    '/support/eligibility',
    '/applications',
    '/leaderboard',
    '/watchlist',
    '/watchlist/toggle',
    '/watchlist/summary',
    '/watchlist/check',
    '/featured-universities',
];

const PERMITTED_ENDPOINTS = [
    '/profile',
    '/dashboard',
    '/dashboard-profile',
    '/dashboard-full',
    '/dashboard-sections-config',
    '/dashboard/stream',
    '/notices',
    '/notifications',
    '/notifications/feed',
    '/me',
    '/me/notifications',
    '/me/notifications/mark-read',
    '/live-alerts',
    '/otp/request',
    '/otp/verify',
    '/otp/resend',
];

// ---------------------------------------------------------------------------
// Arbitrary Generators
// ---------------------------------------------------------------------------

const restrictedEndpointArb = fc.constantFrom(...RESTRICTED_ENDPOINTS);
const permittedEndpointArb = fc.constantFrom(...PERMITTED_ENDPOINTS);
const suffixArb = fc.stringMatching(/^[a-z0-9]{4,8}$/);

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 6: Pending students are restricted to read-only access', () => {
    it('pending students receive 403 on restricted endpoints', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(suffixArb, restrictedEndpointArb, async (suffix, endpoint) => {
                await User.deleteMany({});

                const userId = new mongoose.Types.ObjectId();

                // Create a pending student
                await User.create({
                    _id: userId,
                    full_name: `Student ${suffix}`,
                    username: `pend_${suffix}`,
                    email: `pend_${suffix}@test.com`,
                    password: 'hashedpassword123',
                    role: 'student',
                    status: 'pending',
                });

                const req = buildMockReq({ userId: userId.toHexString(), role: 'student', path: endpoint });
                const res = buildMockRes();
                let nextCalled = false;
                const next: NextFunction = () => { nextCalled = true; };

                await restrictPendingStudent(req, res as unknown as Response, next);

                expect(nextCalled).toBe(false);
                expect(res._status).toBe(403);
                expect((res._json as any).code).toBe('PENDING_STUDENT_RESTRICTED');
            }),
            { numRuns: 10 },
        );
    });

    it('pending students can access permitted endpoints', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(suffixArb, permittedEndpointArb, async (suffix, endpoint) => {
                await User.deleteMany({});

                const userId = new mongoose.Types.ObjectId();

                // Create a pending student
                await User.create({
                    _id: userId,
                    full_name: `Student ${suffix}`,
                    username: `perm_${suffix}`,
                    email: `perm_${suffix}@test.com`,
                    password: 'hashedpassword123',
                    role: 'student',
                    status: 'pending',
                });

                const req = buildMockReq({ userId: userId.toHexString(), role: 'student', path: endpoint });
                const res = buildMockRes();
                let nextCalled = false;
                const next: NextFunction = () => { nextCalled = true; };

                await restrictPendingStudent(req, res as unknown as Response, next);

                expect(nextCalled).toBe(true);
                expect(res._status).toBeNull();
            }),
            { numRuns: 10 },
        );
    });

    it('active students can access restricted endpoints', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(suffixArb, restrictedEndpointArb, async (suffix, endpoint) => {
                await User.deleteMany({});

                const userId = new mongoose.Types.ObjectId();

                // Create an active student
                await User.create({
                    _id: userId,
                    full_name: `Student ${suffix}`,
                    username: `act_${suffix}`,
                    email: `act_${suffix}@test.com`,
                    password: 'hashedpassword123',
                    role: 'student',
                    status: 'active',
                });

                const req = buildMockReq({ userId: userId.toHexString(), role: 'student', path: endpoint });
                const res = buildMockRes();
                let nextCalled = false;
                const next: NextFunction = () => { nextCalled = true; };

                await restrictPendingStudent(req, res as unknown as Response, next);

                expect(nextCalled).toBe(true);
                expect(res._status).toBeNull();
            }),
            { numRuns: 10 },
        );
    });
});
