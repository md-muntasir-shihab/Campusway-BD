/**
 * Exam Runner Service
 *
 * Manages the exam session lifecycle for students:
 *   - startExam: create ExamSession, validate group access, check schedule window, record device fingerprint
 *   - saveAnswers: auto-save with idempotency (same answer for same question doesn't create duplicate)
 *   - submitExam: manual or auto on timer expiry / violation
 *   - restoreSession: resume from last auto-save after disconnect
 *   - recordViolation: log anti-cheat violations, increment counters, auto-submit if limit exceeded
 *
 * Requirements: 5.1, 5.2, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.7, 18.1, 18.4, 28.1, 28.4
 */
import mongoose from 'mongoose';
import Exam, { IExam } from '../models/Exam';
import ExamSession, { IExamSession } from '../models/ExamSession';
import GroupMembership from '../models/GroupMembership';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import AntiCheatViolationLog, { ViolationType } from '../models/AntiCheatViolationLog';

// ─── DTO Types ──────────────────────────────────────────────

export interface DeviceInfo {
    ipAddress: string;
    deviceInfo: string;
    browserInfo: string;
    userAgent: string;
    deviceFingerprint: string;
}

export interface AnswerUpdate {
    questionId: string;
    selectedAnswer: string;
    writtenAnswerUrl?: string;
}

export type SubmissionType = 'manual' | 'auto_timer' | 'auto_violation';

export interface ExamSessionStart {
    session: IExamSession;
    questions: {
        _id: string;
        question_en?: string;
        question_bn?: string;
        questionImageUrl?: string;
        questionFormulaLatex?: string;
        question_type: string;
        options: { key: string; text_en?: string; text_bn?: string; imageUrl?: string }[];
        images?: string[];
        marks: number;
    }[];
    timer: {
        durationMinutes: number;
        startedAt: Date;
        expiresAt: Date;
        remainingSeconds: number;
    };
}

export interface ExamSessionRestore {
    session: IExamSession;
    answers: {
        questionId: string;
        selectedAnswer: string;
        writtenAnswerUrl?: string;
        savedAt: Date;
    }[];
    questions: ExamSessionStart['questions'];
    timer: {
        durationMinutes: number;
        startedAt: Date;
        expiresAt: Date;
        remainingSeconds: number;
    };
}

export interface ViolationEvent {
    violationType: ViolationType;
    details?: string;
    deviceFingerprint?: string;
    ipAddress?: string;
}

export interface ViolationResult {
    autoSubmitted: boolean;
    violationCount: number;
    maxAllowed: number;
}

// ─── Helpers ────────────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

/**
 * Shuffle an array in-place using Fisher-Yates algorithm.
 */
function shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


// ─── Start Exam ─────────────────────────────────────────────

/**
 * Start an exam session for a student.
 *
 * 1. Validate the exam exists and is published
 * 2. Check the exam is within its schedule window
 * 3. Validate the student has group access to the exam
 * 4. Check attempt limits
 * 5. Check for an existing active session (resume instead of duplicate)
 * 6. Create ExamSession with device fingerprint
 * 7. Fetch and return questions (stripped of correct answers) + timer info
 *
 * Requirements: 5.1, 5.7, 13.2, 13.3, 13.4, 18.1, 28.1
 */
