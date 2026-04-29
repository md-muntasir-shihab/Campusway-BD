import { z } from 'zod';

// ── Exam Session Validation Schemas ─────────────────────
// Zod schemas for exam session lifecycle: start, save answers, submit, and anti-cheat violations.
// Requirements: 5.1, 5.2, 6.7, 18.1

/** Reusable 24-char hex ObjectId string validator. */
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');

/** Submission type: manual by student or auto on timer expiry. */
const submissionTypeEnum = z.enum(['manual', 'auto_timeout']);

/** Violation types matching the AntiCheatViolationLog model. */
const violationTypeEnum = z.enum([
    'tab_switch',
    'copy_attempt',
    'fullscreen_exit',
    'fingerprint_match',
    'ip_duplicate',
]);

// ── Start Exam ──────────────────────────────────────────

export const startExamSchema = z.object({
    examId: objectId,
    deviceInfo: z.object({
        userAgent: z.string().trim().min(1, 'User agent is required'),
        browserInfo: z.string().trim().min(1, 'Browser info is required'),
        ipAddress: z.string().trim().min(1, 'IP address is required'),
        deviceFingerprint: z.string().trim().min(1, 'Device fingerprint is required'),
    }),
});

// ── Save Answers (auto-save every 30s) ──────────────────

export const saveAnswersSchema = z.object({
    sessionId: objectId,
    answers: z
        .array(
            z.object({
                questionId: z.string().trim().min(1, 'Question ID is required'),
                selectedAnswer: z.string().trim().min(1, 'Selected answer is required'),
                writtenAnswerUrl: z.string().trim().optional(),
            }),
        )
        .min(1, 'At least one answer is required'),
});

// ── Submit Exam ─────────────────────────────────────────

export const submitExamSchema = z.object({
    sessionId: objectId,
    submissionType: submissionTypeEnum,
});

// ── Record Anti-Cheat Violation ─────────────────────────

export const recordViolationSchema = z.object({
    sessionId: objectId,
    violationType: violationTypeEnum,
    details: z.string().trim().optional(),
    deviceFingerprint: z.string().trim().optional(),
    ipAddress: z.string().trim().optional(),
});
