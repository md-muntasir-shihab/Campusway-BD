// Unit tests for OtpService edge cases
// Validates: Requirements 1.2, 1.3, 1.4, 2.3, 2.4, 3.2

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Mock bcrypt with simple passthrough (performance)
// ---------------------------------------------------------------------------
vi.spyOn(bcrypt, 'hash').mockImplementation(async (data: string, _) => `hashed:${data}`);
vi.spyOn(bcrypt, 'compare').mockImplementation(async (data: string, hash: string) => hash === `hashed:${data}`);

// ---------------------------------------------------------------------------
// Mock notification provider service BEFORE importing otpService
// ---------------------------------------------------------------------------
const mockSendSMS = vi.fn().mockResolvedValue({ success: true, messageId: 'mock-sms-id' });
const mockSendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'mock-email-id' });
const mockGetActiveProvider = vi.fn().mockResolvedValue({
    _id: new mongoose.Types.ObjectId(),
    type: 'sms',
    provider: 'twilio',
    isEnabled: true,
});

vi.mock('../services/notificationProviderService', () => ({
    sendSMS: (...args: any[]) => mockSendSMS(...args),
    sendEmail: (...args: any[]) => mockSendEmail(...args),
    getActiveProvider: (...args: any[]) => mockGetActiveProvider(...args),
}));

import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import OtpVerification from '../models/OtpVerification';
import { requestOtp, verifyOtp } from '../services/otpService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
}, 60_000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await OtpVerification.deleteMany({});
    mockSendSMS.mockClear();
    mockSendEmail.mockClear();
    mockGetActiveProvider.mockClear();
    // Restore default successful mocks
    mockSendSMS.mockResolvedValue({ success: true, messageId: 'mock-sms-id' });
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'mock-email-id' });
    mockGetActiveProvider.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        type: 'sms',
        provider: 'twilio',
        isEnabled: true,
    });
});

// ---------------------------------------------------------------------------
// Helper: create a test user + student profile
// ---------------------------------------------------------------------------
async function createTestUser() {
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
    return userId;
}

// ===========================================================================
// Requirement 1.2: SMS delivery for phone changes
// ===========================================================================
describe('Requirement 1.2: SMS delivery for phone changes', () => {
    it('sends OTP via SMS when contactType is phone', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        const result = await requestOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            contactValue: '+8801234567890',
        });

        expect(result.success).toBe(true);
        expect(mockSendSMS).toHaveBeenCalledTimes(1);
        expect(mockSendEmail).not.toHaveBeenCalled();

        // Verify SMS was sent to the correct phone number
        const smsCall = mockSendSMS.mock.calls[0][0];
        expect(smsCall.to).toBe('+8801234567890');
        expect(smsCall.body).toContain('verification code');
    });
});

// ===========================================================================
// Requirement 1.3: Email delivery for email changes
// ===========================================================================
describe('Requirement 1.3: Email delivery for email changes', () => {
    it('sends OTP via email when contactType is email', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        const result = await requestOtp({
            userId: userId.toHexString(),
            contactType: 'email',
            contactValue: 'newuser@example.com',
        });

        expect(result.success).toBe(true);
        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendSMS).not.toHaveBeenCalled();

        // Verify email was sent to the correct address
        const emailCall = mockSendEmail.mock.calls[0][0];
        expect(emailCall.to).toBe('newuser@example.com');
        expect(emailCall.subject).toContain('Verification');
    });
});

// ===========================================================================
// Requirement 1.4: Delivery failure error handling
// ===========================================================================
describe('Requirement 1.4: Delivery failure error handling', () => {
    it('returns HTTP 500 when SMS delivery fails', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();
        mockSendSMS.mockResolvedValueOnce({ success: false });

        const result = await requestOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            contactValue: '+8801234567890',
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(500);
        expect(result.error).toContain('Failed to deliver OTP');
    });

    it('returns HTTP 500 when email delivery fails', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();
        mockSendEmail.mockResolvedValueOnce({ success: false });

        const result = await requestOtp({
            userId: userId.toHexString(),
            contactType: 'email',
            contactValue: 'newuser@example.com',
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(500);
        expect(result.error).toContain('Failed to deliver OTP');
    });

    it('returns HTTP 500 when SMS provider throws an exception', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();
        mockSendSMS.mockRejectedValueOnce(new Error('Network timeout'));

        const result = await requestOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            contactValue: '+8801234567890',
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(500);
        expect(result.error).toContain('Failed to deliver OTP');
    });

    it('returns HTTP 500 when no active provider is available', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();
        mockGetActiveProvider.mockResolvedValueOnce(null);

        const result = await requestOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            contactValue: '+8801234567890',
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(500);
        expect(result.error).toContain('Failed to deliver OTP');
    });
});

