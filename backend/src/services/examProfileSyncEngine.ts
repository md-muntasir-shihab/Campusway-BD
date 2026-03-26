import mongoose from 'mongoose';
import Notification from '../models/Notification';
import ExamProfileSyncLog from '../models/ExamProfileSyncLog';
import ExamResult from '../models/ExamResult';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import { computeStudentProfileScore } from './studentProfileScoreService';

export type ExamProfileSyncMode = 'none' | 'fill_missing_only' | 'overwrite_mapped_fields';
export type ExamProfileSyncSource = 'external_import' | 'internal_result' | 'manual_resync';

type SyncCandidates = {
    serialId?: unknown;
    rollNumber?: unknown;
    registrationNumber?: unknown;
    admitCardNumber?: unknown;
    userUniqueId?: unknown;
    fullName?: unknown;
    email?: unknown;
    phoneNumber?: unknown;
    institutionName?: unknown;
    department?: unknown;
    sscBatch?: unknown;
    hscBatch?: unknown;
    guardianName?: unknown;
    guardianPhone?: unknown;
    examCenter?: unknown;
    examCenterCode?: unknown;
    examResultNote?: unknown;
    profileUpdateNote?: unknown;
    attendanceStatus?: unknown;
    passFail?: unknown;
};

type SyncInput = {
    exam: Record<string, unknown>;
    result: Record<string, unknown>;
    studentId: string;
    source: ExamProfileSyncSource;
    syncMode?: ExamProfileSyncMode;
    createdBy?: string | null;
    importJobId?: string | null;
    candidates?: SyncCandidates;
    notifyStudent?: boolean;
};

type SyncOutput = {
    changed: boolean;
    status: 'synced' | 'skipped' | 'failed';
    changedFields: string[];
    logId?: string;
    message: string;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
    return String(value ?? '').trim();
}

function asLowerString(value: unknown): string {
    return asString(value).toLowerCase();
}

function asNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function shouldApplyField(currentValue: unknown, nextValue: unknown, mode: ExamProfileSyncMode): boolean {
    const nextText = asString(nextValue);
    if (!nextText) return false;
    if (mode === 'overwrite_mapped_fields') return true;
    return asString(currentValue) === '';
}

function upsertHistoryEntry(
    history: Array<Record<string, unknown>>,
    nextEntry: Record<string, unknown>,
): Array<Record<string, unknown>> {
    const examId = asString(nextEntry.examId);
    const source = asString(nextEntry.source);
    const attemptNo = Number(nextEntry.attemptNo || 1);
    const filtered = history.filter((entry) => {
        return !(
            asString(entry.examId) === examId
            && asString(entry.source) === source
            && Number(entry.attemptNo || 1) === attemptNo
        );
    });

    return [nextEntry, ...filtered].slice(0, 50);
}

function buildLatestResultSummary(result: Record<string, unknown>): string {
    const obtained = asNumber(result.obtainedMarks);
    const total = asNumber(result.totalMarks);
    const percentage = asNumber(result.percentage);
    const parts: string[] = [];
    if (obtained !== null && total !== null) parts.push(`${obtained}/${total}`);
    if (percentage !== null) parts.push(`${percentage.toFixed(1)}%`);
    return parts.join(' • ');
}

function resolveExamMode(exam: Record<string, unknown>): 'external_link' | 'internal_system' {
    return asString(exam.deliveryMode) === 'external_link' ? 'external_link' : 'internal_system';
}

const PROFILE_SCORE_PROFILE_FIELDS = new Set([
    'profile_photo_url',
    'user_unique_id',
    'full_name',
    'email',
    'phone_number',
    'phone',
    'guardian_phone',
    'present_address',
    'permanent_address',
    'district',
    'ssc_batch',
    'hsc_batch',
    'department',
    'college_name',
    'institution_name',
    'dob',
]);

const PROFILE_SCORE_USER_FIELDS = new Set([
    'profile_photo',
    'full_name',
    'email',
    'phone_number',
]);

function shouldRefreshProfileScore(
    userPatch: Record<string, unknown>,
    profilePatch: Record<string, unknown>,
): boolean {
    return Object.keys(userPatch).some((key) => PROFILE_SCORE_USER_FIELDS.has(key))
        || Object.keys(profilePatch).some((key) => PROFILE_SCORE_PROFILE_FIELDS.has(key));
}

async function ensureStudentProfile(studentId: string): Promise<Record<string, unknown>> {
    const existing = await StudentProfile.findOne({ user_id: studentId }).lean();
    if (existing) return existing as unknown as Record<string, unknown>;

    const created = await StudentProfile.create({
        user_id: new mongoose.Types.ObjectId(studentId),
        full_name: 'Student',
        profile_completion_percentage: 0,
    });
    return created.toObject() as unknown as Record<string, unknown>;
}

