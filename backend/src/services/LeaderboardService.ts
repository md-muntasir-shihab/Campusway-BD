/**
 * Leaderboard Service
 *
 * Provides multi-level leaderboard queries (exam, group, weekly, global, subject),
 * name masking for privacy, and leaderboard refresh capabilities.
 *
 * All query functions return paginated results with 20 entries per page.
 *
 * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10
 */
import mongoose from 'mongoose';
import LeaderboardEntry, { ILeaderboardEntry } from '../models/LeaderboardEntry';
import { computeRanks } from './ResultEngineService';

// ─── Constants ──────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Types ──────────────────────────────────────────────────

export interface LeaderboardPage {
    entries: ILeaderboardEntry[];
    total: number;
    page: number;
    totalPages: number;
    myRank?: ILeaderboardEntry;
}

// ─── Helpers ────────────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

/** ISO week number (1-53) */
function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** ISO week-numbering year */
function getISOWeekYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return d.getUTCFullYear();
}

/**
 * Get the current week's period key in "YYYY-Www" format.
 * Example: "2025-W03"
 */
export function getCurrentWeekPeriodKey(date: Date = new Date()): string {
    const year = getISOWeekYear(date);
    const week = getISOWeek(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Mask a full name for leaderboard privacy.
 *
 * Rules:
 *   - "Rahim Khan" → "Rahim K."
 *   - "Rahim" → "Rahim" (single-word names returned as-is)
 *   - "" or whitespace-only → "Anonymous"
 *
 * Requirement 8.10
 */
export function maskDisplayName(fullName: string): string {
    if (!fullName || fullName.trim().length === 0) return 'Anonymous';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
}

// ─── Generic paginated query helper ─────────────────────────

async function queryLeaderboard(
    filter: Record<string, unknown>,
    page: number,
    studentId?: string,
): Promise<LeaderboardPage> {
    const safePage = Math.max(1, Math.floor(page));
    const skip = (safePage - 1) * PAGE_SIZE;

    const [entries, total] = await Promise.all([
        LeaderboardEntry.find(filter)
            .sort({ rank: 1 })
            .skip(skip)
            .limit(PAGE_SIZE)
            .lean<ILeaderboardEntry[]>(),
        LeaderboardEntry.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const result: LeaderboardPage = {
        entries,
        total,
        page: safePage,
        totalPages,
    };

    // If a studentId is provided, fetch their rank entry separately
    if (studentId) {
        const myRank = await LeaderboardEntry.findOne({
            ...filter,
            student: toObjectId(studentId),
        }).lean<ILeaderboardEntry>();

        if (myRank) {
            result.myRank = myRank;
        }
    }

    return result;
}

// ─── Leaderboard Query Functions ────────────────────────────

/**
 * Get paginated leaderboard for a specific exam.
 *
 * If studentId is provided, also returns the student's own rank entry
 * (even if they are not on the current page).
 *
 * Requirement 8.2, 8.3, 8.4
 */
export async function getExamLeaderboard(
    examId: string,
    page: number,
    studentId?: string,
): Promise<LeaderboardPage> {
    return queryLeaderboard(
        { leaderboardType: 'exam', exam: toObjectId(examId) },
        page,
        studentId,
    );
}

/**
 * Get paginated leaderboard for a student group.
 *
 * Shows rankings only among members of the specified StudentGroup.
 *
 * Requirement 8.6
 */
export async function getGroupLeaderboard(
    groupId: string,
    page: number,
): Promise<LeaderboardPage> {
    return queryLeaderboard(
        { leaderboardType: 'group', group: toObjectId(groupId) },
        page,
    );
}

/**
 * Get paginated weekly leaderboard.
 *
 * Aggregates scores from all exams taken within the current ISO week.
 * Period key format: "YYYY-Www" (e.g., "2025-W03").
 *
 * Requirement 8.7
 */
export async function getWeeklyLeaderboard(
    page: number,
): Promise<LeaderboardPage> {
    const periodKey = getCurrentWeekPeriodKey();
    return queryLeaderboard(
        { leaderboardType: 'weekly', periodKey },
        page,
    );
}

/**
 * Get paginated global leaderboard.
 *
 * Aggregates total XP across all exams and practice sessions.
 *
 * Requirement 8.8
 */
export async function getGlobalLeaderboard(
    page: number,
): Promise<LeaderboardPage> {
    return queryLeaderboard(
        { leaderboardType: 'global' },
        page,
    );
}

/**
 * Get paginated subject-wise leaderboard.
 *
 * Shows rankings per Question_Subject (QuestionCategory).
 *
 * Requirement 8.9
 */
export async function getSubjectLeaderboard(
    subjectId: string,
    page: number,
): Promise<LeaderboardPage> {
    return queryLeaderboard(
        { leaderboardType: 'subject', subject: toObjectId(subjectId) },
        page,
    );
}

// ─── Leaderboard Refresh ────────────────────────────────────

/**
 * Recompute the exam leaderboard from ExamResult data.
 *
 * Delegates to ResultEngineService.computeRanks which:
 *   1. Fetches all ExamResults for the exam
 *   2. Sorts by score desc, time asc
 *   3. Assigns ranks with tie handling
 *   4. Upserts LeaderboardEntry documents
 *
 * Requirement 8.5
 */
export async function refreshExamLeaderboard(examId: string): Promise<void> {
    await computeRanks(examId);
}