// ===========================================================================
// Requirement 2.3: Max attempts boundary at exactly 5
// ===========================================================================
describe('Requirement 2.3: Max attempts boundary at exactly 5', () => {
    it('returns HTTP 429 on the 5th failed attempt', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        // Create an OTP record with 4 failed attempts (one away from limit)
        await OtpVerification.create({
            user_id: userId,
            otp_code: 'hashed:123456',
            method: 'sms',
            contact_type: 'phone',
            contact_value: '+8801234567890',
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            attempt_count: 4,
            verified: false,
        });

        // Submit wrong code — this is the 5th attempt
        const result = await verifyOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            code: '000000', // wrong code
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(429);
        expect(result.error).toContain('Maximum verification attempts exceeded');

        // Verify attempt_count is now 5
        const record = await OtpVerification.findOne({ user_id: userId }).lean();
        expect(record!.attempt_count).toBe(5);
    });

    it('returns HTTP 400 on the 4th failed attempt (still under limit)', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        await OtpVerification.create({
            user_id: userId,
            otp_code: 'hashed:123456',
            method: 'sms',
            contact_type: 'phone',
            contact_value: '+8801234567890',
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            attempt_count: 3,
            verified: false,
        });

        // Submit wrong code — this is the 4th attempt
        const result = await verifyOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            code: '000000',
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(400);
        expect(result.error).toContain('incorrect');
        expect(result.error).toContain('1 attempts remaining');
    });

    it('rejects verification when attempt_count is already at 5', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        await OtpVerification.create({
            user_id: userId,
            otp_code: 'hashed:123456',
            method: 'sms',
            contact_type: 'phone',
            contact_value: '+8801234567890',
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            attempt_count: 5,
            verified: false,
        });

        // Even with the correct code, should be rejected
        const result = await verifyOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            code: '123456',
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(429);
        expect(result.error).toContain('Maximum verification attempts exceeded');
    });
});

// ===========================================================================
// Requirement 2.4: Expiry boundary just past expires_at
// ===========================================================================
describe('Requirement 2.4: Expiry boundary just past expires_at', () => {
    it('returns HTTP 410 when OTP is 1ms past expiry', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        // Create an OTP that expired 1ms ago
        await OtpVerification.create({
            user_id: userId,
            otp_code: 'hashed:123456',
            method: 'sms',
            contact_type: 'phone',
            contact_value: '+8801234567890',
            expires_at: new Date(Date.now() - 1), // 1ms in the past
            attempt_count: 0,
            verified: false,
        });

        const result = await verifyOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            code: '123456',
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(410);
        expect(result.error).toContain('expired');
    });

    it('succeeds when OTP has not yet expired', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        // Create an OTP that expires 1 minute from now
        await OtpVerification.create({
            user_id: userId,
            otp_code: 'hashed:123456',
            method: 'sms',
            contact_type: 'phone',
            contact_value: '+8801234567890',
            expires_at: new Date(Date.now() + 60 * 1000),
            attempt_count: 0,
            verified: false,
        });

        const result = await verifyOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            code: '123456',
        });

        expect(result.success).toBe(true);
    });
});

// ===========================================================================
// Requirement 3.2: Hourly rate limit at exactly 5 requests
// ===========================================================================
describe('Requirement 3.2: Hourly rate limit at exactly 5 requests', () => {
    it('rejects the 6th OTP request within 1 hour with HTTP 429', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        // Pre-seed 5 OTP records created within the last hour but outside cooldown
        // Space them 2 minutes apart, starting 12 minutes ago
        for (let i = 0; i < 5; i++) {
            const createdAt = new Date(Date.now() - (12 - i * 2) * 60 * 1000);
            await OtpVerification.create({
                user_id: userId,
                otp_code: `hashed:${100000 + i}`,
                method: 'sms',
                contact_type: 'phone',
                contact_value: '+8801234567890',
                expires_at: new Date(createdAt.getTime() + 5 * 60 * 1000),
                attempt_count: 0,
                verified: true, // mark as verified so they don't get cleaned up
                createdAt,
                updatedAt: createdAt,
            });
        }

        // The 6th request should be rejected by the hourly limit
        const result = await requestOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            contactValue: '+8801234567890',
        });

        expect(result.success).toBe(false);
        expect(result.httpStatus).toBe(429);
        expect(result.error).toContain('maximum number of verification requests');
    });

    it('allows the 5th OTP request within 1 hour (at the boundary)', { timeout: 60_000 }, async () => {
        const userId = await createTestUser();

        // Pre-seed 4 OTP records created within the last hour but outside cooldown
        for (let i = 0; i < 4; i++) {
            const createdAt = new Date(Date.now() - (12 - i * 2) * 60 * 1000);
            await OtpVerification.create({
                user_id: userId,
                otp_code: `hashed:${100000 + i}`,
                method: 'sms',
                contact_type: 'phone',
                contact_value: '+8801234567890',
                expires_at: new Date(createdAt.getTime() + 5 * 60 * 1000),
                attempt_count: 0,
                verified: true,
                createdAt,
                updatedAt: createdAt,
            });
        }

        // The 5th request should succeed (limit is >= 5, so exactly 4 existing is OK)
        const result = await requestOtp({
            userId: userId.toHexString(),
            contactType: 'phone',
            contactValue: '+8801234567890',
        });

        expect(result.success).toBe(true);
    });
});