export async function startExam(
    examId: string,
    studentId: string,
    deviceInfo: DeviceInfo,
): Promise<ExamSessionStart> {
    // 1. Validate exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
        throw new Error('Exam not found');
    }
    if (!exam.isPublished) {
        throw new Error('Exam is not published');
    }

    // 2. Check schedule window
    const now = new Date();
    if (exam.exam_schedule_type !== 'practice') {
        // For non-practice exams, enforce the schedule window
        if (exam.startDate && now < exam.startDate) {
            throw new Error('Exam has not started yet');
        }
        if (exam.endDate && now > exam.endDate) {
            throw new Error('Exam schedule window has ended');
        }
    }

    // 3. Validate group access (Requirement 13.2, 13.3, 13.4)
    await validateGroupAccess(exam, studentId);

    // 4. Check attempt limits
    const previousAttempts = await ExamSession.countDocuments({
        exam: toObjectId(examId),
        student: toObjectId(studentId),
        status: { $in: ['submitted', 'evaluated'] },
    });

    const attemptLimit = exam.attemptLimit || 1;
    if (previousAttempts >= attemptLimit) {
        throw new Error(`Maximum attempts (${attemptLimit}) reached for this exam`);
    }

    // 5. Check for existing active session — resume instead of creating duplicate
    const existingSession = await ExamSession.findOne({
        exam: toObjectId(examId),
        student: toObjectId(studentId),
        status: 'in_progress',
        isActive: true,
    });

    if (existingSession) {
        // Session already exists — restore it instead
        return buildSessionStartResponse(existingSession, exam);
    }

    // 6. Create new ExamSession
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + exam.duration * 60 * 1000);

    const session = new ExamSession({
        exam: toObjectId(examId),
        student: toObjectId(studentId),
        attemptNo: previousAttempts + 1,
        attemptRevision: 0,
        startedAt,
        lastSavedAt: startedAt,
        autoSaves: 0,
        answers: [],
        tabSwitchEvents: [],
        ipAddress: deviceInfo.ipAddress,
        deviceInfo: deviceInfo.deviceInfo,
        browserInfo: deviceInfo.browserInfo,
        userAgent: deviceInfo.userAgent,
        deviceFingerprint: deviceInfo.deviceFingerprint,
        sessionLocked: false,
        isActive: true,
        expiresAt,
        tabSwitchCount: 0,
        copyAttemptCount: 0,
        fullscreenExitCount: 0,
        violationsCount: 0,
        markedForReview: [],
        localStorageBackup: false,
        cheat_flags: [],
        auto_submitted: false,
        status: 'in_progress',
    });

    await session.save();

    // 7. Device fingerprint duplicate detection (Requirement 28.2)
    // Check if another student has an active/submitted session on the same exam
    // with the same device fingerprint — if so, flag both sessions.
    await detectFingerprintDuplicate(session, examId, studentId, deviceInfo.deviceFingerprint);

    return buildSessionStartResponse(session, exam);
}

/**
 * Detect if the same device fingerprint is being used by a different student
 * on the same exam. If found, create AntiCheatViolationLog entries for both
 * the current session and the existing session(s).
 *
 * Requirements: 28.2
 */
async function detectFingerprintDuplicate(
    currentSession: IExamSession,
    examId: string,
    studentId: string,
    fingerprint: string,
): Promise<void> {
    if (!fingerprint) return;

    // Find other sessions on the same exam with the same fingerprint but different student
    const duplicateSessions = await ExamSession.find({
        exam: toObjectId(examId),
        deviceFingerprint: fingerprint,
        student: { $ne: toObjectId(studentId) },
        _id: { $ne: currentSession._id },
    });

    if (duplicateSessions.length === 0) return;

    const now = new Date();

    // Create violation logs for each duplicate session found
    const violationLogs = [];

    for (const dupSession of duplicateSessions) {
        // Log violation for the existing (duplicate) session
        violationLogs.push({
            session: dupSession._id,
            student: dupSession.student,
            exam: toObjectId(examId),
            violationType: 'fingerprint_match' as ViolationType,
            details: `Same device fingerprint detected on student ${studentId}`,
            deviceFingerprint: fingerprint,
            timestamp: now,
        });
    }

    // Log violation for the current (new) session
    violationLogs.push({
        session: currentSession._id,
        student: toObjectId(studentId),
        exam: toObjectId(examId),
        violationType: 'fingerprint_match' as ViolationType,
        details: `Same device fingerprint detected on student(s) ${duplicateSessions.map((s) => s.student.toString()).join(', ')}`,
        deviceFingerprint: fingerprint,
        timestamp: now,
    });

    await AntiCheatViolationLog.insertMany(violationLogs);
}

/**
 * Validate that the student has group access to the exam.
 *
 * Access is granted if:
 * - The exam's visibilityMode is 'all_students' (open to everyone)
 * - The exam's accessMode is 'all' and no specific groups are assigned
 * - The student is an active member of at least one of the exam's assigned groups
 *
 * Requirements: 13.2, 13.3, 13.4
 */
