import mongoose from 'mongoose';
import ActionApproval, { IActionApproval } from '../models/ActionApproval';
import AuditLog from '../models/AuditLog';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import AdminProfile from '../models/AdminProfile';
import LoginActivity from '../models/LoginActivity';
import StudentGroup from '../models/StudentGroup';
import University from '../models/University';
import News from '../models/News';
import Exam from '../models/Exam';
import ManualPayment from '../models/ManualPayment';
import { RiskyActionKey } from '../models/SecuritySettings';
import { SecuritySettingsSnapshot, getSecuritySettingsSnapshot } from './securityCenterService';

type ApprovalActor = {
    userId: string;
    role: string;
};

type RequestApprovalInput = {
    actionKey: RiskyActionKey;
    module: string;
    action: string;
    routePath: string;
    method: string;
    paramsSnapshot: Record<string, unknown>;
    querySnapshot: Record<string, unknown>;
    payloadSnapshot: Record<string, unknown>;
    actor: ApprovalActor;
};

type ExecutionResult = {
    ok: boolean;
    message: string;
    affectedCount?: number;
    details?: Record<string, unknown>;
};

async function writeApprovalAudit(
    actor: ApprovalActor,
    action: string,
    approval: IActionApproval,
    details: Record<string, unknown> = {},
): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(actor.userId)) return;
    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(actor.userId),
        actor_role: actor.role,
        action,
        target_id: approval._id,
        target_type: 'action_approval',
        ip_address: '127.0.0.1',
        details: {
            actionKey: approval.actionKey,
            status: approval.status,
            ...details,
        },
    });
}

export async function expireStaleApprovals(now = new Date()): Promise<number> {
    const result = await ActionApproval.updateMany(
        {
            status: 'pending_second_approval',
            expiresAt: { $lt: now },
        },
        { $set: { status: 'expired', decidedAt: now } },
    );
    return Number(result.modifiedCount || 0);
}

export async function requestApproval(input: RequestApprovalInput): Promise<IActionApproval> {
    await expireStaleApprovals();
    const security = await getSecuritySettingsSnapshot(false);
    const expiryMinutes = Math.max(5, Number(security.twoPersonApproval.approvalExpiryMinutes || 120));
    const approval = await ActionApproval.create({
        actionKey: input.actionKey,
        module: input.module,
        action: input.action,
        routePath: input.routePath,
        method: input.method.toUpperCase(),
        paramsSnapshot: input.paramsSnapshot,
        querySnapshot: input.querySnapshot,
        payloadSnapshot: input.payloadSnapshot,
        initiatedBy: new mongoose.Types.ObjectId(input.actor.userId),
        initiatedByRole: input.actor.role,
        initiatedAt: new Date(),
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
        status: 'pending_second_approval',
    });

    await writeApprovalAudit(input.actor, 'approval.requested', approval, {
        module: input.module,
        action: input.action,
    });
    return approval;
}

