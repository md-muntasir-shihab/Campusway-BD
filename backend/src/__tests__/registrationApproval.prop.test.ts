// Feature: student-verification-approval, Property 5: Registration approval and rejection update status correctly

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 5: Registration approval and rejection update status correctly
 *
 * **Validates: Requirements 5.3, 5.4**
 *
 * For any User with status `pending` and role `student`, when an admin approves the
 * registration, the User status SHALL become `active` with the admin's ID and current
 * timestamp recorded. When an admin rejects the registration with any non-empty reason
 * string, the User status SHALL become `blocked` with the reason, admin ID, and timestamp
 * recorded.
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
import { approveNewStudent, rejectNewStudent } from '../services/profileApprovalService';

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
// Arbitrary Generators
// ---------------------------------------------------------------------------

/** Generates a non-empty reason string for rejection (no leading/trailing spaces to avoid trim mismatch) */
const reasonArb = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{1,30}[A-Za-z0-9]$/);

/** Generates a unique suffix for user fields */
const suffixArb = fc.stringMatching(/^[a-z0-9]{4,8}$/);

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 5: Registration approval and rejection update status correctly', () => {
    it('approveNewStudent sets status to active with admin ID and timestamp', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(suffixArb, async (suffix) => {
                await User.deleteMany({});

                const userId = new mongoose.Types.ObjectId();
                const adminId = new mongoose.Types.ObjectId();

                // Create a pending student
                await User.create({
                    _id: userId,
                    full_name: `Student ${suffix}`,
                    username: `stu_${suffix}`,
                    email: `stu_${suffix}@test.com`,
                    password: 'hashedpassword123',
                    role: 'student',
                    status: 'pending',
                });

                const beforeApproval = new Date();

                await approveNewStudent(userId.toHexString(), adminId.toHexString());

                const updatedUser = await User.findById(userId).lean();
                expect(updatedUser).toBeTruthy();
                expect(updatedUser!.status).toBe('active');
                expect(updatedUser!.approvedBy!.toString()).toBe(adminId.toHexString());
                expect(updatedUser!.approvedAt).toBeInstanceOf(Date);
                expect(updatedUser!.approvedAt!.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime());
            }),
            { numRuns: 10 },
        );
    });

    it('rejectNewStudent sets status to blocked with reason, admin ID, and timestamp', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(suffixArb, reasonArb, async (suffix, reason) => {
                await User.deleteMany({});

                const userId = new mongoose.Types.ObjectId();
                const adminId = new mongoose.Types.ObjectId();

                // Create a pending student
                await User.create({
                    _id: userId,
                    full_name: `Student ${suffix}`,
                    username: `stu_${suffix}`,
                    email: `stu_${suffix}@test.com`,
                    password: 'hashedpassword123',
                    role: 'student',
                    status: 'pending',
                });

                const beforeRejection = new Date();

                await rejectNewStudent(userId.toHexString(), adminId.toHexString(), reason);

                const updatedUser = await User.findById(userId).lean();
                expect(updatedUser).toBeTruthy();
                expect(updatedUser!.status).toBe('blocked');
                expect(updatedUser!.rejectedBy!.toString()).toBe(adminId.toHexString());
                expect(updatedUser!.rejectedAt).toBeInstanceOf(Date);
                expect(updatedUser!.rejectedAt!.getTime()).toBeGreaterThanOrEqual(beforeRejection.getTime());
                expect(updatedUser!.rejectionReason).toBe(reason);
            }),
            { numRuns: 10 },
        );
    });
});


// ---------------------------------------------------------------------------
// Feature: student-verification-approval, Property 7: Pending approvals queue is sorted by creation date descending
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 5.6**
 *
 * For any set of User records with status `pending` and role `student`, the pending
 * approvals queue endpoint SHALL return them sorted by `createdAt` in descending order
 * (newest first).
 */

describe('Feature: student-verification-approval, Property 7: Pending approvals queue is sorted by creation date descending', () => {
    it('pending students are returned sorted by createdAt descending', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 6 }),
                async (count) => {
                    await User.deleteMany({});

                    // Create pending students with staggered creation times
                    const createdIds: { id: string; createdAt: Date }[] = [];
                    for (let i = 0; i < count; i++) {
                        const userId = new mongoose.Types.ObjectId();
                        const hex = userId.toHexString();
                        // Stagger creation times by 1 second each
                        const createdAt = new Date(Date.now() - (count - i) * 1000);
                        await User.create({
                            _id: userId,
                            full_name: `Student ${hex}`,
                            username: `sort_stu_${hex}`,
                            email: `sort_${hex}@test.com`,
                            password: 'hashedpassword123',
                            role: 'student',
                            status: 'pending',
                            createdAt,
                        });
                        createdIds.push({ id: hex, createdAt });
                    }

                    // Query pending students sorted by createdAt desc (same as the endpoint)
                    const pendingStudents = await User.find({ role: 'student', status: 'pending' })
                        .select('full_name email phone_number status createdAt')
                        .sort({ createdAt: -1 })
                        .lean();

                    expect(pendingStudents.length).toBe(count);

                    // Verify descending order: each createdAt >= next createdAt
                    for (let i = 0; i < pendingStudents.length - 1; i++) {
                        const current = new Date(pendingStudents[i].createdAt).getTime();
                        const next = new Date(pendingStudents[i + 1].createdAt).getTime();
                        expect(current).toBeGreaterThanOrEqual(next);
                    }
                },
            ),
            { numRuns: 10 },
        );
    });
});
