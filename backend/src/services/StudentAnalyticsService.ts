/**
 * Student Analytics Service
 *
 * Aggregates per-student performance metrics into the StudentAnalyticsAggregate
 * document. Called as a post-result hook after each exam result computation.
 *
 * Key functions:
 *   - updateStudentAnalytics: Recalculates all aggregate metrics from ExamResult history
 *   - getStudentAnalytics: Returns the current analytics aggregate for a student
 *   - computeAverageScore: Pure helper — mean of a number array
 *   - computeTopicAccuracy: Pure helper — per-topic accuracy from answer data
 *
 * Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10
 */
import mongoose from 'mongoose';
import ExamResult, { IExamResult } from '../models/ExamResult';
import StudentAnalyticsAggregate, {
    IStudentAnalyticsAggregate,
    IAccuracyEntry,
} from '../models/StudentAnalyticsAggregate';

// ─── Exported Types ─────────────────────────────────────────

/** Lightweight answer record used by computeTopicAccuracy */
export interface TopicAnswerInput {
    topic: string;
    isCorrect: boolean;
}

/** Result shape from computeTopicAccuracy */
export interface AccuracyResult {
    correct: number;
    total: number;
    percentage: number;
}

// ─── Pure Helpers ───────────────────────────────────────────

/**
 * Compute the arithmetic mean of an array of numbers.
 * Returns 0 for an empty array.
 *
 * Requirement 9.1
 */
export function computeAverageScore(scores: number[]): number {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, s) => acc + s, 0);
    return Math.round((sum / scores.length) * 100) / 100;
}

/**
 * Compute per-topic accuracy from a list of answer records.
 * Returns a Map of topic name → { correct, total, percentage }.
 *
 * Percentage is rounded to 2 decimal places.
 * Topics with empty/blank names are grouped under the key "(unknown)".
 *
 * Requirement 9.3
 */
export function computeTopicAccuracy(
    answers: TopicAnswerInput[],
): Map<string, AccuracyResult> {
    const map = new Map<string, { correct: number; total: number }>();

    for (const answer of answers) {
        const key =
            answer.topic && answer.topic.trim() !== ''
                ? answer.topic.trim()
                : '(unknown)';
        const entry = map.get(key) || { correct: 0, total: 0 };
        entry.total++;
        if (answer.isCorrect) {
            entry.correct++;
        }
        map.set(key, entry);
    }

    const result = new Map<string, AccuracyResult>();
    for (const [key, entry] of map) {
        const percentage =
            entry.total > 0
                ? Math.round((entry.correct / entry.total) * 100 * 100) / 100
                : 0;
        result.set(key, {
            correct: entry.correct,
            total: entry.total,
            percentage,
        });
    }

    return result;
}

// ─── Internal Helpers ───────────────────────────────────────

/**
 * Build an accuracy map from a flat list of { key, isCorrect } records.
 * Used internally to compute topic, chapter, and subject accuracy dimensions.
 */
function buildAccuracyMap(
    answers: { key: string; isCorrect: boolean }[],
): Map<string, IAccuracyEntry> {
    const map = new Map<string, { correct: number; total: number }>();

    for (const answer of answers) {
        const key =
            answer.key && answer.key.trim() !== ''
                ? answer.key.trim()
                : '(unknown)';
        const entry = map.get(key) || { correct: 0, total: 0 };
        entry.total++;
        if (answer.isCorrect) {
            entry.correct++;
        }
        map.set(key, entry);
    }

    const result = new Map<string, IAccuracyEntry>();
    for (const [key, entry] of map) {
        const percentage =
            entry.total > 0
                ? Math.round((entry.correct / entry.total) * 100 * 100) / 100
                : 0;
        result.set(key, {
            correct: entry.correct,
            total: entry.total,
            percentage,
        });
    }

    return result;
}

/**
 * Compute the 5 topics with the lowest accuracy percentage.
 * Only considers topics with at least 1 attempt.
 *
 * TODO: Replace with AI-based analysis via Google Generative AI SDK
 * for smarter weakness detection that considers recency, trend, and difficulty.
 *
 * Requirement 9.10
 */
function computeWeakestTopics(
    topicAccuracy: Map<string, IAccuracyEntry>,
): string[] {
    const entries: { topic: string; percentage: number }[] = [];

    for (const [topic, accuracy] of topicAccuracy) {
        if (topic === '(unknown)' || accuracy.total === 0) continue;
        entries.push({ topic, percentage: accuracy.percentage });
    }

    // Sort by percentage ascending (weakest first)
    entries.sort((a, b) => a.percentage - b.percentage);

    // Return top 5 weakest
    return entries.slice(0, 5).map((e) => e.topic);
}

// ─── updateStudentAnalytics ─────────────────────────────────

