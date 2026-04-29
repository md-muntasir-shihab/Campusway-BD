import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import Question from '../models/Question';
import QuestionGroup from '../models/QuestionGroup';
import QuestionCategory from '../models/QuestionCategory';
import QuestionTopic from '../models/QuestionTopic';
import StudentProfile from '../models/StudentProfile';
import { ResponseBuilder } from '../utils/responseBuilder';
import { recordStudentActivity, incrementDailyPracticeCount } from '../services/streakService';
import * as PracticeSessionService from '../services/PracticeSessionService';

function ensureStudent(req: AuthRequest, res: Response): string | null {
    if (!req.user) {
        ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Not authenticated'));
        return null;
    }
    if (req.user.role !== 'student') {
        ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access only'));
        return null;
    }
    return req.user._id;
}

/**
 * GET /api/student/practice/taxonomy
 * Returns the full group → category → topic tree for the practice picker.
 */
export async function getPracticeTaxonomy(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!ensureStudent(req, res)) return;

        const [groups, categories, topics] = await Promise.all([
            QuestionGroup.find({ isActive: true }).sort({ order: 1 }).lean(),
            QuestionCategory.find({ isActive: true }).sort({ order: 1 }).lean(),
            QuestionTopic.find({ isActive: true }).sort({ order: 1 }).lean(),
        ]);

        const tree = groups.map((group) => {
            const groupCategories = categories
                .filter((c) => String(c.group_id) === String(group._id))
                .map((cat) => {
                    const catTopics = topics
                        .filter((t) => String(t.category_id) === String(cat._id) && !t.parent_id)
                        .map((topic) => ({
                            _id: String(topic._id),
                            code: topic.code,
                            title: topic.title,
                            questionCount: topic.questionCount ?? 0,
                            children: topics
                                .filter((sub) => String(sub.parent_id) === String(topic._id))
                                .map((sub) => ({
                                    _id: String(sub._id),
                                    code: sub.code,
                                    title: sub.title,
                                    questionCount: sub.questionCount ?? 0,
                                })),
                        }));
                    return {
                        _id: String(cat._id),
                        code: cat.code,
                        title: cat.title,
                        description: cat.description,
                        topics: catTopics,
                    };
                });
            return {
                _id: String(group._id),
                code: group.code,
                title: group.title,
                description: group.description,
                color: group.color ?? '',
                iconUrl: group.iconUrl ?? '',
                categories: groupCategories,
            };
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ groups: tree }));
    } catch (err) {
        console.error('getPracticeTaxonomy error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch taxonomy'));
    }
}

/**
 * GET /api/student/practice/questions
 * Query: groupId, categoryId, topicId, difficulty, count (default 10, max 50)
 * Returns random approved questions matching the filter.
 */
export async function getPracticeQuestions(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;

        const { groupId, categoryId, topicId, difficulty } = req.query;
        const requestedCount = Math.max(1, Math.min(50, Number(req.query.count) || 10));

        const filter: Record<string, unknown> = {
            status: 'approved',
            active: true,
            question_type: { $in: ['MCQ', 'TF', 'MULTI'] },
        };

        if (groupId && mongoose.Types.ObjectId.isValid(String(groupId))) {
            filter.group_id = new mongoose.Types.ObjectId(String(groupId));
        }
        if (categoryId && mongoose.Types.ObjectId.isValid(String(categoryId))) {
            filter.category_id = new mongoose.Types.ObjectId(String(categoryId));
        }
        if (topicId && mongoose.Types.ObjectId.isValid(String(topicId))) {
            filter.topic_id = new mongoose.Types.ObjectId(String(topicId));
        }
        if (difficulty && ['easy', 'medium', 'hard'].includes(String(difficulty))) {
            filter.difficulty = String(difficulty);
        }

        // Sample N random questions matching the filter.
        const questions = await Question.aggregate([
            { $match: filter },
            { $sample: { size: requestedCount } },
            {
                $project: {
                    _id: 1,
                    questionText: 1,
                    question: 1,
                    questionType: 1,
                    question_type: 1,
                    options: 1,
                    optionsLocalized: 1,
                    optionA: 1,
                    optionB: 1,
                    optionC: 1,
                    optionD: 1,
                    languageMode: 1,
                    marks: 1,
                    negativeMarks: 1,
                    negative_marks: 1,
                    difficulty: 1,
                    estimated_time: 1,
                    image_media_id: 1,
                    questionImage: 1,
                    group_id: 1,
                    category_id: 1,
                    topic_id: 1,
                },
            },
        ]);

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            items: questions,
            count: questions.length,
            filter: { groupId, categoryId, topicId, difficulty, requestedCount },
        }));
    } catch (err) {
        console.error('getPracticeQuestions error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch practice questions'));
    }
}

