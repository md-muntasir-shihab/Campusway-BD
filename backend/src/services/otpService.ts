import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import OtpVerification from '../models/OtpVerification';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import {
    sendSMS,
    sendEmail,
    getActiveProvider,
    SendSMSOptions,
    SendEmailOptions,
} from './notificationProviderService';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface RequestOtpInput {
    userId: string;
    contactType: 'phone' | 'email';
    contactValue: string;
}

export interface VerifyOtpInput {
    userId: string;
    contactType: 'phone' | 'email';
    code: string;
}

export interface OtpResult {
    success: boolean;
    error?: string;
    httpStatus?: number;
    cooldownRemaining?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const BCRYPT_SALT_ROUNDS = 10;
const COOLDOWN_SECONDS = 60;
const HOURLY_LIMIT = 5;
const HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms
const MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// generateOtp — returns a 6-digit numeric string (zero-padded)
// ---------------------------------------------------------------------------

export function generateOtp(): string {
    const min = Math.pow(10, OTP_LENGTH - 1); // 100000
    const max = Math.pow(10, OTP_LENGTH) - 1;  // 999999
    const code = Math.floor(min + Math.random() * (max - min + 1));
    return String(code).padStart(OTP_LENGTH, '0');
}

// ---------------------------------------------------------------------------
// checkRateLimit — enforces 60-second cooldown and 5-per-hour limit
// Returns null when the request is allowed, or an OtpResult with error info.
// ---------------------------------------------------------------------------

export async function checkRateLimit(
    userId: string,
    contactType: string,
): Promise<OtpResult | null> {
    const userOid = new mongoose.Types.ObjectId(userId);
    const now = new Date();

    // --- 60-second cooldown ---
    const mostRecent = await OtpVerification.findOne({
        user_id: userOid,
        contact_type: contactType,
    })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean();

    if (mostRecent) {
        const elapsedMs = now.getTime() - new Date(mostRecent.createdAt).getTime();
        const elapsedSeconds = elapsedMs / 1000;
        if (elapsedSeconds < COOLDOWN_SECONDS) {
            const remaining = Math.ceil(COOLDOWN_SECONDS - elapsedSeconds);
            return {
                success: false,
                error: `Please wait ${remaining} seconds before requesting a new code.`,
                httpStatus: 429,
                cooldownRemaining: remaining,
            };
        }
    }

    // --- 5-per-hour rolling window ---
    const oneHourAgo = new Date(now.getTime() - HOURLY_WINDOW_MS);
    const countInWindow = await OtpVerification.countDocuments({
        user_id: userOid,
        contact_type: contactType,
        createdAt: { $gte: oneHourAgo },
    });

    if (countInWindow >= HOURLY_LIMIT) {
        return {
            success: false,
            error: "You've reached the maximum number of verification requests. Please try again later.",
            httpStatus: 429,
        };
    }

    return null; // allowed
}

// ---------------------------------------------------------------------------
// requestOtp — full OTP request flow
// 1. Check rate limits
// 2. Delete existing unverified records for same user + contactType
// 3. Generate OTP, bcrypt-hash it
// 4. Create OtpVerification record with 5-minute expiry
// 5. Dispatch via SMS or email
// 6. Return error on delivery failure
// ---------------------------------------------------------------------------

export async function requestOtp(input: RequestOtpInput): Promise<OtpResult> {
    const { userId, contactType, contactValue } = input;

    // 1. Rate-limit check
    const rateLimitResult = await checkRateLimit(userId, contactType);
    if (rateLimitResult) return rateLimitResult;

    const userOid = new mongoose.Types.ObjectId(userId);

    // 2. Delete existing unverified records for same user + contactType
    await OtpVerification.deleteMany({
        user_id: userOid,
        contact_type: contactType,
        verified: false,
    });

    // 3. Generate OTP and bcrypt-hash it
    const otpCode = generateOtp();
    const hashedCode = await bcrypt.hash(otpCode, BCRYPT_SALT_ROUNDS);

    // 4. Create OtpVerification record with 5-minute expiry
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await OtpVerification.create({
        user_id: userOid,
        otp_code: hashedCode,
        method: contactType === 'phone' ? 'sms' : 'email',
        contact_type: contactType,
        contact_value: contactValue,
        expires_at: expiresAt,
        attempt_count: 0,
        verified: false,
    });

    // 5. Dispatch via SMS or email
    const channel: 'sms' | 'email' = contactType === 'phone' ? 'sms' : 'email';
    const provider = await getActiveProvider(channel);
    if (!provider) {
        return {
            success: false,
            error: 'Failed to deliver OTP. Please try again.',
            httpStatus: 500,
        };
    }

    try {
        let sendResult;
        if (channel === 'sms') {
            const smsOptions: SendSMSOptions = {
                to: contactValue,
                body: `Your CampusWay verification code is: ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
            };
            sendResult = await sendSMS(smsOptions, provider);
        } else {
            const emailOptions: SendEmailOptions = {
                to: contactValue,
                subject: 'CampusWay: Your Verification Code',
                html: `<div style="font-family:sans-serif;padding:20px">
                    <h2>Contact Verification</h2>
                    <p>Your verification code is:</p>
                    <h1 style="letter-spacing:8px;font-size:36px;color:#4f46e5">${otpCode}</h1>
                    <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
                    <p style="color:#666">If you did not request this, please ignore this email.</p>
                </div>`,
                text: `Your CampusWay verification code is: ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
            };
            sendResult = await sendEmail(emailOptions, provider);
        }

        if (!sendResult.success) {
            return {
                success: false,
                error: 'Failed to deliver OTP. Please try again.',
                httpStatus: 500,
            };
        }
    } catch {
        return {
            success: false,
            error: 'Failed to deliver OTP. Please try again.',
            httpStatus: 500,
        };
    }

    return { success: true };
}

// ---------------------------------------------------------------------------
// verifyOtp — verify submitted OTP code and apply contact change on success
// 1. Find matching unverified OtpVerification record
// 2. Check expiry (HTTP 410)
// 3. Check max attempts reached (HTTP 429)
// 4. Compare bcrypt hash; increment attempt_count on mismatch (HTTP 400)
// 5. On success: mark verified, update User + StudentProfile contact fields
// ---------------------------------------------------------------------------

export async function verifyOtp(input: VerifyOtpInput): Promise<OtpResult> {
    const { userId, contactType, code } = input;
    const userOid = new mongoose.Types.ObjectId(userId);

    // 1. Find the most recent unverified record for this user + contactType
    const record = await OtpVerification.findOne({
        user_id: userOid,
        contact_type: contactType,
        verified: false,
    }).sort({ createdAt: -1 });

    if (!record) {
        return {
            success: false,
            error: 'No pending verification found. Please request a new code.',
            httpStatus: 404,
        };
    }

    // 2. Check expiry
    if (new Date() > new Date(record.expires_at)) {
        return {
            success: false,
            error: 'This verification code has expired. Please request a new one.',
            httpStatus: 410,
        };
    }

    // 3. Check if max attempts already reached
    if (record.attempt_count >= MAX_ATTEMPTS) {
        return {
            success: false,
            error: 'Maximum verification attempts exceeded. Please request a new code.',
            httpStatus: 429,
        };
    }

    // 4. Compare submitted code against bcrypt hash
    const isMatch = await bcrypt.compare(code, record.otp_code);

    if (!isMatch) {
        record.attempt_count += 1;
        await record.save();

        // If this attempt pushed us to the limit, return 429
        if (record.attempt_count >= MAX_ATTEMPTS) {
            return {
                success: false,
                error: 'Maximum verification attempts exceeded. Please request a new code.',
                httpStatus: 429,
            };
        }

        const remaining = MAX_ATTEMPTS - record.attempt_count;
        return {
            success: false,
            error: `The code you entered is incorrect. ${remaining} attempts remaining.`,
            httpStatus: 400,
        };
    }

    // 5. Success — mark record as verified
    record.verified = true;
    await record.save();

    const contactValue = record.contact_value;

    // Update User and StudentProfile based on contactType
    if (contactType === 'phone') {
        await User.updateOne(
            { _id: userOid },
            { phone_number: contactValue, phoneVerifiedAt: new Date() },
        );
        // Synchronize both phone and phone_number on StudentProfile
        await StudentProfile.updateOne(
            { user_id: userOid },
            { phone_number: contactValue, phone: contactValue },
        );
    } else {
        // email
        await User.updateOne(
            { _id: userOid },
            { email: contactValue, emailVerifiedAt: new Date() },
        );
        await StudentProfile.updateOne(
            { user_id: userOid },
            { email: contactValue },
        );
    }

    return { success: true };
}