export async function syncExamResultToStudentProfile(input: SyncInput): Promise<SyncOutput> {
    const syncMode = input.syncMode || 'overwrite_mapped_fields';
    const studentId = asString(input.studentId);
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return { changed: false, status: 'failed', changedFields: [], message: 'Invalid student id.' };
    }

    const examId = asString(input.exam._id || input.exam.id);
    const resultId = asString(input.result._id || input.result.id);
    const actorId = input.createdBy && mongoose.Types.ObjectId.isValid(input.createdBy)
        ? new mongoose.Types.ObjectId(input.createdBy)
        : null;
    const importJobId = input.importJobId && mongoose.Types.ObjectId.isValid(input.importJobId)
        ? new mongoose.Types.ObjectId(input.importJobId)
        : null;

    const [user, profileRecord] = await Promise.all([
        User.findById(studentId),
        ensureStudentProfile(studentId),
    ]);

    if (!user) {
        return { changed: false, status: 'failed', changedFields: [], message: 'User not found.' };
    }

    const profileDoc = await StudentProfile.findOne({ user_id: studentId });
    if (!profileDoc) {
        return { changed: false, status: 'failed', changedFields: [], message: 'Profile not found.' };
    }

    const profileObject = asRecord(profileRecord);
    const candidates = input.candidates || {};
    const changedFields: string[] = [];
    const now = new Date();

    const userPatch: Record<string, unknown> = {};
    if (shouldApplyField((user as unknown as Record<string, unknown>).full_name, candidates.fullName, syncMode)) {
        userPatch.full_name = asString(candidates.fullName);
        changedFields.push('user.full_name');
    }
    if (shouldApplyField((user as unknown as Record<string, unknown>).email, candidates.email, syncMode)) {
        userPatch.email = asLowerString(candidates.email);
        changedFields.push('user.email');
    }
    if (shouldApplyField((user as unknown as Record<string, unknown>).phone_number, candidates.phoneNumber, syncMode)) {
        userPatch.phone_number = asString(candidates.phoneNumber);
        changedFields.push('user.phone_number');
    }

    const profilePatch: Record<string, unknown> = {};
    if (shouldApplyField(profileObject.full_name, candidates.fullName, syncMode)) {
        profilePatch.full_name = asString(candidates.fullName);
        changedFields.push('profile.full_name');
    }
    if (shouldApplyField(profileObject.email, candidates.email, syncMode)) {
        profilePatch.email = asLowerString(candidates.email);
        changedFields.push('profile.email');
    }
    if (shouldApplyField(profileObject.phone_number || profileObject.phone, candidates.phoneNumber, syncMode)) {
        const phone = asString(candidates.phoneNumber);
        profilePatch.phone_number = phone;
        profilePatch.phone = phone;
        changedFields.push('profile.phone_number');
    }
    if (shouldApplyField(profileObject.user_unique_id, candidates.userUniqueId, syncMode)) {
        profilePatch.user_unique_id = asString(candidates.userUniqueId);
        changedFields.push('profile.user_unique_id');
    }
    if (shouldApplyField(profileObject.institution_name, candidates.institutionName, syncMode)) {
        profilePatch.institution_name = asString(candidates.institutionName);
        changedFields.push('profile.institution_name');
    }
    if (shouldApplyField(profileObject.department, candidates.department, syncMode)) {
        profilePatch.department = asLowerString(candidates.department);
        changedFields.push('profile.department');
    }
    if (shouldApplyField(profileObject.ssc_batch, candidates.sscBatch, syncMode)) {
        profilePatch.ssc_batch = asString(candidates.sscBatch);
        changedFields.push('profile.ssc_batch');
    }
    if (shouldApplyField(profileObject.hsc_batch, candidates.hscBatch, syncMode)) {
        profilePatch.hsc_batch = asString(candidates.hscBatch);
        changedFields.push('profile.hsc_batch');
    }
    if (shouldApplyField(profileObject.guardian_name, candidates.guardianName, syncMode)) {
        profilePatch.guardian_name = asString(candidates.guardianName);
        changedFields.push('profile.guardian_name');
    }
    if (shouldApplyField(profileObject.guardian_phone, candidates.guardianPhone, syncMode)) {
        profilePatch.guardian_phone = asString(candidates.guardianPhone);
        changedFields.push('profile.guardian_phone');
    }

    const examIdentity = asRecord(profileObject.examIdentity);
    const nextExamIdentity = { ...examIdentity };
    const maybeSetIdentity = (key: string, candidate: unknown) => {
        if (shouldApplyField(examIdentity[key], candidate, syncMode)) {
            nextExamIdentity[key] = asString(candidate);
            changedFields.push(`examIdentity.${key}`);
        }
    };

    maybeSetIdentity('serialId', candidates.serialId);
    maybeSetIdentity('rollNumber', candidates.rollNumber ?? (input.result as Record<string, unknown>).rollNumber);
    maybeSetIdentity('registrationNumber', candidates.registrationNumber ?? (input.result as Record<string, unknown>).registrationNumber);
    maybeSetIdentity('admitCardNumber', candidates.admitCardNumber);
    maybeSetIdentity('examCenter', candidates.examCenter ?? (input.result as Record<string, unknown>).examCenterName);

    nextExamIdentity.externalParticipationStatus = input.source === 'external_import' ? 'imported' : 'completed';
    nextExamIdentity.externalExamScore = asNumber((input.result as Record<string, unknown>).obtainedMarks) ?? undefined;
    nextExamIdentity.latestResultSummary = buildLatestResultSummary(input.result);
    nextExamIdentity.latestResultStatus = asString(input.result.status) || 'evaluated';
    nextExamIdentity.lastSyncedExamId = examId;
    nextExamIdentity.lastSyncSource = input.source;
    nextExamIdentity.lastSyncAt = now;
    profilePatch.examIdentity = nextExamIdentity;

    const resultPercentage = asNumber((input.result as Record<string, unknown>).percentage) ?? 0;
    const historyEntry: Record<string, unknown> = {
        examId,
        examTitle: asString(input.exam.title),
        source: input.source,
        examMode: resolveExamMode(input.exam),
        attemptNo: Number((input.result as Record<string, unknown>).attemptNo || 1),
        obtainedMarks: asNumber((input.result as Record<string, unknown>).obtainedMarks) ?? 0,
        totalMarks: asNumber((input.result as Record<string, unknown>).totalMarks) ?? 0,
        percentage: resultPercentage,
        rank: asNumber((input.result as Record<string, unknown>).rank) ?? undefined,
        status: asString(input.result.status) || 'evaluated',
        examCenter: asString(candidates.examCenter || (input.result as Record<string, unknown>).examCenterName || asRecord(input.exam.examCenterSnapshot).name),
        serialId: asString(candidates.serialId),
        rollNumber: asString(candidates.rollNumber ?? (input.result as Record<string, unknown>).rollNumber),
        registrationNumber: asString(candidates.registrationNumber ?? (input.result as Record<string, unknown>).registrationNumber),
        admitCardNumber: asString(candidates.admitCardNumber),
        profileUpdateNote: asString(candidates.profileUpdateNote || candidates.examResultNote),
        syncedAt: now,
    };

    const existingHistory = Array.isArray(profileObject.examHistory)
        ? (profileObject.examHistory as Array<Record<string, unknown>>)
        : [];
    profilePatch.examHistory = upsertHistoryEntry(existingHistory, historyEntry);
    profilePatch.latestExamResultSummary = buildLatestResultSummary(input.result);
    profilePatch.examDataLastSyncAt = now;
    profilePatch.examDataLastSyncSource = input.source;

    if (Object.keys(userPatch).length > 0) {
        Object.assign(user, userPatch);
        await user.save();
    }

    Object.assign(profileDoc, profilePatch);
    if (shouldRefreshProfileScore(userPatch, profilePatch)) {
        const scoreResult = computeStudentProfileScore(
            profileDoc.toObject() as unknown as Record<string, unknown>,
            user.toObject() as unknown as Record<string, unknown>,
        );
        profileDoc.profile_completion_percentage = scoreResult.score;
    }
    await profileDoc.save();

    const logDoc = await ExamProfileSyncLog.create({
        examId: mongoose.Types.ObjectId.isValid(examId) ? new mongoose.Types.ObjectId(examId) : undefined,
        studentId: new mongoose.Types.ObjectId(studentId),
        resultId: mongoose.Types.ObjectId.isValid(resultId) ? new mongoose.Types.ObjectId(resultId) : undefined,
        importJobId,
        source: input.source,
        status: syncMode === 'none' ? 'skipped' : 'synced',
        syncMode,
        examMode: resolveExamMode(input.exam),
        attemptNo: Number((input.result as Record<string, unknown>).attemptNo || 1),
        changedFields,
        message: changedFields.length > 0
            ? 'Student profile synced from exam data.'
            : 'No profile field changes were required.',
        snapshot: {
            latestResultSummary: profileDoc.latestExamResultSummary,
            examIdentity: profileDoc.examIdentity,
            latestHistoryEntry: historyEntry,
        },
        createdBy: actorId,
    });

    if (resultId && mongoose.Types.ObjectId.isValid(resultId)) {
        await ExamResult.findByIdAndUpdate(resultId, {
            $set: {
                syncStatus: syncMode === 'none' ? 'pending' : 'synced',
                profileSyncLogId: logDoc._id,
            },
        });
    }

    if (input.notifyStudent !== false) {
        await Notification.create({
            title: input.source === 'external_import' ? 'External exam data synced' : 'Exam data updated',
            message: `${asString(input.exam.title) || 'Exam'} updated your exam record.`,
            category: 'exam',
            publishAt: now,
            isActive: true,
            linkUrl: '/profile',
            targetRole: 'student',
            targetUserIds: [new mongoose.Types.ObjectId(studentId)],
            createdBy: actorId || undefined,
            updatedBy: actorId || undefined,
        });
    }

    return {
        changed: changedFields.length > 0,
        status: syncMode === 'none' ? 'skipped' : 'synced',
        changedFields,
        logId: String(logDoc._id),
        message: changedFields.length > 0
            ? 'Student profile synced from exam data.'
            : 'No profile changes were required.',
    };
}
