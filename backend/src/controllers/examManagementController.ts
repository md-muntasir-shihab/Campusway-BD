import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as ExamBuilderService from '../services/ExamBuilderService';
import { addLeaderboardStreamClient } from '../realtime/leaderboardStream';
import * as ExamRunnerService from '../services/ExamRunnerService';
import { computeResult } from '../services/ResultEngineService';
import { getExamLeaderboard } from '../services/LeaderboardService';
import Exam from '../models/Exam';
import ExamResult from '../models/ExamResult';
import AntiCheatViolationLog from '../models/AntiCheatViolationLog';
import ExamSession from '../models/ExamSession';
import User from '../models/User';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import { triggerWrittenResultGraded, triggerAntiCheatWarning, triggerSessionCancelled } from '../services/NotificationTriggerService';

// ── Exam Management Controller ──────────────────────────────
// Thin handlers delegating to ExamBuilderService, ExamRunnerService,
// ResultEngineService, and LeaderboardService.
// Requirements: 4.1, 5.1, 7.4, 8.3, 17.3, 17.4, 17.5, 17.6

// ═══════════════════════════════════════════════════════════
// Admin Handlers
// ═══════════════════════════════════════════════════════════

// ─── Admin: Create Draft (Step 1) ───────────────────────────

/**
 * POST / — Create a new exam draft.
 */
