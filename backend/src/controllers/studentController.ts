import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import StudentProfile from '../models/StudentProfile';
import StudentApplication from '../models/StudentApplication';
import ProfileUpdateRequest from '../models/ProfileUpdateRequest';
import { AuthRequest } from '../middlewares/auth';
import mongoose from 'mongoose';
import { getStudentDashboardHeader } from '../services/studentDashboardService';
import { broadcastStudentDashboardEvent } from '../realtime/studentDashboardStream';
import StudentDashboardConfig from '../models/StudentDashboardConfig';
import ExamResult from '../models/ExamResult';
import ExamProfileSyncLog from '../models/ExamProfileSyncLog';
import { createAdminAlert } from '../services/adminAlertService';
import { computeStudentProfileScore } from '../services/studentProfileScoreService';
import { buildSecureUploadUrl, registerSecureUpload } from '../services/secureUploadService';
import OtpVerification from '../models/OtpVerification';
import { broadcastAdminLiveEvent } from '../realtime/adminLiveStream';
import { ResponseBuilder } from '../utils/responseBuilder';

// Ensure the profile exists, if not create a default one
const ensureProfile = async (userId: string) => {
    let profile = await StudentProfile.findOne({ user_id: userId });
    if (!profile) {
        // We'll need a full_name from the user object if it was there, but it's removed now.
        // During registration we create the profile, so this is just a safety.
        const created = await StudentProfile.create({
            user_id: userId,
            full_name: 'Student',
            profile_completion_percentage: 0,
        });
        const scoreResult = computeStudentProfileScore(created.toObject() as unknown as Record<string, unknown>);
        created.profile_completion_percentage = scoreResult.score;
        await created.save();
        profile = created;
    }
    return profile;
};

const normalizeDepartment = (value: unknown): 'science' | 'arts' | 'commerce' | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['science', 'sci'].includes(normalized)) return 'science';
    if (['arts', 'humanities', 'humanity'].includes(normalized)) return 'arts';
    if (['commerce', 'business', 'business studies'].includes(normalized)) return 'commerce';
    return undefined;
};

const DEFAULT_CELEBRATION_RULES = {
    enabled: true,
    windowDays: 7,
    minPercentage: 80,
    maxRank: 10,
    ruleMode: 'score_or_rank',
    messageTemplates: [
        'Excellent performance! Keep it up.',
        'Top result achieved. Great work!',
        'You are in the top performers this week.',
    ],
    showForSec: 10,
    dismissible: true,
    maxShowsPerDay: 2,
} as const;

async function resolveCelebration(userId: string) {
    const config = await StudentDashboardConfig.findOne().select('celebrationRules').lean();
    const rulesRaw = (config as Record<string, unknown> | null)?.celebrationRules as Record<string, unknown> | undefined;
    const rules = {
        ...DEFAULT_CELEBRATION_RULES,
        ...(rulesRaw || {}),
    };

    const windowDays = Math.max(1, Number(rules.windowDays || DEFAULT_CELEBRATION_RULES.windowDays));
    const minPercentage = Math.max(0, Number(rules.minPercentage || DEFAULT_CELEBRATION_RULES.minPercentage));
    const maxRank = Math.max(1, Number(rules.maxRank || DEFAULT_CELEBRATION_RULES.maxRank));
    const ruleMode = String(rules.ruleMode || DEFAULT_CELEBRATION_RULES.ruleMode);
    const showForSec = Math.max(3, Number(rules.showForSec || DEFAULT_CELEBRATION_RULES.showForSec));
    const dismissible = rules.dismissible === undefined ? DEFAULT_CELEBRATION_RULES.dismissible : Boolean(rules.dismissible);
    const messageTemplates = Array.isArray(rules.messageTemplates)
        ? rules.messageTemplates.map((item) => String(item || '').trim()).filter(Boolean)
        : [];

    const base = {
        eligible: false,
        reasonCodes: [] as string[],
        topPercentage: 0,
        bestRank: null as number | null,
        message: '',
        showForSec,
        dismissible,
        windowDays,
        maxShowsPerDay: Math.max(1, Number(rules.maxShowsPerDay || DEFAULT_CELEBRATION_RULES.maxShowsPerDay)),
    };

    if (!Boolean(rules.enabled)) {
        return {
            ...base,
            reasonCodes: ['disabled'],
        };
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - windowDays);

    const recentResults = await ExamResult.find({
        student: userId,
        submittedAt: { $gte: fromDate },
    })
        .select('percentage rank submittedAt')
        .sort({ submittedAt: -1 })
        .limit(50)
        .lean();

    if (!recentResults.length) {
        return {
            ...base,
            reasonCodes: ['no_recent_results'],
        };
    }

    const topPercentage = recentResults.reduce((best, item) => Math.max(best, Number(item.percentage || 0)), 0);
    const rankCandidates = recentResults
        .map((item) => Number(item.rank || 0))
        .filter((rank) => Number.isFinite(rank) && rank > 0);
    const bestRank = rankCandidates.length ? Math.min(...rankCandidates) : null;

    const scoreQualified = topPercentage >= minPercentage;
    const rankQualified = bestRank !== null && bestRank <= maxRank;
    const eligible = ruleMode === 'score_and_rank'
        ? (scoreQualified && rankQualified)
        : (scoreQualified || rankQualified);

    const reasonCodes = [] as string[];
    if (scoreQualified) reasonCodes.push('score_threshold');
    if (rankQualified) reasonCodes.push('rank_threshold');
    if (!reasonCodes.length) reasonCodes.push('below_threshold');

    const message = messageTemplates[0]
        || (scoreQualified
            ? `You scored ${Math.round(topPercentage)}% in recent exams.`
            : bestRank !== null
                ? `You reached rank ${bestRank} in recent exams.`
                : 'Great progress in your exam journey.');

    return {
        ...base,
        eligible,
        reasonCodes,
        topPercentage,
        bestRank,
        message,
    };
}

