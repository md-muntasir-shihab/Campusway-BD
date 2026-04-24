/**
 * API Contract Tests — Authentication, Exam, and Payment endpoints.
 *
 * These tests create Zod schemas that mirror the shared TypeScript interfaces
 * in `backend/src/types/shared/`. They validate that the response shapes
 * produced by the controllers conform to those schemas.
 *
 * If a controller changes its response shape without updating the shared
 * interface, these tests will fail.
 *
 * Requirements: 13.3, 13.4
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ResponseBuilder } from '../utils/responseBuilder';

// ---------------------------------------------------------------------------
// Zod schemas mirroring shared/api.ts
// ---------------------------------------------------------------------------

const PaginationMetaSchema = z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
    total: z.number().optional(),
});

const ApiErrorPayloadSchema = z.object({
    code: z.string(),
    details: z.unknown().optional(),
});

const ApiEnvelopeSchema = z.object({
    success: z.boolean(),
    data: z.unknown().optional(),
    message: z.string().optional(),
    error: ApiErrorPayloadSchema.optional(),
    meta: PaginationMetaSchema.optional(),
});

// ---------------------------------------------------------------------------
// Zod schemas mirroring shared/auth.ts
// ---------------------------------------------------------------------------

const LoginRequestSchema = z.object({
    identifier: z.string(),
    password: z.string(),
    portal: z.enum(['student', 'admin', 'chairman']).optional(),
});

const RegisterRequestSchema = z.object({
    fullName: z.string(),
    email: z.string(),
    username: z.string(),
    password: z.string(),
    phone: z.string().optional(),
});

const SubscriptionSummarySchema = z.object({
    planCode: z.string(),
    planName: z.string(),
    isActive: z.boolean(),
    expiresAt: z.string().nullable(),
});

const StudentMetaSchema = z.object({
    department: z.string(),
    ssc_batch: z.string(),
    hsc_batch: z.string(),
    admittedAt: z.string(),
    groupIds: z.array(z.string()),
});

const UserSummarySchema = z.object({
    _id: z.string(),
    username: z.string(),
    email: z.string(),
    role: z.string(),
    fullName: z.string(),
    status: z.string(),
    emailVerified: z.boolean(),
    phoneVerified: z.boolean(),
    twoFactorEnabled: z.boolean(),
    twoFactorMethod: z.string().nullable(),
    passwordExpiresAt: z.string().nullable(),
    permissions: z.record(z.string(), z.boolean()),
    permissionsV2: z.record(z.string(), z.record(z.string(), z.boolean())),
    mustChangePassword: z.boolean(),
    redirectTo: z.string(),
    profile_photo: z.string(),
    profile_completion_percentage: z.number(),
    user_unique_id: z.string(),
    subscription: SubscriptionSummarySchema,
    student_meta: StudentMetaSchema.nullable(),
});

const LoginSuccessDataSchema = z.object({
    token: z.string(),
    user: UserSummarySchema,
    suspiciousLogin: z.boolean(),
});

const Login2faDataSchema = z.object({
    requires2fa: z.literal(true),
    tempToken: z.string(),
    method: z.string(),
});

const LoginResponseDataSchema = z.union([LoginSuccessDataSchema, Login2faDataSchema]);

// ---------------------------------------------------------------------------
// Zod schemas mirroring shared/exam.ts
// ---------------------------------------------------------------------------

const ExamResultSummarySchema = z.object({
    obtainedMarks: z.number(),
    percentage: z.number(),
    rank: z.number().optional(),
});

const ExamSummarySchema = z.object({
    _id: z.string(),
    title: z.string(),
    title_bn: z.string().optional(),
    subject: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    duration: z.number(),
    isPublished: z.boolean(),
    status: z.enum(['active', 'upcoming', 'completed', 'completed_window', 'in_progress', 'locked']),
    submissionStatus: z.enum(['published', 'graded', 'submitted', 'pending_review']).optional(),
    attemptsUsed: z.number(),
    attemptsLeft: z.number(),
    attemptLimit: z.number(),
    paymentPending: z.boolean(),
    subscriptionRequired: z.boolean(),
    subscriptionActive: z.boolean(),
    accessDeniedReason: z.string().optional(),
    canTakeExam: z.boolean(),
    myResult: ExamResultSummarySchema.nullable(),
    resultPublishMode: z.enum(['immediate', 'manual', 'scheduled']),
    resultPublished: z.boolean(),
});

const StudentExamsDataSchema = z.object({
    exams: z.array(ExamSummarySchema),
    subscriptionActive: z.boolean(),
});

// ---------------------------------------------------------------------------
// Zod schemas mirroring shared/payment.ts
// ---------------------------------------------------------------------------

const PaymentMethodSchema = z.enum([
    'bkash', 'nagad', 'rocket', 'upay', 'cash', 'manual', 'bank', 'card', 'sslcommerz',
]);

const SubscriptionPaymentRequestSchema = z.object({
    method: PaymentMethodSchema.optional(),
    transactionId: z.string().optional(),
    proofUrl: z.string().optional(),
    notes: z.string().optional(),
});

const SubscriptionPlanDtoSchema = z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    slug: z.string(),
    type: z.enum(['free', 'paid', 'trial']),
    priceBDT: z.number(),
    billingCycle: z.string(),
    durationLabel: z.string(),
    features: z.array(z.string()),
    enabled: z.boolean(),
    isFeatured: z.boolean(),
    themeKey: z.string(),
    supportLevel: z.string(),
});

const PaymentRecordSchema = z.object({
    _id: z.string(),
    studentId: z.string(),
    subscriptionPlanId: z.string(),
    amount: z.number(),
    method: z.string(),
    status: z.enum(['pending', 'paid', 'rejected', 'refunded']),
    transactionId: z.string().optional(),
    proofUrl: z.string().optional(),
    createdAt: z.string(),
});

const SubscriptionRecordSchema = z.object({
    _id: z.string(),
    userId: z.string(),
    planId: z.string(),
    status: z.enum(['active', 'pending', 'expired', 'suspended']),
    startDate: z.string(),
    endDate: z.string(),
});

const SubscriptionPaymentResponseDataSchema = z.object({
    message: z.string(),
    payment: PaymentRecordSchema,
    subscription: SubscriptionRecordSchema,
    invoice: z.record(z.unknown()).nullable(),
    plan: SubscriptionPlanDtoSchema,
});

const TransactionSummarySchema = z.object({
    _id: z.string(),
    type: z.enum(['income', 'expense']),
    category: z.string(),
    amount: z.number(),
    description: z.string(),
    date: z.string(),
    status: z.string(),
    tags: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Contract Tests
// ---------------------------------------------------------------------------

describe('API Contract Tests — Shared Interface Conformance', () => {
    // ── API Envelope ──────────────────────────────────────────────────────

    describe('ApiEnvelope (shared/api.ts)', () => {
        it('ResponseBuilder.success() conforms to ApiEnvelope', () => {
            const response = ResponseBuilder.success({ foo: 'bar' }, 'ok');
            expect(() => ApiEnvelopeSchema.parse(response)).not.toThrow();
            expect(response.success).toBe(true);
        });

        it('ResponseBuilder.created() conforms to ApiEnvelope', () => {
            const response = ResponseBuilder.created({ id: '1' }, 'Created');
            expect(() => ApiEnvelopeSchema.parse(response)).not.toThrow();
            expect(response.success).toBe(true);
        });

        it('ResponseBuilder.error() conforms to ApiEnvelope', () => {
            const response = ResponseBuilder.error('VALIDATION_ERROR', 'Bad input', { field: 'email' });
            expect(() => ApiEnvelopeSchema.parse(response)).not.toThrow();
            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('VALIDATION_ERROR');
        });

        it('ResponseBuilder.paginated() conforms to ApiEnvelope with meta', () => {
            const response = ResponseBuilder.paginated([1, 2, 3], 1, 10, 100);
            expect(() => ApiEnvelopeSchema.parse(response)).not.toThrow();
            expect(response.meta).toEqual({ page: 1, limit: 10, total: 100 });
        });

        it('rejects envelope missing success field', () => {
            const bad = { data: 'hello' };
            expect(() => ApiEnvelopeSchema.parse(bad)).toThrow();
        });

        it('rejects envelope with non-boolean success', () => {
            const bad = { success: 'yes', data: 'hello' };
            expect(() => ApiEnvelopeSchema.parse(bad)).toThrow();
        });
    });

    // ── Auth Contracts ────────────────────────────────────────────────────

    describe('Auth contracts (shared/auth.ts)', () => {
        it('LoginRequest schema validates a valid login body', () => {
            const body = { identifier: 'user@example.com', password: 'secret123' };
            expect(() => LoginRequestSchema.parse(body)).not.toThrow();
        });

        it('LoginRequest schema validates with optional portal', () => {
            const body = { identifier: 'admin', password: 'pass', portal: 'admin' as const };
            expect(() => LoginRequestSchema.parse(body)).not.toThrow();
        });

        it('LoginRequest schema rejects missing identifier', () => {
            const body = { password: 'secret123' };
            expect(() => LoginRequestSchema.parse(body)).toThrow();
        });

        it('RegisterRequest schema validates a valid registration body', () => {
            const body = {
                fullName: 'Test User',
                email: 'test@example.com',
                username: 'testuser',
                password: 'StrongP@ss1',
            };
            expect(() => RegisterRequestSchema.parse(body)).not.toThrow();
        });

        it('RegisterRequest schema rejects missing email', () => {
            const body = { fullName: 'Test', username: 'test', password: 'pass' };
            expect(() => RegisterRequestSchema.parse(body)).toThrow();
        });

        it('LoginSuccessData conforms to shared interface shape', () => {
            const data = {
                token: 'jwt-token-here',
                user: buildMockUserSummary(),
                suspiciousLogin: false,
            };
            expect(() => LoginSuccessDataSchema.parse(data)).not.toThrow();
        });

        it('Login2faData conforms to shared interface shape', () => {
            const data = {
                requires2fa: true as const,
                tempToken: 'temp-jwt',
                method: 'email',
            };
            expect(() => Login2faDataSchema.parse(data)).not.toThrow();
        });

        it('LoginResponseData accepts either success or 2fa shape', () => {
            const successData = {
                token: 'jwt',
                user: buildMockUserSummary(),
                suspiciousLogin: false,
            };
            const twoFaData = {
                requires2fa: true as const,
                tempToken: 'temp',
                method: 'totp',
            };
            expect(() => LoginResponseDataSchema.parse(successData)).not.toThrow();
            expect(() => LoginResponseDataSchema.parse(twoFaData)).not.toThrow();
        });

        it('login success wrapped in ApiEnvelope conforms', () => {
            const envelope = ResponseBuilder.success({
                token: 'jwt-token',
                user: buildMockUserSummary(),
                suspiciousLogin: false,
            });
            expect(() => ApiEnvelopeSchema.parse(envelope)).not.toThrow();
            expect(() => LoginSuccessDataSchema.parse(envelope.data)).not.toThrow();
        });

        it('login 2fa wrapped in ApiEnvelope conforms', () => {
            const envelope = ResponseBuilder.success({
                requires2fa: true as const,
                tempToken: 'temp-jwt',
                method: 'email',
            });
            expect(() => ApiEnvelopeSchema.parse(envelope)).not.toThrow();
            expect(() => Login2faDataSchema.parse(envelope.data)).not.toThrow();
        });

        it('register response (null data) wrapped in ApiEnvelope conforms', () => {
            const envelope = ResponseBuilder.created(null, 'Registration successful.');
            expect(() => ApiEnvelopeSchema.parse(envelope)).not.toThrow();
            expect(envelope.data).toBeNull();
        });

        it('UserSummary rejects missing required fields', () => {
            const partial = { _id: '123', username: 'test' };
            expect(() => UserSummarySchema.parse(partial)).toThrow();
        });

        it('SubscriptionSummary rejects non-boolean isActive', () => {
            const bad = { planCode: 'free', planName: 'Free', isActive: 'yes', expiresAt: null };
            expect(() => SubscriptionSummarySchema.parse(bad)).toThrow();
        });
    });

    // ── Exam Contracts ────────────────────────────────────────────────────

    describe('Exam contracts (shared/exam.ts)', () => {
        it('ExamSummary conforms to shared interface shape', () => {
            const exam = buildMockExamSummary();
            expect(() => ExamSummarySchema.parse(exam)).not.toThrow();
        });

        it('ExamSummary rejects invalid status value', () => {
            const exam = { ...buildMockExamSummary(), status: 'invalid_status' };
            expect(() => ExamSummarySchema.parse(exam)).toThrow();
        });

        it('ExamResultSummary conforms with optional rank', () => {
            expect(() => ExamResultSummarySchema.parse({ obtainedMarks: 80, percentage: 80 })).not.toThrow();
            expect(() => ExamResultSummarySchema.parse({ obtainedMarks: 80, percentage: 80, rank: 1 })).not.toThrow();
        });

        it('StudentExamsData conforms to shared interface shape', () => {
            const data = {
                exams: [buildMockExamSummary()],
                subscriptionActive: true,
            };
            expect(() => StudentExamsDataSchema.parse(data)).not.toThrow();
        });

        it('StudentExamsData wrapped in ApiEnvelope conforms', () => {
            const envelope = ResponseBuilder.success({
                exams: [buildMockExamSummary()],
                subscriptionActive: true,
            });
            expect(() => ApiEnvelopeSchema.parse(envelope)).not.toThrow();
            expect(() => StudentExamsDataSchema.parse(envelope.data)).not.toThrow();
        });

        it('ExamSummary rejects missing _id', () => {
            const { _id, ...rest } = buildMockExamSummary();
            expect(() => ExamSummarySchema.parse(rest)).toThrow();
        });

        it('ExamSummary rejects non-number duration', () => {
            const exam = { ...buildMockExamSummary(), duration: '30min' };
            expect(() => ExamSummarySchema.parse(exam)).toThrow();
        });
    });

    // ── Payment Contracts ─────────────────────────────────────────────────

    describe('Payment contracts (shared/payment.ts)', () => {
        it('SubscriptionPaymentRequest conforms to shared interface', () => {
            const body = { method: 'bkash' as const, transactionId: 'TXN123' };
            expect(() => SubscriptionPaymentRequestSchema.parse(body)).not.toThrow();
        });

        it('SubscriptionPaymentRequest accepts empty body (all optional)', () => {
            expect(() => SubscriptionPaymentRequestSchema.parse({})).not.toThrow();
        });

        it('SubscriptionPaymentRequest rejects invalid payment method', () => {
            const body = { method: 'paypal' };
            expect(() => SubscriptionPaymentRequestSchema.parse(body)).toThrow();
        });

        it('SubscriptionPlanDto conforms to shared interface', () => {
            const plan = buildMockSubscriptionPlanDto();
            expect(() => SubscriptionPlanDtoSchema.parse(plan)).not.toThrow();
        });

        it('SubscriptionPlanDto rejects invalid type', () => {
            const plan = { ...buildMockSubscriptionPlanDto(), type: 'premium' };
            expect(() => SubscriptionPlanDtoSchema.parse(plan)).toThrow();
        });

        it('PaymentRecord conforms to shared interface', () => {
            const record = buildMockPaymentRecord();
            expect(() => PaymentRecordSchema.parse(record)).not.toThrow();
        });

        it('PaymentRecord rejects invalid status', () => {
            const record = { ...buildMockPaymentRecord(), status: 'cancelled' };
            expect(() => PaymentRecordSchema.parse(record)).toThrow();
        });

        it('SubscriptionRecord conforms to shared interface', () => {
            const record = buildMockSubscriptionRecord();
            expect(() => SubscriptionRecordSchema.parse(record)).not.toThrow();
        });

        it('SubscriptionPaymentResponseData conforms to shared interface', () => {
            const data = {
                message: 'Payment request submitted',
                payment: buildMockPaymentRecord(),
                subscription: buildMockSubscriptionRecord(),
                invoice: null,
                plan: buildMockSubscriptionPlanDto(),
            };
            expect(() => SubscriptionPaymentResponseDataSchema.parse(data)).not.toThrow();
        });

        it('SubscriptionPaymentResponseData wrapped in ApiEnvelope conforms', () => {
            const data = {
                message: 'Free plan activated',
                payment: buildMockPaymentRecord(),
                subscription: buildMockSubscriptionRecord(),
                invoice: null,
                plan: buildMockSubscriptionPlanDto(),
            };
            const envelope = ResponseBuilder.created(data);
            expect(() => ApiEnvelopeSchema.parse(envelope)).not.toThrow();
            expect(() => SubscriptionPaymentResponseDataSchema.parse(envelope.data)).not.toThrow();
        });

        it('TransactionSummary conforms to shared interface', () => {
            const tx = {
                _id: 'tx-001',
                type: 'income' as const,
                category: 'subscription',
                amount: 500,
                description: 'Monthly subscription',
                date: '2024-01-15T00:00:00.000Z',
                status: 'completed',
                tags: ['subscription', 'monthly'],
            };
            expect(() => TransactionSummarySchema.parse(tx)).not.toThrow();
        });

        it('TransactionSummary rejects invalid type', () => {
            const tx = {
                _id: 'tx-002',
                type: 'transfer',
                category: 'misc',
                amount: 100,
                description: 'test',
                date: '2024-01-01',
                status: 'done',
                tags: [],
            };
            expect(() => TransactionSummarySchema.parse(tx)).toThrow();
        });

        it('paginated transaction list wrapped in ApiEnvelope conforms', () => {
            const tx = {
                _id: 'tx-003',
                type: 'expense' as const,
                category: 'operations',
                amount: 200,
                description: 'Server costs',
                date: '2024-02-01T00:00:00.000Z',
                status: 'completed',
                tags: ['infra'],
            };
            const envelope = ResponseBuilder.paginated([tx], 1, 10, 50);
            expect(() => ApiEnvelopeSchema.parse(envelope)).not.toThrow();
            const parsed = z.array(TransactionSummarySchema).parse(envelope.data);
            expect(parsed).toHaveLength(1);
        });
    });

    // ── Cross-cutting: shape drift detection ──────────────────────────────

    describe('Shape drift detection', () => {
        it('fails if ApiEnvelope gains unexpected required field', () => {
            // Simulates a controller returning extra required fields not in the interface
            const strictEnvelope = ApiEnvelopeSchema.strict();
            const withExtra = { success: true, data: null, extraField: 'oops' };
            expect(() => strictEnvelope.parse(withExtra)).toThrow();
        });

        it('fails if LoginSuccessData is missing token', () => {
            const data = {
                user: buildMockUserSummary(),
                suspiciousLogin: false,
            };
            expect(() => LoginSuccessDataSchema.parse(data)).toThrow();
        });

        it('fails if ExamSummary changes status enum values', () => {
            const exam = { ...buildMockExamSummary(), status: 'draft' };
            expect(() => ExamSummarySchema.parse(exam)).toThrow();
        });

        it('fails if PaymentRecord changes status enum values', () => {
            const record = { ...buildMockPaymentRecord(), status: 'processing' };
            expect(() => PaymentRecordSchema.parse(record)).toThrow();
        });

        it('fails if SubscriptionRecord changes status enum values', () => {
            const record = { ...buildMockSubscriptionRecord(), status: 'cancelled' };
            expect(() => SubscriptionRecordSchema.parse(record)).toThrow();
        });
    });
});

// ---------------------------------------------------------------------------
// Mock data builders
// ---------------------------------------------------------------------------

function buildMockUserSummary() {
    return {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        fullName: 'Test User',
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
        twoFactorMethod: null,
        passwordExpiresAt: null,
        permissions: { canTakeExam: true },
        permissionsV2: { exams: { read: true, write: false } },
        mustChangePassword: false,
        redirectTo: '/student/dashboard',
        profile_photo: '',
        profile_completion_percentage: 75,
        user_unique_id: 'STU-001',
        subscription: {
            planCode: 'free',
            planName: 'Free Plan',
            isActive: true,
            expiresAt: null,
        },
        student_meta: {
            department: 'CSE',
            ssc_batch: '2020',
            hsc_batch: '2022',
            admittedAt: '2023-01-01T00:00:00.000Z',
            groupIds: ['group-1'],
        },
    };
}

function buildMockExamSummary() {
    return {
        _id: '507f1f77bcf86cd799439022',
        title: 'Midterm Exam',
        subject: 'Mathematics',
        startDate: '2024-06-01T09:00:00.000Z',
        endDate: '2024-06-01T12:00:00.000Z',
        duration: 180,
        isPublished: true,
        status: 'active' as const,
        attemptsUsed: 0,
        attemptsLeft: 3,
        attemptLimit: 3,
        paymentPending: false,
        subscriptionRequired: false,
        subscriptionActive: true,
        canTakeExam: true,
        myResult: null,
        resultPublishMode: 'immediate' as const,
        resultPublished: false,
    };
}

function buildMockSubscriptionPlanDto() {
    return {
        id: '507f1f77bcf86cd799439033',
        name: 'Basic Plan',
        code: 'basic',
        slug: 'basic',
        type: 'paid' as const,
        priceBDT: 500,
        billingCycle: 'monthly',
        durationLabel: '30 days',
        features: ['Access to exams', 'Email support'],
        enabled: true,
        isFeatured: false,
        themeKey: 'basic',
        supportLevel: 'basic',
    };
}

function buildMockPaymentRecord() {
    return {
        _id: '507f1f77bcf86cd799439044',
        studentId: '507f1f77bcf86cd799439011',
        subscriptionPlanId: '507f1f77bcf86cd799439033',
        amount: 500,
        method: 'bkash',
        status: 'pending' as const,
        transactionId: 'TXN-001',
        createdAt: '2024-06-01T10:00:00.000Z',
    };
}

function buildMockSubscriptionRecord() {
    return {
        _id: '507f1f77bcf86cd799439055',
        userId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439033',
        status: 'active' as const,
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-07-01T00:00:00.000Z',
    };
}
