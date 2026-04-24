/**
 * Test fixture factory functions for generating model instances.
 *
 * Each factory returns a plain object with sensible defaults that can be
 * overridden via a partial. Use with mongodb-memory-server for integration tests
 * or standalone for unit tests.
 *
 * Requirements: 14.4
 */
import mongoose from 'mongoose';

// ── Types ────────────────────────────────────────────────────────────

type UserRole = 'superadmin' | 'admin' | 'moderator' | 'editor' | 'viewer' | 'support_agent' | 'finance_agent' | 'student' | 'chairman';
type UserStatus = 'active' | 'suspended' | 'blocked' | 'pending';

interface UserFixture {
    full_name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    permissions: {
        canEditExams: boolean;
        canManageStudents: boolean;
        canViewReports: boolean;
        canDeleteData: boolean;
        canManageFinance: boolean;
        canManagePlans: boolean;
        canManageTickets: boolean;
        canManageBackups: boolean;
        canRevealPasswords: boolean;
    };
    twoFactorEnabled: boolean;
    loginAttempts: number;
    mustChangePassword: boolean;
    passwordResetRequired: boolean;
    forcePasswordResetRequired: boolean;
}

interface ExamFixture {
    title: string;
    subject: string;
    totalQuestions: number;
    totalMarks: number;
    duration: number;
    negativeMarking: boolean;
    negativeMarkValue: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    allowBackNavigation: boolean;
    showQuestionPalette: boolean;
    showRemainingTime: boolean;
    autoSubmitOnTimeout: boolean;
    allowPause: boolean;
    startDate: Date;
    endDate: Date;
    scheduleWindows: Array<{ startDateTimeUTC: Date; endDateTimeUTC: Date }>;
    resultPublishDate: Date;
    isPublished: boolean;
    status: 'draft' | 'scheduled' | 'live' | 'closed';
    deliveryMode: 'internal' | 'external_link';
    createdBy: mongoose.Types.ObjectId;
}

interface StudentFixture {
    user_id: mongoose.Types.ObjectId;
    user_unique_id: string;
    full_name: string;
    email: string;
    phone_number: string;
    gender: 'male' | 'female' | 'other';
    department: 'science' | 'arts' | 'commerce';
    institution_name: string;
    profile_completion_percentage: number;
    points: number;
    country: string;
}

interface SubscriptionFixture {
    userId: string;
    planId: string;
    status: 'active' | 'expired' | 'pending' | 'suspended';
    startAtUTC: Date;
    expiresAtUTC: Date;
    paymentId: string;
    notes: string;
}

// ── Counters for unique values ───────────────────────────────────────

let userCounter = 0;
let examCounter = 0;
let studentCounter = 0;
let subscriptionCounter = 0;

/**
 * Reset all factory counters. Call in beforeEach if you need deterministic IDs.
 */
export function resetFactoryCounters(): void {
    userCounter = 0;
    examCounter = 0;
    studentCounter = 0;
    subscriptionCounter = 0;
}

// ── Factory Functions ────────────────────────────────────────────────

/**
 * Build a User fixture with sensible defaults.
 */
export function buildUser(overrides: Partial<UserFixture> = {}): UserFixture {
    userCounter++;
    return {
        full_name: `Test User ${userCounter}`,
        username: `testuser${userCounter}`,
        email: `testuser${userCounter}@example.com`,
        password: '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12', // bcrypt hash placeholder
        role: 'student',
        status: 'active',
        permissions: {
            canEditExams: false,
            canManageStudents: false,
            canViewReports: false,
            canDeleteData: false,
            canManageFinance: false,
            canManagePlans: false,
            canManageTickets: false,
            canManageBackups: false,
            canRevealPasswords: false,
        },
        twoFactorEnabled: false,
        loginAttempts: 0,
        mustChangePassword: false,
        passwordResetRequired: false,
        forcePasswordResetRequired: false,
        ...overrides,
    };
}

/**
 * Build an admin User fixture.
 */