async function executeStudentsBulkDelete(approval: IActionApproval): Promise<ExecutionResult> {
    const studentIdsRaw = Array.isArray(approval.payloadSnapshot.studentIds)
        ? approval.payloadSnapshot.studentIds
        : [];
    const studentIds = studentIdsRaw
        .map((id) => String(id || '').trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (studentIds.length === 0) {
        return { ok: false, message: 'No valid studentIds provided for execution.' };
    }

    await Promise.all([
        User.deleteMany({ _id: { $in: studentIds }, role: 'student' }),
        StudentProfile.deleteMany({ user_id: { $in: studentIds } }),
        AdminProfile.deleteMany({ user_id: { $in: studentIds } }),
        LoginActivity.deleteMany({ user_id: { $in: studentIds } }),
        StudentGroup.updateMany({}, { $pull: { manualStudents: { $in: studentIds } } }),
    ]);

    return {
        ok: true,
        message: 'Bulk delete students executed',
        affectedCount: studentIds.length,
    };
}

async function executeUniversitiesBulkDelete(approval: IActionApproval): Promise<ExecutionResult> {
    const idsRaw = Array.isArray(approval.payloadSnapshot.ids) ? approval.payloadSnapshot.ids : [];
    const ids = idsRaw
        .map((id) => String(id || '').trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (ids.length === 0) {
        return { ok: false, message: 'No valid university IDs provided for execution.' };
    }

    const mode = String(approval.payloadSnapshot.mode || 'soft').toLowerCase() === 'hard' ? 'hard' : 'soft';
    let affected = 0;
    if (mode === 'hard') {
        const result = await University.deleteMany({ _id: { $in: ids } });
        affected = Number(result.deletedCount || 0);
    } else {
        const result = await University.updateMany(
            { _id: { $in: ids } },
            {
                $set: {
                    isArchived: true,
                    isActive: false,
                    archivedAt: new Date(),
                },
            },
        );
        affected = Number(result.modifiedCount || 0);
    }

    return {
        ok: true,
        message: 'Bulk delete universities executed',
        affectedCount: affected,
        details: { mode },
    };
}

async function executeNewsBulkDelete(approval: IActionApproval): Promise<ExecutionResult> {
    const idsRaw = Array.isArray(approval.payloadSnapshot.ids) ? approval.payloadSnapshot.ids : [];
    const fromPayload = idsRaw
        .map((id) => String(id || '').trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
    const fromParams = String(approval.paramsSnapshot.id || '').trim();
    const ids = fromPayload.length > 0
        ? fromPayload
        : (mongoose.Types.ObjectId.isValid(fromParams) ? [fromParams] : []);
    if (ids.length === 0) {
        return { ok: false, message: 'No valid news IDs provided for execution.' };
    }

    const result = await News.deleteMany({ _id: { $in: ids } });
    return {
        ok: true,
        message: 'Bulk delete news executed',
        affectedCount: Number(result.deletedCount || 0),
    };
}

async function executePublishExamResult(approval: IActionApproval): Promise<ExecutionResult> {
    const examId = String(approval.paramsSnapshot.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(examId)) {
        return { ok: false, message: 'Invalid exam id for publish result.' };
    }
    const updated = await Exam.findByIdAndUpdate(
        examId,
        {
            $set: {
                resultPublishMode: 'immediate',
                resultPublishDate: new Date(),
            },
        },
        { new: true },
    );
    if (!updated) {
        return { ok: false, message: 'Exam not found.' };
    }
    return {
        ok: true,
        message: 'Exam result published',
        affectedCount: 1,
    };
}

async function executePublishBreakingNews(approval: IActionApproval): Promise<ExecutionResult> {
    const newsId = String(approval.paramsSnapshot.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(newsId)) {
        return { ok: false, message: 'Invalid news id for publish now.' };
    }
    const now = new Date();
    const updated = await News.findByIdAndUpdate(
        newsId,
        {
            $set: {
                status: 'published',
                isPublished: true,
                publishDate: now,
                publishedAt: now,
                scheduleAt: null,
                scheduledAt: null,
            },
        },
        { new: true },
    );
    if (!updated) {
        return { ok: false, message: 'News item not found.' };
    }
    return {
        ok: true,
        message: 'Breaking news published',
        affectedCount: 1,
    };
}

async function executeMarkPaymentRefunded(approval: IActionApproval): Promise<ExecutionResult> {
    const paymentId = String(approval.paramsSnapshot.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        return { ok: false, message: 'Invalid payment id for refund.' };
    }
    const updated = await ManualPayment.findByIdAndUpdate(
        paymentId,
        {
            $set: {
                status: 'refunded',
                paidAt: null,
            },
        },
        { new: true },
    );
    if (!updated) {
        return { ok: false, message: 'Payment entry not found.' };
    }
    return {
        ok: true,
        message: 'Payment marked as refunded',
        affectedCount: 1,
    };
}

async function executeApprovalAction(approval: IActionApproval): Promise<ExecutionResult> {
    switch (approval.actionKey) {
        case 'students.bulk_delete':
            return executeStudentsBulkDelete(approval);
        case 'universities.bulk_delete':
            return executeUniversitiesBulkDelete(approval);
        case 'news.bulk_delete':
            return executeNewsBulkDelete(approval);
        case 'exams.publish_result':
            return executePublishExamResult(approval);
        case 'news.publish_breaking':
            return executePublishBreakingNews(approval);
        case 'payments.mark_refunded':
            return executeMarkPaymentRefunded(approval);
        default:
            return { ok: false, message: `No executor registered for ${approval.actionKey}` };
    }
}

export async function approveApproval(id: string, actor: ApprovalActor): Promise<IActionApproval> {
    await expireStaleApprovals();
    const approval = await ActionApproval.findById(id);
    if (!approval) {
        throw new Error('APPROVAL_NOT_FOUND');
    }
    if (approval.status !== 'pending_second_approval') {
        throw new Error('APPROVAL_NOT_PENDING');
    }
    if (approval.expiresAt.getTime() <= Date.now()) {
        approval.status = 'expired';
        approval.decidedAt = new Date();
        await approval.save();
        throw new Error('APPROVAL_EXPIRED');
    }
    if (String(approval.initiatedBy) === actor.userId) {
        throw new Error('SELF_APPROVAL_FORBIDDEN');
    }

    approval.status = 'approved';
    approval.secondApprover = new mongoose.Types.ObjectId(actor.userId);
    approval.secondApproverRole = actor.role;
    approval.decidedAt = new Date();
    await approval.save();
    await writeApprovalAudit(actor, 'approval.approved', approval);

    const execution = await executeApprovalAction(approval);
    if (execution.ok) {
        approval.status = 'executed';
        approval.executedAt = new Date();
    } else {
        approval.status = 'rejected';
        approval.decisionReason = execution.message;
    }
    approval.executionMeta = {
        ...(approval.executionMeta || {}),
        execution,
    };
    await approval.save();
    await writeApprovalAudit(actor, 'approval.executed', approval, execution.details || {});
    return approval;
}

export async function rejectApproval(id: string, actor: ApprovalActor, reason?: string): Promise<IActionApproval> {
    await expireStaleApprovals();
    const approval = await ActionApproval.findById(id);
    if (!approval) throw new Error('APPROVAL_NOT_FOUND');
    if (approval.status !== 'pending_second_approval') throw new Error('APPROVAL_NOT_PENDING');
    if (String(approval.initiatedBy) === actor.userId) throw new Error('SELF_APPROVAL_FORBIDDEN');

    approval.status = 'rejected';
    approval.secondApprover = new mongoose.Types.ObjectId(actor.userId);
    approval.secondApproverRole = actor.role;
    approval.decisionReason = String(reason || '').trim();
    approval.decidedAt = new Date();
    await approval.save();
    await writeApprovalAudit(actor, 'approval.rejected', approval, { reason: approval.decisionReason || '' });
    return approval;
}

export async function getPendingApprovals(limit = 100): Promise<IActionApproval[]> {
    await expireStaleApprovals();
    return ActionApproval.find({ status: 'pending_second_approval' })
        .sort({ createdAt: -1 })
        .limit(Math.max(1, Math.min(limit, 500)))
        .populate('initiatedBy', 'username email full_name role')
        .populate('secondApprover', 'username email full_name role');
}

export async function shouldRequireTwoPersonApproval(actionKey: RiskyActionKey): Promise<boolean> {
    const security: SecuritySettingsSnapshot = await getSecuritySettingsSnapshot(false);
    return (
        Boolean(security.twoPersonApproval.enabled) &&
        security.twoPersonApproval.riskyActions.includes(actionKey)
    );
}
