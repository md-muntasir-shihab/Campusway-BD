import mongoose from 'mongoose';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import ProfileUpdateRequest from '../models/ProfileUpdateRequest';
import Settings from '../models/Settings';
import { sendNotificationToStudent } from './notificationProviderService';
import { broadcastAdminLiveEvent } from '../realtime/adminLiveStream';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ApprovalDecision {
    requestId: string;
    adminId: string;
    action: 'approve' | 'reject';
    feedback?: string;
}

export interface BulkApprovalInput {
    userIds: string[];
    adminId: string;
    action: 'approve' | 'reject';
    reason?: string;
}

// ---------------------------------------------------------------------------
// isApprovalEnabled — reads profileApprovalEnabled from Settings
// ---------------------------------------------------------------------------

export async function isApprovalEnabled(): Promise<boolean> {
    const settings = await Settings.findOne().select('profileApprovalEnabled').lean();
    // Default to true if no settings document exists
    return settings?.profileApprovalEnabled ?? true;
}

// ---------------------------------------------------------------------------
// approveNewStudent — sets User status to active, records admin ID & timestamp
// Sends notification to student on approval
// Requirements: 5.3, 5.5
// ---------------------------------------------------------------------------

export async function approveNewStudent(userId: string, adminId: string): Promise<void> {
    const userOid = new mongoose.Types.ObjectId(userId);
    const adminOid = new mongoose.Types.ObjectId(adminId);

    const user = await User.findById(userOid).select('status role');
    if (!user) {
        throw new Error('User not found');
    }
    if (user.status !== 'pending') {
        throw new Error('This student is not in pending status.');
    }

    const now = new Date();
    await User.updateOne(
        { _id: userOid },
        {
            status: 'active',
            approvedBy: adminOid,
            approvedAt: now,
        },
    );

    // Send approval notification to student (fire-and-forget)
    sendNotificationToStudent(
        userOid,
        'REGISTRATION_APPROVED',
        'email',
        { decision: 'approved' },
    ).catch(() => {
        // Notification failure should not block the approval flow
    });

    // Broadcast SSE event for real-time approval queue update
    broadcastAdminLiveEvent('approval-queue-updated', {
        type: 'registration',
        action: 'approved',
        userId,
    });
}

// ---------------------------------------------------------------------------
// rejectNewStudent — sets User status to blocked, stores reason, admin ID,
// and timestamp. Sends notification to student on rejection.
// Requirements: 5.4, 5.5
// ---------------------------------------------------------------------------

export async function rejectNewStudent(
    userId: string,
    adminId: string,
    reason: string,
): Promise<void> {
    const userOid = new mongoose.Types.ObjectId(userId);
    const adminOid = new mongoose.Types.ObjectId(adminId);

    const user = await User.findById(userOid).select('status role');
    if (!user) {
        throw new Error('User not found');
    }
    if (user.status !== 'pending') {
        throw new Error('This student is not in pending status.');
    }

    const now = new Date();
    await User.updateOne(
        { _id: userOid },
        {
            status: 'blocked',
            rejectedBy: adminOid,
            rejectedAt: now,
            rejectionReason: reason,
        },
    );

    // Send rejection notification to student (fire-and-forget)
    sendNotificationToStudent(
        userOid,
        'REGISTRATION_REJECTED',
        'email',
        { decision: 'rejected', reason },
    ).catch(() => {
        // Notification failure should not block the rejection flow
    });

    // Broadcast SSE event for real-time approval queue update
    broadcastAdminLiveEvent('approval-queue-updated', {
        type: 'registration',
        action: 'rejected',
        userId,
    });
}


// ---------------------------------------------------------------------------
// bulkApproveRejectStudents — processes multiple pending student IDs in bulk
// Returns { processed, failed } counts
// Requirements: 10.3
// ---------------------------------------------------------------------------

export async function bulkApproveRejectStudents(
    input: BulkApprovalInput,
): Promise<{ processed: number; failed: number }> {
    const { userIds, adminId, action, reason } = input;

    let processed = 0;
    let failed = 0;

    for (const userId of userIds) {
        try {
            if (action === 'approve') {
                await approveNewStudent(userId, adminId);
            } else {
                await rejectNewStudent(userId, adminId, reason ?? '');
            }
            processed++;
        } catch {
            failed++;
        }
    }

    return { processed, failed };
}

// ---------------------------------------------------------------------------
// reviewProfileChangeRequest — approves or rejects a profile change request
// On approve: applies requested_changes to StudentProfile and User,
//   synchronizes phone/phone_number and email fields
// On reject: stores admin_feedback, no changes applied
// Sends notification to student on either outcome
// Requirements: 7.3, 7.4, 7.5, 7.6, 7.7
// ---------------------------------------------------------------------------

export async function reviewProfileChangeRequest(
    decision: ApprovalDecision,
): Promise<void> {
    const { requestId, adminId, action, feedback } = decision;

    const request = await ProfileUpdateRequest.findById(requestId);
    if (!request) {
        throw new Error('Profile change request not found.');
    }
    if (request.status !== 'pending') {
        throw new Error('This request has already been reviewed.');
    }

    const adminOid = new mongoose.Types.ObjectId(adminId);
    const now = new Date();

    if (action === 'approve') {
        const changes = request.requested_changes ?? {};

        // Build update objects for StudentProfile and User
        const profileUpdate: Record<string, any> = {};
        const userUpdate: Record<string, any> = {};

        for (const [field, value] of Object.entries(changes)) {
            // Phone number change — synchronize phone + phone_number on profile and User
            if (field === 'phone_number') {
                profileUpdate.phone_number = value;
                profileUpdate.phone = value;
                userUpdate.phone_number = value;
            } else if (field === 'email') {
                // Email change — update on both profile and User
                profileUpdate.email = value;
                userUpdate.email = value;
            } else {
                // All other restricted fields go to StudentProfile only
                profileUpdate[field] = value;

                // Sync full_name to User if changed
                if (field === 'full_name') {
                    userUpdate.full_name = value;
                }
            }
        }

        // Apply updates
        if (Object.keys(profileUpdate).length > 0) {
            await StudentProfile.updateOne(
                { user_id: request.student_id },
                { $set: profileUpdate },
            );
        }
        if (Object.keys(userUpdate).length > 0) {
            await User.updateOne(
                { _id: request.student_id },
                { $set: userUpdate },
            );
        }

        // Mark request as approved
        request.status = 'approved';
        request.reviewed_by = adminOid;
        request.reviewed_at = now;
        await request.save();

        // Notify student (fire-and-forget)
        sendNotificationToStudent(
            request.student_id,
            'PROFILE_CHANGE_APPROVED',
            'email',
            { decision: 'approved' },
        ).catch(() => { });

        // Broadcast SSE event for real-time approval queue update
        broadcastAdminLiveEvent('approval-queue-updated', {
            type: 'profile-change',
            action: 'approved',
            requestId,
        });
    } else {
        // Reject — no changes applied
        request.status = 'rejected';
        request.reviewed_by = adminOid;
        request.reviewed_at = now;
        request.admin_feedback = feedback ?? '';
        await request.save();

        // Notify student with feedback (fire-and-forget)
        sendNotificationToStudent(
            request.student_id,
            'PROFILE_CHANGE_REJECTED',
            'email',
            { decision: 'rejected', feedback: feedback ?? '' },
        ).catch(() => { });

        // Broadcast SSE event for real-time approval queue update
        broadcastAdminLiveEvent('approval-queue-updated', {
            type: 'profile-change',
            action: 'rejected',
            requestId,
        });
    }
}