async function validateGroupAccess(exam: IExam, studentId: string): Promise<void> {
    // If exam is open to all students, skip group check
    if (exam.visibilityMode === 'all_students') {
        return;
    }

    // If accessMode is 'all' and no specific groups are assigned, allow access
    if (exam.accessMode === 'all' && (!exam.targetGroupIds || exam.targetGroupIds.length === 0)) {
        return;
    }

    // Collect all group IDs from both targetGroupIds and accessControl.allowedGroupIds
    const assignedGroupIds: mongoose.Types.ObjectId[] = [];

    if (exam.targetGroupIds && exam.targetGroupIds.length > 0) {
        assignedGroupIds.push(...exam.targetGroupIds);
    }
    if (exam.accessControl?.allowedGroupIds && exam.accessControl.allowedGroupIds.length > 0) {
        for (const gid of exam.accessControl.allowedGroupIds) {
            // Avoid duplicates
            if (!assignedGroupIds.some((id) => id.equals(gid))) {
                assignedGroupIds.push(gid);
            }
        }
    }

    // If no groups are assigned at all, allow access (no restriction configured)
    if (assignedGroupIds.length === 0) {
        return;
    }

    // Check if student is an active member of any assigned group
    const membership = await GroupMembership.findOne({
        studentId: toObjectId(studentId),
        groupId: { $in: assignedGroupIds },
        membershipStatus: 'active',
    });

    if (!membership) {
        throw new Error('Access denied: you are not a member of any group assigned to this exam');
    }
}

/**
 * Build the ExamSessionStart response with questions and timer info.
 */
async function buildSessionStartResponse(
    session: IExamSession,
    exam: IExam,
): Promise<ExamSessionStart> {
    // Determine question IDs — use questionOrder if available
    let questionIds: mongoose.Types.ObjectId[] = [];
    if (exam.questionOrder && exam.questionOrder.length > 0) {
        questionIds = exam.questionOrder;
    }

    // Fetch questions (strip correct answers for student view)
    const questions = await QuestionBankQuestion.find(
        { _id: { $in: questionIds } },
        {
            _id: 1,
            question_en: 1,
            question_bn: 1,
            questionImageUrl: 1,
            questionFormulaLatex: 1,
            question_type: 1,
            options: 1,
            images: 1,
            marks: 1,
        },
    ).lean();

    // Build a map for ordering
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    // Order questions according to questionOrder
    let orderedQuestions = questionIds
        .map((id) => questionMap.get(id.toString()))
        .filter(Boolean) as typeof questions;

    // Shuffle if exam settings require it
    if (exam.randomizeQuestions) {
        orderedQuestions = shuffleArray([...orderedQuestions]);
    }

    // Strip isCorrect from options (students should not see correct answers)
    const sanitizedQuestions = orderedQuestions.map((q) => ({
        _id: q._id.toString(),
        question_en: q.question_en,
        question_bn: q.question_bn,
        questionImageUrl: q.questionImageUrl,
        questionFormulaLatex: q.questionFormulaLatex,
        question_type: q.question_type || 'mcq',
        options: (q.options || []).map((opt: any) => ({
            key: opt.key,
            text_en: opt.text_en,
            text_bn: opt.text_bn,
            imageUrl: opt.imageUrl,
        })),
        images: q.images,
        marks: q.marks || exam.defaultMarksPerQuestion || 1,
    }));

    // Calculate timer info
    const now = new Date();
    const remainingMs = session.expiresAt.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return {
        session,
        questions: sanitizedQuestions,
        timer: {
            durationMinutes: exam.duration,
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            remainingSeconds,
        },
    };
}

// ─── Save Answers (Auto-Save with Idempotency) ─────────────

/**
 * Auto-save answers to an exam session.
 *
 * Idempotency: if the same answer for the same question already exists,
 * it is not duplicated — only updated if the answer value changed.
 * Tracks answer history for change auditing.
 *
 * Requirements: 5.2, 18.1
 */
