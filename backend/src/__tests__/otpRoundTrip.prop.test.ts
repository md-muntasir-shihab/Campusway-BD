// Feature: student-verification-approval, Property 1: OTP verification round-trip preserves contact value

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 1: OTP verification round-trip preserves contact value
 *
 * **Validates: Requirements 2.1, 2.5, 2.6**
 *
 * For any valid contact value (phone number or email) and any user, if an OTP is
 * requested for that contact, and the correct OTP code is submitted for verification
 * before expiry and under the attempt limit, then the User record's corresponding
 * contact field and verification timestamp, and the StudentProfile's corresponding
 * contact fields, SHALL all be updated to the submitted contact value.
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
import { requestOtp, verifyOtp } from '../services/otpService';

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

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 1: OTP verification round-trip preserves contact value', () => {
    it('requesting an OTP and verifying with the correct code updates User and StudentProfile contact fields', { timeout: 120_000 }, async () => {
        // Fully mock bcrypt to avoid expensive hashing — use plain-text prefix for round-trip
        let capturedOtp = '';

        vi.spyOn(bcrypt, 'hash').mockImplementation(
            async (data: string, _saltOrRounds: string | number) => {
                if (/^\d{6}$/.test(data)) {
                    capturedOtp = data;
                }
                return `hashed:${data}`;
            },
        );

        vi.spyOn(bcrypt, 'compare').mockImplementation(
            async (data: string, hash: string) => {
                return hash === `hashed:${data}`;
            },
        );

        await fc.assert(
            fc.asyncProperty(
                contactTypeArb,
                phoneArb,
                emailArb,
                async (contactType, phone, email) => {
                    // Clean up from previous iteration
                    await User.deleteMany({});
                    await StudentProfile.deleteMany({});
                    await OtpVerification.deleteMany({});
                    capturedOtp = '';

                    const contactValue = contactType === 'phone' ? phone : email;

                    // 1. Create a User and StudentProfile in the test DB
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

                    // 2. Call requestOtp (bcrypt.hash spy captures the plain OTP)
                    const requestResult = await requestOtp({
                        userId: userId.toHexString(),
                        contactType,
                        contactValue,
                    });

                    expect(requestResult.success).toBe(true);
                    expect(capturedOtp).toMatch(/^\d{6}$/);

                    // 3. Call verifyOtp with the correct code
                    const verifyResult = await verifyOtp({
                        userId: userId.toHexString(),
                        contactType,
                        code: capturedOtp,
                    });

                    expect(verifyResult.success).toBe(true);

                    // 4. Assert User record is updated
                    const updatedUser = await User.findById(userId).lean();
                    expect(updatedUser).toBeTruthy();

                    if (contactType === 'phone') {
                        expect(updatedUser!.phone_number).toBe(contactValue);
                        expect(updatedUser!.phoneVerifiedAt).toBeInstanceOf(Date);
                    } else {
                        expect(updatedUser!.email).toBe(contactValue);
                        expect(updatedUser!.emailVerifiedAt).toBeInstanceOf(Date);
                    }

                    // 5. Assert StudentProfile is updated
                    const updatedProfile = await StudentProfile.findOne({
                        user_id: userId,
                    }).lean();
                    expect(updatedProfile).toBeTruthy();

                    if (contactType === 'phone') {
                        // Requirement 2.6: phone and phone_number synchronized
                        expect(updatedProfile!.phone).toBe(contactValue);
                        expect(updatedProfile!.phone_number).toBe(contactValue);
                    } else {
                        expect(updatedProfile!.email).toBe(contactValue);
                    }

                    // 6. Assert OtpVerification record is marked as verified
                    const otpRecord = await OtpVerification.findOne({
                        user_id: userId,
                        contact_type: contactType,
                        verified: true,
                    }).lean();
                    expect(otpRecord).toBeTruthy();
                    expect(otpRecord!.contact_value).toBe(contactValue);
                },
            ),
            { numRuns: 10 },
        );
    });
});
