// Feature: student-verification-approval, Property 3: Failed OTP attempts increment attempt count

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 3: Failed OTP attempts increment attempt count
 *
 * **Validates: Requirements 2.2**
 *
 * For any valid OtpVerification record that has not expired and has fewer than 5
 * attempts, submitting an incorrect OTP code SHALL increment the attempt_count by
 * exactly 1 and return HTTP 400, without modifying the verified status or any
 * contact fields.
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

// Mock bcrypt entirely for performance
vi.spyOn(bcrypt, 'hash').mockImplementation(async (data: string, _saltOrRounds: string | number) => `hashed:${data}`);
vi.spyOn(bcrypt, 'compare').mockImplementation(async (data: string, hash: string) => hash === `hashed:${data}`);

import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import OtpVerification from '../models/OtpVerification';
import { verifyOtp } from '../services/otpService';

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

/** Generates a valid 6-digit OTP code */
const otpCodeArb = fc.stringMatching(/^\d{6}$/);

/** Generates a wrong OTP code guaranteed to differ from the correct one */
const wrongCodeArb = (correctCode: string) =>
    otpCodeArb.filter((code) => code !== correctCode);

/** Contact type: phone or email */
const contactTypeArb = fc.constantFrom<'phone' | 'email'>('phone', 'email');

/** Initial attempt count: 0 to 4 (fewer than 5) */
const attemptCountArb = fc.integer({ min: 0, max: 4 });

/** Generates a valid phone number */
const phoneArb = fc
    .stringMatching(/^\d{10}$/)
    .map((digits) => `+880${digits}`);

/** Generates a valid email */
const emailArb = fc
    .tuple(
        fc.stringMatching(/^[a-z0-9]{3,12}$/),
        fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'test.edu'),
    )
    .map(([local, domain]) => `${local}@${domain}`);

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 3: Failed OTP attempts increment attempt count', () => {
    it('submitting an incorrect OTP increments attempt_count by 1 and returns HTTP 400 without modifying verified or contact fields', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                contactTypeArb,
                otpCodeArb,
                attemptCountArb,
                phoneArb,
                emailArb,
                async (contactType, correctCode, initialAttempts, phone, email) => {
                    // Clean up from previous iteration
                    await User.deleteMany({});
                    await StudentProfile.deleteMany({});
                    await OtpVerification.deleteMany({});

                    const contactValue = contactType === 'phone' ? phone : email;
                    const userId = new mongoose.Types.ObjectId();

                    // 1. Create a User with known contact fields
                    const originalEmail = `original_${userId.toHexString().slice(0, 8)}@test.com`;
                    const originalPhone = '+8801234567890';
                    await User.create({
                        _id: userId,
                        full_name: 'Test Student',
                        username: `student_${userId.toHexString().slice(0, 8)}`,
                        email: originalEmail,
                        phone_number: originalPhone,
                        password: 'hashedpassword123',
                        role: 'student',
                        status: 'active',
                    });

                    await StudentProfile.create({
                        user_id: userId,
                        full_name: 'Test Student',
                        user_unique_id: `UID-${userId.toHexString().slice(0, 8)}`,
                        email: originalEmail,
                        phone_number: originalPhone,
                        phone: originalPhone,
                    });

                    // 2. Create an OtpVerification record with known hashed code and initial attempts
                    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
                    await OtpVerification.create({
                        user_id: userId,
                        otp_code: `hashed:${correctCode}`,
                        method: contactType === 'phone' ? 'sms' : 'email',
                        contact_type: contactType,
                        contact_value: contactValue,
                        expires_at: expiresAt,
                        attempt_count: initialAttempts,
                        verified: false,
                    });

                    // 3. Generate a wrong code (different from the correct one)
                    // Simple approach: flip the last digit
                    const lastDigit = parseInt(correctCode[5], 10);
                    const flippedDigit = (lastDigit + 1) % 10;
                    const wrongCode = correctCode.slice(0, 5) + String(flippedDigit);

                    // 4. Call verifyOtp with the wrong code
                    const result = await verifyOtp({
                        userId: userId.toHexString(),
                        contactType,
                        code: wrongCode,
                    });

                    // 5. Assert HTTP 400 returned (or 429 if this attempt pushed to max)
                    expect(result.success).toBe(false);
                    if (initialAttempts + 1 >= 5) {
                        expect(result.httpStatus).toBe(429);
                    } else {
                        expect(result.httpStatus).toBe(400);
                    }

                    // 6. Assert attempt_count incremented by exactly 1
                    const updatedOtp = await OtpVerification.findOne({
                        user_id: userId,
                        contact_type: contactType,
                    }).lean();
                    expect(updatedOtp).toBeTruthy();
                    expect(updatedOtp!.attempt_count).toBe(initialAttempts + 1);

                    // 7. Assert verified is still false
                    expect(updatedOtp!.verified).toBe(false);

                    // 8. Assert User contact fields unchanged
                    const userAfter = await User.findById(userId).lean();
                    expect(userAfter).toBeTruthy();
                    expect(userAfter!.email).toBe(originalEmail);
                    expect(userAfter!.phone_number).toBe(originalPhone);

                    // 9. Assert StudentProfile contact fields unchanged
                    const profileAfter = await StudentProfile.findOne({ user_id: userId }).lean();
                    expect(profileAfter).toBeTruthy();
                    expect(profileAfter!.email).toBe(originalEmail);
                    expect(profileAfter!.phone_number).toBe(originalPhone);
                    expect(profileAfter!.phone).toBe(originalPhone);
                },
            ),
            { numRuns: 10 },
        );
    });
});
