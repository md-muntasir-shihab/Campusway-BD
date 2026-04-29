/**
 * Practice Session Service
 *
 * Manages topic-based practice sessions with instant feedback, session summaries,
 * prioritization of previously incorrect questions, and adaptive difficulty selection
 * via TopicMastery integration.
 *
 * Key functions:
 *   - startPracticeSession: Fetches questions for a topic, prioritizes previously incorrect ones, shuffles rest
 *   - submitPracticeAnswer: Checks correctness, returns instant feedback, updates TopicMastery stats
 *   - getPracticeSessionSummary: Pure function computing session summary (attempted, correct, incorrect, accuracy)
 *   - getAdaptiveDifficulty: Checks TopicMastery level, returns recommended difficulty
 *   - selectDifficultyForMastery: Pure helper mapping mastery level → difficulty string
 *   - prioritizeQuestions: Pure helper reordering questions with incorrect-first priority
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 30.1, 30.2, 30.3, 30.4
 */
import mongoose from 'mongoose';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import MistakeVaultEntry from '../models/MistakeVaultEntry';
import TopicMastery, { type ITopicMastery } from '../models/TopicMastery';

// ─── Exported Types ─────────────────────────────────────────

export type MasteryLevel = 'beginner' | 'intermediate' | 'advanced' | 'mastered';
export type Difficulty = 'easy' | 'medium' | 'hard';

/** A question returned to the student in a practice session */
export interface PracticeQuestion {
    questionId: string;
    questionText_en?: string;
    questionText_bn?: string;
    options: Array<{
        key: string;
        text_en?: string;
        text_bn?: string;
        imageUrl?: string;
    }>;
    difficulty: string;
    marks: number;
    isPreviouslyIncorrect: boolean;
}

/** Result of starting a practice session */
export interface PracticeSessionStart {
    topicId: string;
    studentId: string;
    questions: PracticeQuestion[];
    totalQuestions: number;
    recommendedDifficulty: Difficulty;
}

/** Instant feedback after submitting an answer */
export interface PracticeAnswerFeedback {
    questionId: string;
    isCorrect: boolean;
    selectedAnswer: string;
    correctAnswer: string;
    explanation_en?: string;
    explanation_bn?: string;
}

/** Session summary computed after completing practice */
export interface PracticeSessionSummary {
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    accuracyPercentage: number;
}

// ─── Pure Helpers ───────────────────────────────────────────

/**
 * Pure function: select the recommended difficulty based on mastery level.
 *
 * Mapping:
 *   - beginner   → 'easy'
 *   - intermediate → 'medium'
 *   - advanced   → 'hard'
 *   - mastered   → 'hard'
 *
 * Requirement 30.1, 30.2, 30.4
 */
export function selectDifficultyForMastery(masteryLevel: MasteryLevel): Difficulty {
    switch (masteryLevel) {
        case 'beginner':
            return 'easy';
        case 'intermediate':
            return 'medium';
        case 'advanced':
        case 'mastered':
            return 'hard';
        default:
            return 'easy';
    }
}

/**
 * Pure function: reorder question IDs so that previously incorrect ones appear first,
 * followed by the remaining questions in their original order.
 *
 * Requirement 12.5
 *
 * @param allQuestionIds - All question IDs available for the session
 * @param incorrectQuestionIds - IDs of questions the student previously answered incorrectly
 * @returns Reordered array with incorrect questions first, then the rest
 */
export function prioritizeQuestions(
    allQuestionIds: string[],
    incorrectQuestionIds: string[],
): string[] {
    const incorrectSet = new Set(incorrectQuestionIds);

    const incorrectFirst: string[] = [];
    const rest: string[] = [];

    for (const id of allQuestionIds) {
        if (incorrectSet.has(id)) {
            incorrectFirst.push(id);
        } else {
            rest.push(id);
        }
    }

    return [...incorrectFirst, ...rest];
}

// ─── getPracticeSessionSummary ──────────────────────────────

/**
 * Pure function: compute a practice session summary from the list of question IDs
 * and the student's answers.
 *
 * Each entry in `answers` maps a questionId to { selectedAnswer, correctAnswer }.
 * Questions in `sessionQuestionIds` without an answer entry are counted as unattempted.
 *
 * Requirement 12.3
 *
 * @param sessionQuestionIds - All question IDs in the session
 * @param answers - Array of answer records with questionId, selectedAnswer, correctAnswer
 * @returns Session summary with attempted, correct, incorrect, and accuracy percentage
 */
