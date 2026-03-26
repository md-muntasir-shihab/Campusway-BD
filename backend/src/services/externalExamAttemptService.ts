import mongoose from 'mongoose';
import ExternalExamJoinLog from '../models/ExternalExamJoinLog';

type ObjectIdLike = string | mongoose.Types.ObjectId;

function normalizeObjectId(value: ObjectIdLike): mongoose.Types.ObjectId {
    return value instanceof mongoose.Types.ObjectId
        ? value
        : new mongoose.Types.ObjectId(String(value));
}

export function appendAttemptRefToExternalExamUrl(baseUrl: string, attemptRef: string): string {
    const parsed = new URL(String(baseUrl || '').trim());
    parsed.searchParams.set('cw_ref', attemptRef);
    return parsed.toString();
}

export async function getExternalExamAttemptCount(examId: ObjectIdLike, studentId: ObjectIdLike): Promise<number> {
    return ExternalExamJoinLog.countDocuments({
        examId: normalizeObjectId(examId),
        studentId: normalizeObjectId(studentId),
    });
}

export async function getExternalExamAttemptCountsForStudent(
    studentId: ObjectIdLike,
    examIds: string[],
): Promise<Map<string, number>> {
    const validExamIds = examIds
        .map((examId) => String(examId || '').trim())
        .filter((examId) => mongoose.Types.ObjectId.isValid(examId))
        .map((examId) => new mongoose.Types.ObjectId(examId));

    if (validExamIds.length === 0) return new Map();

    const rows = await ExternalExamJoinLog.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        {
            $match: {
                studentId: normalizeObjectId(studentId),
                examId: { $in: validExamIds },
            },
        },
        {
            $group: {
                _id: '$examId',
                count: { $sum: 1 },
            },
        },
    ]);

    return new Map(rows.map((row) => [String(row._id), Number(row.count || 0)]));
}

export async function createExternalExamAttempt(input: {
    examId: ObjectIdLike;
    studentId: ObjectIdLike;
    attemptNo: number;
    sourcePanel?: string;
    registrationIdSnapshot?: string;
    userUniqueIdSnapshot?: string;
    usernameSnapshot?: string;
    emailSnapshot?: string;
    phoneNumberSnapshot?: string;
    fullNameSnapshot?: string;
    groupIdsSnapshot?: string[];
    ip?: string;
    userAgent?: string;
    externalExamUrl: string;
}): Promise<{
    attemptId: string;
    attemptRef: string;
    redirectUrl: string;
}> {
    const attemptRef = `cwref_${new mongoose.Types.ObjectId().toString()}`;
    const redirectUrl = appendAttemptRefToExternalExamUrl(input.externalExamUrl, attemptRef);
    const attempt = await ExternalExamJoinLog.create({
        examId: normalizeObjectId(input.examId),
        studentId: normalizeObjectId(input.studentId),
        joinedAt: new Date(),
        attemptNo: Math.max(1, Number(input.attemptNo || 1)),
        attemptRef,
        status: 'awaiting_result',
        sourcePanel: String(input.sourcePanel || 'exam_start').trim() || 'exam_start',
        registration_id_snapshot: String(input.registrationIdSnapshot || '').trim(),
        user_unique_id_snapshot: String(input.userUniqueIdSnapshot || '').trim(),
        username_snapshot: String(input.usernameSnapshot || '').trim().toLowerCase(),
        email_snapshot: String(input.emailSnapshot || '').trim().toLowerCase(),
        phone_number_snapshot: String(input.phoneNumberSnapshot || '').trim(),
        full_name_snapshot: String(input.fullNameSnapshot || '').trim(),
        groupIds_snapshot: Array.isArray(input.groupIdsSnapshot) ? input.groupIdsSnapshot.map((value) => String(value || '').trim()).filter(Boolean) : [],
        externalExamUrl: redirectUrl,
        ip: String(input.ip || '').trim(),
        userAgent: String(input.userAgent || '').trim(),
    });

    return {
        attemptId: String(attempt._id),
        attemptRef,
        redirectUrl,
    };
}

export async function markExternalExamAttemptImported(input: {
    attemptId?: string;
    attemptRef?: string;
    resultId: string;
    matchedBy?: string;
}): Promise<void> {
    const filter: Record<string, unknown> = {};
    if (input.attemptId && mongoose.Types.ObjectId.isValid(input.attemptId)) {
        filter._id = new mongoose.Types.ObjectId(input.attemptId);
    } else if (input.attemptRef) {
        filter.attemptRef = String(input.attemptRef).trim();
    } else {
        return;
    }

    await ExternalExamJoinLog.updateOne(filter, {
        $set: {
            status: 'imported',
            importedAt: new Date(),
            importedResultId: mongoose.Types.ObjectId.isValid(input.resultId) ? new mongoose.Types.ObjectId(input.resultId) : undefined,
            matchedBy: String(input.matchedBy || '').trim(),
        },
    });
}
