/**
 * Result Engine Service
 *
 * Computes exam scores, creates ExamResult documents, ranks participants,
 * and triggers downstream updates (leaderboard, analytics, mistake vault, XP/coins).
 *
 * Key functions:
 *   - computeScore: Pure function — calculates score, percentage, pass/fail from answers + config
 *   - computeResult: Orchestrates full result pipeline for a submitted session
 *   - computeRanks: Sorts all results for an exam by score desc / time asc, assigns ranks, updates leaderboard
 *   - publishResults: Makes results visible to students, triggers rank computation
 *   - gradeWrittenAnswer: Manual grading for written/CQ answers with feedback
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 29.3, 29.4, 29.5, 29.6
 */
import mongoose from 'mongoose';
import Exam from '../models/Exam';
import ExamSession from '../models/ExamSession';
import ExamResult, { IExamResult } from '../models/ExamResult';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import LeaderboardEntry from '../models/LeaderboardEntry';
import User from '../models/User';
import { updateStudentAnalytics } from './StudentAnalyticsService';
import { createMistakeEntries, IncorrectAnswerInput } from './MistakeVaultService';
import { refreshExamLeaderboard } from './LeaderboardService';
import { awardXP, awardCoins, updateStreak, checkLeaguePromotion } from './GamificationService';
import { triggerResultPublished } from './NotificationTriggerService';

// ─── Exported Types ─────────────────────────────────────────

/** Per-answer data fed into the pure computeScore function */
export interface AnswerData {
    questionId: string;
    selectedAnswer: string;
    correctAnswer: string;
    /** The question type — written questions are excluded from auto-scoring */
    questionType?: 'mcq' | 'written_cq' | 'fill_blank' | 'true_false' | 'image_mcq';
    /** Per-question marks override (falls back to examConfig.marksPerQuestion) */
    marks?: number;
}

/** Exam-level scoring configuration */
export interface ExamScoreConfig {
    marksPerQuestion: number;
    negativeMarksPerQuestion: number;
    totalQuestions: number;
    passPercentage: number;
}

/** Output of the pure computeScore function */
export interface ScoreBreakdown {
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    passed: boolean;
}

// ─── Helpers ────────────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

/**
 * Mask a full name for leaderboard privacy.
 * "Rahim Khan" → "Rahim K."
 * Single-word names are returned as-is.
 */
function maskDisplayName(fullName: string): string {
    if (!fullName || fullName.trim().length === 0) return 'Anonymous';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
}

// ─── computeScore (Pure Function) ───────────────────────────

/**
 * Pure function: compute score from answer data and exam config.
 *
 * Formula:
 *   obtainedMarks = (correct × marks) − (incorrect × negativeMarks)
 *   percentage = (obtainedMarks / totalMarks) × 100, rounded to 2 decimal places
 *   passed = percentage >= passPercentage
 *
 * Written/CQ questions are counted as unanswered (not auto-scored).
 * Empty/blank selectedAnswer is counted as unanswered (no penalty).
 *
 * Requirement 7.1, 7.2, 7.3
 */
export function computeScore(
    answers: AnswerData[],
    examConfig: ExamScoreConfig,
): ScoreBreakdown {
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const totalMarks = examConfig.totalQuestions * examConfig.marksPerQuestion;

    for (const answer of answers) {
        // Written questions are not auto-scored
        if (answer.questionType === 'written_cq') {
            unansweredCount++;
            continue;
        }

        // No answer provided — unanswered (no penalty)
        if (!answer.selectedAnswer || answer.selectedAnswer.trim() === '') {
            unansweredCount++;
            continue;
        }

        // Compare selected answer with correct answer (case-insensitive)
        const isCorrect =
            answer.selectedAnswer.trim().toUpperCase() ===
            answer.correctAnswer.trim().toUpperCase();

        if (isCorrect) {
            correctCount++;
        } else {
            wrongCount++;
        }
    }

    // Score = (correct × marks) − (incorrect × negativeMarks)
    const rawScore =
        correctCount * examConfig.marksPerQuestion -
        wrongCount * examConfig.negativeMarksPerQuestion;

    // Obtained marks cannot go below 0
    const obtainedMarks = Math.max(0, rawScore);

    // Percentage = (obtained / total) × 100, rounded to 2 decimal places
    const percentage =
        totalMarks > 0
            ? Math.round((obtainedMarks / totalMarks) * 100 * 100) / 100
            : 0;

    const passed = percentage >= examConfig.passPercentage;

    return {
        obtainedMarks,
        totalMarks,
        percentage,
        correctCount,
        wrongCount,
        unansweredCount,
        passed,
    };
}

