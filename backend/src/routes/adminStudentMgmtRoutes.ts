import { Router, Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';

import { authenticate, requireRole, requirePermission } from '../middlewares/auth';
import { requireSensitiveAction, trackSensitiveExport } from '../middlewares/sensitiveAction';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import UserSubscription from '../models/UserSubscription';
import SubscriptionPlan from '../models/SubscriptionPlan';
import StudentGroup from '../models/StudentGroup';
import GroupMembership from '../models/GroupMembership';
import StudentContactTimeline from '../models/StudentContactTimeline';
import NotificationProvider from '../models/NotificationProvider';
import NotificationTemplate from '../models/NotificationTemplate';
import NotificationJob from '../models/NotificationJob';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog';
import { StudentSettingsModel } from '../models/StudentSettings';
import { PaymentModel } from '../models/payment.model';
import ManualPayment from '../models/ManualPayment';
import FinanceTransaction from '../models/FinanceTransaction';
import StudentDueLedger from '../models/StudentDueLedger';
import ExamResult from '../models/ExamResult';
import ImportExportLog from '../models/ImportExportLog';
import { encrypt } from '../services/cryptoService';
import { sendNotificationToStudent } from '../services/notificationProviderService';
import { executeCampaign, resolveAudience, retryFailedDeliveries } from '../services/notificationOrchestrationService';
import {
  parseFileBuffer,
  generatePreview,
  commitImport,
  exportStudents,
  generateTemplateXlsx,
  ImportCommitOptions,
} from '../services/studentImportExportService';
import { getUnifiedStudentDetail } from '../services/adminStudentUnifiedService';
import ProfileUpdateRequest from '../models/ProfileUpdateRequest';
import Settings from '../models/Settings';
import {
  approveNewStudent,
  rejectNewStudent,
  bulkApproveRejectStudents,
  reviewProfileChangeRequest,
} from '../services/profileApprovalService';
import * as groupMembershipService from '../services/groupMembershipService';
import {
  assignSubscriptionLifecycle,
  extendSubscriptionForUser,
  expireSubscriptionForUser,
  toggleAutoRenewForUser,
} from '../services/subscriptionLifecycleService';
import { resolveSubscriptionContactUserIds } from '../services/subscriptionContactCenterService';
import { computeStudentProfileScore } from '../services/studentProfileScoreService';
import { validateRules, evaluateRules, refreshDynamicGroup, DynamicRuleSet } from '../services/dynamicRuleEngine';
import * as deleteSafetyService from '../services/deleteSafetyService';
import {
  generateExportFilename,
  buildCategoryColumnDef,
  VALID_EXPORT_CATEGORIES,
  type ExportCategory,
} from '../utils/groupExportHelpers';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All routes require admin auth
const adminAuth = [authenticate, requireRole('superadmin', 'admin', 'moderator')];
const notificationAdminAuth = [authenticate, requireRole('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent')];

const requireDestructiveStepUp = (moduleName: string, actionName: string) => requireSensitiveAction({
  actionKey: 'data.destructive_change',
  moduleName,
  actionName,
});

const requireSensitiveExport = (moduleName: string, actionName: string, enforceExportRolePolicy = false) => requireSensitiveAction({
  actionKey: 'students.export',
  moduleName,
  actionName,
  enforceExportRolePolicy,
});

// ============================================================================
// STUDENT METRICS (Dashboard overview) — must be before :id wildcard routes
// ============================================================================

router.get('/students-v2/metrics', ...adminAuth, async (_req: Request, res: Response) => {
  try {
    const [
      totalStudents, activeStudents, suspendedStudents, pendingStudents,
      activeSubs, expiredSubs, expiringSoon,
      pendingLegacyPayments, pendingManualPayments, totalPaidLegacyPayments, totalPaidManualPayments,
      groupCount,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', status: 'active' }),
      User.countDocuments({ role: 'student', status: 'suspended' }),
      User.countDocuments({ role: 'student', status: 'pending' }),
      UserSubscription.countDocuments({ status: 'active' }),
      UserSubscription.countDocuments({ status: 'expired' }),
      UserSubscription.countDocuments({
        status: 'active',
        expiresAtUTC: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
      PaymentModel.countDocuments({ status: 'pending' }),
      ManualPayment.countDocuments({ status: 'pending' }),
      PaymentModel.countDocuments({ status: 'paid' }),
      ManualPayment.countDocuments({ status: 'paid' }),
      StudentGroup.countDocuments({ isActive: true }),
    ]);

    // Profile completion stats
    const profileStats = await StudentProfile.aggregate([
      {
        $group: {
          _id: null,
          avgCompletion: { $avg: '$profile_completion_percentage' },
          lowProfile: { $sum: { $cond: [{ $lt: ['$profile_completion_percentage', 50] }, 1, 0] } },
        }
      },
    ]);
    const avgProfileCompletion = Math.round(profileStats[0]?.avgCompletion ?? 0);
    const lowProfileCount = profileStats[0]?.lowProfile ?? 0;

    const pendingPayments = pendingLegacyPayments + pendingManualPayments;
    const totalPaidPayments = totalPaidLegacyPayments + totalPaidManualPayments;

    // Recent registrations (last 7 days)
    const recentRegistrations = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({
      totalStudents, activeStudents, suspendedStudents, pendingStudents,
      activeSubs, expiredSubs, expiringSoon,
      pendingPayments, totalPaidPayments,
      groupCount,
      avgProfileCompletion, lowProfileCount,
      recentRegistrations,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch metrics', error: String(err) });
  }
});

// ============================================================================
// UNIFIED STUDENT DETAIL (Student Management OS — canonical read model)
// ============================================================================

router.get('/students-v2/:id/unified', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const payload = await getUnifiedStudentDetail(String(req.params.id));
    if (!payload) return res.status(404).json({ message: 'Student not found' });
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unified student detail', error: String(err) });
  }
});

// ============================================================================
// STUDENT CREATE (Full admin create flow)
// ============================================================================

router.post('/students-v2/create', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const {
      full_name, email, phone_number, password,
      department, ssc_batch, hsc_batch, college_name,
      guardian_name, guardian_phone, guardian_email,
      gender, dob, district, present_address,
      planId, sendCredentials, groupIds,
      paymentAmount, paymentMethod, recordPayment, paymentStatus,
      startDate, expiryDate, dueDateUTC,
    } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'full_name, email, and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check for duplicates
    const existing = await User.findOne({
      $or: [
        { email: String(email).toLowerCase() },
        ...(phone_number ? [{ phone_number: String(phone_number) }] : []),
      ],
    });
    if (existing) {
      return res.status(409).json({ message: 'A user with this email or phone already exists' });
    }
    if (planId && !mongoose.Types.ObjectId.isValid(String(planId))) {
      return res.status(400).json({ message: 'Invalid planId' });
    }
    if (planId) {
      const planExists = await SubscriptionPlan.exists({ _id: String(planId) });
      if (!planExists) {
        return res.status(404).json({ message: 'Plan not found' });
      }
    }

    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const hashed = await bcrypt.hash(String(password), 12);
    const username = String(email).split('@')[0] + '-' + Date.now().toString(36);

    const user = await User.create({
      full_name: String(full_name).trim(),
      username,
      email: String(email).toLowerCase().trim(),
      password: hashed,
      role: 'student',
      status: 'active',
      phone_number: phone_number ? String(phone_number).trim() : undefined,
      mustChangePassword: true,
      passwordResetRequired: true,
      passwordSetByAdminId: adminUser?.['_id'],
    });

    // Create profile
    const profileData: Record<string, unknown> = {
      user_id: user._id,
      full_name: String(full_name).trim(),
      phone_number: phone_number ? String(phone_number).trim() : undefined,
      email: String(email).toLowerCase().trim(),
    };
    if (department) profileData['department'] = department;
    if (ssc_batch) profileData['ssc_batch'] = ssc_batch;
    if (hsc_batch) profileData['hsc_batch'] = hsc_batch;
    if (college_name) profileData['college_name'] = college_name;
    if (guardian_name) profileData['guardian_name'] = guardian_name;
    if (guardian_phone) profileData['guardian_phone'] = guardian_phone;
    if (guardian_email) profileData['guardian_email'] = guardian_email;
    if (gender) profileData['gender'] = gender;
    if (dob) profileData['dob'] = new Date(dob);
    if (district) profileData['district'] = district;
    if (present_address) profileData['present_address'] = present_address;

    const profile = await StudentProfile.create(profileData);
    const scoreResult = computeStudentProfileScore(
      profile.toObject() as unknown as Record<string, unknown>,
      user.toObject() as unknown as Record<string, unknown>,
    );
    profile.profile_completion_percentage = scoreResult.score;
    await profile.save();

    const normalizedGroupIds = Array.isArray(groupIds)
      ? groupIds.filter((id) => mongoose.Types.ObjectId.isValid(String(id))).map((id) => String(id))
      : [];
    if (normalizedGroupIds.length > 0) {
      await groupMembershipService.setStudentGroups(
        user._id,
        normalizedGroupIds,
        adminUser?.['_id'] as mongoose.Types.ObjectId | undefined,
        'Assigned during student creation'
      );
    }

    // Auto-assign to matching batch/department groups
    const autoGroupQuery: Record<string, unknown> = { isActive: true, type: 'manual' };
    const orConditions: Record<string, unknown>[] = [];
    if (hsc_batch) orConditions.push({ batch: String(hsc_batch).trim() });
    if (department) orConditions.push({ department: String(department).trim().toLowerCase() });
    if (orConditions.length > 0) {
      autoGroupQuery['$or'] = orConditions;
      const matchingGroups = await StudentGroup.find(autoGroupQuery).select('_id').lean();
      const autoGroupIds = matchingGroups
        .map(g => String(g._id))
        .filter(id => !normalizedGroupIds.includes(id)); // skip already-assigned
      if (autoGroupIds.length > 0) {
        for (const gid of autoGroupIds) {
          await groupMembershipService.bulkAddMembers(
            gid,
            [String(user._id)],
            adminUser?.['_id'] as string | undefined,
            'Auto-assigned by batch/department match'
          );
        }
      }
    }

    // Create CRM timeline entry
    await StudentContactTimeline.create({
      studentId: user._id,
      type: 'account_event',
      content: `Student account created by admin${adminUser?.['full_name'] ? ' (' + adminUser['full_name'] + ')' : ''}`,
      sourceType: 'system',
      createdByAdminId: adminUser?.['_id'],
    });

    // Assign plan if requested
    let subscription = null;
    let payment = null;
    let invoice = null;
    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      const assignment = await assignSubscriptionLifecycle({
        userId: String(user._id),
        planId: String(planId),
        actorId: String(adminUser?.['_id'] || ''),
        startAtUTC: startDate,
        expiresAtUTC: expiryDate,
        paymentAmount,
        paymentMethod,
        paymentStatus,
        recordPayment,
        dueDateUTC,
        notes: 'Assigned during student creation',
        paymentNotes: 'Student creation subscription payment',
      });
      subscription = assignment.subscription;
      payment = assignment.payment;
      invoice = assignment.invoice;

      await StudentContactTimeline.create({
        studentId: user._id,
        type: 'subscription_event',
        content: `Subscription plan "${String((assignment.plan as Record<string, unknown>)['name'] || '')}" assigned during account creation (${assignment.subscription.status})`,
        sourceType: 'system',
        createdByAdminId: adminUser?.['_id'],
      });
    }

    // Send credentials if requested
    if (sendCredentials) {
      try {
        await sendNotificationToStudent(user._id, 'ACCOUNT_CREATED', 'sms', {
          full_name: String(full_name),
          username,
          email: String(email),
        });
      } catch { /* Best-effort, don't fail the create */ }
    }

    const safeUser = await User.findById(user._id).select('-password -twoFactorSecret').lean();
    res.status(201).json({
      message: 'Student created successfully',
      student: safeUser,
      user: safeUser,
      profile,
      subscription,
      payment,
      invoice,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create student', error: String(err) });
  }
});

// ============================================================================
// STUDENTS V2
// ============================================================================

router.get('/students-v2', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const {
      q, status, group, page = '1', limit = '20',
      profileScoreMin, subscriptionStatus, expiringDays,
      department, sscBatch, hscBatch, guardianStatus,
      hasPaymentDue, sortBy, sortOrder,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const userQuery: Record<string, unknown> = { role: 'student' };
    if (status) userQuery['status'] = status;
    if (q) {
      const re = new RegExp(String(q), 'i');
      userQuery['$or'] = [{ full_name: re }, { email: re }, { username: re }, { phone_number: re }];
    }

    if (group && mongoose.Types.ObjectId.isValid(group)) {
      const groupId = new mongoose.Types.ObjectId(group);
      const memberships = await GroupMembership.find({ groupId }).select('studentId').lean();
      const memberIds = memberships.map((m) => m.studentId);
      userQuery['_id'] = { $in: memberIds };
    }

    if (subscriptionStatus || expiringDays) {
      const subQuery: Record<string, unknown> = {};
      if (subscriptionStatus) subQuery['status'] = subscriptionStatus;
      if (expiringDays) {
        const days = parseInt(expiringDays, 10);
        if (!isNaN(days)) {
          const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          subQuery['expiresAtUTC'] = { $lte: cutoff };
          subQuery['status'] = 'active';
        }
      }
      const subs = await UserSubscription.find(subQuery).select('userId').lean();
      const subUserIds = subs.map((s) => s.userId);
      const existingId = userQuery['_id'] as { $in: mongoose.Types.ObjectId[] } | undefined;
      userQuery['_id'] = existingId
        ? { $in: existingId.$in.filter((id) => subUserIds.some((sid) => String(sid) === String(id))) }
        : { $in: subUserIds };
    }

    // Profile-based pre-filtering (department, batch, guardian)
    if (department || sscBatch || hscBatch || guardianStatus) {
      const profileQuery: Record<string, unknown> = {};
      if (department) profileQuery['department'] = department;
      if (sscBatch) profileQuery['ssc_batch'] = sscBatch;
      if (hscBatch) profileQuery['hsc_batch'] = hscBatch;
      if (guardianStatus === 'verified') profileQuery['guardianPhoneVerificationStatus'] = 'verified';
      if (guardianStatus === 'unverified') profileQuery['guardianPhoneVerificationStatus'] = { $ne: 'verified' };
      if (guardianStatus === 'has_guardian') profileQuery['guardian_phone'] = { $exists: true, $ne: '' };
      if (guardianStatus === 'no_guardian') profileQuery['guardian_phone'] = { $in: [null, '', undefined] };

      const filteredProfiles = await StudentProfile.find(profileQuery).select('user_id').lean();
      const profileUserIds = filteredProfiles.map((p) => p.user_id);
      const existingId2 = userQuery['_id'] as { $in: mongoose.Types.ObjectId[] } | undefined;
      userQuery['_id'] = existingId2
        ? { $in: existingId2.$in.filter((id) => profileUserIds.some((pid) => String(pid) === String(id))) }
        : { $in: profileUserIds };
    }

    // Payment due filter
    if (hasPaymentDue === 'true') {
      const dueStudents = await StudentDueLedger.find({ netDue: { $gt: 0 } }).select('studentId').lean();
      const dueIds = dueStudents.map((d) => d.studentId);
      const existingId3 = userQuery['_id'] as { $in: mongoose.Types.ObjectId[] } | undefined;
      userQuery['_id'] = existingId3
        ? { $in: existingId3.$in.filter((id) => dueIds.some((did) => String(did) === String(id))) }
        : { $in: dueIds };
    }

    // Determine sort
    const sortField = sortBy === 'name' ? 'full_name'
      : sortBy === 'status' ? 'status'
        : sortBy === 'lastLogin' ? 'lastLoginAtUTC'
          : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(userQuery)
        .select('-password -twoFactorSecret')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(userQuery),
    ]);

    const userIds = users.map((u) => u._id);
    const [profiles, subscriptions] = await Promise.all([
      StudentProfile.find({ user_id: { $in: userIds } }).lean(),
      UserSubscription.find({ userId: { $in: userIds }, status: 'active' })
        .populate('planId', 'name code')
        .lean(),
    ]);

    const profileMap = new Map(profiles.map((p) => [String(p.user_id), p]));
    const subMap = new Map(subscriptions.map((s) => [String(s.userId), s]));
    const filterScore = profileScoreMin ? parseInt(profileScoreMin, 10) : undefined;

    const data = users
      .map((u) => ({
        ...u,
        profile: profileMap.get(String(u._id)) ?? null,
        subscription: subMap.get(String(u._id)) ?? null,
      }))
      .filter((row) => {
        if (filterScore === undefined) return true;
        const score = (row.profile as Record<string, unknown> | null)?.['profile_completion_percentage'] as number ?? 0;
        return score >= filterScore;
      });

    res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch students', error: String(err) });
  }
});

