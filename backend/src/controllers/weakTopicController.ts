import { Response } from 'express';
import mongoose from 'mongoose';
import ExamResult from '../models/ExamResult';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import QuestionBankAnalytics from '../models/QuestionBankAnalytics';
import { AuthRequest } from '../middlewares/auth';

/* ── helpers ── */

function asObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS — Weak Topic Detection
   ═══════════════════════════════════════════════════════════ */

/** GET /admin/analytics/weak-topics — aggregate weak topics across all students */
export async function adminGetWeakTopics(req: AuthRequest, res: Response): Promise<void> {
    const minAttempts = Math.max(1, Number(req.query.minAttempts) || 5);
    const maxAccuracy = Math.min(100, Number(req.query.maxAccuracy) || 50);
    const subject = String(req.query.subject || '').trim();
    const limitN = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    // Get question IDs grouped by topic from the question bank
    const qbMatch: Record<string, unknown> = {};
    if (subject) qbMatch.subject = subject;

    // Aggregate from ExamResult answers joined with QuestionBankQuestion topics
    const pipeline: mongoose.PipelineStage[] = [
        { $unwind: '$answers' },
        {
            $lookup: {
                from: 'question_bank_questions',
                localField: 'answers.question',
                foreignField: '_id',
                as: 'qInfo',
            },
        },
        { $unwind: { path: '$qInfo', preserveNullAndEmptyArrays: false } },
    ];

    if (subject) {
        pipeline.push({ $match: { 'qInfo.subject': subject } });
    }

    pipeline.push(
        {
            $group: {
                _id: {
                    subject: '$qInfo.subject',
                    topic: { $ifNull: ['$qInfo.topic', 'General'] },
                },
                totalAttempts: { $sum: 1 },
                correctCount: { $sum: { $cond: ['$answers.isCorrect', 1, 0] } },
                wrongCount: { $sum: { $cond: ['$answers.isCorrect', 0, 1] } },
                avgTimeTaken: { $avg: '$answers.timeTaken' },
                uniqueStudents: { $addToSet: '$student' },
            },
        },
        {
            $project: {
                _id: 0,
                subject: '$_id.subject',
                topic: '$_id.topic',
                totalAttempts: 1,
                correctCount: 1,
                wrongCount: 1,
                accuracy: {
                    $round: [{ $multiply: [{ $divide: ['$correctCount', '$totalAttempts'] }, 100] }, 1],
                },
                avgTimeTaken: { $round: ['$avgTimeTaken', 0] },
                studentCount: { $size: '$uniqueStudents' },
            },
        },
        { $match: { totalAttempts: { $gte: minAttempts }, accuracy: { $lte: maxAccuracy } } },
        { $sort: { accuracy: 1, totalAttempts: -1 } },
        { $limit: limitN },
    );

    const weakTopics = await ExamResult.aggregate(pipeline);

    // Also get available subjects for filtering
    const subjects = await QuestionBankQuestion.distinct('subject');

    res.json({ weakTopics, subjects });
}

/** GET /admin/analytics/weak-topics/by-student/:studentId */
export async function adminGetStudentWeakTopics(req: AuthRequest, res: Response): Promise<void> {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) { res.status(400).json({ message: 'Invalid studentId' }); return; }

    const pipeline: mongoose.PipelineStage[] = [
        { $match: { student: studentId } },
        { $unwind: '$answers' },
        {
            $lookup: {
                from: 'question_bank_questions',
                localField: 'answers.question',
                foreignField: '_id',
                as: 'qInfo',
            },
        },
        { $unwind: { path: '$qInfo', preserveNullAndEmptyArrays: false } },
        {
            $group: {
                _id: {
                    subject: '$qInfo.subject',
                    topic: { $ifNull: ['$qInfo.topic', 'General'] },
                },
                totalAttempts: { $sum: 1 },
                correctCount: { $sum: { $cond: ['$answers.isCorrect', 1, 0] } },
                wrongCount: { $sum: { $cond: ['$answers.isCorrect', 0, 1] } },
                avgTimeTaken: { $avg: '$answers.timeTaken' },
            },
        },
        {
            $project: {
                _id: 0,
                subject: '$_id.subject',
                topic: '$_id.topic',
                totalAttempts: 1,
                correctCount: 1,
                wrongCount: 1,
                accuracy: {
                    $round: [{ $multiply: [{ $divide: ['$correctCount', '$totalAttempts'] }, 100] }, 1],
                },
                avgTimeTaken: { $round: ['$avgTimeTaken', 0] },
            },
        },
        { $sort: { accuracy: 1 } },
    ];

    const topics = await ExamResult.aggregate(pipeline);

    // Separate into weak and strong
    const weakTopics = topics.filter((t) => t.accuracy <= 50);
    const strongTopics = topics.filter((t) => t.accuracy > 70);

    res.json({ allTopics: topics, weakTopics, strongTopics });
}

/** GET /admin/analytics/weak-topics/question-difficulty — hardest questions */
export async function adminGetHardestQuestions(req: AuthRequest, res: Response): Promise<void> {
    const limitN = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const hardest = await QuestionBankAnalytics.find({ totalAppearances: { $gte: 5 } })
        .sort({ accuracyPercent: 1 })
        .limit(limitN)
        .populate({
            path: 'bankQuestionId',
            select: 'questionText subject topic subtopic moduleCategory',
        })
        .lean();

    res.json({ questions: hardest });
}

/* ═══════════════════════════════════════════════════════════
   STUDENT  ENDPOINTS — Personal Weak Topics
   ═══════════════════════════════════════════════════════════ */

/** GET /api/student/me/weak-topics */
export async function getStudentWeakTopics(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?._id) { res.status(401).json({ message: 'Not authenticated' }); return; }
    const studentId = new mongoose.Types.ObjectId(req.user._id);

    const pipeline: mongoose.PipelineStage[] = [
        { $match: { student: studentId } },
        { $unwind: '$answers' },
        {
            $lookup: {
                from: 'question_bank_questions',
                localField: 'answers.question',
                foreignField: '_id',
                as: 'qInfo',
            },
        },
        { $unwind: { path: '$qInfo', preserveNullAndEmptyArrays: false } },
        {
            $group: {
                _id: {
                    subject: '$qInfo.subject',
                    topic: { $ifNull: ['$qInfo.topic', 'General'] },
                },
                totalAttempts: { $sum: 1 },
                correctCount: { $sum: { $cond: ['$answers.isCorrect', 1, 0] } },
                wrongCount: { $sum: { $cond: ['$answers.isCorrect', 0, 1] } },
            },
        },
        {
            $project: {
                _id: 0,
                subject: '$_id.subject',
                topic: '$_id.topic',
                totalAttempts: 1,
                correctCount: 1,
                wrongCount: 1,
                accuracy: {
                    $round: [{ $multiply: [{ $divide: ['$correctCount', '$totalAttempts'] }, 100] }, 1],
                },
            },
        },
        { $match: { totalAttempts: { $gte: 3 } } },
        { $sort: { accuracy: 1 } },
        { $limit: 15 },
    ];

    const weakTopics = await ExamResult.aggregate(pipeline);
    res.json({ weakTopics });
}