// @desc    Get current student profile
// @route   GET /api/student/profile
// @access  Private (Student)
export const getStudentProfile = async (req: AuthRequest, res: ExpressResponse) => {
    try {
        if (!req.user) return ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Not authenticated'));
        if (req.user.role !== 'student') return ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access only'));
        const profile = await ensureProfile(req.user._id);
        const scoreResult = computeStudentProfileScore(
            profile.toObject() as unknown as Record<string, unknown>,
            req.user as unknown as Record<string, unknown>
        );
        const dashboardHeader = await getStudentDashboardHeader(req.user._id);
        const celebration = await resolveCelebration(req.user._id);
        const pendingRequest = await ProfileUpdateRequest.exists({ student_id: req.user._id, status: 'pending' });
        const recentSyncLogs = await ExamProfileSyncLog.find({ studentId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(8)
            .populate('examId', 'title deliveryMode')
            .lean();
        const examHistory = Array.isArray((profile as unknown as Record<string, unknown>).examHistory)
            ? ((profile as unknown as Record<string, unknown>).examHistory as Array<Record<string, unknown>>)
            : [];
        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            ...profile.toObject(),
            date_of_birth: profile.dob,
            phone_number: profile.phone_number || profile.phone || '',
            profile_completion: profile.profile_completion_percentage,
            profileScore: scoreResult.score,
            profileScoreThreshold: scoreResult.threshold,
            profileEligibleForExam: scoreResult.eligible,
            profileScoreBreakdown: scoreResult.breakdown,
            missingProfileFields: scoreResult.missingFields,
            address: profile.present_address || '',
            preferred_stream: profile.department || '',
            guardian_phone_verification_status: (profile as any).guardianPhoneVerificationStatus || 'unverified',
            guardian_phone_verified_at: (profile as any).guardianPhoneVerifiedAt || null,
            welcome_message: dashboardHeader.welcomeMessage,
            overall_rank: dashboardHeader.overallRank,
            profile_completion_threshold: dashboardHeader.profileCompletionThreshold,
            profile_eligible_for_exam: dashboardHeader.isProfileEligible,
            pendingRequest: Boolean(pendingRequest),
            celebration,
            exam_data: {
                identity: (profile as unknown as Record<string, unknown>).examIdentity || {},
                latestResultSummary: (profile as unknown as Record<string, unknown>).latestExamResultSummary || '',
                lastSyncAt: (profile as unknown as Record<string, unknown>).examDataLastSyncAt || null,
                lastSyncSource: (profile as unknown as Record<string, unknown>).examDataLastSyncSource || '',
                history: examHistory.slice(0, 12),
                syncLogs: recentSyncLogs.map((item) => {
                    const examDoc = item.examId as unknown as Record<string, unknown> | null;
                    return {
                        _id: String(item._id),
                        examId: examDoc?._id ? String(examDoc._id) : String(item.examId || ''),
                        examTitle: String(examDoc?.title || ''),
                        source: item.source,
                        status: item.status,
                        syncMode: item.syncMode,
                        changedFields: item.changedFields || [],
                        createdAt: item.createdAt,
                    };
                }),
            },
        }));
    } catch (err: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to get profile'));
    }
};