export async function createDraft(req: AuthRequest, res: Response): Promise<void> {
    try {
        const createdBy = String(req.user?._id ?? req.user?.id ?? '');
        const exam = await ExamBuilderService.createExamDraft({ ...req.body, createdBy });
        ResponseBuilder.send(res, 201, ResponseBuilder.created(exam, 'Exam draft created'));
    } catch (err: unknown) {
        console.error('[examManagement.createDraft] failed:', err);
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('required') ? 400 : 500;
        const code = status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Update Question Selection (Step 2) ──────────────

/**
 * PUT /:id/questions — Set selected questions on a draft exam.
 */
export async function updateQuestions(req: AuthRequest, res: Response): Promise<void> {
    try {
        await ExamBuilderService.updateQuestionSelection(String(req.params.id), req.body.questionIds);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Questions updated'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : message.includes('draft') ? 400 : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Auto-Pick Questions (Step 2 alternative) ────────

/**
 * POST /:id/auto-pick — Auto-select questions by difficulty distribution.
 */
export async function autoPick(req: AuthRequest, res: Response): Promise<void> {
    try {
        const questions = await ExamBuilderService.autoPick(String(req.params.id), req.body);
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.success({ questions, questionIds: questions.map((q) => q.id) }, 'Questions auto-picked'),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : message.includes('draft') ? 400 : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Update Settings (Step 3) ────────────────────────

/**
 * PUT /:id/settings — Update exam settings (marks, shuffle, visibility, anti-cheat).
 */
export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        await ExamBuilderService.updateSettings(String(req.params.id), req.body);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Settings updated'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : message.includes('draft') ? 400 : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Update Scheduling (Step 4) ──────────────────────

/**
 * PUT /:id/scheduling — Update exam scheduling and pricing.
 */
export async function updateScheduling(req: AuthRequest, res: Response): Promise<void> {
    try {
        await ExamBuilderService.updateScheduling(String(req.params.id), req.body);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Scheduling updated'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : message.includes('draft') ? 400 : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Preview Exam ────────────────────────────────────

/**
 * GET /:id/preview — Preview an exam with its questions before publishing.
 */
export async function previewExam(req: AuthRequest, res: Response): Promise<void> {
    try {
        const exam = await Exam.findById(String(req.params.id)).populate('questionOrder').lean();
        if (!exam) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Exam not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(exam));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── Admin: Publish Exam (Step 5) ───────────────────────────

/**
 * POST /:id/publish — Validate and publish a draft exam.
 */
export async function publishExam(req: AuthRequest, res: Response): Promise<void> {
    try {
        const exam = await ExamBuilderService.publishExam(String(req.params.id));
        ResponseBuilder.send(res, 200, ResponseBuilder.success(exam, 'Exam published'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('Cannot publish') || message.includes('Only draft') ? 400
                : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Clone Exam ──────────────────────────────────────

/**
 * POST /:id/clone — Clone an existing exam as a new draft.
 */
export async function cloneExam(req: AuthRequest, res: Response): Promise<void> {
    try {
        const exam = await ExamBuilderService.cloneExam(String(req.params.id));
        ResponseBuilder.send(res, 201, ResponseBuilder.created(exam, 'Exam cloned'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        const code = status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Get Pending Evaluation Results ──────────────────

/**
 * GET /:id/results/pending-evaluation — Fetch all exam results that need
 * written-answer grading for the given exam.
 */
export async function getPendingEvaluationResults(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examId = String(req.params.id);
        if (!/^[a-fA-F0-9]{24}$/.test(examId)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid exam ID format'));
            return;
        }

        // Fetch all results for this exam that have written answers
        const results = await ExamResult.find({
            exam: examId,
            $or: [
                { status: 'pending_evaluation' },
                { 'answers.questionType': 'written' },
            ],
        }).populate('student', '_id full_name username email');

        // Keep results where status is pending_evaluation OR at least one
        // written answer lacks a corresponding writtenGrades entry
        const filtered = results.filter((result) => {
            if (result.status === 'pending_evaluation') return true;
            const writtenAnswers = result.answers.filter((a) => a.questionType === 'written');
            if (writtenAnswers.length === 0) return false;
            const gradedQuestionIds = new Set(
                (result.writtenGrades || []).map((g) => String(g.questionId)),
            );
            return writtenAnswers.some((a) => !gradedQuestionIds.has(String(a.question)));
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success(filtered));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        const code = status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Grade Written Answer ────────────────────────────

/**
 * POST /results/:resultId/grade — Grade a single written answer
 * in an exam result.
 */
export async function gradeWrittenAnswer(req: AuthRequest, res: Response): Promise<void> {
    try {
        const resultId = String(req.params.resultId);
        if (!/^[a-fA-F0-9]{24}$/.test(resultId)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid result ID format'));
            return;
        }

        const result = await ExamResult.findById(resultId);
        if (!result) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Result not found'));
            return;
        }

        const { questionId, marks, maxMarks, feedback } = req.body;

        // Verify questionId corresponds to a written-type answer
        const writtenAnswer = result.answers.find(
            (a) => String(a.question) === questionId && a.questionType === 'written',
        );
        if (!writtenAnswer) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Question is not a written-type answer'));
            return;
        }

        // Upsert entry in writtenGrades array
        const gradeEntry = {
            questionId,
            marks,
            maxMarks,
            feedback: feedback || '',
            gradedBy: req.user!._id,
            gradedAt: new Date(),
        };

        const existingIndex = (result.writtenGrades || []).findIndex(
            (g) => String(g.questionId) === questionId,
        );

        if (existingIndex >= 0) {
            result.writtenGrades![existingIndex] = gradeEntry as any;
        } else {
            if (!result.writtenGrades) {
                result.writtenGrades = [];
            }
            result.writtenGrades.push(gradeEntry as any);
        }

        // Check if all written answers have corresponding writtenGrades entries
        const writtenAnswers = result.answers.filter((a) => a.questionType === 'written');
        const grades = result.writtenGrades || [];
        const gradedQuestionIds = new Set(
            grades.map((g) => String(g.questionId)),
        );
        const allGraded = writtenAnswers.every((a) => gradedQuestionIds.has(String(a.question)));

        if (allGraded) {
            // Recalculate: MCQ marksObtained + written grades marks
            const mcqMarks = result.answers
                .filter((a) => a.questionType !== 'written')
                .reduce((sum, a) => sum + (a.marksObtained || 0), 0);

            const writtenMarks = grades.reduce((sum, g) => sum + g.marks, 0);

            result.obtainedMarks = mcqMarks + writtenMarks;
            result.percentage = result.totalMarks > 0
                ? (result.obtainedMarks / result.totalMarks) * 100
                : 0;
            result.status = 'evaluated';
        }

        await result.save();

        ResponseBuilder.send(res, 200, ResponseBuilder.success(result));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        const code = status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Anti-Cheat Report ───────────────────────────────

/**
 * GET /:id/anti-cheat-report — Generate a comprehensive anti-cheat
 * violation report for the given exam.
 */
export async function getAntiCheatReport(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examId = String(req.params.id);
        if (!/^[a-fA-F0-9]{24}$/.test(examId)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid exam ID format'));
            return;
        }

        const examObjectId = new mongoose.Types.ObjectId(examId);

        const [summaryResult, byType, flaggedSessions] = await Promise.all([
            // Summary: total violations, distinct sessions, distinct students
            AntiCheatViolationLog.aggregate([
                { $match: { exam: examObjectId } },
                {
                    $group: {
                        _id: null,
                        totalViolations: { $sum: 1 },
                        flaggedSessions: { $addToSet: '$session' },
                        uniqueStudentsFlagged: { $addToSet: '$student' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        totalViolations: 1,
                        flaggedSessions: { $size: '$flaggedSessions' },
                        uniqueStudentsFlagged: { $size: '$uniqueStudentsFlagged' },
                    },
                },
            ]),

            // By Type: group by violationType, count each
            AntiCheatViolationLog.aggregate([
                { $match: { exam: examObjectId } },
                {
                    $group: {
                        _id: '$violationType',
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        violationType: '$_id',
                        count: 1,
                    },
                },
            ]),

            // Flagged Sessions: sessions with violationsCount > 0
            ExamSession.find({ exam: examId, violationsCount: { $gt: 0 } })
                .populate('student', '_id full_name email')
                .select('student violationsCount deviceFingerprint ipAddress submittedAt status')
                .lean(),
        ]);

        const summary = summaryResult.length > 0
            ? summaryResult[0]
            : { totalViolations: 0, flaggedSessions: 0, uniqueStudentsFlagged: 0 };

        const report = {
            summary,
            violationsByType: byType,
            flaggedSessions: flaggedSessions.map((session: any) => ({
                sessionId: session._id,
                studentId: session.student?._id || null,
                studentName: session.student?.full_name || null,
                studentEmail: session.student?.email || null,
                violationCount: session.violationsCount,
                deviceFingerprint: session.deviceFingerprint || null,
                ipAddress: session.ipAddress || null,
                submittedAt: session.submittedAt || null,
                status: session.status,
            })),
        };

        ResponseBuilder.send(res, 200, ResponseBuilder.success(report));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        const code = status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Admin: Anti-Cheat Actions ──────────────────────────────

/**
 * PATCH /:examId/sessions/:sessionId/cancel — Void a flagged exam session.
 *
 * Marks the session cancelled/locked, zeroes the student's result for that
 * attempt, and notifies the student. Used by the Anti-Cheat report when an
 * admin decides a flagged attempt should not count.
 */
export async function cancelExamSession(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examId = String(req.params.examId);
        const sessionId = String(req.params.sessionId);
        if (!/^[a-fA-F0-9]{24}$/.test(examId) || !/^[a-fA-F0-9]{24}$/.test(sessionId)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid exam or session ID format'));
            return;
        }

        const reason = String((req.body as { reason?: string })?.reason || 'Cancelled by admin (anti-cheat)').trim();
        const session = await ExamSession.findOne({ _id: sessionId, exam: examId });
        if (!session) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Session not found'));
            return;
        }

        session.status = 'cancelled';
        session.sessionLocked = true;
        session.lockReason = reason;
        session.isActive = false;
        session.forcedSubmittedBy = req.user!._id as unknown as mongoose.Types.ObjectId;
        session.cheat_flags.push({ reason: 'admin_cancelled', timestamp: new Date() });
        await session.save();

        // Void the student's result for this attempt (zero marks).
        await ExamResult.updateOne(
            { exam: examId, student: session.student, attemptNo: session.attemptNo },
            {
                $set: {
                    obtainedMarks: 0,
                    percentage: 0,
                    status: 'evaluated',
                    cancelled: true,
                    cancelReason: reason,
                },
            },
        );

        try {
            await triggerSessionCancelled({ examId, studentId: String(session.student) });
        } catch (notifyErr) {
            console.error('triggerSessionCancelled failed:', notifyErr);
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ sessionId, status: 'cancelled' }, 'Session cancelled and marks voided.'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * POST /:examId/sessions/:sessionId/warn — Send a warning notification to the
 * student of a flagged session without changing their marks.
 */
export async function warnExamSessionStudent(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examId = String(req.params.examId);
        const sessionId = String(req.params.sessionId);
        if (!/^[a-fA-F0-9]{24}$/.test(examId) || !/^[a-fA-F0-9]{24}$/.test(sessionId)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid exam or session ID format'));
            return;
        }

        const session = await ExamSession.findOne({ _id: sessionId, exam: examId }).select('student').lean();
        if (!session) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Session not found'));
            return;
        }

        const message = String((req.body as { message?: string })?.message || '').trim() || undefined;
        await triggerAntiCheatWarning({ examId, studentId: String(session.student), message });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ sessionId }, 'Warning sent to student.'));
    } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', errMsg));
    }
}

// ─── Admin: List Exams for Selection ────────────────────────

/**
 * GET / — List exams for the admin selector panels (grading, anti-cheat).
 * Supports `?status=completed` (closed or past end date) and
 * `?hasPendingEvaluation=true` (exams with written results awaiting grading).
 * Returns `{ items: [{ _id, title, status, startTime, participantCount }] }`.
 */
export async function listExams(req: AuthRequest, res: Response): Promise<void> {
    try {
        const statusFilter = String(req.query.status || '').trim().toLowerCase();
        const hasPendingEvaluation = String(req.query.hasPendingEvaluation || '').toLowerCase() === 'true';
        let limit = parseInt(String(req.query.limit ?? ''), 10);
        if (Number.isNaN(limit)) limit = 50;
        limit = Math.max(1, Math.min(200, limit));

        const query: Record<string, unknown> = {};
        const now = new Date();

        if (hasPendingEvaluation) {
            const pendingExamIds = await ExamResult.distinct('exam', { status: 'pending_evaluation' });
            if (pendingExamIds.length === 0) {
                ResponseBuilder.send(res, 200, ResponseBuilder.success({ items: [] }));
                return;
            }
            query._id = { $in: pendingExamIds };
        }

        if (statusFilter === 'completed') {
            query.isPublished = true;
            query.$or = [{ status: 'closed' }, { endDate: { $lt: now } }];
        } else if (['draft', 'scheduled', 'live', 'closed'].includes(statusFilter)) {
            query.status = statusFilter;
        }

        const exams = await Exam.find(query)
            .sort({ startDate: -1 })
            .limit(limit)
            .select('title title_bn status startDate endDate isPublished exam_schedule_type deliveryMode totalQuestions totalMarks duration createdAt')
            .lean();

        const examIds = exams.map((e) => e._id);
        const countAgg = examIds.length > 0
            ? await ExamResult.aggregate([
                { $match: { exam: { $in: examIds } } },
                { $group: { _id: '$exam', count: { $sum: 1 } } },
            ])
            : [];
        const countById = new Map<string, number>(
            countAgg.map((c: { _id: mongoose.Types.ObjectId; count: number }) => [String(c._id), Number(c.count || 0)]),
        );

        const items = exams.map((e) => {
            const endMs = e.endDate ? new Date(e.endDate as Date).getTime() : 0;
            const ended = endMs > 0 && endMs < now.getTime();
            const displayStatus = (e.status === 'closed' || ended) ? 'completed' : String(e.status || 'draft');
            return {
                _id: String(e._id),
                title: String(e.title || 'Untitled Exam'),
                title_bn: e.title_bn ? String(e.title_bn) : undefined,
                status: displayStatus,
                rawStatus: String(e.status || 'draft'),
                isPublished: Boolean(e.isPublished),
                scheduleType: e.exam_schedule_type ? String(e.exam_schedule_type) : undefined,
                deliveryMode: e.deliveryMode ? String(e.deliveryMode) : 'internal',
                totalQuestions: Number(e.totalQuestions || 0),
                totalMarks: Number(e.totalMarks || 0),
                duration: Number(e.duration || 0),
                startTime: e.startDate ? new Date(e.startDate as Date).toISOString() : undefined,
                endTime: e.endDate ? new Date(e.endDate as Date).toISOString() : undefined,
                createdAt: e.createdAt ? new Date(e.createdAt as Date).toISOString() : undefined,
                participantCount: countById.get(String(e._id)) || 0,
            };
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ items }));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── Admin: Delete Exam ─────────────────────────────────────

/**
 * DELETE /:id — Delete an exam. Refuses if the exam already has participant
 * results, to avoid destroying attempt history (close it instead).
 */
export async function deleteExam(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examId = String(req.params.id);
        if (!/^[a-fA-F0-9]{24}$/.test(examId)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Invalid exam ID format'));
            return;
        }
        const resultCount = await ExamResult.countDocuments({ exam: examId });
        if (resultCount > 0) {
            ResponseBuilder.send(
                res,
                409,
                ResponseBuilder.error('CONFLICT', `Cannot delete: this exam already has ${resultCount} participant result(s). Close it instead.`),
            );
            return;
        }
        const deleted = await Exam.findByIdAndDelete(examId);
        if (!deleted) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Exam not found'));
            return;
        }
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Exam deleted'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── Analytics Overview Helpers ────────────────────────────────────

/**
 * Validates the analytics inputs. Returns an error message if invalid, otherwise null.
 */
function validateAnalyticsInputs(dateFrom?: any, dateTo?: any, examId?: any): string | null {
    if (dateFrom) {
        const d = new Date(dateFrom as string);
        if (isNaN(d.getTime())) return 'Invalid date format for dateFrom';
    }
    if (dateTo) {
        const d = new Date(dateTo as string);
        if (isNaN(d.getTime())) return 'Invalid date format for dateTo';
    }
    if (examId && !/^[a-fA-F0-9]{24}$/.test(examId as string)) {
        return 'Invalid exam ID format';
    }
    return null;
}

/**
 * Builds the aggregation match filter for ExamResult.
 */
function buildExamResultFilter(dateFrom?: any, dateTo?: any, examId?: any): Record<string, any> {
    const matchFilter: Record<string, any> = {};
    if (examId) {
        matchFilter.exam = new mongoose.Types.ObjectId(examId as string);
    }
    if (dateFrom || dateTo) {
        matchFilter.submittedAt = {};
        if (dateFrom) matchFilter.submittedAt.$gte = new Date(dateFrom as string);
        if (dateTo) matchFilter.submittedAt.$lte = new Date(dateTo as string);
    }
    return matchFilter;
}

/**
 * Builds the date filter for counting Exam documents.
 */
function buildExamDateFilter(dateFrom?: any, dateTo?: any): Record<string, any> {
    if (dateFrom || dateTo) {
        return {
            createdAt: {
                ...(dateFrom ? { $gte: new Date(dateFrom as string) } : {}),
                ...(dateTo ? { $lte: new Date(dateTo as string) } : {}),
            },
        };
    }
    return {};
}

/**
 * Formats the raw aggregation result into final metrics.
 */
function formatAnalyticsMetrics(aggregationResult: any[], totalExams: number) {
    if (aggregationResult.length > 0) {
        return {
            totalExams,
            totalAttempts: aggregationResult[0].totalAttempts,
            averageScore: Math.round((aggregationResult[0].averageScore || 0) * 100) / 100,
            passRate: aggregationResult[0].totalAttempts > 0
                ? Math.round((aggregationResult[0].passCount / aggregationResult[0].totalAttempts) * 100 * 100) / 100
                : 0,
            activeStudents: aggregationResult[0].activeStudents,
        };
    }
    return {
        totalExams,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        activeStudents: 0,
    };
}

// ─── Admin: Analytics Overview ───────────────────────────────

/**
 * GET /analytics/overview — Compute exam center metrics with optional
 * date range and exam filters.
 */
export async function getAnalyticsOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { dateFrom, dateTo, examId } = req.query;

        // Validation
        const validationError = validateAnalyticsInputs(dateFrom, dateTo, examId);
        if (validationError) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', validationError));
            return;
        }

        // Run aggregation pipeline
        const [aggregationResult, totalExams] = await Promise.all([
            ExamResult.aggregate([
                { $match: buildExamResultFilter(dateFrom, dateTo, examId) },
                {
                    $group: {
                        _id: null,
                        totalAttempts: { $sum: 1 },
                        averageScore: { $avg: '$percentage' },
                        passCount: {
                            $sum: { $cond: [{ $gte: ['$percentage', 40] }, 1, 0] },
                        },
                        activeStudents: { $addToSet: '$student' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        totalAttempts: 1,
                        averageScore: 1,
                        passCount: 1,
                        activeStudents: { $size: '$activeStudents' },
                    },
                },
            ]),

            // Count total exams with optional date filter on createdAt
            Exam.countDocuments(buildExamDateFilter(dateFrom, dateTo)),
        ]);

        // Return metrics
        const metrics = formatAnalyticsMetrics(aggregationResult, totalExams);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(metrics));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404 : 500;
        const code = status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ═══════════════════════════════════════════════════════════
// Student Handlers
// ═══════════════════════════════════════════════════════════

// ─── Student: Start Exam ────────────────────────────────────

/**
 * POST /:id/start — Start an exam session for the authenticated student.
 */
export async function startExamSession(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user!._id as string;
        const result = await ExamRunnerService.startExam(
            String(req.params.id),
            studentId,
            req.body.deviceInfo,
        );
        ResponseBuilder.send(res, 201, ResponseBuilder.created(result, 'Exam session started'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('not published') || message.includes('not started')
                || message.includes('ended') || message.includes('Maximum attempts')
                || message.includes('access') ? 403
                : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Student: Save Answers ──────────────────────────────────

/**
 * PATCH /sessions/:id/answers — Auto-save answers for an in-progress session.
 */
export async function saveAnswers(req: AuthRequest, res: Response): Promise<void> {
    try {
        await ExamRunnerService.saveAnswers(String(req.params.id), req.body.answers);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Answers saved'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('not in progress') || message.includes('expired')
                || message.includes('no longer active') ? 400
                : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Student: Submit Exam ───────────────────────────────────

/**
 * POST /:id/submit — Submit an exam session (manual or auto-timeout).
 */
export async function submitExamSession(req: AuthRequest, res: Response): Promise<void> {
    try {
        const submissionType = req.body.submissionType === 'auto_timeout' ? 'auto_timer' as const : 'manual' as const;
        const session = await ExamRunnerService.submitExam(req.body.sessionId, submissionType);

        // Trigger result computation asynchronously
        computeResult(String(session._id)).catch(() => {
            // Result computation errors are logged internally; don't block the response
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({ sessionId: session._id }, 'Exam submitted'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('already been submitted') ? 400
                : 500;
        const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
        ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
    }
}

// ─── Student: Get Result ────────────────────────────────────

/**
 * GET /:id/result — Get the exam result for the authenticated student.
 */
export async function getResult(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user!._id as string;
        const result = await ExamResult.findOne({
            exam: String(req.params.id),
            student: studentId,
        }).lean();

        if (!result) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Result not found'));
            return;
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success(result));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── Student: Detailed Result (per-question review) ─────────

/**
 * GET /:id/result/detailed — Per-question review for the authenticated student.
 * Returns { scoreBreakdown, questions[], examTitle, rank, totalParticipants,
 * resultPublished } shaped for the ExamResultView page. When results are not
 * yet published, returns resultPublished:false with an empty questions list.
 */
export async function getDetailedResult(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user!._id as string;
        const examId = String(req.params.id);

        const exam = await Exam.findById(examId)
            .select('title resultPublishMode resultPublishDate passPercentage')
            .lean();
        if (!exam) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Exam not found'));
            return;
        }

        const result = await ExamResult.findOne({ exam: examId, student: studentId })
            .sort({ attemptNo: -1, submittedAt: -1 })
            .lean();
        if (!result) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'Result not found'));
            return;
        }

        // Determine publish state from the exam's result-publish policy.
        const modeRaw = String((exam as { resultPublishMode?: string }).resultPublishMode || 'scheduled');
        const mode = ['immediate', 'manual', 'scheduled'].includes(modeRaw) ? modeRaw : 'scheduled';
        const now = new Date();
        let resultPublished = false;
        if (mode === 'immediate') {
            resultPublished = true;
        } else if (mode === 'manual') {
            resultPublished = result.status === 'evaluated';
        } else {
            const pd = (exam as { resultPublishDate?: Date }).resultPublishDate
                ? new Date(String((exam as { resultPublishDate?: Date }).resultPublishDate))
                : null;
            resultPublished = Boolean(pd && !Number.isNaN(pd.getTime()) && now >= pd);
        }

        const totalMarks = Number(result.totalMarks || 0);
        const obtainedMarks = Number(result.obtainedMarks || 0);
        const percentage = Number(result.percentage || (totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0));
        const passThreshold = Number((exam as { passPercentage?: number }).passPercentage || 0) || 40;
        const passed = result.passFail
            ? /pass/i.test(String(result.passFail))
            : percentage >= passThreshold;

        const scoreBreakdown = {
            obtainedMarks,
            totalMarks,
            correctCount: Number(result.correctCount || 0),
            incorrectCount: Number(result.wrongCount || 0),
            unansweredCount: Number(result.unansweredCount || 0),
            percentage,
            passed,
            timeTakenSeconds: Number(result.timeTaken || 0),
        };

        if (!resultPublished) {
            ResponseBuilder.send(res, 200, ResponseBuilder.success({
                scoreBreakdown,
                questions: [],
                examTitle: String(exam.title || ''),
                resultPublished: false,
            }));
            return;
        }

        // Build per-question review from the stored answers + question bank.
        const answers = Array.isArray(result.answers) ? result.answers : [];
        const questionIds = answers.map((a) => a.question).filter(Boolean);
        const questionDocs = questionIds.length > 0
            ? await QuestionBankQuestion.find({ _id: { $in: questionIds } }).lean()
            : [];
        const qMap = new Map(questionDocs.map((q) => [String(q._id), q]));

        const questions = answers
            .filter((a) => a.questionType !== 'written') // written answers shown via writtenGrades elsewhere
            .map((a, index) => {
                const q = qMap.get(String(a.question));
                const options = Array.isArray(q?.options)
                    ? q!.options.map((o) => ({
                        key: String(o.key),
                        text_en: o.text_en,
                        text_bn: o.text_bn,
                        imageUrl: o.imageUrl,
                        isCorrect: Boolean(o.isCorrect),
                    }))
                    : [];
                const correctAnswer = String(
                    q?.correctKey || options.find((o) => o.isCorrect)?.key || '',
                );
                return {
                    questionId: String(a.question),
                    questionIndex: index,
                    question_en: q?.question_en,
                    question_bn: q?.question_bn,
                    options,
                    selectedAnswer: a.selectedAnswer || null,
                    correctAnswer,
                    isCorrect: Boolean(a.isCorrect),
                    explanation_en: q?.explanation_en,
                    explanation_bn: q?.explanation_bn,
                    marks: Number(a.marks ?? q?.marks ?? 0),
                    negativeMarks: Number(q?.negativeMarks ?? 0),
                };
            });

        const [betterCount, totalParticipants] = await Promise.all([
            ExamResult.countDocuments({ exam: examId, obtainedMarks: { $gt: obtainedMarks } }),
            ExamResult.countDocuments({ exam: examId }),
        ]);

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            scoreBreakdown,
            questions,
            examTitle: String(exam.title || ''),
            rank: betterCount + 1,
            totalParticipants,
            resultPublished: true,
        }));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

// ─── Student: Get Leaderboard ───────────────────────────────

/**
 * GET /:id/leaderboard — Get the leaderboard for a specific exam.
 */
export async function getExamLeaderboardHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const studentId = req.user?._id as string | undefined;
        const leaderboard = await getExamLeaderboard(String(req.params.id), page, studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(leaderboard));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /:id/leaderboard/stream — Subscribe to live leaderboard stream for an exam.
 */
export async function getExamLeaderboardStreamHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examId = String(req.params.id);
        const studentId = req.user?._id ? String(req.user._id) : undefined;
        
        addLeaderboardStreamClient({
            examId,
            studentId,
            res,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