/**
 * POST /api/student/practice/submit
 * Body: { questionId, selectedKeys: string[] }
 * Checks the answer, returns instant feedback, updates streak/daily count, and increments usage stats.
 */
export async function submitPracticeAnswer(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;

        const { questionId, selectedKeys } = req.body ?? {};
        if (!questionId || !mongoose.Types.ObjectId.isValid(String(questionId))) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Valid questionId required'));
            return;
        }
        const selected: string[] = Array.isArray(selectedKeys)
            ? selectedKeys.map((k: string) => String(k).toUpperCase().trim()).filter(Boolean)
            : [];

        const question = await Question.findById(questionId).lean();
        if (!question) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Question not found'));
            return;
        }

        // Resolve correct keys from any of the legacy/normalized fields.
        const correctSet = new Set<string>();
        if (Array.isArray((question as any).correct_answer) && (question as any).correct_answer.length > 0) {
            for (const k of (question as any).correct_answer) correctSet.add(String(k).toUpperCase().trim());
        }
        if (typeof (question as any).correctAnswer === 'string' && (question as any).correctAnswer) {
            correctSet.add((question as any).correctAnswer.toUpperCase());
        }

        const selectedSorted = [...selected].sort().join('|');
        const correctSorted = [...correctSet].sort().join('|');
        const isCorrect = selectedSorted.length > 0 && selectedSorted === correctSorted;

        // Update streak + daily counter for engagement
        const streak = await recordStudentActivity(studentId);
        await incrementDailyPracticeCount(studentId, 1);

        // Award a small point for correct practice; do not punish wrong attempts in practice mode.
        if (isCorrect) {
            await StudentProfile.updateOne(
                { user_id: studentId },
                { $inc: { points: 1 } },
            );
        }

        // Update question usage statistics
        await Question.updateOne(
            { _id: question._id },
            {
                $inc: {
                    usage_count: 1,
                    totalAttempted: 1,
                    totalCorrect: isCorrect ? 1 : 0,
                },
                $set: { last_used_at: new Date() },
            },
        );

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            isCorrect,
            correctAnswer: [...correctSet],
            explanation: (question as any).explanationText ?? { en: (question as any).explanation ?? '', bn: '' },
            streak: streak ? {
                current: (streak as any).streak_current,
                longest: (streak as any).streak_longest,
                incrementedToday: (streak as any).incrementedToday,
            } : null,
        }));
    } catch (err) {
        console.error('submitPracticeAnswer error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to submit answer'));
    }
}

/**
 * GET /api/student/practice/stats
 * Returns the student's streak + recent practice stats for the practice landing page.
 */
export async function getPracticeStats(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId) return;

        const profile = await StudentProfile.findOne({ user_id: studentId }).lean();
        if (!profile) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Student profile not found'));
            return;
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            streak: {
                current: (profile as any).streak_current ?? 0,
                longest: (profile as any).streak_longest ?? 0,
                lastActivityDate: (profile as any).streak_last_activity_date ?? null,
                freezeCount: (profile as any).streak_freeze_count ?? 0,
            },
            dailyGoal: (profile as any).daily_practice_goal ?? 10,
            dailyCompleted: (profile as any).daily_practice_count_today ?? 0,
            lifetimePoints: (profile as any).points ?? 0,
        }));
    } catch (err) {
        console.error('getPracticeStats error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to fetch practice stats'));
    }
}

// ── New Practice Session Handlers (Exam Management System) ──
// These handlers delegate to PracticeSessionService for topic-based
// adaptive practice sessions.
// Requirements: 12.1, 12.2

/**
 * GET /api/v1/practice/topics/:topicId — Start a practice session for a given topic.
 */
export async function startPractice(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const topicId = String(req.params.topicId);
        const session = await PracticeSessionService.startPracticeSession(studentId, topicId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(session));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('PRACTICE_ERROR', message));
    }
}

/**
 * POST /api/v1/practice/sessions/:id/answer — Submit an answer during a practice session.
 * Body: { questionId, answer }
 */
export async function submitPracticeSessionAnswer(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const { questionId, answer } = req.body;
        const feedback = await PracticeSessionService.submitPracticeAnswer(studentId, questionId, answer);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(feedback));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('PRACTICE_ERROR', message));
    }
}
