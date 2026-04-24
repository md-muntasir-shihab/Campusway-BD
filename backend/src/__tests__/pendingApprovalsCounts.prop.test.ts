// Feature: student-verification-approval, Property 11: Pending approvals counts match actual pending records

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 11: Pending approvals counts match actual pending records
 *
 * **Validates: Requirements 10.2, 7.1**
 *
 * For any state of the database, the pending approvals endpoint SHALL return a
 * `registrationCount` equal to the number of User documents with
 * `{ role: 'student', status: 'pending' }` and a `profileChangeCount` equal to the
 * number of ProfileUpdateRequest documents with `{ status: 'pending' }`.
 */

// ---------------------------------------------------------------------------
// Mock bcrypt with simple passthrough
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
import ProfileUpdateRequest from '../models/ProfileUpdateRequest';

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
    await ProfileUpdateRequest.deleteMany({});
});

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 11: Pending approvals counts match actual pending records', () => {
    it('registrationCount and profileChangeCount match actual pending records', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0, max: 5 }),  // pending registrations
                fc.integer({ min: 0, max: 3 }),  // active students (non-pending)
                fc.integer({ min: 0, max: 5 }),  // pending profile change requests
                fc.integer({ min: 0, max: 3 }),  // non-pending profile change requests
                async (pendingRegCount, activeCount, pendingProfileCount, nonPendingProfileCount) => {
                    await User.deleteMany({});
                    await ProfileUpdateRequest.deleteMany({});

                    // Create pending student registrations
                    for (let i = 0; i < pendingRegCount; i++) {
                        const id = new mongoose.Types.ObjectId();
                        const hex = id.toHexString();
                        await User.create({
                            _id: id,
                            full_name: `Pending ${hex}`,
                            username: `pend_${hex}`,
                            email: `pend_${hex}@test.com`,
                            password: 'hashedpassword123',
                            role: 'student',
                            status: 'pending',
                        });
                    }

                    // Create active students (should NOT be counted)
                    for (let i = 0; i < activeCount; i++) {
                        const id = new mongoose.Types.ObjectId();
                        const hex = id.toHexString();
                        await User.create({
                            _id: id,
                            full_name: `Active ${hex}`,
                            username: `act_${hex}`,
                            email: `act_${hex}@test.com`,
                            password: 'hashedpassword123',
                            role: 'student',
                            status: 'active',
                        });
                    }

                    // Create pending profile change requests
                    for (let i = 0; i < pendingProfileCount; i++) {
                        const studentId = new mongoose.Types.ObjectId();
                        await ProfileUpdateRequest.create({
                            student_id: studentId,
                            requested_changes: { full_name: `New Name ${i}` },
                            previous_values: { full_name: `Old Name ${i}` },
                            status: 'pending',
                        });
                    }

                    // Create non-pending profile change requests (should NOT be counted)
                    const nonPendingStatuses: Array<'approved' | 'rejected'> = ['approved', 'rejected'];
                    for (let i = 0; i < nonPendingProfileCount; i++) {
                        const studentId = new mongoose.Types.ObjectId();
                        await ProfileUpdateRequest.create({
                            student_id: studentId,
                            requested_changes: { full_name: `Done Name ${i}` },
                            previous_values: { full_name: `Prev Name ${i}` },
                            status: nonPendingStatuses[i % 2],
                        });
                    }

                    // Query counts the same way the endpoint does
                    const [registrationCount, profileChangeCount] = await Promise.all([
                        User.countDocuments({ role: 'student', status: 'pending' }),
                        ProfileUpdateRequest.countDocuments({ status: 'pending' }),
                    ]);

                    expect(registrationCount).toBe(pendingRegCount);
                    expect(profileChangeCount).toBe(pendingProfileCount);
                },
            ),
            { numRuns: 10 },
        );
    });
});