export function buildAdminUser(overrides: Partial<UserFixture> = {}): UserFixture {
    return buildUser({
        role: 'admin',
        permissions: {
            canEditExams: true,
            canManageStudents: true,
            canViewReports: true,
            canDeleteData: false,
            canManageFinance: false,
            canManagePlans: true,
            canManageTickets: true,
            canManageBackups: false,
            canRevealPasswords: false,
        },
        ...overrides,
    });
}

/**
 * Build an Exam fixture with sensible defaults.
 */
export function buildExam(overrides: Partial<ExamFixture> = {}): ExamFixture {
    examCounter++;
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    return {
        title: `Test Exam ${examCounter}`,
        subject: 'Physics',
        totalQuestions: 30,
        totalMarks: 30,
        duration: 60,
        negativeMarking: false,
        negativeMarkValue: 0,
        randomizeQuestions: true,
        randomizeOptions: true,
        allowBackNavigation: true,
        showQuestionPalette: true,
        showRemainingTime: true,
        autoSubmitOnTimeout: true,
        allowPause: false,
        startDate,
        endDate,
        scheduleWindows: [{ startDateTimeUTC: startDate, endDateTimeUTC: endDate }],
        resultPublishDate: endDate,
        isPublished: false,
        status: 'draft',
        deliveryMode: 'internal',
        createdBy: new mongoose.Types.ObjectId(),
        ...overrides,
    };
}

/**
 * Build a StudentProfile fixture with sensible defaults.
 */
export function buildStudent(overrides: Partial<StudentFixture> = {}): StudentFixture {
    studentCounter++;
    return {
        user_id: new mongoose.Types.ObjectId(),
        user_unique_id: `STU-${String(studentCounter).padStart(4, '0')}`,
        full_name: `Test Student ${studentCounter}`,
        email: `student${studentCounter}@example.com`,
        phone_number: `+8801700000${String(studentCounter).padStart(3, '0')}`,
        gender: 'male',
        department: 'science',
        institution_name: 'Test College',
        profile_completion_percentage: 80,
        points: 0,
        country: 'Bangladesh',
        ...overrides,
    };
}

/**
 * Build a Subscription fixture with sensible defaults.
 */
export function buildSubscription(overrides: Partial<SubscriptionFixture> = {}): SubscriptionFixture {
    subscriptionCounter++;
    const now = new Date();
    return {
        userId: new mongoose.Types.ObjectId().toString(),
        planId: new mongoose.Types.ObjectId().toString(),
        status: 'active',
        startAtUTC: now,
        expiresAtUTC: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
        paymentId: `PAY-${String(subscriptionCounter).padStart(6, '0')}`,
        notes: '',
        ...overrides,
    };
}

// ── Database-persisting helpers (require mongoose connection) ─────────

/**
 * Create and persist a User document. Requires an active mongoose connection.
 */
export async function createUser(overrides: Partial<UserFixture> = {}): Promise<mongoose.Document> {
    const { default: UserModel } = await import('../../models/User');
    const data = buildUser(overrides);
    return UserModel.create(data);
}

/**
 * Create and persist an Exam document. Requires an active mongoose connection.
 */
export async function createExam(overrides: Partial<ExamFixture> = {}): Promise<mongoose.Document> {
    const { default: ExamModel } = await import('../../models/Exam');
    const data = buildExam(overrides);
    return ExamModel.create(data);
}

/**
 * Create and persist a StudentProfile document. Requires an active mongoose connection.
 */
export async function createStudent(overrides: Partial<StudentFixture> = {}): Promise<mongoose.Document> {
    const { default: StudentProfileModel } = await import('../../models/StudentProfile');
    const data = buildStudent(overrides);
    return StudentProfileModel.create(data);
}

/**
 * Create and persist a Subscription document. Requires an active mongoose connection.
 */
export async function createSubscription(overrides: Partial<SubscriptionFixture> = {}): Promise<mongoose.Document> {
    const { SubscriptionModel } = await import('../../models/subscription.model');
    const data = buildSubscription(overrides);
    return SubscriptionModel.create(data);
}