// @desc    Get latest student profile update request status
// @route   GET /api/student/profile-update-request
// @access  Private (Student)
export const getStudentProfileUpdateRequestStatus = async (req: AuthRequest, res: ExpressResponse) => {
    try {
        if (!req.user) return ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Not authenticated'));
        if (req.user.role !== 'student') return ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access only'));

        const [pending, latestDecision] = await Promise.all([
            ProfileUpdateRequest.findOne({ student_id: req.user._id, status: 'pending' }).sort({ createdAt: -1 }).lean(),
            ProfileUpdateRequest.findOne({ student_id: req.user._id, status: { $in: ['approved', 'rejected'] } }).sort({ updatedAt: -1 }).lean(),
        ]);

        const normalize = (doc: Record<string, any> | null) => {
            if (!doc) return null;
            return {
                id: String(doc._id),
                status: String(doc.status || ''),
                requestedChanges: (doc.requested_changes || {}) as Record<string, unknown>,
                submittedAt: doc.createdAt || null,
                reviewedAt: doc.reviewed_at || null,
                feedback: String(doc.admin_feedback || ''),
            };
        };

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            pendingRequest: normalize(pending as Record<string, any> | null),
            latestDecision: normalize(latestDecision as Record<string, any> | null),
        }));
    } catch (err: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to load profile update request status'));
    }
};

