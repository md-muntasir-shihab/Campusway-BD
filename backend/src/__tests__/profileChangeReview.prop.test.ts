// Feature: student-verification-approval, Property 10: Profile change review applies changes and records metadata correctly

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 10: Profile change review applies changes and records metadata correctly
 *
 * **Validates: Requirements 7.3, 7.4, 7.6, 7.7**
 *
 * For any pending ProfileUpdateRequest, when an admin approves it, all requested_changes
 * SHALL be applied to the StudentProfile (and User where applicable), the request status
 * SHALL be `approved`, and reviewed_by and reviewed_at SHALL be set. When an admin rejects
 * it with any feedback string, no changes SHALL be applied, the status SHALL be `rejected`,
 * admin_feedback SHALL match the provided feedback, and reviewed_by and reviewed_at SHALL
 * be set. For approved requests containing phone_number changes, both phone and phone_number
 * on StudentProfile and phone_number on User SHALL be synchronized to the new value.
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
import StudentProfile from '../models/StudentProfile';
import ProfileUpdateRequest from '../models/ProfileUpdateRequest';
import { reviewProfileChangeRequest } from '../services/profileApprovalService';

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
    await StudentProfile.deleteMany({});
    await ProfileUpdateRequest.deleteMany({});
});

// ---------------------------------------------------------------------------
// Arbitrary Generators
// ---------------------------------------------------------------------------

const suffixArb = fc.stringMatching(/^[a-z0-9]{4,8}$/);
const nameArb = fc.stringMatching(/^[A-Za-z][A-Za-z ]{1,10}[A-Za-z]$/);
const phoneArb = fc.stringMatching(/^\d{10}$/).map((d) => `+880${d}`);
const feedbackArb = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{1,20}[A-Za-z0-9]$/);

