/**
 * Adaptive Difficulty Service
 *
 * Implements an Elo-inspired rating system per student per topic.
 * After each answer, the student's difficulty rating adjusts up (correct) or down (incorrect).
 * The rating determines the difficulty label shown in the study dashboard.
 *
 * Requirement: 28
 */
import mongoose from 'mongoose';
import TopicDifficulty, { type ITopicDifficulty } from '../models/TopicDifficulty';

// ─── Constants ──────────────────────────────────────────────

/** K-factor: how much each answer shifts the rating */
const K_FACTOR = 32;

/** Rating thresholds for difficulty labels */
const DIFFICULTY_THRESHOLDS = {
    beginner: 0,
    intermediate: 1100,
    advanced: 1400,
    expert: 1700,
} as const;

// ─── Helper ─────────────────────────────────────────────────

function ratingToLevel(rating: number): ITopicDifficulty['difficultyLevel'] {
    if (rating >= DIFFICULTY_THRESHOLDS.expert) return 'expert';
    if (rating >= DIFFICULTY_THRESHOLDS.advanced) return 'advanced';
    if (rating >= DIFFICULTY_THRESHOLDS.intermediate) return 'intermediate';
    return 'beginner';
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Adjust a student's difficulty rating for a topic after answering a question.
 *
 * @param studentId - Student ObjectId
 * @param topicId   - Topic ObjectId
 * @param isCorrect - Whether the answer was correct
 * @param questionDifficulty - Difficulty weight of the question (1=easy, 2=medium, 3=hard)
 */
export async function adjustDifficulty(
    studentId: string,
    topicId: string,
    isCorrect: boolean,
    questionDifficulty: number = 2,
): Promise<ITopicDifficulty> {
    const studentOid = new mongoose.Types.ObjectId(studentId);
    const topicOid = new mongoose.Types.ObjectId(topicId);

    let record = await TopicDifficulty.findOne({ student: studentOid, topic: topicOid });

    if (!record) {
        record = new TopicDifficulty({ student: studentOid, topic: topicOid });
    }

    // Elo-style expected score
    const expectedScore = 1 / (1 + Math.pow(10, (questionDifficulty * 500 - record.rating) / 400));
    const actualScore = isCorrect ? 1 : 0;

    // Adjust rating
    record.rating = Math.max(0, Math.round(record.rating + K_FACTOR * (actualScore - expectedScore)));
    record.totalAnswered += 1;
    if (isCorrect) record.correctCount += 1;
    record.accuracy = record.totalAnswered > 0 ? record.correctCount / record.totalAnswered : 0;
    record.difficultyLevel = ratingToLevel(record.rating);
    record.lastUpdated = new Date();

    await record.save();
    return record;
}

/**
 * Batch-adjust difficulty for multiple topic answers at once (e.g. after exam submission).
 */
export async function batchAdjustDifficulty(
    studentId: string,
    answers: Array<{ topicId: string; isCorrect: boolean; questionDifficulty?: number }>,
): Promise<void> {
    for (const answer of answers) {
        await adjustDifficulty(studentId, answer.topicId, answer.isCorrect, answer.questionDifficulty ?? 2);
    }
}

/**
 * Get a student's difficulty rating for a specific topic.
 */
export async function getTopicDifficulty(
    studentId: string,
    topicId: string,
): Promise<any | null> {
    return TopicDifficulty.findOne({
        student: new mongoose.Types.ObjectId(studentId),
        topic: new mongoose.Types.ObjectId(topicId),
    }).lean();
}

/**
 * Get all topic difficulty records for a student.
 */
export async function getAllTopicDifficulties(
    studentId: string,
): Promise<any[]> {
    return TopicDifficulty.find({
        student: new mongoose.Types.ObjectId(studentId),
    })
        .populate('topic', 'name name_bn')
        .sort({ lastUpdated: -1 })
        .lean() as any;
}