/**
 * Recalculate and upsert the StudentAnalyticsAggregate for a student.
 *
 * Called after each exam result computation. Fetches all evaluated ExamResult
 * documents for the student and recomputes every aggregate metric from scratch
 * to ensure consistency.
 *
 * Steps:
 *   1. Fetch all evaluated results for the student (sorted by submittedAt desc)
 *   2. Compute totalExamsTaken, averageScore, averagePercentage
 *   3. Build per-topic, per-chapter, per-subject accuracy maps from all answers
 *   4. Build recentScores (last 30 exams)
 *   5. Compute avgTimePerQuestion
 *   6. Compute weakestTopics (5 lowest accuracy topics)
 *   7. Upsert the StudentAnalyticsAggregate document
 *
 * Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10
 */
export async function updateStudentAnalytics(
    studentId: string,
    _examResult: IExamResult,
): Promise<IStudentAnalyticsAggregate> {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // 1. Fetch all evaluated results for this student
    const allResults = await ExamResult.find({
        student: studentObjectId,
        status: 'evaluated',
    })
        .sort({ submittedAt: -1 })
        .lean();

    // 2. Compute basic aggregates
    const totalExamsTaken = allResults.length;
    const allScores = allResults.map((r) => r.obtainedMarks);
    const allPercentages = allResults.map((r) => r.percentage);

    const averageScore = computeAverageScore(allScores);
    const averagePercentage = computeAverageScore(allPercentages);

    // 3. Build accuracy maps from all answers across all results
    const topicAnswers: { key: string; isCorrect: boolean }[] = [];
    const chapterAnswers: { key: string; isCorrect: boolean }[] = [];
    const subjectAnswers: { key: string; isCorrect: boolean }[] = [];

    let totalQuestionsSeen = 0;
    let totalTimeTaken = 0;

    for (const result of allResults) {
        totalTimeTaken += result.timeTaken || 0;

        const answersSource =
            result.detailedAnswers && result.detailedAnswers.length > 0
                ? result.detailedAnswers
                : result.answers;

        for (const answer of answersSource) {
            // Skip unanswered and written questions for accuracy tracking
            if (answer.correctWrongIndicator === 'unanswered') continue;
            if (answer.questionType === 'written') continue;

            totalQuestionsSeen++;
            const isCorrect =
                answer.isCorrect ||
                answer.correctWrongIndicator === 'correct';

            // Topic accuracy
            const topic = answer.topic || '(unknown)';
            topicAnswers.push({ key: topic, isCorrect });

            // Chapter accuracy — use topic as proxy since answers store topic string
            // In production, this would resolve via the question's chapter_id reference
            chapterAnswers.push({ key: topic, isCorrect });

            // Subject accuracy — use topic as proxy
            // In production, this would resolve via the question's subject_id reference
            subjectAnswers.push({ key: topic, isCorrect });
        }
    }

    const topicAccuracy = buildAccuracyMap(topicAnswers);
    const chapterAccuracy = buildAccuracyMap(chapterAnswers);
    const subjectAccuracy = buildAccuracyMap(subjectAnswers);

    // 4. Build recentScores (last 30 exams)
    const recentScores = allResults.slice(0, 30).map((r) => ({
        examId: r.exam,
        score: r.obtainedMarks,
        percentage: r.percentage,
        date: r.submittedAt || r.createdAt,
    }));

    // 5. Compute avgTimePerQuestion
    const avgTimePerQuestion =
        totalQuestionsSeen > 0
            ? Math.round(
                (totalTimeTaken / totalQuestionsSeen) * 100,
            ) / 100
            : 0;

    // 6. Compute weakestTopics
    const weakestTopics = computeWeakestTopics(topicAccuracy);

    // 7. Upsert the StudentAnalyticsAggregate document
    const updateData = {
        totalExamsTaken,
        averageScore,
        averagePercentage,
        topicAccuracy: Object.fromEntries(topicAccuracy),
        chapterAccuracy: Object.fromEntries(chapterAccuracy),
        subjectAccuracy: Object.fromEntries(subjectAccuracy),
        recentScores,
        avgTimePerQuestion,
        weakestTopics,
        lastActivityDate: new Date(),
    };

    const analytics = await StudentAnalyticsAggregate.findOneAndUpdate(
        { student: studentObjectId },
        { $set: updateData },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return analytics;
}

// ─── getStudentAnalytics ────────────────────────────────────

/**
 * Retrieve the current analytics aggregate for a student.
 * Returns null if no analytics document exists yet.
 *
 * Requirement 9.1
 */
export async function getStudentAnalytics(
    studentId: string,
): Promise<IStudentAnalyticsAggregate | null> {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const doc = await StudentAnalyticsAggregate.findOne({
        student: studentObjectId,
    });
    return doc;
}
