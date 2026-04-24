/**
 * Shared exam API request/response types.
 *
 * Derived from the actual shapes used in `examController.ts`.
 */

import type { ApiEnvelope } from './api';

/** Exam result summary embedded in student exam list items. */
export interface ExamResultSummary {
    obtainedMarks: number;
    percentage: number;
    rank?: number;
}

/** Single exam item returned by GET /api/exams (student list). */
export interface ExamSummary {
    _id: string;
    title: string;
    title_bn?: string;
    subject: string;
    startDate: string;
    endDate: string;
    duration: number;
    isPublished: boolean;
    status: 'active' | 'upcoming' | 'completed' | 'completed_window' | 'in_progress' | 'locked';
    submissionStatus?: 'published' | 'graded' | 'submitted' | 'pending_review';
    attemptsUsed: number;
    attemptsLeft: number;
    attemptLimit: number;
    paymentPending: boolean;
    subscriptionRequired: boolean;
    subscriptionActive: boolean;
    accessDeniedReason?: string;
    canTakeExam: boolean;
    myResult: ExamResultSummary | null;
    resultPublishMode: 'immediate' | 'manual' | 'scheduled';
    resultPublished: boolean;
}

/** Response data for the student exam list endpoint. */
export interface StudentExamsData {
    exams: ExamSummary[];
    subscriptionActive: boolean;
}

/** Full typed student exam list response. */
export type StudentExamsResponse = ApiEnvelope<StudentExamsData>;

/** Contact admin info embedded in public exam list items. */
export interface ExamContactAdmin {
    phone: string;
    whatsapp: string;
    messageTemplate: string;
}

/** Lock reason for public exam list items. */
export type PublicExamLockReason =
    | 'none'
    | 'login_required'
    | 'subscription_required'
    | 'group_restricted'
    | 'plan_restricted';

/** Single exam item returned by the public exam list endpoint. */
export interface PublicExamListItem {
    id: string;
    serialNo: number;
    title: string;
    title_bn?: string;
    subject: string;
    examCategory: string;
    bannerImageUrl: string;
    startDate: string;
    endDate: string;
    durationMinutes: number;
    status: 'live' | 'upcoming' | 'ended';
    deliveryMode: 'internal' | 'external_link';
    isLocked: boolean;
    lockReason: PublicExamLockReason;
    canOpenDetails: boolean;
    canStart: boolean;
    joinUrl: string | null;
    contactAdmin: ExamContactAdmin;
    subscriptionRequired: boolean;
    paymentRequired: boolean;
    attemptLimit: number;
    allowReAttempt: boolean;
    myAttemptStatus?: 'not_started' | 'in_progress' | 'submitted';
}

/** Full typed exam detail response (single exam wrapped in envelope). */
export type ExamDetailResponse = ApiEnvelope<ExamSummary>;