router.get('/students-v2/template.xlsx', ...adminAuth, async (_req: Request, res: Response) => {
  try {
    const buffer = await generateTemplateXlsx();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="students_import_template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/students-v2/export', ...adminAuth, requireSensitiveExport('students_groups', 'students_v2_export', true), trackSensitiveExport({ moduleName: 'students_groups', actionName: 'students_v2_export' }), async (req: Request, res: Response) => {
  try {
    const format = String(req.query['format'] ?? req.query['type'] ?? 'xlsx').trim().toLowerCase() === 'csv' ? 'csv' : 'xlsx';
    const filters: Record<string, unknown> = {};
    const passthroughKeys = [
      'q',
      'status',
      'group',
      'profileScoreMin',
      'subscriptionStatus',
      'expiringDays',
      'department',
      'sscBatch',
      'hscBatch',
      'guardianStatus',
      'hasPaymentDue',
      'sortBy',
      'sortOrder',
    ];
    passthroughKeys.forEach((key) => {
      if (req.query[key] !== undefined) filters[key] = req.query[key];
    });

    const buffer = await exportStudents(filters, format === 'csv' ? 'csv' : 'xlsx');
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="students_export.xlsx"');
    }
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post(
  '/students-v2/import/preview',
  ...adminAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'file is required' });
      const { rows, columns } = await parseFileBuffer(req.file.buffer, req.file.mimetype);
      const preview = await generatePreview(rows, columns);
      res.json({ ...preview, allRows: rows });
    } catch (err) {
      res.status(500).json({ message: String(err) });
    }
  },
);

router.post('/students-v2/import/commit', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { mode, dedupeField, mapping, rows } = req.body as ImportCommitOptions;
    if (!mode || !dedupeField || !mapping || !Array.isArray(rows)) {
      return res.status(400).json({ message: 'mode, dedupeField, mapping, rows required' });
    }
    const adminId = String((req as unknown as Record<string, unknown>)['user'] && ((req as unknown as Record<string, unknown>)['user'] as Record<string, unknown>)['_id'] || '');
    const result = await commitImport({ mode, dedupeField, mapping, rows }, adminId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/students-v2/bulk-delete', ...adminAuth, requireDestructiveStepUp('students_groups', 'students_v2_bulk_delete'), async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array required' });
    }
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    await Promise.all([
      User.deleteMany({ _id: { $in: validIds } }),
      StudentProfile.deleteMany({ user_id: { $in: validIds } }),
    ]);
    res.json({ message: `Deleted ${validIds.length} students`, deleted: validIds.length });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/students-v2/bulk-update', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { ids, update } = req.body as { ids: string[]; update: Record<string, unknown> };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array required' });
    }
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const allowedUserFields: Record<string, unknown> = {};
    const allowedProfileFields: Record<string, unknown> = {};
    if (update['status'] && ['active', 'suspended', 'blocked', 'pending'].includes(String(update['status']))) {
      allowedUserFields['status'] = update['status'];
    }
    if (update['department'] !== undefined) allowedProfileFields['department'] = String(update['department'] || '').trim();
    if (update['ssc_batch'] !== undefined) allowedProfileFields['ssc_batch'] = String(update['ssc_batch'] || '').trim();
    if (update['hsc_batch'] !== undefined) allowedProfileFields['hsc_batch'] = String(update['hsc_batch'] || '').trim();
    if (Object.keys(allowedUserFields).length > 0) {
      await User.updateMany({ _id: { $in: validIds } }, { $set: allowedUserFields });
    }
    if (Object.keys(allowedProfileFields).length > 0) {
      await StudentProfile.updateMany({ user_id: { $in: validIds } }, { $set: allowedProfileFields });
    }
    res.json({ message: `Updated ${validIds.length} students`, updated: validIds.length });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// WEAK TOPICS ADMIN REPORT — must be before :id wildcard
