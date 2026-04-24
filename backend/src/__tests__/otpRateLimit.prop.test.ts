// Feature: student-verification-approval, Property 4: OTP cooldown rate limiting rejects rapid requests

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 4: OTP cooldown rate limiting rejects rapid requests
 *
 * **Validates: Requirements 3.1**
 *
 * For any user and contact type, if an OtpVerification record was created within
 * the last 60 seconds, a new OTP request for the same user and contact type SHALL
 * be rejected with HTTP 429 and the response SHALL include the remaining cooldown
 * time in seconds.
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

/** Seconds ago the recent record was created (1–55, well within the 60s cooldown) */
const recentSecondsAgoArb = fc.integer({ min: 1, max: 55 });

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 4: OTP cooldown rate limiting rejects rapid requests', () => {
    it('rejects OTP request with HTTP 429 and cooldownRemaining when a record exists within the last 60 seconds', { timeout: 120_000 }, async () => {
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
                recentSecondsAgoArb,
                async (contactType, phone, email, secondsAgo) => {
                    // Clean up from previous iteration
                    await OtpVerification.deleteMany({});

                    const contactValue = contactType === 'phone' ? phone : email;

                    // 1. Create a user ID
                    const userId = new mongoose.Types.ObjectId();

                    // 2. Create a recent OtpVerification record (created within the last 60 seconds)
                    const recentCreatedAt = new Date(Date.now() - secondsAgo * 1000);
                    await OtpVerification.create({
                        user_id: userId,
                        otp_code: 'hashed:123456',
                        method: contactType === 'phone' ? 'sms' : 'email',
                        contact_type: contactType,
                        contact_value: contactValue,
                        expires_at: new Date(Date.now() + 5 * 60 * 1000),
                        attempt_count: 0,
                        verified: false,
                        createdAt: recentCreatedAt,
                        updatedAt: recentCreatedAt,
                    });

                    // 3. Call requestOtp for the same user and contact type
                    const result = await requestOtp({
                        userId: userId.toHexString(),
                        contactType,
                        contactValue,
                    });

                    // 4. Assert the request is rejected with HTTP 429
                    expect(result.success).toBe(false);
                    expect(result.httpStatus).toBe(429);

                    // 5. Assert the response includes cooldownRemaining > 0
                    expect(result.cooldownRemaining).toBeDefined();
                    expect(result.cooldownRemaining).toBeGreaterThan(0);
                    expect(result.cooldownRemaining).toBeLessThanOrEqual(60);
                },
            ),
            { numRuns: 10 },
        );
    });
});