export async function saveAnswers(
    sessionId: string,
    answers: AnswerUpdate[],
): Promise<void> {
    const session = await ExamSession.findById(sessionId);
    if (!session) {
        throw new Error('Exam session not found');
    }
    if (session.status !== 'in_progress') {
        throw new Error('Cannot save answers: session is not in progress');
    }
    if (!session.isActive) {
        throw new Error('Cannot save answers: session is no longer active');
    }

    // Check if session has expired
    const now = new Date();
    if (now > session.expiresAt) {
        throw new Error('Cannot save answers: session has expired');
    }

    // Build a map of existing answers by questionId for fast lookup
    const existingAnswerMap = new Map<string, number>();
    for (let i = 0; i < session.answers.length; i++) {
        existingAnswerMap.set(session.answers[i].questionId, i);
    }

    for (const update of answers) {
        const existingIdx = existingAnswerMap.get(update.questionId);

        if (existingIdx !== undefined) {
            const existing = session.answers[existingIdx];

            // Idempotency: skip if the answer hasn't changed
            if (
                existing.selectedAnswer === update.selectedAnswer &&
                existing.writtenAnswerUrl === (update.writtenAnswerUrl || undefined)
            ) {
                continue;
            }

            // Answer changed — update and track history
            existing.answerHistory.push({
                value: existing.selectedAnswer,
                timestamp: now,
            });
            existing.selectedAnswer = update.selectedAnswer;
            if (update.writtenAnswerUrl !== undefined) {
                existing.writtenAnswerUrl = update.writtenAnswerUrl;
            }
            existing.savedAt = now;
            existing.changeCount = (existing.changeCount || 0) + 1;
        } else {
            // New answer — add to the array
            session.answers.push({
                questionId: update.questionId,
                selectedAnswer: update.selectedAnswer,
                writtenAnswerUrl: update.writtenAnswerUrl,
                savedAt: now,
                answerHistory: [],
                changeCount: 0,
            });
            existingAnswerMap.set(update.questionId, session.answers.length - 1);
        }
    }

    session.lastSavedAt = now;
    session.autoSaves = (session.autoSaves || 0) + 1;

    await session.save();
}

// ─── Submit Exam ────────────────────────────────────────────

/**
 * Submit an exam session (manual, auto on timer expiry, or auto on violation).
 *
 * Marks the session as submitted, records submission type and time.
 * Does NOT compute results here — that is handled by ResultEngineService.
 *
 * Requirements: 5.5, 5.6
 */
export async function submitExam(
    sessionId: string,
    submissionType: SubmissionType,
): Promise<IExamSession> {
    const session = await ExamSession.findById(sessionId);
    if (!session) {
        throw new Error('Exam session not found');
    }
    if (session.status !== 'in_progress') {
        throw new Error('Session has already been submitted');
    }

    const now = new Date();

    // Map our submission types to the ExamSession model's enum
    const submissionTypeMap: Record<SubmissionType, IExamSession['submissionType']> = {
        manual: 'manual',
        auto_timer: 'auto_timeout',
        auto_violation: 'forced',
    };

    session.status = 'submitted';
    session.submittedAt = now;
    session.submissionType = submissionTypeMap[submissionType];
    session.isActive = false;

    if (submissionType === 'auto_timer') {
        session.auto_submitted = true;
    }
    if (submissionType === 'auto_violation') {
        session.auto_submitted = true;
        session.forcedSubmittedAt = now;
    }

    await session.save();

    return session;
}

// ─── Restore Session ────────────────────────────────────────

/**
 * Restore an in-progress exam session for resuming after disconnect.
 *
 * Returns the current session state including saved answers,
 * remaining time, and question list.
 *
 * Requirements: 18.4
 */