// ─── computeResult (Orchestrator) ───────────────────────────

/**
 * Orchestrate the full result pipeline for a submitted exam session:
 *
 * 1. Fetch the ExamSession (must be 'submitted')
 * 2. Fetch the Exam and its questions
 * 3. Build AnswerData[] by matching session answers against correct answers
 * 4. Call computeScore to get the ScoreBreakdown
 * 5. Create and save an ExamResult document
 * 6. Trigger downstream updates (leaderboard, analytics, mistake vault, XP/coins)
 *
 * Requirement 7.1, 7.2, 7.3, 7.4
 */
export async function computeResult(sessionId: string): Promise<IExamResult> {
    // 1. Fetch session
    const session = await ExamSession.findById(sessionId);
    if (!session) {
        throw new Error('Exam session not found');
    }
    if (session.status !== 'submitted') {
        throw new Error('Session must be in submitted status to compute results');
    }

    // 2. Fetch exam
    const exam = await Exam.findById(session.exam);
    if (!exam) {
        throw new Error('Associated exam not found');
    }

    // 3. Fetch questions referenced by the exam
    const questionIds = exam.questionOrder && exam.questionOrder.length > 0
        ? exam.questionOrder
        : [];

    const questions = await QuestionBankQuestion.find({
        _id: { $in: questionIds },
    }).lean();

    // Build a map of questionId → question for fast lookup
    const questionMap = new Map(
        questions.map((q) => [q._id.toString(), q]),
    );

    // Build per-question marks map from exam's perQuestionMarks
    const perQuestionMarksMap = new Map<string, number>();
    if (exam.perQuestionMarks && exam.perQuestionMarks.length > 0) {
        for (const pqm of exam.perQuestionMarks) {
            perQuestionMarksMap.set(pqm.questionId.toString(), pqm.marks);
        }
    }

    // Build a map of session answers by questionId
    const sessionAnswerMap = new Map(
        session.answers.map((a) => [a.questionId, a]),
    );

    // Check if exam has any written questions (for pending_evaluation status)
    let hasWrittenQuestions = false;

    // 4. Build AnswerData[] and detailed answer records
    const answerDataList: AnswerData[] = [];
    const detailedAnswers: IExamResult['answers'] = [];

    for (const qId of questionIds) {
        const qIdStr = qId.toString();
        const question = questionMap.get(qIdStr);
        if (!question) continue;

        const questionType = question.question_type || 'mcq';
        if (questionType === 'written_cq') {
            hasWrittenQuestions = true;
        }

        // Determine the correct answer key
        const correctAnswer = question.correctKey || '';

        // Get the student's answer (if any)
        const sessionAnswer = sessionAnswerMap.get(qIdStr);
        const selectedAnswer = sessionAnswer?.selectedAnswer || '';

        // Per-question marks (override or default)
        const questionMarks =
            perQuestionMarksMap.get(qIdStr) ??
            question.marks ??
            exam.defaultMarksPerQuestion ??
            1;

        answerDataList.push({
            questionId: qIdStr,
            selectedAnswer,
            correctAnswer,
            questionType,
            marks: questionMarks,
        });

        // Determine correctness for the detailed answer record
        let isCorrect = false;
        let correctWrongIndicator: 'correct' | 'wrong' | 'unanswered' = 'unanswered';

        if (questionType !== 'written_cq') {
            if (!selectedAnswer || selectedAnswer.trim() === '') {
                correctWrongIndicator = 'unanswered';
            } else {
                isCorrect =
                    selectedAnswer.trim().toUpperCase() ===
                    correctAnswer.trim().toUpperCase();
                correctWrongIndicator = isCorrect ? 'correct' : 'wrong';
            }
        }

        detailedAnswers.push({
            question: toObjectId(qIdStr),
            questionType: questionType === 'written_cq' ? 'written' : 'mcq',
            selectedAnswer,
            writtenAnswerUrl: sessionAnswer?.writtenAnswerUrl,
            isCorrect,
            timeTaken: 0, // per-question time not tracked in session
            marks: questionMarks,
            marksObtained: isCorrect ? questionMarks : 0,
            explanation: question.explanation_en || '',
            correctWrongIndicator,
            topic: question.topic || '',
        });
    }

    // 5. Compute score using the pure function
    const examConfig: ExamScoreConfig = {
        marksPerQuestion: exam.defaultMarksPerQuestion || 1,
        negativeMarksPerQuestion: exam.negativeMarking
            ? (exam.negativeMarkValue || 0)
            : 0,
        totalQuestions: questionIds.length,
        passPercentage: exam.certificateSettings?.minPercentage ?? 40,
    };

    const scoreBreakdown = computeScore(answerDataList, examConfig);

    // Calculate time taken (seconds from start to submission)
    const timeTaken = session.submittedAt
        ? Math.floor(
            (session.submittedAt.getTime() - session.startedAt.getTime()) / 1000,
        )
        : 0;

    // Determine result status
    let resultStatus: 'submitted' | 'evaluated' | 'pending_evaluation' = 'evaluated';
    if (hasWrittenQuestions) {
        resultStatus = 'pending_evaluation';
    }

    // 6. Create ExamResult document
    const examResult = new ExamResult({
        exam: session.exam,
        student: session.student,
        attemptNo: session.attemptNo,
        sourceType: 'internal_submission',
        answers: detailedAnswers,
        detailedAnswers,
        performanceSummary: {
            totalScore: scoreBreakdown.obtainedMarks,
            percentage: scoreBreakdown.percentage,
            strengths: [],
            weaknesses: [],
        },
        totalMarks: scoreBreakdown.totalMarks,
        obtainedMarks: scoreBreakdown.obtainedMarks,
        correctCount: scoreBreakdown.correctCount,
        wrongCount: scoreBreakdown.wrongCount,
        unansweredCount: scoreBreakdown.unansweredCount,
        percentage: scoreBreakdown.percentage,
        passFail: scoreBreakdown.passed ? 'pass' : 'fail',
        pointsEarned: 0,
        timeTaken,
        deviceInfo: session.deviceInfo || '',
        browserInfo: session.browserInfo || '',
        ipAddress: session.ipAddress || '',
        tabSwitchCount: session.tabSwitchCount || 0,
        submittedAt: session.submittedAt || new Date(),
        isAutoSubmitted: session.auto_submitted || false,
        cheat_flags: session.cheat_flags || [],
        status: resultStatus,
    });

    await examResult.save();

    // Mark session as evaluated
    session.status = 'evaluated';
    await session.save();

    // 7. Trigger downstream updates — full post-submission pipeline

    // 7a. Refresh exam leaderboard — Requirement 8.1, 8.5
    try {
        await refreshExamLeaderboard(exam._id.toString());
    } catch (err) {
        console.error('Failed to refresh exam leaderboard:', err);
    }

    // 7b. Update StudentAnalytics — Requirement 9.5
    try {
        await updateStudentAnalytics(session.student.toString(), examResult);
    } catch (err) {
        // Analytics update failure should not block result computation
        console.error('Failed to update student analytics:', err);
    }

    // 7c. Create MistakeVault entries for incorrect answers — Requirement 20.1
    try {
        const incorrectAnswers: IncorrectAnswerInput[] = detailedAnswers
            .filter(
                (a) =>
                    a.correctWrongIndicator === 'wrong' &&
                    a.questionType !== 'written',
            )
            .map((a) => ({
                questionId: a.question.toString(),
                selectedAnswer: a.selectedAnswer,
                correctAnswer:
                    questionMap.get(a.question.toString())?.correctKey || '',
                subject: a.topic || undefined, // topic string used as subject proxy
                chapter: undefined,
                topic: a.topic || undefined,
            }));

        await createMistakeEntries(
            session.student.toString(),
            exam._id.toString(),
            incorrectAnswers,
        );
    } catch (err) {
        // MistakeVault update failure should not block result computation
        console.error('Failed to create mistake vault entries:', err);
    }

    // 7d. Award XP and Coins via GamificationEngine — Requirement 19.1
    try {
        const examDifficulty = (exam as unknown as Record<string, unknown>).difficulty as string | undefined;
        const difficultyFactor = examDifficulty === 'hard' ? 2.0
            : examDifficulty === 'medium' ? 1.5
                : 1.0;

        await awardXP(session.student.toString(), {
            baseXP: 50 + scoreBreakdown.correctCount * 5,
            difficultyFactor,
            event: 'exam_complete',
            sourceId: exam._id.toString(),
        });

        // Award coins for passing
        if (scoreBreakdown.passed) {
            await awardCoins(session.student.toString(), {
                amount: 10 + Math.floor(scoreBreakdown.percentage / 10),
                event: 'exam_pass',
                sourceId: exam._id.toString(),
            });
        }
    } catch (err) {
        console.error('Failed to award XP/Coins:', err);
    }

    // 7e. Update streak — Requirement 19.3
    try {
        await updateStreak(session.student.toString());
    } catch (err) {
        console.error('Failed to update streak:', err);
    }

    // 7f. Check league promotion — Requirement 19.4
    try {
        await checkLeaguePromotion(session.student.toString());
    } catch (err) {
        console.error('Failed to check league promotion:', err);
    }

    // 7g. Trigger result notification — Requirement 24.1
    try {
        await triggerResultPublished(exam._id.toString());
    } catch (err) {
        console.error('Failed to trigger result notification:', err);
    }

    return examResult;
}