// ---------------------------------------------------------------------------
// Property Test — Approve applies changes
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 10: Profile change review applies changes and records metadata correctly', () => {
    it('approve applies requested_changes to StudentProfile/User and sets status/reviewed_by/reviewed_at', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(suffixArb, nameArb, async (suffix, newName) => {
                await User.deleteMany({});
                await StudentProfile.deleteMany({});
                await ProfileUpdateRequest.deleteMany({});

                const studentId = new mongoose.Types.ObjectId();
                const adminId = new mongoose.Types.ObjectId();

                await User.create({
                    _id: studentId,
                    full_name: `Old Name ${suffix}`,
                    username: `stu_${suffix}`,
                    email: `stu_${suffix}@test.com`,
                    password: 'hashedpassword123',
                    role: 'student',
                    status: 'active',
                });

                await StudentProfile.create({
                    user_id: studentId,
                    full_name: `Old Name ${suffix}`,
                    user_unique_id: `UID-${suffix}`,
                });

                const request = await ProfileUpdateRequest.create({
                    student_id: studentId,
                    requested_changes: { full_name: newName },
                    previous_values: { full_name: `Old Name ${suffix}` },
                    status: 'pending',
                });

                const beforeReview = new Date();

                await reviewProfileChangeRequest({
                    requestId: request._id.toString(),
                    adminId: adminId.toHexString(),
                    action: 'approve',
                });

                // Check request metadata
                const updatedReq = await ProfileUpdateRequest.findById(request._id).lean();
                expect(updatedReq!.status).toBe('approved');
                expect(updatedReq!.reviewed_by!.toString()).toBe(adminId.toHexString());
                expect(updatedReq!.reviewed_at).toBeInstanceOf(Date);
                expect(updatedReq!.reviewed_at!.getTime()).toBeGreaterThanOrEqual(beforeReview.getTime());

                // Check changes applied to StudentProfile
                const profile = await StudentProfile.findOne({ user_id: studentId }).lean();
                expect(profile!.full_name).toBe(newName);

                // Check changes applied to User (full_name syncs)
                const user = await User.findById(studentId).lean();
                expect(user!.full_name).toBe(newName);
            }),
            { numRuns: 10 },
        );
    });

    it('reject does not apply changes and stores admin_feedback', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(suffixArb, nameArb, feedbackArb, async (suffix, newName, feedback) => {
                await User.deleteMany({});
                await StudentProfile.deleteMany({});
                await ProfileUpdateRequest.deleteMany({});

                const studentId = new mongoose.Types.ObjectId();
                const adminId = new mongoose.Types.ObjectId();
                const originalName = `Original ${suffix}`;

                await User.create({
                    _id: studentId,
                    full_name: originalName,
                    username: `stu_${suffix}`,
                    email: `stu_${suffix}@test.com`,
                    password: 'hashedpassword123',
                    role: 'student',
                    status: 'active',
                });

                await StudentProfile.create({
                    user_id: studentId,
                    full_name: originalName,
                    user_unique_id: `UID-${suffix}`,
                });

                const request = await ProfileUpdateRequest.create({
                    student_id: studentId,
                    requested_changes: { full_name: newName },
                    previous_values: { full_name: originalName },
                    status: 'pending',
                });

                const beforeReview = new Date();

                await reviewProfileChangeRequest({
                    requestId: request._id.toString(),
                    adminId: adminId.toHexString(),
                    action: 'reject',
                    feedback,
                });

                // Check request metadata
                const updatedReq = await ProfileUpdateRequest.findById(request._id).lean();
                expect(updatedReq!.status).toBe('rejected');
                expect(updatedReq!.reviewed_by!.toString()).toBe(adminId.toHexString());
                expect(updatedReq!.reviewed_at).toBeInstanceOf(Date);
                expect(updatedReq!.reviewed_at!.getTime()).toBeGreaterThanOrEqual(beforeReview.getTime());
                expect(updatedReq!.admin_feedback).toBe(feedback);

                // Changes NOT applied — profile and user retain original values
                const profile = await StudentProfile.findOne({ user_id: studentId }).lean();
                expect(profile!.full_name).toBe(originalName);

                const user = await User.findById(studentId).lean();
                expect(user!.full_name).toBe(originalName);
            }),
            { numRuns: 10 },
        );
    });

    it('approve with phone_number change syncs phone and phone_number on StudentProfile and User', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(suffixArb, phoneArb, async (suffix, newPhone) => {
                await User.deleteMany({});
                await StudentProfile.deleteMany({});
                await ProfileUpdateRequest.deleteMany({});

                const studentId = new mongoose.Types.ObjectId();
                const adminId = new mongoose.Types.ObjectId();
                const oldPhone = `+880${suffix}00000`.slice(0, 14);

                await User.create({
                    _id: studentId,
                    full_name: `Student ${suffix}`,
                    username: `stu_${suffix}`,
                    email: `stu_${suffix}@test.com`,
                    password: 'hashedpassword123',
                    role: 'student',
                    status: 'active',
                    phone_number: oldPhone,
                });

                await StudentProfile.create({
                    user_id: studentId,
                    full_name: `Student ${suffix}`,
                    user_unique_id: `UID-${suffix}`,
                    phone: oldPhone,
                    phone_number: oldPhone,
                });

                const request = await ProfileUpdateRequest.create({
                    student_id: studentId,
                    requested_changes: { phone_number: newPhone },
                    previous_values: { phone_number: oldPhone },
                    status: 'pending',
                });

                await reviewProfileChangeRequest({
                    requestId: request._id.toString(),
                    adminId: adminId.toHexString(),
                    action: 'approve',
                });

                // phone and phone_number on StudentProfile should both be newPhone
                const profile = await StudentProfile.findOne({ user_id: studentId }).lean();
                expect(profile!.phone).toBe(newPhone);
                expect(profile!.phone_number).toBe(newPhone);

                // phone_number on User should be newPhone
                const user = await User.findById(studentId).lean();
                expect(user!.phone_number).toBe(newPhone);
            }),
            { numRuns: 10 },
        );
    });
});
