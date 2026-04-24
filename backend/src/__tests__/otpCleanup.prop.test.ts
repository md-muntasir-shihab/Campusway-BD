// Feature: student-verification-approval, Property 2: OTP request cleanup leaves at most one unverified record

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 2: OTP request cleanup leaves at most one unverified record
 *
 * **Validates: Requirements 1.5**
 *
 * For any user and contact type, regardless of how many unverified OtpVerification
 * records previously exist, after a new OTP request completes successfully, there
 * SHALL be exactly one unverified OtpVerification record for that user and contact type.
 */

// ---------------------------------------------------------------------------
// Mock notification provider service BEFORE importing otpService
// ---------------------------------------------------------------------------
vi.mock('../services/notificationProviderService', () => ({
    sendSMS: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-sms-id' }),
    sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-email-id' }),
    getActiveProvider: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        type: 'sms',
        provider: 'twilio',
        isEnabled: true,
    }),
}));

import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import OtpVerification from '../models/OtpVerification';
import { requestOtp } from '../services/otpService';

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
    await OtpVerification.deleteMany({});
});

// ---------------------------------------------------------------------------
// Arbitrary Generators
// ---------------------------------------------------------------------------

/** Generates a valid phone number: +880 followed by 10 digits */
const phoneArb = fc
    .stringMatching(/^\d{10}$/)
    .map((digits) => `+880${digits}`);

/** Generates a valid-looking email address */
const emailArb = fc
    .tuple(
        fc.stringMatching(/^[a-z0-9]{3,12}$/),
        fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'test.edu'),
    )
    .map(([local, domain]) => `${local}@${domain}`);

/** Contact type: phone or email */
const contactTypeArb = fc.constantFrom<'phone' | 'email'>('phone', 'email');

/** Number of pre-existing unverified records to seed (1 to 5) */
const preExistingCountArb = fc.integer({ min: 1, max: 5 });

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 2: OTP request cleanup leaves at most one unverified record', () => {
    it('after requestOtp, exactly one unverified record exists for that user and contact type', { timeout: 120_000 }, async () => {
        // Mock bcrypt entirely for performance
        vi.spyOn(bcrypt, 'hash').mockImplementation(
            async (data: string, _saltOrRounds: string | number) => `hashed:${data}`,
        );
        vi.spyOn(bcrypt, 'compare').mockImplementation(
            async (data: string, hash: string) => hash === `hashed:${data}`,
        );

        await fc.assert(
            fc.asyncProperty(
                contactTypeArb,
                phoneArb,
                emailArb,
                preExistingCountArb,
                async (contactType, phone, email, preExistingCount) => {
                    // Clean up from previous iteration
                    await User.deleteMany({});
                    await StudentProfile.deleteMany({});
                    await OtpVerification.deleteMany({});

                    const contactValue = contactType === 'phone' ? phone : email;

                    // 1. Create a User
                    const userId = new mongoose.Types.ObjectId();
                    await User.create({
                        _id: userId,
                        full_name: 'Test Student',
                        username: `student_${userId.toHexString().slice(0, 8)}`,
                        email: `old_${userId.toHexString().slice(0, 8)}@test.com`,
                        password: 'hashedpassword123',
                        role: 'student',
                        status: 'active',
                    });

                    await StudentProfile.create({
                        user_id: userId,
                        full_name: 'Test Student',
                        user_unique_id: `UID-${userId.toHexString().slice(0, 8)}`,
                    });

                    // 2. Create multiple pre-existing unverified OtpVerification records
                    //    Set createdAt to 2 hours ago to avoid triggering both the
                    //    60-second cooldown and the 5-per-hour rate limit
                    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
                    const preExistingRecords = [];
                    for (let i = 0; i < preExistingCount; i++) {
                        preExistingRecords.push({
                            user_id: userId,
                            otp_code: `hashed:old_code_${i}`,
                            method: contactType === 'phone' ? 'sms' : 'email',
                            contact_type: contactType,
                            contact_value: contactValue,
                            expires_at: new Date(Date.now() + 5 * 60 * 1000),
                            attempt_count: 0,
                            verified: false,
                            createdAt: oldDate,
                            updatedAt: oldDate,
                        });
                    }
                    await OtpVerification.insertMany(preExistingRecords);

                    // Verify pre-existing records were created
                    const beforeCount = await OtpVerification.countDocuments({
                        user_id: userId,
                        contact_type: contactType,
                        verified: false,
                    });
                    expect(beforeCount).toBe(preExistingCount);

                    // 3. Call requestOtp
                    const result = await requestOtp({
                        userId: userId.toHexString(),
                        contactType,
                        contactValue,
                    });

                    expect(result.success).toBe(true);

                    // 4. Assert exactly one unverified record exists
                    const afterCount = await OtpVerification.countDocuments({
                        user_id: userId,
                        contact_type: contactType,
                        verified: false,
                    });
                    expect(afterCount).toBe(1);
                },
            ),
            { numRuns: 10 },
        );
    });
});