// ─── computeRanks ───────────────────────────────────────────

/**
 * Compute ranks for all participants of an exam.
 *
 * Ranking rules:
 *   1. Sort by obtainedMarks descending (higher score = better rank)
 *   2. Tie-break by timeTaken ascending (faster = better rank)
 *   3. Equal score AND equal timeTaken get the same rank
 *
 * After computing ranks, updates:
 *   - ExamResult.rank for each participant
 *   - LeaderboardEntry collection (upsert per student+exam)
 *
 * Requirement 8.1
 */
export async function computeRanks(examId: string): Promise<void> {
    // Fetch all results for this exam, sorted by score desc then time asc
    const results = await ExamResult.find({ exam: toObjectId(examId) })
        .sort({ obtainedMarks: -1, timeTaken: 1 })
        .lean();

    if (results.length === 0) return;

    // Assign ranks with tie handling
    let currentRank = 1;

    // Bulk operations for ExamResult rank updates
    const resultBulkOps: {
        updateOne: {
            filter: { _id: mongoose.Types.ObjectId };
            update: { $set: { rank: number } };
        };
    }[] = [];

    // Collect leaderboard entries to upsert
    const leaderboardUpserts: {
        studentId: mongoose.Types.ObjectId;
        score: number;
        percentage: number;
        rank: number;
        timeTaken: number;
    }[] = [];

    for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (i > 0) {
            const prev = results[i - 1];
            // Same score AND same timeTaken → same rank; otherwise increment
            if (
                result.obtainedMarks === prev.obtainedMarks &&
                result.timeTaken === prev.timeTaken
            ) {
                // Keep currentRank the same (tie)
            } else {
                currentRank = i + 1;
            }
        }

        resultBulkOps.push({
            updateOne: {
                filter: { _id: result._id },
                update: { $set: { rank: currentRank } },
            },
        });

        leaderboardUpserts.push({
            studentId: result.student,
            score: result.obtainedMarks,
            percentage: result.percentage,
            rank: currentRank,
            timeTaken: result.timeTaken,
        });
    }

    // Bulk update ExamResult ranks
    if (resultBulkOps.length > 0) {
        await ExamResult.bulkWrite(resultBulkOps);
    }

    // Update Exam analytics cache
    const scores = results.map((r) => r.obtainedMarks);
    const avgScore =
        scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
            : 0;

    await Exam.findByIdAndUpdate(examId, {
        totalParticipants: results.length,
        avgScore,
        highestScore: scores[0] ?? 0,
        lowestScore: scores[scores.length - 1] ?? 0,
    });

    // Upsert LeaderboardEntry documents for each participant
    // Fetch student names for display
    const studentIds = leaderboardUpserts.map((e) => e.studentId);
    const students = await User.find(
        { _id: { $in: studentIds } },
        { _id: 1, full_name: 1 },
    ).lean();

    const studentNameMap = new Map(
        students.map((s) => [s._id.toString(), s.full_name || 'Anonymous']),
    );

    const leaderboardBulkOps = leaderboardUpserts.map((entry) => ({
        updateOne: {
            filter: {
                student: entry.studentId,
                exam: toObjectId(examId),
                leaderboardType: 'exam' as const,
            },
            update: {
                $set: {
                    score: entry.score,
                    percentage: entry.percentage,
                    rank: entry.rank,
                    timeTaken: entry.timeTaken,
                    displayName: maskDisplayName(
                        studentNameMap.get(entry.studentId.toString()) || 'Anonymous',
                    ),
                },
            },
            upsert: true,
        },
    }));

    if (leaderboardBulkOps.length > 0) {
        await LeaderboardEntry.bulkWrite(leaderboardBulkOps);
    }
}