// @desc    Update student profile
// @route   PUT /api/student/profile
// @access  Private (Student)
export const updateStudentProfile = async (req: AuthRequest, res: ExpressResponse) => {
    try {
        if (!req.user) return ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Not authenticated'));
        if (req.user.role !== 'student') return ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access only'));

        // Fields that can be updated directly without approval
        const openFields = [
            'dob', 'gender', 'present_address', 'permanent_address', 'district', 'college_address', 'college_name'
        ];

        // Contact fields that require OTP verification before creating a ProfileUpdateRequest
        const contactFields = ['phone_number', 'email'];

        // Fields that require admin approval if they were already set
        const restrictedFields = [
            'full_name', 'phone_number', 'phone', 'guardian_name', 'guardian_phone',
            'ssc_batch', 'hsc_batch', 'department', 'roll_number', 'registration_id', 'institution_name', 'email'
        ];

        const aliasMap: Record<string, string> = {
            date_of_birth: 'dob',
            address: 'present_address',
            // REMOVED 'preferred_stream': 'department' to fix the clobbering bug
        };

        const profile = await ensureProfile(req.user._id);
        const profileObj = profile.toObject() as Record<string, any>;
        const userObj = req.user as Record<string, any>;

        const directUpdates: Record<string, any> = {};
        const requestedUpdates: Record<string, any> = {};
        const previousValues: Record<string, any> = {};

        // 1. Process Open Fields
        for (const field of openFields) {
            if (req.body[field] !== undefined) {
                directUpdates[field] = req.body[field];
            }
        }

        // 2. Process Aliases for Open Fields
        for (const [alias, target] of Object.entries(aliasMap)) {
            if (req.body[alias] !== undefined && openFields.includes(target)) {
                directUpdates[target] = req.body[alias];
            }
        }

        // 3. Check OTP verification for contact field changes (Requirement 6.2)
        for (const field of contactFields) {
            const val = req.body[field];
            if (val === undefined) continue;

            const contactType = field === 'phone_number' ? 'phone' : 'email';
            // Look up current value from profile or user
            const currentVal = field === 'email'
                ? (profileObj.email || userObj.email || '')
                : (profileObj.phone_number || profileObj.phone || userObj.phone_number || '');
            const isSet = currentVal != null && String(currentVal).trim() !== '';

            if (isSet && String(currentVal) !== String(val)) {
                // Contact is changing — require OTP verification
                const userOid = new mongoose.Types.ObjectId(String(req.user._id));
                const verifiedRecord = await OtpVerification.findOne({
                    user_id: userOid,
                    contact_type: contactType,
                    contact_value: String(val).trim(),
                    verified: true,
                }).sort({ createdAt: -1 }).lean();

                if (!verifiedRecord) {
                    return ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', `OTP verification is required before changing your ${field === 'phone_number' ? 'phone number' : 'email'}. Please verify the new contact first.`, {
                        requiresOtp: true,
                        contactType,
                        contactValue: val,
                    }));
                }
            }
        }

        // 4. Process Restricted Fields
        for (const field of restrictedFields) {
            let val = req.body[field];
            if (val === undefined) {
                // Check aliases (though none currently map to restricted fields, for future safety)
                const aliasKey = Object.keys(aliasMap).find(a => aliasMap[a] === field);
                if (aliasKey && req.body[aliasKey] !== undefined) {
                    val = req.body[aliasKey];
                }
            }

            if (val !== undefined) {
                // Check if current value exists and is different
                const currentVal = field === 'email'
                    ? (profileObj.email || userObj.email)
                    : profileObj[field];
                const isSet = currentVal != null && String(currentVal).trim() !== '';

                if (!isSet) {
                    // If not set yet, allow direct update
                    directUpdates[field] = val;
                } else if (String(currentVal) !== String(val)) {
                    // If already set and changing, require approval
                    requestedUpdates[field] = val;
                    previousValues[field] = currentVal;
                }
            }
        }

        // Apply direct updates
        if (Object.keys(directUpdates).length > 0) {
            for (const [key, value] of Object.entries(directUpdates)) {
                if (key === 'department') {
                    const mapped = normalizeDepartment(value);
                    if (mapped) (profile as any)[key] = mapped;
                } else if (key === 'dob' && value === '') {
                    (profile as any)[key] = undefined;
                } else if (key === 'gender') {
                    const gender = typeof value === 'string' ? value.trim().toLowerCase() : '';
                    if (['male', 'female', 'other'].includes(gender)) (profile as any)[key] = gender;
                } else {
                    (profile as any)[key] = value;
                }
            }

            // Sync phone/phone_number
            if (directUpdates.phone_number && !directUpdates.phone) (profile as any).phone = directUpdates.phone_number;
            if (directUpdates.phone && !directUpdates.phone_number) (profile as any).phone_number = directUpdates.phone;

            // Compute completion
            const scoreResult = computeStudentProfileScore(
                profile.toObject() as unknown as Record<string, unknown>,
                req.user as unknown as Record<string, unknown>
            );
            profile.profile_completion_percentage = scoreResult.score;

            await profile.save();
        }

        // Handle requested updates (Requirement 6.1, 6.3, 6.4, 6.5)
        let requestMsg = '';
        if (Object.keys(requestedUpdates).length > 0) {
            // Replace existing pending request if any (Requirement 6.3)
            await ProfileUpdateRequest.deleteMany({ student_id: req.user._id, status: 'pending' });

            const changedFieldNames = Object.keys(requestedUpdates);

            const request = await ProfileUpdateRequest.create({
                student_id: req.user._id,
                requested_changes: requestedUpdates,
                previous_values: previousValues,
            });

            // Create admin alert with changed field names and link to approval queue (Requirement 6.4)
            await createAdminAlert({
                title: 'Profile approval required',
                message: `A student submitted changes to: ${changedFieldNames.join(', ')}. Review required.`,
                type: 'profile_update_request',
                messagePreview: changedFieldNames.join(', '),
                linkUrl: `/__cw_admin__/pending-approvals?tab=profile-changes&requestId=${String(request._id)}`,
                category: 'update',
                sourceType: 'profile_update_request',
                sourceId: String(request._id),
                targetRoute: '/__cw_admin__/pending-approvals',
                targetEntityId: String(request._id),
                priority: 'normal',
                actorUserId: req.user._id,
                actorNameSnapshot: String(req.user.fullName || req.user.username || req.user.email || 'Student').trim(),
                targetRole: 'admin',
                createdBy: req.user._id,
                dedupeKey: `profile_update_request:${String(request._id)}`,
            });

            // Broadcast SSE event for real-time approval queue update (Requirement 10.7)
            broadcastAdminLiveEvent('approval-queue-updated', {
                type: 'profile-change',
                action: 'created',
                requestId: String(request._id),
            });

            requestMsg = ' Some changes require admin approval and have been sent for review.';
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            profile: {
                ...profile.toObject(),
                date_of_birth: profile.dob,
                phone_number: profile.phone_number || profile.phone || '',
                profile_completion: profile.profile_completion_percentage,
                profileScore: profile.profile_completion_percentage,
                guardian_phone_verification_status: (profile as any).guardianPhoneVerificationStatus || 'unverified',
                guardian_phone_verified_at: (profile as any).guardianPhoneVerifiedAt || null,
            },
            pendingRequest: Object.keys(requestedUpdates).length > 0
        }, 'Profile update processed.' + requestMsg));

        broadcastStudentDashboardEvent({ type: 'profile_updated', meta: { studentId: req.user._id } });
    } catch (err: any) {
        console.error('updateStudentProfile Error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to update profile'));
    }
};