export async function restoreSession(
    sessionId: string,
): Promise<ExamSessionRestore> {
    const session = await ExamSession.findById(sessionId);
    if (!session) {
        throw new Error('Exam session not found');
    }
    if (session.status !== 'in_progress') {
        throw new Error('Session is not in progress — cannot restore');
    }

    // Check if session has expired
    const now = new Date();
    if (now > session.expiresAt) {
        // Auto-submit the expired session
        session.status = 'submitted';
        session.submittedAt = now;
        session.submissionType = 'auto_expired';
        session.isActive = false;
        session.auto_submitted = true;
        await session.save();
        throw new Error('Session has expired and was auto-submitted');
    }

    // Fetch the exam for question data
    const exam = await Exam.findById(session.exam);
    if (!exam) {
        throw new Error('Associated exam not found');
    }

    // Build question list (same as startExam)
    const { questions, timer } = await buildSessionStartResponse(session, exam);

    // Extract saved answers
    const savedAnswers = session.answers.map((a) => ({
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer,
        writtenAnswerUrl: a.writtenAnswerUrl,
        savedAt: a.savedAt,
    }));

    return {
        session,
        answers: savedAnswers,
        questions,
        timer,
    };
}

// ─── Record Violation (Anti-Cheat) ──────────────────────────

/** Default violation limit when exam has no security_policies configured */
const DEFAULT_VIOLATION_LIMIT = 3;

/**
 * Record an anti-cheat violation for an exam session.
 *
 * 1. Validates the session is still in progress
 * 2. Creates an AntiCheatViolationLog document
 * 3. Increments the appropriate type-specific counter on the session
 *    (tabSwitchCount for tab_switch, copyAttemptCount for copy_attempt,
 *     fullscreenExitCount for fullscreen_exit)
 * 4. Increments the general violationsCount
 * 5. Adds a cheat_flag entry with reason and timestamp
 * 6. Checks if the violation count exceeds the exam's configured limit
 *    (security_policies.tab_switch_limit, default 3)
 * 7. If limit exceeded, auto-submits via submitExam with 'auto_violation'
 *
 * Requirements: 6.1, 6.2, 6.3, 6.7, 28.1, 28.4
 */
export async function recordViolation(
    sessionId: string,
    violation: ViolationEvent,
): Promise<ViolationResult> {
    // 1. Validate session
    const session = await ExamSession.findById(sessionId);
    if (!session) {
        throw new Error('Exam session not found');
    }
    if (session.status !== 'in_progress') {
        throw new Error('Cannot record violation: session is not in progress');
    }

    // 2. Create AntiCheatViolationLog document
    const violationLog = new AntiCheatViolationLog({
        session: session._id,
        student: session.student,
        exam: session.exam,
        violationType: violation.violationType,
        details: violation.details || null,
        deviceFingerprint: violation.deviceFingerprint || null,
        ipAddress: violation.ipAddress || null,
        timestamp: new Date(),
    });
    await violationLog.save();

    // 3. Increment the type-specific counter
    switch (violation.violationType) {
        case 'tab_switch':
            session.tabSwitchCount = (session.tabSwitchCount || 0) + 1;
            break;
        case 'copy_attempt':
            session.copyAttemptCount = (session.copyAttemptCount || 0) + 1;
            break;
        case 'fullscreen_exit':
            session.fullscreenExitCount = (session.fullscreenExitCount || 0) + 1;
            break;
        // fingerprint_match and ip_duplicate don't have dedicated counters
        default:
            break;
    }

    // 4. Increment general violations count
    session.violationsCount = (session.violationsCount || 0) + 1;

    // 5. Add cheat_flag entry
    session.cheat_flags.push({
        reason: `${violation.violationType}${violation.details ? ': ' + violation.details : ''}`,
        timestamp: new Date(),
    });

    await session.save();

    // 6. Check violation limit from exam's security_policies
    const exam = await Exam.findById(session.exam);
    const maxAllowed = exam?.security_policies?.tab_switch_limit ?? DEFAULT_VIOLATION_LIMIT;

    // 7. Auto-submit if limit exceeded
    let autoSubmitted = false;
    if (session.violationsCount > maxAllowed) {
        await submitExam(sessionId, 'auto_violation');
        autoSubmitted = true;
    }

    return {
        autoSubmitted,
        violationCount: session.violationsCount,
        maxAllowed,
    };
}