// ============================================================================

router.get('/students-v2/weak-topics-report', ...adminAuth, async (_req: Request, res: Response) => {
  try {
    const results = await ExamResult.aggregate([
      { $unwind: '$answers' },
      {
        $group: {
          _id: '$answers.question',
          totalAttempts: { $sum: 1 },
          correctCount: { $sum: { $cond: ['$answers.isCorrect', 1, 0] } },
        }
      },
      { $match: { totalAttempts: { $gte: 5 } } },
      { $addFields: { accuracy: { $multiply: [{ $divide: ['$correctCount', '$totalAttempts'] }, 100] } } },
      { $match: { accuracy: { $lte: 50 } } },
      { $sort: { accuracy: 1 } },
      { $limit: 100 },
    ]);
    res.json({ data: results });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ── Global CRM Timeline — must be before :id wildcard ───────
router.get('/students-v2/crm-timeline', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { type, sourceType, limit: limitStr } = req.query;
    const filter: Record<string, unknown> = {};
    if (type) filter['type'] = type;
    if (sourceType) filter['sourceType'] = sourceType;
    const lim = Math.min(Number(limitStr) || 100, 500);

    const entries = await StudentContactTimeline.find(filter)
      .sort({ createdAt: -1 })
      .limit(lim)
      .populate('studentId', 'full_name email')
      .populate('createdByAdminId', 'full_name')
      .lean();

    // Reshape so studentId → student for frontend consumption
    const data = entries.map((e: Record<string, unknown>) => ({
      ...e,
      student: e['studentId'] as Record<string, unknown> | null,
    }));

    res.json({ entries: data });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// ADMIN APPROVAL ENDPOINTS — Registration & Profile Change Approvals
// Must be before :id wildcard routes
// Requirements: 5.3, 5.4, 5.6, 10.1, 10.2, 10.3
// ============================================================================

// GET /students-v2/pending-approvals — list pending registrations + profile changes with counts
router.get('/students-v2/pending-approvals', ...adminAuth, async (_req: Request, res: Response) => {
  try {
    const [pendingRegistrations, registrationCount, profileChanges, profileChangeCount] = await Promise.all([
      User.find({ role: 'student', status: 'pending' })
        .select('full_name email phone_number status createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments({ role: 'student', status: 'pending' }),
      ProfileUpdateRequest.find({ status: 'pending' })
        .populate('student_id', 'full_name email')
        .sort({ createdAt: -1 })
        .lean(),
      ProfileUpdateRequest.countDocuments({ status: 'pending' }),
    ]);

    res.json({
      pendingRegistrations,
      registrationCount,
      profileChanges,
      profileChangeCount,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// GET /students-v2/profile-requests — list pending profile change requests
// Requirements: 7.1
router.get('/students-v2/profile-requests', ...adminAuth, async (_req: Request, res: Response) => {
  try {
    const requests = await ProfileUpdateRequest.find({ status: 'pending' })
      .populate('student_id', 'full_name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// GET /students-v2/profile-requests/:id — get single request with side-by-side diff
// Requirements: 7.2
router.get('/students-v2/profile-requests/:id', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const request = await ProfileUpdateRequest.findById(req.params.id)
      .populate('student_id', 'full_name email phone_number')
      .populate('reviewed_by', 'full_name')
      .lean();
    if (!request) return res.status(404).json({ message: 'Profile change request not found.' });

    // Build side-by-side diff
    const diff = Object.keys(request.requested_changes || {}).map((field) => ({
      field,
      previousValue: request.previous_values?.[field] ?? null,
      requestedValue: request.requested_changes[field],
    }));

    res.json({ request, diff });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/students-v2/:id', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password -twoFactorSecret').lean();
    if (!user) return res.status(404).json({ message: 'Student not found' });
    const [profile, subscription, subscriptionHistory] = await Promise.all([
      StudentProfile.findOne({ user_id: user._id }).lean(),
      UserSubscription.findOne({ userId: user._id, status: 'active' })
        .populate('planId', 'name code durationDays')
        .lean(),
      UserSubscription.find({ userId: user._id })
        .populate('planId', 'name code')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);
    res.json({ ...user, profile, subscription, subscriptionHistory });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.put('/students-v2/:id', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const {
      full_name,
      email,
      phone_number,
      status,
      planId,
      planCode,
      startDate,
      expiryDate,
      paymentAmount,
      paymentMethod,
      paymentStatus,
      recordPayment,
      dueDateUTC,
      subscriptionNotes,
      ...profileFields
    } = req.body;
    const userUpdate: Record<string, unknown> = {};
    if (full_name) userUpdate['full_name'] = full_name;
    if (email) {
      userUpdate['email'] = email;
      // Admin bypass: reset emailVerifiedAt when admin updates email (Requirement 4.3)
      userUpdate['emailVerifiedAt'] = null;
    }
    if (phone_number) {
      userUpdate['phone_number'] = phone_number;
      // Admin bypass: reset phoneVerifiedAt when admin updates phone (Requirement 4.2)
      userUpdate['phoneVerifiedAt'] = null;
    }
    if (status && ['active', 'suspended', 'blocked', 'pending'].includes(status)) {
      userUpdate['status'] = status;
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: userUpdate }, { new: true })
      .select('-password -twoFactorSecret').lean();
    if (!user) return res.status(404).json({ message: 'Student not found' });

    const profileUpdate: Record<string, unknown> = {};
    const profileKeys = [
      'guardian_phone', 'department', 'ssc_batch', 'hsc_batch', 'college_name',
      'college_address', 'present_address', 'district', 'gender', 'dob',
      'guardian_name', 'roll_number', 'registration_id',
    ];
    for (const key of profileKeys) {
      if (profileFields[key] !== undefined) profileUpdate[key] = profileFields[key];
    }
    if (full_name) profileUpdate['full_name'] = full_name;
    if (phone_number) {
      // Admin bypass: apply phone directly and sync phone field (Requirements 4.1, 4.2)
      profileUpdate['phone_number'] = phone_number;
      profileUpdate['phone'] = phone_number;
    }
    if (email) {
      // Admin bypass: apply email directly (Requirement 4.1)
      profileUpdate['email'] = email;
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { user_id: req.params.id },
      { $set: profileUpdate },
      { upsert: true, new: true },
    ).lean();

    let subscription = null;
    if (planId || planCode) {
      const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
      const assignment = await assignSubscriptionLifecycle({
        userId: String(req.params.id),
        planId: planId ? String(planId) : undefined,
        planCode: planCode ? String(planCode) : undefined,
        actorId: String(adminUser?.['_id'] || ''),
        startAtUTC: startDate,
        expiresAtUTC: expiryDate,
        paymentAmount,
        paymentMethod,
        paymentStatus,
        recordPayment,
        dueDateUTC,
        notes: subscriptionNotes || 'Assigned via student update',
      });
      subscription = assignment.subscription;
    }

    res.json({ ...user, profile, subscription });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/students-v2/:id/suspend', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, { $set: { status: 'suspended' } }, { new: true },
    ).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student suspended', user });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/students-v2/:id/activate', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, { $set: { status: 'active' } }, { new: true },
    ).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student activated', user });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/students-v2/:id/reset-password', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
    }
    const hashed = await bcrypt.hash(String(newPassword), 12);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { password: hashed, mustChangePassword: true, passwordResetRequired: true } },
      { new: true },
    ).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// STUDENT GROUPS
// ============================================================================

router.get('/student-groups', ...adminAuth, requirePermission('students_groups', 'view'), async (req: Request, res: Response) => {
  try {
    const { q, isActive, page = '1', limit = '50' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const query: Record<string, unknown> = {};
    if (isActive !== undefined) query['isActive'] = isActive === 'true';
    if (q) query['name'] = new RegExp(String(q), 'i');
    const [groups, total] = await Promise.all([
      StudentGroup.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      StudentGroup.countDocuments(query),
    ]);
    res.json({ data: groups, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/student-groups/export', ...adminAuth, requirePermission('students_groups', 'export'), requireSensitiveExport('students_groups', 'student_groups_legacy_export', true), trackSensitiveExport({ moduleName: 'students_groups', actionName: 'student_groups_legacy_export' }), async (req: Request, res: Response) => {
  try {
    const { q, isActive } = req.query as Record<string, string>;
    const format = String(req.query['format'] ?? req.query['type'] ?? 'xlsx').trim().toLowerCase() === 'csv' ? 'csv' : 'xlsx';
    const query: Record<string, unknown> = {};
    if (isActive !== undefined) query['isActive'] = isActive === 'true';
    if (q) {
      const matcher = new RegExp(String(q), 'i');
      query['$or'] = [{ name: matcher }, { slug: matcher }, { batchTag: matcher }, { description: matcher }];
    }

    const [groups, counts] = await Promise.all([
      StudentGroup.find(query).sort({ createdAt: -1 }).lean(),
      GroupMembership.aggregate([
        { $match: { membershipStatus: 'active' } },
        { $group: { _id: '$groupId', studentCount: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map((item) => [String(item._id), Number(item.studentCount || 0)]));
    const rows = groups.map((group) => ({
      name: group.name,
      slug: group.slug,
      batchTag: group.batchTag || '',
      description: group.description || '',
      type: group.type || 'manual',
      isActive: Boolean(group.isActive),
      isFeatured: Boolean(group.isFeatured),
      department: String(group.department || ''),
      batch: String(group.batch || ''),
      memberCount: countMap.get(String(group._id)) || Number(group.studentCount || 0),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    if (format === 'csv') {
      const sheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(sheet);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="student_groups_export.csv"');
      res.send(csv);
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Groups');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student_groups_export.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/student-groups/bulk-update', ...adminAuth, requirePermission('students_groups', 'edit'), async (req: Request, res: Response) => {
  try {
    const { ids, update } = req.body as { ids: string[]; update: Record<string, unknown> };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array required' });
    }
    if (!update || typeof update !== 'object') {
      return res.status(400).json({ message: 'update payload required' });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const allowed: Record<string, unknown> = {};
    const directFields = ['description', 'department', 'batch', 'visibilityNote', 'color', 'icon'];
    directFields.forEach((field) => {
      if (update[field] !== undefined) allowed[field] = String(update[field] || '').trim();
    });
    if (update['isActive'] !== undefined) allowed['isActive'] = Boolean(update['isActive']);
    if (update['isFeatured'] !== undefined) allowed['isFeatured'] = Boolean(update['isFeatured']);
    if (update['sortOrder'] !== undefined) allowed['sortOrder'] = Number(update['sortOrder']) || 0;
    if (update['cardStyleVariant'] !== undefined && ['solid', 'gradient', 'outline', 'minimal'].includes(String(update['cardStyleVariant']))) {
      allowed['cardStyleVariant'] = update['cardStyleVariant'];
    }
    if (update['defaultExamVisibility'] !== undefined && ['all_students', 'group_only', 'hidden'].includes(String(update['defaultExamVisibility']))) {
      allowed['defaultExamVisibility'] = update['defaultExamVisibility'];
    }
    if (update['defaultCommunicationAudience'] !== undefined) {
      allowed['defaultCommunicationAudience'] = Boolean(update['defaultCommunicationAudience']);
    }

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ message: 'No safe bulk fields provided' });
    }

    const result = await StudentGroup.updateMany({ _id: { $in: validIds } }, { $set: allowed });
    res.json({ message: `Updated ${Number(result.modifiedCount || 0)} groups`, updated: Number(result.modifiedCount || 0) });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/student-groups/bulk-delete', ...adminAuth, requirePermission('students_groups', 'delete'), requireDestructiveStepUp('students_groups', 'student_groups_bulk_delete'), async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array required' });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const result = await deleteSafetyService.bulkDeleteGroups(validIds);

    // Clean up denormalized groupIds on student profiles for deleted groups
    for (const id of result.deleted) {
      const objectId = new mongoose.Types.ObjectId(id);
      await StudentProfile.updateMany(
        { groupIds: objectId },
        { $pull: { groupIds: objectId } }
      );
    }

    res.json({
      message: `Deleted ${result.deleted.length} groups`,
      deleted: result.deleted.length,
      deletedIds: result.deleted,
      skipped: result.skipped,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/student-groups', ...adminAuth, requirePermission('students_groups', 'create'), async (req: Request, res: Response) => {
  try {
    const { name, description, batchTag, type, rules, isActive,
      shortCode, color, icon, cardStyleVariant, sortOrder, isFeatured,
      batch, department, visibilityNote, defaultExamVisibility,
      defaultCommunicationAudience } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    // Validate rules for dynamic groups
    if (type === 'dynamic' && rules) {
      const validation = validateRules(rules as DynamicRuleSet);
      if (!validation.valid) {
        return res.status(400).json({ message: 'Invalid dynamic rules', errors: validation.errors });
      }
    }

    const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const group = await StudentGroup.create({
      name, slug, description, batchTag,
      type: type || 'manual',
      rules: rules || {},
      isActive: isActive !== false,
      createdByAdminId: adminUser?.['_id'],
      shortCode: shortCode || undefined,
      color: color || '#6366f1',
      icon: icon || 'Users',
      cardStyleVariant: cardStyleVariant || 'solid',
      sortOrder: Number(sortOrder) || 0,
      isFeatured: isFeatured === true,
      batch: batch || undefined,
      department: department || undefined,
      visibilityNote: visibilityNote || '',
      defaultExamVisibility: defaultExamVisibility || 'all_students',
      defaultCommunicationAudience: defaultCommunicationAudience === true,
    });

    // For dynamic groups, evaluate rules and return estimated member count
    if (type === 'dynamic' && rules) {
      try {
        const evaluation = await evaluateRules(rules as DynamicRuleSet);
        await StudentGroup.updateOne({ _id: group._id }, { $set: { memberCountCached: evaluation.matchedCount } });
        return res.status(201).json({ ...group.toObject(), estimatedMemberCount: evaluation.matchedCount });
      } catch {
        // Rule evaluation failure is non-fatal — return group without estimate
        return res.status(201).json(group);
      }
    }

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/student-groups/:id', ...adminAuth, requirePermission('students_groups', 'view'), async (req: Request, res: Response) => {
  try {
    const group = await StudentGroup.findById(req.params.id).lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const memberCount = await groupMembershipService.getGroupMemberCount(group._id, 'active');
    res.json({ ...group, memberCount });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.put('/student-groups/:id', ...adminAuth, requirePermission('students_groups', 'edit'), async (req: Request, res: Response) => {
  try {
    const { name, description, batchTag, type, rules, isActive,
      shortCode, color, icon, cardStyleVariant, sortOrder, isFeatured,
      batch, department, visibilityNote, defaultExamVisibility,
      defaultCommunicationAudience } = req.body;

    // Determine effective type: use provided type or fetch existing group's type
    let effectiveType = type;
    if (effectiveType === undefined) {
      const existing = await StudentGroup.findById(req.params.id).select('type').lean();
      effectiveType = existing?.type;
    }

    // Validate rules for dynamic groups
    if (effectiveType === 'dynamic' && rules) {
      const validation = validateRules(rules as DynamicRuleSet);
      if (!validation.valid) {
        return res.status(400).json({ message: 'Invalid dynamic rules', errors: validation.errors });
      }
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update['name'] = name;
    if (description !== undefined) update['description'] = description;
    if (batchTag !== undefined) update['batchTag'] = batchTag;
    if (type !== undefined) update['type'] = type;
    if (rules !== undefined) update['rules'] = rules;
    if (isActive !== undefined) update['isActive'] = isActive;
    if (shortCode !== undefined) update['shortCode'] = shortCode;
    if (color !== undefined) update['color'] = color;
    if (icon !== undefined) update['icon'] = icon;
    if (cardStyleVariant !== undefined) update['cardStyleVariant'] = cardStyleVariant;
    if (sortOrder !== undefined) update['sortOrder'] = Number(sortOrder) || 0;
    if (isFeatured !== undefined) update['isFeatured'] = isFeatured === true;
    if (batch !== undefined) update['batch'] = batch;
    if (department !== undefined) update['department'] = department;
    if (visibilityNote !== undefined) update['visibilityNote'] = visibilityNote;
    if (defaultExamVisibility !== undefined) update['defaultExamVisibility'] = defaultExamVisibility;
    if (defaultCommunicationAudience !== undefined) update['defaultCommunicationAudience'] = defaultCommunicationAudience === true;
    const group = await StudentGroup.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // For dynamic groups, evaluate rules and return estimated member count
    if (effectiveType === 'dynamic' && rules) {
      try {
        const evaluation = await evaluateRules(rules as DynamicRuleSet);
        await StudentGroup.updateOne({ _id: group._id }, { $set: { memberCountCached: evaluation.matchedCount } });
        return res.json({ ...group, estimatedMemberCount: evaluation.matchedCount });
      } catch {
        // Rule evaluation failure is non-fatal
        return res.json(group);
      }
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.delete('/student-groups/:id', ...adminAuth, requirePermission('students_groups', 'delete'), requireDestructiveStepUp('students_groups', 'student_group_delete'), async (req: Request, res: Response) => {
  try {
    const groupId = String(req.params.id);
    // Safety check before deletion
    const safety = await deleteSafetyService.canDeleteGroup(groupId);
    if (!safety.canDelete) {
      return res.status(409).json({ message: 'Cannot delete group', blockers: safety.blockers });
    }
    // Execute safe deletion (sets memberships to removed, then deletes group)
    await deleteSafetyService.executeGroupDeletion(groupId);
    // Remove group from all student profiles (denormalized cache)
    await StudentProfile.updateMany(
      { groupIds: groupId },
      { $pull: { groupIds: new mongoose.Types.ObjectId(groupId) } }
    );
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/student-groups/:id/members/add', ...adminAuth, requirePermission('students_groups', 'edit'), async (req: Request, res: Response) => {
  try {
    const { studentIds, dryRun } = req.body as { studentIds: string[]; dryRun?: boolean };
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array required' });
    }

    const normalizedIds = [...new Set(
      studentIds
        .map(id => String(id || '').trim())
        .filter(Boolean),
    )];

    const objectIds = normalizedIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const unresolvedTokens = normalizedIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

    const resolvedIdSet = new Set<string>(objectIds);
    if (unresolvedTokens.length > 0) {
      const lowerTokens = unresolvedTokens.map(token => token.toLowerCase());
      const [usersByDirectFields, profilesByLegacyIds] = await Promise.all([
        User.find({
          role: 'student',
          $or: [
            { username: { $in: lowerTokens } },
            { email: { $in: lowerTokens } },
            { phone_number: { $in: unresolvedTokens } },
          ],
        }).select('_id').lean(),
        StudentProfile.find({
          $or: [
            { user_unique_id: { $in: unresolvedTokens } },
            { phone_number: { $in: unresolvedTokens } },
            { email: { $in: lowerTokens } },
          ],
        }).select('user_id').lean(),
      ]);

      usersByDirectFields.forEach(user => resolvedIdSet.add(String(user._id)));
      profilesByLegacyIds.forEach(profile => resolvedIdSet.add(String(profile.user_id)));
    }

    const resolvedIds = [...resolvedIdSet];
    const groupId = String(req.params.id);
    const unresolvedCount = Math.max(0, normalizedIds.length - resolvedIds.length);

    // Dry-run mode: resolve IDs and check existing memberships without committing
    if (dryRun) {
      const existingMemberships = await GroupMembership.find({
        groupId: new mongoose.Types.ObjectId(groupId),
        studentId: { $in: resolvedIds.map(rid => new mongoose.Types.ObjectId(rid)) },
        membershipStatus: 'active',
      }).select('studentId').lean();
      const existingSet = new Set(existingMemberships.map(m => String(m.studentId)));
      const newCount = resolvedIds.filter(rid => !existingSet.has(rid)).length;
      return res.json({
        dryRun: true,
        requested: normalizedIds.length,
        resolved: resolvedIds.length,
        unresolved: unresolvedCount,
        alreadyMembers: existingSet.size,
        newMembers: newCount,
      });
    }

    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const adminId = adminUser?.['_id'] as string | undefined;
    const result = await groupMembershipService.bulkAddMembers(
      groupId,
      resolvedIds,
      adminId,
      'Added via group member management'
    );
    res.json({
      message: `Added ${result.added} members`,
      added: result.added,
      skipped: result.skipped,
      requested: normalizedIds.length,
      resolved: resolvedIds.length,
      unresolved: unresolvedCount,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/student-groups/:id/members/remove', ...adminAuth, requirePermission('students_groups', 'edit'), async (req: Request, res: Response) => {
  try {
    const { studentIds } = req.body as { studentIds: string[] };
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array required' });
    }
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const adminId = adminUser?.['_id'] as string | undefined;
    const result = await groupMembershipService.bulkRemoveMembers(
      String(req.params.id),
      studentIds.filter(id => mongoose.Types.ObjectId.isValid(id)),
      adminId,
      'Removed via group member management'
    );
    res.json({ message: `Removed ${result.removed} members`, removed: result.removed });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/student-groups/:id/members/export', ...adminAuth, requirePermission('students_groups', 'export'), requireSensitiveExport('students_groups', 'student_group_members_export', true), trackSensitiveExport({ moduleName: 'students_groups', actionName: 'student_group_members_export', targetType: 'student_group', targetParam: 'id' }), async (req: Request, res: Response) => {
  try {
    const format = String(req.query['format'] ?? req.query['type'] ?? 'csv').trim().toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
    const categoryParam = req.query['category'] ? String(req.query['category']).trim().toLowerCase() : undefined;

    // Validate category if provided
    if (categoryParam && !VALID_EXPORT_CATEGORIES.includes(categoryParam as ExportCategory)) {
      return res.status(400).json({
        message: `Invalid export category "${categoryParam}". Valid categories: ${VALID_EXPORT_CATEGORIES.join(', ')}`,
      });
    }
    const category = categoryParam as ExportCategory | undefined;

    const groupId = new mongoose.Types.ObjectId(String(req.params.id));

    // Fetch group for slug-based filename
    const group = await StudentGroup.findById(groupId).select('slug name').lean();
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const memberships = await GroupMembership.find({ groupId, membershipStatus: 'active' })
      .select('studentId joinedAtUTC membershipStatus note')
      .lean();

    if (memberships.length === 0) {
      return res.status(404).json({ message: 'No active members found for this group' });
    }

    const memberIds = memberships.map((m) => m.studentId);
    const [users, profiles] = await Promise.all([
      User.find({ _id: { $in: memberIds } }).select('full_name email phone_number status createdAt').lean(),
      StudentProfile.find({ user_id: { $in: memberIds } })
        .select('user_id full_name email phone_number department ssc_batch hsc_batch guardian_name guardian_phone roll_number')
        .lean(),
    ]);
    const profileMap = new Map(profiles.map(p => [p.user_id.toString(), p]));
    const membershipMap = new Map(memberships.map(m => [m.studentId.toString(), m]));

    const { columns, extract } = buildCategoryColumnDef(category);
    const rows = users.map(u => {
      const prof = (profileMap.get(u._id.toString()) ?? {}) as Record<string, unknown>;
      const mem = membershipMap.get(u._id.toString()) as Record<string, unknown> | undefined;
      return extract(prof, u as unknown as Record<string, unknown>, mem);
    });

    const filename = generateExportFilename(group.slug, category, format);

    if (format === 'xlsx') {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Members');
      ws.addRow(columns).eachCell(cell => { cell.font = { bold: true }; });
      rows.forEach(r => ws.addRow(r));
      columns.forEach((_, i) => { const col = ws.getColumn(i + 1); col.width = 18; });
      const buf = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(Buffer.from(buf as ArrayBuffer));
    } else {
      const escCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const csv = [columns.join(','), ...rows.map(r => r.map(escCsv).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: `Export failed: ${message}` });
  }
});

// Membership import template XLSX download
router.get('/student-groups/members/template', ...adminAuth, async (_req: Request, res: Response) => {
  try {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Import Template');
    const headerRow = ws.addRow(['Email', 'Phone Number', 'Student ID (optional)']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    });
    ws.addRow(['student@example.com', '01700000000', '']);
    ws.addRow(['another@example.com', '01800000000', '']);
    ws.getColumn(1).width = 30;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 28;
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="group_members_import_template.xlsx"');
    res.send(Buffer.from(buf as ArrayBuffer));
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// Membership import preview — upload file, match students by email/phone/ID
// Returns each row categorized as new | existing | not_found | duplicate with color-coded status
router.post('/student-groups/:id/members/import/preview', ...adminAuth, requirePermission('students_groups', 'edit'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file is required' });
    const groupId = new mongoose.Types.ObjectId(req.params.id as string);

    const { rows: rawRows } = await parseFileBuffer(req.file.buffer, req.file.mimetype);

    // Resolve column mapping (flexible header aliasing)
    const emailAliases = ['email', 'e-mail', 'email address', 'student email', 'ইমেইল'];
    const phoneAliases = ['phone', 'phone number', 'phone_number', 'mobile', 'cell', 'ফোন'];
    const idAliases = ['student id', 'studentid', 'student_id', 'id', '_id', 'user id', 'userid'];

    const findCol = (aliases: string[], cols: string[]): string | null => {
      for (const a of aliases) {
        const found = cols.find(c => c.toLowerCase().trim() === a);
        if (found) return found;
      }
      return null;
    };
    const cols = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const emailCol = findCol(emailAliases, cols);
    const phoneCol = findCol(phoneAliases, cols);
    const idCol = findCol(idAliases, cols);

    if (!emailCol && !phoneCol && !idCol) {
      return res.status(400).json({ message: 'File must contain at least one of: Email, Phone Number, or Student ID columns' });
    }

    // Existing members set
    const existingMemberships = await GroupMembership.find({ groupId, membershipStatus: 'active' }).select('studentId').lean();
    const existingSet = new Set(existingMemberships.map(m => m.studentId.toString()));

    // Track seen student IDs for duplicate detection within the file
    const seenStudentIds = new Map<string, number>(); // studentId -> first row number

    type RowStatus = 'new' | 'existing' | 'not_found' | 'duplicate';
    const statusColors: Record<RowStatus, string> = {
      new: '#22c55e',       // green
      existing: '#3b82f6',  // blue
      not_found: '#ef4444', // red
      duplicate: '#f59e0b', // amber
    };

    const rows: {
      row: number;
      email?: string;
      phone?: string;
      studentId?: string;
      fullName?: string;
      status: RowStatus;
      statusColor: string;
      reason?: string;
    }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      const email = emailCol ? String(r[emailCol] ?? '').trim().toLowerCase() : '';
      const phone = phoneCol ? String(r[phoneCol] ?? '').trim() : '';
      const rawId = idCol ? String(r[idCol] ?? '').trim() : '';
      const rowNum = i + 2; // 1-indexed, skip header row

      let user: Record<string, unknown> | null = null;

      // Try ID first, then email, then phone
      if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
        user = await User.findById(rawId).select('_id full_name').lean() as Record<string, unknown> | null;
      }
      if (!user && email) {
        user = await User.findOne({ email, role: 'student' }).select('_id full_name').lean() as Record<string, unknown> | null;
      }
      if (!user && phone) {
        user = await User.findOne({ phone_number: phone, role: 'student' }).select('_id full_name').lean() as Record<string, unknown> | null;
      }

      if (!user) {
        rows.push({
          row: rowNum,
          email: email || undefined,
          phone: phone || undefined,
          status: 'not_found',
          statusColor: statusColors.not_found,
          reason: 'No matching student found',
        });
        continue;
      }

      const sid = String((user as Record<string, unknown>)._id);
      const fullName = (user.full_name as string) || '';

      // Check for duplicate within the file
      if (seenStudentIds.has(sid)) {
        rows.push({
          row: rowNum,
          email: email || undefined,
          phone: phone || undefined,
          studentId: sid,
          fullName,
          status: 'duplicate',
          statusColor: statusColors.duplicate,
          reason: `Duplicate of row ${seenStudentIds.get(sid)}`,
        });
        continue;
      }

      seenStudentIds.set(sid, rowNum);

      const status: RowStatus = existingSet.has(sid) ? 'existing' : 'new';
      rows.push({
        row: rowNum,
        email: email || undefined,
        phone: phone || undefined,
        studentId: sid,
        fullName,
        status,
        statusColor: statusColors[status],
      });
    }

    const newCount = rows.filter(r => r.status === 'new').length;
    const existingCount = rows.filter(r => r.status === 'existing').length;
    const notFoundCount = rows.filter(r => r.status === 'not_found').length;
    const duplicateCount = rows.filter(r => r.status === 'duplicate').length;

    // Backward-compatible matched/unmatched arrays
    const matched = rows.filter(r => r.status === 'new' || r.status === 'existing');
    const unmatched = rows.filter(r => r.status === 'not_found');

    res.json({
      totalRows: rawRows.length,
      rows,
      matched,
      unmatched,
      summary: {
        total: rawRows.length,
        newCount,
        existingCount,
        notFoundCount,
        duplicateCount,
        // Backward-compatible fields
        newMembers: newCount,
        alreadyMembers: existingCount,
        notFound: notFoundCount,
      },
      warningCount: notFoundCount,
      canProceed: newCount > 0,
      statusColors,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// Membership import commit — add matched students to group
router.post('/student-groups/:id/members/import/commit', ...adminAuth, requirePermission('students_groups', 'edit'), async (req: Request, res: Response) => {
  try {
    const { studentIds } = req.body as { studentIds: string[] };
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array required' });
    }
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const adminId = adminUser?.['_id'] as string | undefined;
    const validIds = studentIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const result = await groupMembershipService.bulkAddMembers(
      String(req.params.id),
      validIds,
      adminId,
      'Added via file import'
    );
    res.json({ message: `Imported ${result.added} members`, added: result.added, skipped: result.skipped, errors: result.errors });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// Group members list (paginated, with profile data)
router.get('/student-groups/:id/members', ...adminAuth, requirePermission('students_groups', 'view'), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', q } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const groupId = new mongoose.Types.ObjectId(req.params.id as string);

    const memberships = await GroupMembership.find({ groupId, membershipStatus: 'active' })
      .sort({ joinedAtUTC: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select('studentId joinedAtUTC addedByAdminId note')
      .lean();
    const total = await GroupMembership.countDocuments({ groupId, membershipStatus: 'active' });
    const studentIds = memberships.map(m => m.studentId);

    let profileQuery: Record<string, unknown> = { user_id: { $in: studentIds } };
    if (q) {
      profileQuery = {
        ...profileQuery,
        $or: [
          { full_name: new RegExp(String(q), 'i') },
          { email: new RegExp(String(q), 'i') },
          { phone_number: new RegExp(String(q), 'i') },
        ],
      };
    }
    const profiles = await StudentProfile.find(profileQuery)
      .select('user_id full_name email phone_number ssc_batch hsc_batch department')
      .lean();
    const users = await User.find({ _id: { $in: studentIds } })
      .select('_id status subscription')
      .lean();

    const profileMap = new Map(profiles.map(p => [p.user_id.toString(), p]));
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const data = memberships.map(m => {
      const sid = m.studentId.toString();
      const prof = profileMap.get(sid);
      const usr = userMap.get(sid);
      return {
        studentId: sid,
        fullName: prof?.full_name || '',
        email: prof?.email || '',
        phone: prof?.phone_number || '',
        batch: prof?.hsc_batch || '',
        department: prof?.department || '',
        status: (usr as Record<string, unknown>)?.status || '',
        subscription: (usr as Record<string, unknown>)?.subscription || null,
        joinedAtUTC: m.joinedAtUTC,
        note: m.note || '',
      };
    });

    res.json({ data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// Group detail metrics
router.get('/student-groups/:id/metrics', ...adminAuth, requirePermission('students_groups', 'view'), async (req: Request, res: Response) => {
  try {
    const groupId = new mongoose.Types.ObjectId(req.params.id as string);
    const memberships = await GroupMembership.find({ groupId, membershipStatus: 'active' }).select('studentId').lean();
    const memberIds = memberships.map(m => m.studentId);

    const [users, activeMembers, examScoreAgg, campaignReachAgg] = await Promise.all([
      User.find({ _id: { $in: memberIds } }).select('status').lean(),
      User.countDocuments({ _id: { $in: memberIds }, status: 'active' }),
      // Average exam score for group members
      memberIds.length > 0
        ? ExamResult.aggregate([
          { $match: { student: { $in: memberIds } } },
          { $group: { _id: null, avgScore: { $avg: '$percentage' } } },
        ])
        : Promise.resolve([]),
      // Campaign reach: sum sentCount for campaigns targeting this group
      NotificationJob.aggregate([
        { $match: { targetGroupId: groupId, isTestSend: { $ne: true } } },
        { $group: { _id: null, totalReach: { $sum: '$sentCount' } } },
      ]),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const u of users) {
      const s = (u as unknown as Record<string, unknown>).status as string || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const avgExamScore = examScoreAgg.length > 0 && examScoreAgg[0].avgScore != null
      ? Math.round(examScoreAgg[0].avgScore * 100) / 100
      : null;
    const campaignReach = campaignReachAgg.length > 0 ? campaignReachAgg[0].totalReach : 0;

    res.json({
      totalMembers: memberIds.length,
      activeMembers,
      avgExamScore,
      campaignReach,
      activeMembersWithSubscription: statusCounts['active'] ?? 0,
      membersByStatus: statusCounts,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// Move members between groups
router.post('/student-groups/:id/members/move', ...adminAuth, requirePermission('students_groups', 'edit'), async (req: Request, res: Response) => {
  try {
    const { studentIds, targetGroupId } = req.body as { studentIds: string[]; targetGroupId: string };
    if (!Array.isArray(studentIds) || !targetGroupId) {
      return res.status(400).json({ message: 'studentIds array and targetGroupId required' });
    }
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const adminId = adminUser?.['_id'] as string | undefined;
    const result = await groupMembershipService.moveMembers(
      String(req.params.id),
      targetGroupId,
      studentIds.filter(id => mongoose.Types.ObjectId.isValid(id)),
      adminId,
      'Moved via group management'
    );
    res.json({ message: `Moved ${result.added} members`, ...result });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// Dynamic rule preview — evaluate rules and return estimated count + sample profiles
router.post('/student-groups/:id/rules/preview', ...adminAuth, requirePermission('students_groups', 'edit'), async (req: Request, res: Response) => {
  try {
    const rules = req.body as DynamicRuleSet;
    if (!rules || typeof rules !== 'object') {
      return res.status(400).json({ message: 'Request body must contain a valid rules object' });
    }
    const validation = validateRules(rules);
    if (!validation.valid) {
      return res.status(400).json({ message: 'Invalid dynamic rules', errors: validation.errors });
    }
    const result = await evaluateRules(rules);
    res.json({ estimatedCount: result.matchedCount, sampleProfiles: result.sampleProfiles });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// Dynamic group refresh — re-evaluate rules and sync memberships
router.post('/student-groups/:id/rules/refresh', ...adminAuth, requirePermission('students_groups', 'edit'), async (req: Request, res: Response) => {
  try {
    const result = await refreshDynamicGroup(String(req.params.id));
    res.json({ message: 'Dynamic group refreshed', added: result.added, removed: result.removed });
  } catch (err) {
    const message = String(err);
    if (message.includes('not found') || message.includes('not a dynamic group') || message.includes('no rules defined')) {
      return res.status(400).json({ message });
    }
    res.status(500).json({ message });
  }
});

// Delete safety check
router.get('/student-groups/:id/can-delete', ...adminAuth, requirePermission('students_groups', 'delete'), requireDestructiveStepUp('students_groups', 'student_group_delete'), async (req: Request, res: Response) => {
  try {
    const result = await deleteSafetyService.canDeleteGroup(String(req.params.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// STUDENT CONTACT TIMELINE (CRM)
// ============================================================================

router.get('/student-contact-timeline/:studentId', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const entries = await StudentContactTimeline.find({ studentId: req.params.studentId })
      .sort({ createdAt: -1 })
      .populate('createdByAdminId', 'full_name username')
      .lean();
    res.json({ data: entries });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/student-contact-timeline/:studentId', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { type, content, linkedId } = req.body;
    if (!type || !content) return res.status(400).json({ message: 'type and content required' });
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const entry = await StudentContactTimeline.create({
      studentId: new mongoose.Types.ObjectId(req.params.studentId as string),
      type,
      content: String(content).slice(0, 2000),
      linkedId: linkedId ? new mongoose.Types.ObjectId(linkedId) : undefined,
      createdByAdminId: adminUser?.['_id'],
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.delete('/student-contact-timeline/:studentId/:entryId', ...adminAuth, requireDestructiveStepUp('students_groups', 'student_contact_timeline_delete'), async (req: Request, res: Response) => {
  try {
    const entry = await StudentContactTimeline.findOneAndDelete({
      _id: req.params.entryId,
      studentId: req.params.studentId,
    }).lean();
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// SUBSCRIPTIONS V2
// ============================================================================

router.get('/subscriptions-v2', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20', q } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const query: Record<string, unknown> = {};
    if (status) query['status'] = status;

    if (q) {
      const users = await User.find({
        $or: [
          { full_name: new RegExp(q, 'i') },
          { email: new RegExp(q, 'i') },
          { phone_number: new RegExp(q, 'i') },
        ],
      }).select('_id').lean();
      query['userId'] = { $in: users.map((u) => u._id) };
    }

    const [subs, total] = await Promise.all([
      UserSubscription.find(query)
        .populate('userId', 'full_name email phone_number status')
        .populate('planId', 'name code priceBDT')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      UserSubscription.countDocuments(query),
    ]);

    res.json({ data: subs, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/subscriptions-v2/users/:studentId/assign', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { planId, startDate, notes, paymentAmount, paymentMethod, paymentStatus, recordPayment, dueDateUTC } = req.body;
    if (!planId) return res.status(400).json({ message: 'planId required' });
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;

    const assignment = await assignSubscriptionLifecycle({
      userId: String(req.params.studentId),
      planId: String(planId),
      actorId: String(adminUser?.['_id'] || ''),
      startAtUTC: startDate,
      paymentAmount,
      paymentMethod,
      paymentStatus,
      recordPayment,
      dueDateUTC,
      notes,
    });

    res.status(201).json({
      message: assignment.subscription.status === 'active' ? 'Subscription assigned' : 'Subscription created in pending state',
      subscription: assignment.subscription,
      payment: assignment.payment,
      invoice: assignment.invoice,
      cache: assignment.cache,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/subscriptions-v2/users/:studentId/extend', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { days, notes } = req.body as { days: number; notes?: string };
    if (!days || isNaN(Number(days))) return res.status(400).json({ message: 'days (number) required' });
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const result = await extendSubscriptionForUser(String(req.params.studentId), Number(days), String(adminUser?.['_id'] || ''), notes);
    res.json({ message: `Extended by ${days} days`, newExpiry: result.subscription.expiresAtUTC, sub: result.subscription });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/subscriptions-v2/users/:studentId/expire-now', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const result = await expireSubscriptionForUser(String(req.params.studentId), String(adminUser?.['_id'] || ''), 'Expired from student management');
    res.json({ message: 'Subscription expired immediately', subscription: result.subscription });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/subscriptions-v2/users/:studentId/toggle-auto-renew', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const sub = await toggleAutoRenewForUser(String(req.params.studentId));
    res.json({ message: `Auto-renew ${sub.autoRenewEnabled ? 'enabled' : 'disabled'}`, autoRenewEnabled: sub.autoRenewEnabled });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// NOTIFICATION PROVIDERS
// ============================================================================

router.get('/notification-providers', ...notificationAdminAuth, async (_req: Request, res: Response) => {
  try {
    const providers = await NotificationProvider.find().select('-credentialsEncrypted').lean();
    res.json({ data: providers });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/notification-providers', ...notificationAdminAuth, requireSensitiveAction({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_create' }), async (req: Request, res: Response) => {
  try {
    const { type, provider, displayName, credentials, senderConfig, rateLimit, isEnabled } = req.body;
    if (!type || !provider || !displayName || !credentials) {
      return res.status(400).json({ message: 'type, provider, displayName, credentials required' });
    }
    const credentialsEncrypted = encrypt(JSON.stringify(credentials));
    const doc = await NotificationProvider.create({
      type, provider, displayName,
      credentialsEncrypted,
      senderConfig: senderConfig ?? {},
      rateLimit: rateLimit ?? { perMinute: 30, perDay: 1000 },
      isEnabled: isEnabled !== false,
    });
    const safe = doc.toObject() as unknown as Record<string, unknown>;
    delete safe['credentialsEncrypted'];
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/notification-providers/:id', ...notificationAdminAuth, async (req: Request, res: Response) => {
  try {
    const doc = await NotificationProvider.findById(req.params.id).select('-credentialsEncrypted').lean();
    if (!doc) return res.status(404).json({ message: 'Provider not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.put('/notification-providers/:id', ...notificationAdminAuth, requireSensitiveAction({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_update' }), async (req: Request, res: Response) => {
  try {
    const { displayName, credentials, senderConfig, rateLimit, isEnabled } = req.body;
    const update: Record<string, unknown> = {};
    if (displayName !== undefined) update['displayName'] = displayName;
    if (senderConfig !== undefined) update['senderConfig'] = senderConfig;
    if (rateLimit !== undefined) update['rateLimit'] = rateLimit;
    if (isEnabled !== undefined) update['isEnabled'] = isEnabled;
    if (credentials !== undefined) update['credentialsEncrypted'] = encrypt(JSON.stringify(credentials));
    const doc = await NotificationProvider.findByIdAndUpdate(
      req.params.id, { $set: update }, { new: true },
    ).select('-credentialsEncrypted').lean();
    if (!doc) return res.status(404).json({ message: 'Provider not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.delete('/notification-providers/:id', ...notificationAdminAuth, requireSensitiveAction({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_delete' }), async (req: Request, res: Response) => {
  try {
    const doc = await NotificationProvider.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Provider not found' });
    res.json({ message: 'Provider deleted' });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/notification-providers/:id/test-send', ...notificationAdminAuth, requireSensitiveAction({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_test_send' }), async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });
    const provider = await NotificationProvider.findById(req.params.id).select('+credentialsEncrypted').lean();
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    const result = await sendNotificationToStudent(
      studentId,
      'SUB_EXPIRY_7D',
      (provider as Record<string, unknown>)['type'] as 'sms' | 'email',
      { expiry_date: new Date().toISOString().split('T')[0], plan_name: 'Test' },
    );
    res.json({ result });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

router.get('/notification-templates', ...notificationAdminAuth, async (_req: Request, res: Response) => {
  try {
    const templates = await NotificationTemplate.find().sort({ key: 1 }).lean();
    res.json({ data: templates });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/notification-templates', ...notificationAdminAuth, async (req: Request, res: Response) => {
  try {
    const { key, channel, subject, body, placeholdersAllowed, isEnabled } = req.body;
    if (!key || !channel || !body) {
      return res.status(400).json({ message: 'key, channel, body required' });
    }
    const template = await NotificationTemplate.create({
      key: String(key).toUpperCase(),
      channel, subject: subject ?? '', body,
      placeholdersAllowed: placeholdersAllowed ?? [],
      isEnabled: isEnabled !== false,
    });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/notification-templates/:id', ...notificationAdminAuth, async (req: Request, res: Response) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.put('/notification-templates/:id', ...notificationAdminAuth, requireDestructiveStepUp('notification_center', 'template_update'), async (req: Request, res: Response) => {
  try {
    const { subject, body, placeholdersAllowed, isEnabled } = req.body;
    const update: Record<string, unknown> = {};
    if (subject !== undefined) update['subject'] = subject;
    if (body !== undefined) update['body'] = body;
    if (placeholdersAllowed !== undefined) update['placeholdersAllowed'] = placeholdersAllowed;
    if (isEnabled !== undefined) update['isEnabled'] = isEnabled;
    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id, { $set: update }, { new: true },
    ).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.delete('/notification-templates/:id', ...notificationAdminAuth, requireDestructiveStepUp('notification_center', 'template_delete'), async (req: Request, res: Response) => {
  try {
    const template = await NotificationTemplate.findByIdAndDelete(req.params.id).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// NOTIFICATIONS V2 - SEND / JOBS / LOGS
// ============================================================================

router.post('/notifications-v2/send', ...notificationAdminAuth, async (req: Request, res: Response) => {
  try {
    const {
      channel, target, templateKey, payloadOverrides,
      targetStudentId, targetGroupId, targetStudentIds, targetFilterJson,
      scheduledAtUTC, customBody, customSubject, campaignName, guardianTargeted, recipientMode,
    } = req.body;

    if (!channel || !target || !templateKey) {
      return res.status(400).json({ message: 'channel, target, templateKey required' });
    }

    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const adminId = String(adminUser?.['_id'] || '');
    let totalTargets = 0;
    let audienceFilters: Record<string, unknown> | undefined;

    if (target === 'group' && targetGroupId) {
      const recipients = await resolveAudience('group', { groupId: String(targetGroupId) });
      totalTargets = recipients.length;
    } else if (target === 'single' && targetStudentId) {
      totalTargets = 1;
    } else if (target === 'selected' && Array.isArray(targetStudentIds)) {
      totalTargets = (targetStudentIds as string[]).filter((id) => mongoose.Types.ObjectId.isValid(id)).length;
    } else if (target === 'filter' && targetFilterJson) {
      try {
        const parsedFilters = JSON.parse(targetFilterJson as string) as Record<string, unknown>;
        audienceFilters = { ...parsedFilters };
        if (!audienceFilters.statuses && audienceFilters.status) {
          audienceFilters.statuses = [audienceFilters.status];
        }
        const recipients = await resolveAudience('filter', { filters: audienceFilters });
        totalTargets = recipients.length;
      } catch {
        return res.status(400).json({ message: 'Invalid targetFilterJson' });
      }
    }

    const result = await executeCampaign({
      campaignName: String(campaignName || templateKey),
      channels: channel === 'both' ? ['sms', 'email'] : [channel as 'sms' | 'email'],
      templateKey: String(templateKey).toUpperCase(),
      customBody: typeof customBody === 'string' ? customBody : undefined,
      customSubject: typeof customSubject === 'string' ? customSubject : undefined,
      vars: (payloadOverrides ?? {}) as Record<string, string>,
      audienceType: target === 'group' ? 'group' : target === 'filter' ? 'filter' : 'manual',
      audienceGroupId: target === 'group' ? String(targetGroupId || '') : undefined,
      audienceFilters,
      manualStudentIds: target === 'single'
        ? [String(targetStudentId || '')].filter(Boolean)
        : Array.isArray(targetStudentIds)
          ? (targetStudentIds as string[]).map((id) => String(id || '')).filter(Boolean)
          : undefined,
      guardianTargeted: Boolean(guardianTargeted),
      recipientMode: recipientMode === 'guardian' || recipientMode === 'both' ? recipientMode : 'student',
      scheduledAtUTC: scheduledAtUTC ? new Date(scheduledAtUTC as string) : undefined,
      adminId,
    });

    res.status(201).json({
      message: scheduledAtUTC ? 'Notification job scheduled' : 'Notification job queued or completed',
      jobId: result.jobId,
      totalTargets,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/notifications-v2/jobs', ...notificationAdminAuth, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const query: Record<string, unknown> = {};
    if (status) query['status'] = status;
    const [jobs, total] = await Promise.all([
      NotificationJob.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      NotificationJob.countDocuments(query),
    ]);
    res.json({ data: jobs, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/notifications-v2/jobs/:id', ...notificationAdminAuth, async (req: Request, res: Response) => {
  try {
    const job = await NotificationJob.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/notifications-v2/jobs/:id/retry-failed', ...notificationAdminAuth, async (req: Request, res: Response) => {
  try {
    const job = await NotificationJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!['failed', 'partial'].includes(job.status)) {
      return res.status(400).json({ message: 'Only failed or partial jobs can be retried' });
    }

    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const result = await retryFailedDeliveries(String(job._id), String(adminUser?.['_id'] || ''));
    res.json({ message: 'Retry complete', ...result });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.get('/notifications-v2/logs', ...notificationAdminAuth, async (req: Request, res: Response) => {
  try {
    const { jobId, studentId, status, page = '1', limit = '50' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const query: Record<string, unknown> = {};
    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) query['jobId'] = new mongoose.Types.ObjectId(jobId);
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) query['studentId'] = new mongoose.Types.ObjectId(studentId);
    if (status) query['status'] = status;
    const [logs, total] = await Promise.all([
      NotificationDeliveryLog.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      NotificationDeliveryLog.countDocuments(query),
    ]);
    res.json({ data: logs, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// STUDENT SETTINGS
// ============================================================================

router.get('/student-settings', ...adminAuth, async (_req: Request, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (StudentSettingsModel as any).getDefault();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.put('/student-settings', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const allowedFields = [
      'expiryReminderDays', 'autoExpireEnabled', 'passwordResetOnExpiry',
      'autoAlertTriggers', 'smsEnabled', 'emailEnabled',
      'quietHoursStart', 'quietHoursEnd', 'defaultSmsFromName', 'defaultEmailFromName',
    ];
    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    const settings = await StudentSettingsModel.findOneAndUpdate(
      { key: 'default' },
      { $set: update },
      { upsert: true, new: true },
    ).lean();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// AUDIENCE SEGMENTS (extends StudentGroup with type='audience')
// ============================================================================

router.get('/audience-segments', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { q, page = '1', limit = '50' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const query: Record<string, unknown> = { type: 'dynamic' };
    if (q) query['name'] = new RegExp(String(q), 'i');
    const [segments, total] = await Promise.all([
      StudentGroup.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      StudentGroup.countDocuments(query),
    ]);
    // Enrich with live preview count
    const enriched = await Promise.all(segments.map(async (seg) => {
      const count = await resolveAudienceCount(seg.rules);
      return { ...seg, liveCount: count };
    }));
    res.json({ data: enriched, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/audience-segments', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, rules } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });
    const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const count = await resolveAudienceCount(rules);
    const segment = await StudentGroup.create({
      name, slug, description,
      type: 'dynamic',
      rules: rules || {},
      isActive: true,
      createdByAdminId: adminUser?.['_id'],
      memberCountCached: count,
    });
    res.status(201).json({ ...segment.toObject(), liveCount: count });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.post('/audience-segments/preview', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { rules } = req.body;
    const count = await resolveAudienceCount(rules);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

router.delete('/audience-segments/:id', ...adminAuth, requireDestructiveStepUp('students_groups', 'audience_segment_delete'), async (req: Request, res: Response) => {
  try {
    const segment = await StudentGroup.findOneAndDelete({ _id: req.params.id, type: 'dynamic' }).lean();
    if (!segment) return res.status(404).json({ message: 'Segment not found' });
    res.json({ message: 'Segment deleted' });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// FINANCE ADJUSTMENT (Admin adds manual finance entries for a student)
// ============================================================================

router.post('/students-v2/:id/finance-adjustment', ...adminAuth, requireDestructiveStepUp('payments', 'student_finance_adjustment'), async (req: Request, res: Response) => {
  try {
    const { amount, direction, description, method, categoryLabel } = req.body;
    if (!amount || !direction || !description) {
      return res.status(400).json({ message: 'amount, direction, description required' });
    }
    const adminUser = (req as unknown as Record<string, unknown>)['user'] as Record<string, unknown> | undefined;
    const studentId = new mongoose.Types.ObjectId(req.params.id as string);

    const txnCode = `ADJ-${Date.now().toString(36).toUpperCase()}`;
    const txn = await FinanceTransaction.create({
      txnCode,
      direction: direction === 'income' ? 'income' : 'expense',
      amount: Math.abs(Number(amount)),
      currency: 'BDT',
      dateUTC: new Date(),
      accountCode: direction === 'income' ? 'STU-INC' : 'STU-EXP',
      categoryLabel: categoryLabel || 'Manual Adjustment',
      description: String(description).slice(0, 500),
      status: 'approved',
      method: method || 'manual',
      sourceType: direction === 'income' ? 'manual_income' : 'expense',
      sourceId: req.params.id,
      studentId,
      createdByAdminId: adminUser?.['_id'] as mongoose.Types.ObjectId,
    });

    // Update due ledger
    const ledger = await StudentDueLedger.findOne({ studentId });
    if (ledger) {
      ledger.manualAdjustment += direction === 'income' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
      ledger.netDue = ledger.computedDue + ledger.manualAdjustment - ledger.waiverAmount;
      ledger.lastComputedAt = new Date();
      ledger.updatedBy = adminUser?.['_id'] as mongoose.Types.ObjectId;
      await ledger.save();
    }

    // Timeline entry
    await StudentContactTimeline.create({
      studentId,
      type: 'payment_note',
      content: `Finance adjustment: ${direction} ৳${Math.abs(Number(amount))} — ${description}`,
      sourceType: 'system',
      createdByAdminId: adminUser?.['_id'],
      metadata: { txnId: txn._id, txnCode },
    });

    res.status(201).json(txn);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// STUDENT PAYMENT HISTORY
// ============================================================================

router.get('/students-v2/:id/payments', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.id || '');
    const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
      ? new mongoose.Types.ObjectId(studentId)
      : null;

    const [legacyPayments, manualPayments, ledger] = await Promise.all([
      PaymentModel.find({ userId: studentId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      studentObjectId
        ? ManualPayment.find({ studentId: studentObjectId })
          .sort({ date: -1, createdAt: -1 })
          .limit(100)
          .lean()
        : Promise.resolve([]),
      StudentDueLedger.findOne({ studentId }).lean(),
    ]);

    const payments = [
      ...legacyPayments.map((payment) => ({
        _id: String(payment._id),
        amountBDT: Number(payment.amountBDT) || 0,
        method: String(payment.method || 'manual'),
        status: String(payment.status || 'pending'),
        date: payment.paidAt || payment.createdAt,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt || null,
        source: 'legacy',
        entryType: payment.examId ? 'exam_fee' : 'legacy_payment',
      })),
      ...manualPayments.map((payment) => ({
        _id: String(payment._id),
        amountBDT: Number(payment.amount) || 0,
        method: String(payment.method || 'manual'),
        status: String(payment.status || 'pending'),
        date: payment.date || payment.createdAt,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt || null,
        source: 'manual',
        entryType: payment.entryType || 'manual_payment',
      })),
    ].sort((a, b) => {
      const aTime = new Date(String(a.date || a.createdAt || 0)).getTime();
      const bTime = new Date(String(b.date || b.createdAt || 0)).getTime();
      return bTime - aTime;
    });

    const dueLedger = ledger || null;
    const totals = {
      totalPaid: payments
        .filter((payment) => payment.status === 'paid')
        .reduce((sum, payment) => sum + payment.amountBDT, 0),
      pendingCount: payments.filter((payment) => payment.status === 'pending').length,
    };

    res.json({
      payments,
      ledger: dueLedger,
      dueLedger,
      totals,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// STUDENT FINANCE STATEMENT
// ============================================================================

router.get('/students-v2/:id/finance-statement', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.id || '');
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const transactions = await FinanceTransaction.find({
      studentId: studentObjectId,
      isDeleted: false,
    }).sort({ dateUTC: -1 }).limit(200).lean();

    const totals = await FinanceTransaction.aggregate([
      { $match: { studentId: studentObjectId, isDeleted: false } },
      {
        $group: {
          _id: '$direction',
          total: { $sum: '$amount' },
        }
      },
    ]);
    const income = totals.find((t) => t._id === 'income')?.total ?? 0;
    const expense = totals.find((t) => t._id === 'expense')?.total ?? 0;
    const dueLedger = await StudentDueLedger.findOne({ studentId }).lean();

    res.json({
      transactions: transactions.map((transaction) => ({
        _id: String(transaction._id),
        txnCode: transaction.txnCode,
        direction: transaction.direction,
        amount: transaction.amount,
        description: transaction.description ?? '',
        status: transaction.status,
        dateUTC: transaction.dateUTC,
      })),
      totals: {
        income,
        expense,
      },
      totalIncome: income,
      totalExpenses: expense,
      net: income - expense,
      dueLedger: dueLedger || null,
    });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// IMPORT / EXPORT LOGS
// ============================================================================

router.get('/import-export-logs', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { direction, category, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const query: Record<string, unknown> = {};
    if (direction) query['direction'] = direction;
    if (category) query['category'] = category;
    const [logs, total] = await Promise.all([
      ImportExportLog.find(query)
        .populate('performedBy', 'full_name username')
        .sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      ImportExportLog.countDocuments(query),
    ]);
    res.json({ data: logs, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// ADMIN APPROVAL POST ENDPOINTS — Registration & Profile Change Approvals
// Requirements: 5.3, 5.4, 10.3
// ============================================================================

// POST /students-v2/approve-registration/:id — approve pending student
router.post('/students-v2/approve-registration/:id', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    await approveNewStudent(String(req.params.id), String(adminUser._id));
    res.json({ message: 'Student approved successfully.' });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg === 'User not found') return res.status(404).json({ message: msg });
    if (msg.includes('not in pending status')) return res.status(400).json({ message: msg });
    res.status(500).json({ message: msg });
  }
});

// POST /students-v2/reject-registration/:id — reject pending student with reason
router.post('/students-v2/reject-registration/:id', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ message: 'A rejection reason is required.' });
    }
    const adminUser = (req as any).user;
    await rejectNewStudent(String(req.params.id), String(adminUser._id), reason.trim());
    res.json({ message: 'Student rejected successfully.' });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg === 'User not found') return res.status(404).json({ message: msg });
    if (msg.includes('not in pending status')) return res.status(400).json({ message: msg });
    res.status(500).json({ message: msg });
  }
});

// POST /students-v2/bulk-approve-registrations — bulk approve/reject
router.post('/students-v2/bulk-approve-registrations', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { userIds, action, reason } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'At least one student ID is required.' });
    }
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject".' });
    }
    if (action === 'reject' && (!reason || typeof reason !== 'string' || !reason.trim())) {
      return res.status(400).json({ message: 'A rejection reason is required for bulk reject.' });
    }
    const adminUser = (req as any).user;
    const result = await bulkApproveRejectStudents({
      userIds,
      adminId: String(adminUser._id),
      action,
      reason: reason?.trim(),
    });
    res.json({ message: 'Bulk operation completed.', ...result });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// PROFILE CHANGE REQUEST REVIEW POST ENDPOINT
// Requirements: 7.3, 7.4, 7.5
// ============================================================================

// POST /students-v2/profile-requests/:id/review — approve or reject with feedback
router.post('/students-v2/profile-requests/:id/review', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { action, feedback } = req.body;
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject".' });
    }
    if (action === 'reject' && (!feedback || typeof feedback !== 'string' || !feedback.trim())) {
      return res.status(400).json({ message: 'Feedback is required when rejecting a profile change request.' });
    }
    const adminUser = (req as any).user;
    await reviewProfileChangeRequest({
      requestId: String(req.params.id),
      adminId: String(adminUser._id),
      action,
      feedback: feedback?.trim(),
    });
    res.json({ message: `Profile change request ${action}d successfully.` });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('not found')) return res.status(404).json({ message: msg });
    if (msg.includes('already been reviewed')) return res.status(400).json({ message: msg });
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// VERIFICATION RESET & SETTINGS TOGGLE ENDPOINTS
// Requirements: 10.5, 10.6
// ============================================================================

// POST /students-v2/:id/reset-verification — reset phoneVerifiedAt or emailVerifiedAt to null
router.post('/students-v2/:id/reset-verification', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    if (!type || !['phone', 'email'].includes(type)) {
      return res.status(400).json({ message: 'Type must be "phone" or "email".' });
    }
    const field = type === 'phone' ? 'phoneVerifiedAt' : 'emailVerifiedAt';
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { [field]: null } },
      { new: true },
    ).select('-password -twoFactorSecret').lean();
    if (!user) return res.status(404).json({ message: 'Student not found.' });
    res.json({ message: `${type} verification reset successfully.`, user });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// PUT /admin/settings/profile-approval — toggle profileApprovalEnabled setting
router.put('/settings/profile-approval', ...adminAuth, async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled must be a boolean.' });
    }
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: { profileApprovalEnabled: enabled } },
      { new: true, upsert: true },
    ).lean();
    res.json({ profileApprovalEnabled: settings?.profileApprovalEnabled ?? enabled });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// ============================================================================
// AUDIENCE RESOLUTION HELPER
// ============================================================================

async function resolveAudienceCount(rules?: Record<string, unknown>): Promise<number> {
  const userIds = await resolveSubscriptionContactUserIds(rules || {});
  return userIds.length;
}

export default router;




