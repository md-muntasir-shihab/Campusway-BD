/**
 * Mistake Vault Service
 *
 * Manages per-student incorrect question records for targeted review and retry.
 *
 * Key functions:
 *   - createMistakeEntries: Bulk-upsert MistakeVaultEntry docs for each incorrect answer
 *   - getMistakes: Paginated, filterable list of a student's mistake entries
 *   - retryMistake: Update mastery status after a retry attempt
 *   - createRetrySession: Build a list of question IDs for a retry practice session
 *   - computeMasteryTransition: Pure helper for mastery state machine
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */
import mongoose from 'mongoose';
import MistakeVaultEntry, { IMistakeVaultEntry } from '../models/MistakeVaultEntry';

// ─── Exported Types ─────────────────────────────────────────

/** Shape of an incorrect answer passed from the result engine */
export interface IncorrectAnswerInput {
    questionId: string;
    selectedAnswer: string;
    correctAnswer: string;
    subject?: string;
    chapter?: string;
    topic?: string;
}

/** Filters for querying the mistake vault */
export interface MistakeVaultFilters {
    subject?: string;
    chapter?: string;
    topic?: string;
    examId?: string;
    masteryStatus?: 'weak' | 'still_weak' | 'mastered';
    page?: number;
    limit?: number;
}

/** Paginated result shape */
export interface PaginatedMistakes {
    entries: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export type MasteryStatus = 'weak' | 'still_weak' | 'mastered';

// ─── Pure Helper ────────────────────────────────────────────

/**
 * Pure function: compute the next mastery status given the current status
 * and whether the retry answer was correct.
 *
 * Transition rules:
 *   - If already 'mastered', status never goes backward (stays 'mastered')
 *   - If correct retry → 'mastered'
 *   - If incorrect retry → 'still_weak'
 *
 * Requirement 20.4, 20.5
 */
export function computeMasteryTransition(
    currentStatus: MasteryStatus,
    wasCorrect: boolean,
): MasteryStatus {
    // Never go backward from mastered
    if (currentStatus === 'mastered') {
        return 'mastered';
    }

    if (wasCorrect) {
        return 'mastered';
    }

    return 'still_weak';
}

// ─── createMistakeEntries ───────────────────────────────────

/**
 * Create MistakeVaultEntry documents for each incorrect answer from an exam.
 *
 * Uses upsert on the { student, question } unique index to avoid duplicates.
 * If the student already has an entry for a question, the entry is updated
 * with the latest attempt data (but mastery status is NOT reset if already mastered).
 *
 * Requirement 20.1
 */
export async function createMistakeEntries(
    studentId: string,
    examId: string,
    incorrectAnswers: IncorrectAnswerInput[],
): Promise<void> {
    if (incorrectAnswers.length === 0) return;

    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const examObjectId = new mongoose.Types.ObjectId(examId);
    const now = new Date();

    const bulkOps = incorrectAnswers.map((answer) => ({
        updateOne: {
            filter: {
                student: studentObjectId,
                question: new mongoose.Types.ObjectId(answer.questionId),
            },
            update: {
                $set: {
                    exam: examObjectId,
                    selectedAnswer: answer.selectedAnswer,
                    correctAnswer: answer.correctAnswer,
                    subject: answer.subject || null,
                    chapter: answer.chapter || null,
                    topic: answer.topic || null,
                    attemptDate: now,
                },
                $setOnInsert: {
                    student: studentObjectId,
                    question: new mongoose.Types.ObjectId(answer.questionId),
                    retryCount: 0,
                    masteryStatus: 'weak' as const,
                },
            },
            upsert: true,
        },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await MistakeVaultEntry.bulkWrite(bulkOps as any);
}

// ─── getMistakes ────────────────────────────────────────────

/**
 * Retrieve a student's mistake vault entries with optional filters and pagination.
 *
 * Filterable by: subject, chapter, topic, examId, masteryStatus.
 * Sorted by attemptDate descending (most recent first).
 *
 * Requirement 20.2, 20.6
 */
export async function getMistakes(
    studentId: string,
    filters: MistakeVaultFilters = {},
): Promise<PaginatedMistakes> {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Build query filter
    const query: Record<string, unknown> = { student: studentObjectId };

    if (filters.subject) {
        query.subject = filters.subject;
    }
    if (filters.chapter) {
        query.chapter = filters.chapter;
    }
    if (filters.topic) {
        query.topic = filters.topic;
    }
    if (filters.examId) {
        query.exam = new mongoose.Types.ObjectId(filters.examId);
    }
    if (filters.masteryStatus) {
        query.masteryStatus = filters.masteryStatus;
    }

    const [entries, total] = await Promise.all([
        MistakeVaultEntry.find(query)
            .sort({ attemptDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        MistakeVaultEntry.countDocuments(query),
    ]);

    return {
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    };
}

// ─── retryMistake ───────────────────────────────────────────

/**
 * Update a mistake entry's mastery status after a retry attempt.
 *
 * Transition rules (via computeMasteryTransition):
 *   - correct retry → 'mastered'
 *   - incorrect retry → 'still_weak' + increment retryCount
 *   - already 'mastered' → stays 'mastered' (never goes backward)
 *
 * Requirement 20.4, 20.5
 */
export async function retryMistake(
    studentId: string,
    mistakeId: string,
    wasCorrect: boolean,
): Promise<IMistakeVaultEntry> {
    const entry = await MistakeVaultEntry.findOne({
        _id: new mongoose.Types.ObjectId(mistakeId),
        student: new mongoose.Types.ObjectId(studentId),
    });

    if (!entry) {
        throw new Error('Mistake vault entry not found');
    }

    const newStatus = computeMasteryTransition(entry.masteryStatus, wasCorrect);

    entry.masteryStatus = newStatus;
    entry.lastRetryDate = new Date();

    // Increment retryCount only on incorrect retry (and not already mastered)
    if (!wasCorrect && entry.masteryStatus !== 'mastered') {
        entry.retryCount += 1;
    }

    await entry.save();

    return entry;
}

// ─── createRetrySession ─────────────────────────────────────

/**
 * Build a list of question IDs from the student's mistake vault for a retry
 * practice session. Filters can narrow by subject/chapter/topic/exam/mastery.
 *
 * Returns question IDs sorted by priority:
 *   1. 'still_weak' entries first (highest priority)
 *   2. 'weak' entries second
 *   3. Within each group, sorted by retryCount descending (most retried first)
 *
 * 'mastered' entries are excluded by default unless explicitly requested.
 *
 * Requirement 20.3
 */
export async function createRetrySession(
    studentId: string,
    filters: MistakeVaultFilters = {},
): Promise<string[]> {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // Build query filter
    const query: Record<string, unknown> = { student: studentObjectId };

    if (filters.subject) {
        query.subject = filters.subject;
    }
    if (filters.chapter) {
        query.chapter = filters.chapter;
    }
    if (filters.topic) {
        query.topic = filters.topic;
    }
    if (filters.examId) {
        query.exam = new mongoose.Types.ObjectId(filters.examId);
    }

    // If a specific mastery status is requested, use it; otherwise exclude mastered
    if (filters.masteryStatus) {
        query.masteryStatus = filters.masteryStatus;
    } else {
        query.masteryStatus = { $in: ['weak', 'still_weak'] };
    }

    // Fetch entries sorted by priority: still_weak first, then by retryCount desc
    const entries = await MistakeVaultEntry.find(query)
        .sort({ masteryStatus: 1, retryCount: -1 })
        .select('question')
        .lean();

    return entries.map((e) => e.question.toString());
}