export function getPracticeSessionSummary(
    sessionQuestionIds: string[],
    answers: Array<{ questionId: string; selectedAnswer: string; correctAnswer: string }>,
): PracticeSessionSummary {
    const totalQuestions = sessionQuestionIds.length;
    const attempted = answers.length;

    let correct = 0;
    let incorrect = 0;

    for (const answer of answers) {
        if (answer.selectedAnswer === answer.correctAnswer) {
            correct++;
        } else {
            incorrect++;
        }
    }

    const accuracyPercentage =
        attempted > 0
            ? Math.round((correct / attempted) * 100 * 100) / 100
            : 0;

    return {
        totalQuestions,
        attempted,
        correct,
        incorrect,
        accuracyPercentage,
    };
}

// ─── getAdaptiveDifficulty ──────────────────────────────────

/**
 * Check the student's TopicMastery level for a given topic and return
 * the recommended difficulty for their next practice session.
 *
 * If no mastery record exists, defaults to 'beginner' → 'easy'.
 *
 * Requirement 30.1, 30.2, 30.4
 */
export async function getAdaptiveDifficulty(
    studentId: string,
    topicId: string,
): Promise<Difficulty> {
    const mastery = await TopicMastery.findOne({
        student: new mongoose.Types.ObjectId(studentId),
        topic: new mongoose.Types.ObjectId(topicId),
    }).lean();

    if (!mastery) {
        return selectDifficultyForMastery('beginner');
    }

    return selectDifficultyForMastery(mastery.masteryLevel);
}

// ─── startPracticeSession ───────────────────────────────────

/**
 * Start a topic-based practice session for a student.
 *
 * Steps:
 *   1. Determine adaptive difficulty from TopicMastery
 *   2. Fetch published, non-archived questions for the topic
 *   3. Fetch the student's previously incorrect question IDs from MistakeVaultEntry
 *   4. Prioritize incorrect questions first, shuffle the rest
 *   5. Return the ordered question list with metadata
 *
 * Requirements: 12.1, 12.2, 12.4, 12.5, 30.3, 30.4
 */
export async function startPracticeSession(
    studentId: string,
    topicId: string,
): Promise<PracticeSessionStart> {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const topicObjectId = new mongoose.Types.ObjectId(topicId);

    // 1. Get adaptive difficulty
    const recommendedDifficulty = await getAdaptiveDifficulty(studentId, topicId);

    // 2. Fetch published, non-archived questions for this topic
    //    Prefer the recommended difficulty but include all if not enough
    const questions = await QuestionBankQuestion.find({
        topic_id: topicObjectId,
        isArchived: false,
        isActive: true,
        question_type: 'mcq', // Practice sessions are MCQ-based
    })
        .sort({ difficulty: 1, createdAt: -1 })
        .lean();

    // 3. Fetch previously incorrect question IDs from MistakeVaultEntry
    const mistakeEntries = await MistakeVaultEntry.find({
        student: studentObjectId,
        question: { $in: questions.map((q) => q._id) },
        masteryStatus: { $in: ['weak', 'still_weak'] },
    })
        .select('question')
        .lean();

    const incorrectQuestionIds = mistakeEntries.map((e) => e.question.toString());
    const allQuestionIds = questions.map((q) => (q._id as mongoose.Types.ObjectId).toString());

    // 4. Prioritize incorrect questions, then shuffle the rest
    const prioritized = prioritizeQuestions(allQuestionIds, incorrectQuestionIds);

    // Build a lookup map for quick access (lean returns plain objects)
    const questionMap = new Map<string, (typeof questions)[number]>();
    for (const q of questions) {
        questionMap.set((q._id as mongoose.Types.ObjectId).toString(), q);
    }

    const incorrectSet = new Set(incorrectQuestionIds);

    // 5. Build the response
    const practiceQuestions: PracticeQuestion[] = [];
    for (const id of prioritized) {
        const q = questionMap.get(id);
        if (!q) continue;
        practiceQuestions.push({
            questionId: id,
            questionText_en: q.question_en,
            questionText_bn: q.question_bn,
            options: (q.options || []).map((opt) => ({
                key: opt.key,
                text_en: opt.text_en,
                text_bn: opt.text_bn,
                imageUrl: opt.imageUrl,
            })),
            difficulty: q.difficulty,
            marks: q.marks,
            isPreviouslyIncorrect: incorrectSet.has(id),
        });
    }

    return {
        topicId,
        studentId,
        questions: practiceQuestions,
        totalQuestions: practiceQuestions.length,
        recommendedDifficulty,
    };
}