// ─── publishResults ─────────────────────────────────────────

/**
 * Publish results for an exam, making them visible to students.
 *
 * Steps:
 *   1. Validate the exam exists
 *   2. Set the exam's isPublished flag to true and resultPublishDate to now
 *   3. Compute ranks for all participants via computeRanks
 *
 * This is used when resultPublishMode is 'manual' — the admin explicitly
 * publishes results after reviewing them. For 'immediate' mode, results
 * are visible right after submission. For 'scheduled' mode, a cron job
 * calls this at the configured resultPublishDate.
 *
 * Requirement 7.5, 7.6
 */
export async function publishResults(examId: string): Promise<void> {
    // 1. Validate exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
        throw new Error('Exam not found');
    }

    // 2. Mark results as published on the exam
    exam.isPublished = true;
    exam.resultPublishDate = new Date();
    await exam.save();

    // 3. Compute/refresh ranks for all participants
    await computeRanks(examId);
}

// ─── gradeWrittenAnswer ─────────────────────────────────────

/**
 * Grade a single written/CQ answer in an ExamResult.
 *
 * Steps:
 *   1. Validate the ExamResult exists and is in 'pending_evaluation' status
 *   2. Validate the questionId corresponds to a written answer in the result
 *   3. Validate marks do not exceed maxMarks for the question
 *   4. Upsert the grade entry in writtenGrades array
 *   5. Update the corresponding answer's marksObtained in the answers array
 *   6. Check if all written questions are now graded
 *   7. If all graded: recompute total score, percentage, pass/fail, set status to 'evaluated'
 *
 * Requirement 7.7, 29.3, 29.4, 29.5, 29.6
 */
