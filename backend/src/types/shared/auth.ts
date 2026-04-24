/**
 * Shared auth API request/response types.
 *
 * Derived from the actual shapes used in `authController.ts`.
 */

import type { ApiEnvelope } from './api';

/** Body sent to POST /api/auth/login */
export interface LoginRequest {
    /** Email or username */
    identifier: string;
    password: string;
    /** Optional portal hint: student, admin, or chairman */
    portal?: 'student' | 'admin' | 'chairman';
}

/** Body sent to POST /api/auth/register */
export interface RegisterRequest {
    fullName: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
}

/** Subscription summary embedded in the user payload. */
export interface SubscriptionSummary {
    planCode: string;
    planName: string;
    isActive: boolean;
    expiresAt: string | null;
}

/** User payload returned inside login / session responses. */
export interface UserSummary {
    _id: string;
    username: string;
    email: string;
    role: string;
    fullName: string;
    status: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    twoFactorEnabled: boolean;
    twoFactorMethod: string | null;
    passwordExpiresAt: string | null;
    permissions: Record<string, boolean>;
    permissionsV2: Record<string, Record<string, boolean>>;
    mustChangePassword: boolean;
    redirectTo: string;
    profile_photo: string;
    profile_completion_percentage: number;
    user_unique_id: string;
    subscription: SubscriptionSummary;
    student_meta: StudentMeta | null;
}

/** Student-specific metadata included in the user payload. */
export interface StudentMeta {
    department: string;
    ssc_batch: string;
    hsc_batch: string;
    admittedAt: string;
    groupIds: string[];
}

/** Successful login data (credentials accepted, no 2FA required). */
export interface LoginSuccessData {
    token: string;
    user: UserSummary;
    suspiciousLogin: boolean;
}

/** Login data when two-factor authentication is required. */
export interface Login2faData {
    requires2fa: true;
    tempToken: string;
    method: string;
}

/** Union of possible login response data shapes. */
export type LoginResponseData = LoginSuccessData | Login2faData;

/** Full typed login response envelope. */
export type LoginResponse = ApiEnvelope<LoginResponseData>;

/** Full typed register response envelope. */
export type RegisterResponse = ApiEnvelope<null>;
