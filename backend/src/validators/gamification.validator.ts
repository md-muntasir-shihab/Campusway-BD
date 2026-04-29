import { z } from 'zod';

// ── Gamification & Social Validation Schemas ────────────
// Zod schemas for Battle Mode, Study Routine, Doubt Solver,
// Examiner Application, and Exam Packages.
// Requirements: 19.1, 21.1, 25.1, 26.1, 22.1, 23.1

/** Reusable 24-char hex ObjectId string validator. */
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');

/** Days of the week for study routine scheduling. */
const dayEnum = z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
]);

/** Vote direction for doubt thread replies. */
const voteEnum = z.enum(['up', 'down']);

// ── Battle Mode ─────────────────────────────────────────

export const battleChallengeSchema = z.object({
    opponentId: objectId,
    topicId: objectId.optional(),
});

export const battleAnswerSchema = z.object({
    battleId: objectId,
    questionId: objectId,
    answer: z.string().trim().min(1, 'Answer is required'),
});

// ── Study Routine ───────────────────────────────────────

export const studyRoutineSchema = z.object({
    weeklySchedule: z.array(
        z.object({
            day: dayEnum,
            items: z.array(
                z.object({
                    subject: z.string().trim().min(1, 'Subject is required'),
                    topic: z.string().trim().optional(),
                    goal: z.string().trim().min(1, 'Goal is required'),
                    completed: z.boolean().default(false),
                }),
            ),
        }),
    ),
    examCountdowns: z
        .array(
            z.object({
                examTitle: z.string().trim().min(1, 'Exam title is required'),
                examDate: z.coerce.date(),
            }),
        )
        .default([]),
});


// ── Doubt Solver ────────────────────────────────────────

export const doubtCreateSchema = z.object({
    questionId: objectId,
    content: z.string().trim().optional(),
});

export const doubtReplySchema = z.object({
    threadId: objectId,
    content: z.string().trim().min(1, 'Reply content is required'),
});

export const doubtVoteSchema = z.object({
    threadId: objectId,
    replyIndex: z.number().int().min(0, 'Reply index must be non-negative'),
    vote: voteEnum,
});

// ── Examiner Application ────────────────────────────────

export const examinerApplicationSchema = z.object({
    institutionName: z.string().trim().optional(),
    experience: z.string().trim().optional(),
    subjects: z.array(z.string().trim().min(1)).optional(),
    reason: z.string().trim().min(1, 'Reason is required'),
});

// ── Exam Packages ───────────────────────────────────────

export const examPackageSchema = z.object({
    title: z.string().trim().min(1, 'Title is required'),
    title_bn: z.string().trim().optional(),
    description: z.string().trim().optional(),
    exams: z.array(objectId).min(1, 'At least one exam is required'),
    priceBDT: z.number().min(0, 'Price must be non-negative'),
    discountPercentage: z.number().min(0).max(100, 'Discount must be between 0 and 100').default(0),
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
    couponCodes: z
        .array(
            z.object({
                code: z.string().trim().min(1, 'Coupon code is required'),
                discountPercent: z.number().min(0).max(100, 'Discount percent must be between 0 and 100'),
                maxUses: z.number().int().positive('Max uses must be a positive integer'),
                expiresAt: z.coerce.date(),
            }),
        )
        .optional(),
});