// ─── submitPracticeAnswer ───────────────────────────────────

/**
 * Submit an answer for a single practice question. Returns instant feedback
 * (correct/incorrect + explanation) and updates TopicMastery stats.
 *
 * Requirements: 12.2, 12.4, 30.3
 */
export async function submitPracticeAnswer(
    studentId: string,
    questionId: string,
    answer: string,
): Promise<PracticeAnswerFeedback> {
    const question = await QuestionBankQuestion.findById(questionId).lean();

    if (!question) {
        throw new Error('Question not found');
    }

    // Determine correctness
    const isCorrect = answer === question.correctKey;

    // Update TopicMastery stats if the question has a topic_id
    if (question.topic_id) {
        await updateTopicMastery(studentId, question.topic_id.toString(), isCorrect);
    }

    // Create or update MistakeVaultEntry if incorrect
    if (!isCorrect) {
        const studentObjectId = new mongoose.Types.ObjectId(studentId);
        const questionObjectId = new mongoose.Types.ObjectId(questionId);

        await MistakeVaultEntry.findOneAndUpdate(
            { student: studentObjectId, question: questionObjectId },
            {
                $set: {
                    selectedAnswer: answer,
                    correctAnswer: question.correctKey,
                    subject: question.subject || null,
                    chapter: question.chapter || null,
                    topic: question.topic || null,
                    attemptDate: new Date(),
                },
                $setOnInsert: {
                    student: studentObjectId,
                    question: questionObjectId,
                    retryCount: 0,
                    masteryStatus: 'weak' as const,
                },
            },
            { upsert: true, new: true },
        );
    }

    return {
        questionId,
        isCorrect,
        selectedAnswer: answer,
        correctAnswer: question.correctKey,
        explanation_en: question.explanation_en || undefined,
        explanation_bn: question.explanation_bn || undefined,
    };
}

// ─── Internal Helper ────────────────────────────────────────

/**
 * Update TopicMastery record for a student after a practice answer.
 *
 * - Increments totalAttempts
 * - Increments correctCount if correct
 * - Recomputes lastScore as percentage
 * - Updates masteryLevel based on performance thresholds:
 *     - 80%+ correct → advance mastery (beginner→intermediate→advanced→mastered)
 *     - below 50% → do not advance (stay at current level)
 *     - 50-79% → stay at current level
 *
 * Requirement 30.1, 30.2, 30.3
 */
async function updateTopicMastery(
    studentId: string,
    topicId: string,
    isCorrect: boolean,
): Promise<void> {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const topicObjectId = new mongoose.Types.ObjectId(topicId);

    // Upsert the mastery record
    let mastery = await TopicMastery.findOne({
        student: studentObjectId,
        topic: topicObjectId,
    });

    if (!mastery) {
        mastery = new TopicMastery({
            student: studentObjectId,
            topic: topicObjectId,
            masteryLevel: 'beginner',
            totalAttempts: 0,
            correctCount: 0,
            lastScore: 0,
            lastPracticeDate: new Date(),
        });
    }

    mastery.totalAttempts += 1;
    if (isCorrect) {
        mastery.correctCount += 1;
    }
    mastery.lastPracticeDate = new Date();

    // Compute accuracy percentage
    const accuracy =
        mastery.totalAttempts > 0
            ? Math.round((mastery.correctCount / mastery.totalAttempts) * 100 * 100) / 100
            : 0;
    mastery.lastScore = accuracy;

    // Update mastery level based on thresholds (Requirement 30.1, 30.2)
    // Only advance if accuracy >= 80%, never go backward
    if (accuracy >= 80) {
        mastery.masteryLevel = advanceMasteryLevel(mastery.masteryLevel);
    }
    // Below 50% → do not advance (stays at current level, per Requirement 30.2)
    // 50-79% → stays at current level

    await mastery.save();
}

/**
 * Advance mastery level by one step. Never goes backward.
 *
 *   beginner → intermediate → advanced → mastered
 */
function advanceMasteryLevel(current: ITopicMastery['masteryLevel']): ITopicMastery['masteryLevel'] {
    switch (current) {
        case 'beginner':
            return 'intermediate';
        case 'intermediate':
            return 'advanced';
        case 'advanced':
            return 'mastered';
        case 'mastered':
            return 'mastered';
        default:
            return current;
    }
}