export async function gradeWrittenAnswer(
    resultId: string,
    questionId: string,
    marks: number,
    feedback: string,
    gradedBy: string,
): Promise<IExamResult> {
    // 1. Fetch the ExamResult
    const result = await ExamResult.findById(resultId);
    if (!result) {
        throw new Error('Exam result not found');
    }

    if (result.status !== 'pending_evaluation') {
        throw new Error('Result is not in pending_evaluation status');
    }

    // 2. Find the written answer in the result's answers array
    const answerIndex = result.answers.findIndex(
        (a) => a.question.toString() === questionId && a.questionType === 'written',
    );
    if (answerIndex === -1) {
        throw new Error('Written question not found in this result');
    }

    const answer = result.answers[answerIndex];
    const maxMarks = answer.marks || 1;

    // 3. Validate marks
    if (marks < 0) {
        throw new Error('Marks cannot be negative');
    }
    if (marks > maxMarks) {
        throw new Error(`Marks (${marks}) cannot exceed max marks (${maxMarks}) for this question`);
    }

    // 4. Upsert the grade in writtenGrades array
    if (!result.writtenGrades) {
        result.writtenGrades = [];
    }

    const existingGradeIndex = result.writtenGrades.findIndex(
        (g) => g.questionId.toString() === questionId,
    );

    const gradeEntry = {
        questionId: toObjectId(questionId),
        marks,
        maxMarks,
        feedback: feedback || '',
        gradedBy: toObjectId(gradedBy),
        gradedAt: new Date(),
    };

    if (existingGradeIndex >= 0) {
        // Update existing grade (re-grading)
        result.writtenGrades[existingGradeIndex] = gradeEntry;
    } else {
        result.writtenGrades.push(gradeEntry);
    }

    // 5. Update the answer's marksObtained and correctness indicator
    result.answers[answerIndex].marksObtained = marks;
    result.answers[answerIndex].isCorrect = marks > 0;
    result.answers[answerIndex].correctWrongIndicator = marks > 0 ? 'correct' : 'wrong';

    // Also update detailedAnswers if present
    if (result.detailedAnswers && result.detailedAnswers.length > 0) {
        const detailedIndex = result.detailedAnswers.findIndex(
            (a) => a.question.toString() === questionId && a.questionType === 'written',
        );
        if (detailedIndex >= 0) {
            result.detailedAnswers[detailedIndex].marksObtained = marks;
            result.detailedAnswers[detailedIndex].isCorrect = marks > 0;
            result.detailedAnswers[detailedIndex].correctWrongIndicator = marks > 0 ? 'correct' : 'wrong';
        }
    }

    // 6. Check if all written questions are now graded
    const writtenAnswers = result.answers.filter((a) => a.questionType === 'written');
    const gradedQuestionIds = new Set(
        result.writtenGrades.map((g) => g.questionId.toString()),
    );
    const allWrittenGraded = writtenAnswers.every(
        (a) => gradedQuestionIds.has(a.question.toString()),
    );

    // 7. If all written questions are graded, recompute totals and mark as evaluated
    if (allWrittenGraded) {
        // Recompute obtained marks from all answers
        let totalObtained = 0;
        let totalPossible = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let unansweredCount = 0;

        for (const ans of result.answers) {
            const ansMarks = ans.marks || 0;
            totalPossible += ansMarks;

            if (ans.questionType === 'written') {
                // Use the graded marks
                const grade = result.writtenGrades!.find(
                    (g) => g.questionId.toString() === ans.question.toString(),
                );
                const gradedMarks = grade ? grade.marks : 0;
                totalObtained += gradedMarks;
                if (gradedMarks > 0) {
                    correctCount++;
                } else {
                    wrongCount++;
                }
            } else {
                // MCQ answers — use existing marksObtained
                totalObtained += (ans.marksObtained || 0);
                if (ans.correctWrongIndicator === 'correct') {
                    correctCount++;
                } else if (ans.correctWrongIndicator === 'wrong') {
                    wrongCount++;
                } else {
                    unansweredCount++;
                }
            }
        }

        // Fetch exam for pass percentage
        const exam = await Exam.findById(result.exam);
        const passPercentage = exam?.certificateSettings?.minPercentage ?? 40;

        const percentage = totalPossible > 0
            ? Math.round((totalObtained / totalPossible) * 100 * 100) / 100
            : 0;

        result.obtainedMarks = totalObtained;
        result.totalMarks = totalPossible;
        result.percentage = percentage;
        result.correctCount = correctCount;
        result.wrongCount = wrongCount;
        result.unansweredCount = unansweredCount;
        result.passFail = percentage >= passPercentage ? 'pass' : 'fail';
        result.status = 'evaluated';

        // Update performance summary
        if (result.performanceSummary) {
            result.performanceSummary.totalScore = totalObtained;
            result.performanceSummary.percentage = percentage;
        }
    }

    await result.save();

    return result;
}