// @desc    Get student applications
// @route   GET /api/student/applications
// @access  Private (Student)
export const getStudentApplications = async (req: AuthRequest, res: ExpressResponse) => {
    try {
        if (!req.user) return ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Not authenticated'));
        if (req.user.role !== 'student') return ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access only'));
        const apps = await StudentApplication.find({ student_id: req.user._id })
            .populate('university_id', 'name slug logo')
            .sort({ createdAt: -1 });
        ResponseBuilder.send(res, 200, ResponseBuilder.success(apps));
    } catch (err: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to get profile'));
    }
};

// @desc    Submit new application
// @route   POST /api/student/applications
// @access  Private (Student)
export const createStudentApplication = async (req: AuthRequest, res: ExpressResponse) => {
    try {
        if (!req.user) return ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Not authenticated'));
        if (req.user.role !== 'student') return ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access only'));

        const { university_id, program } = req.body;

        if (!university_id || !program) {
            return ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'University and program are required'));
        }

        // Check profile completion first
        const profile = await ensureProfile(req.user._id);
        if (profile.profile_completion_percentage < 60) {
            return ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Please complete at least 60% of your profile before applying.'));
        }

        // Prevent duplicate applications for the same program in draft/submitted
        const existing = await StudentApplication.findOne({
            student_id: req.user._id,
            university_id,
            program,
            status: { $in: ['draft', 'submitted', 'under_review'] }
        });

        if (existing) {
            return ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'You already have an active application for this program.'));
        }

        const application = await StudentApplication.create({
            student_id: req.user._id,
            university_id,
            program,
            status: 'draft',
            applied_at: new Date()
        });

        ResponseBuilder.send(res, 201, ResponseBuilder.created({ application }, 'Application draft created successfully'));
    } catch (err: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to create application'));
    }
};

// @desc    Upload student document
export const uploadStudentDocument = async (req: AuthRequest, res: ExpressResponse) => {
    try {
        if (!req.user) return ResponseBuilder.send(res, 401, ResponseBuilder.error('AUTHENTICATION_ERROR', 'Not authenticated'));
        if (req.user.role !== 'student') return ResponseBuilder.send(res, 403, ResponseBuilder.error('AUTHORIZATION_ERROR', 'Student access only'));
        if (!req.file) return ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'No file uploaded'));

        const document_type = req.body.document_type || req.body.type;
        if (!document_type) return ResponseBuilder.send(res, 400, ResponseBuilder.error('VALIDATION_ERROR', 'Document type is required'));

        const profile = await ensureProfile(req.user._id);
        const isProfilePhoto = String(document_type).trim().toLowerCase() === 'profile_photo';
        const secureUpload = await registerSecureUpload({
            file: req.file,
            category: isProfilePhoto ? 'profile_photo' : 'student_document',
            visibility: isProfilePhoto ? 'public' : 'protected',
            ownerUserId: req.user._id,
            ownerRole: req.user.role,
            uploadedBy: req.user._id,
            accessRoles: isProfilePhoto
                ? ['student', 'superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent']
                : ['student', 'superadmin', 'admin', 'moderator', 'support_agent', 'finance_agent'],
        });
        const docUrl = buildSecureUploadUrl(secureUpload.storedName);

        // Persist profile photo immediately so the student sees it without a second save action.
        if (isProfilePhoto) {
            profile.profile_photo_url = docUrl;
            await profile.save();
            broadcastStudentDashboardEvent({ type: 'profile_updated', meta: { studentId: req.user._id } });
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            url: docUrl,
            document_type,
            visibility: secureUpload.visibility
        }, 'Document uploaded successfully'));
    } catch (err: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to upload document'));
    }
};
