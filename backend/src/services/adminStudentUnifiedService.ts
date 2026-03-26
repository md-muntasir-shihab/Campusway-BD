// ═══════════════════════════════════════════════════════════════════════════
// Admin Student Unified Detail — Aggregation Service
// Canonical read model combining all student-linked data for the 13-tab
// admin detail control center.
// ═══════════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import UserSubscription from '../models/UserSubscription';
import { PaymentModel } from '../models/payment.model';
import ManualPayment from '../models/ManualPayment';
import FinanceTransaction from '../models/FinanceTransaction';
import ExamResult from '../models/ExamResult';
import ExamProfileSyncLog from '../models/ExamProfileSyncLog';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog';
import SupportTicket from '../models/SupportTicket';
import StudentContactTimeline from '../models/StudentContactTimeline';
import GroupMembership from '../models/GroupMembership';
import StudentGroup from '../models/StudentGroup';
import StudentDueLedger from '../models/StudentDueLedger';
import type {
  AdminStudentUnifiedPayload,
  SubscriptionState,
  CommunicationEligibility,
  WeakTopicSeverity,
} from '../types/studentManagement';

/**
 * Fetch the full unified detail payload for a single student.
 * This is the canonical read model consumed by the admin detail page.
 */
export async function getUnifiedStudentDetail(
  studentId: string,
): Promise<AdminStudentUnifiedPayload | null> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return null;

  const user = await User.findById(studentId)
    .select('-password -twoFactorSecret')
    .lean();
  if (!user || user.role !== 'student') return null;

  // Parallel aggregation of all related data
    const [
        profile,
        activeSub,
    subHistory,
    legacyPayments,
    manualPayments,
    financeTxns,
        dueLedger,
        examResults,
        examSyncLogs,
        deliveryLogs,
    tickets,
    timelineEntries,
    groupMemberships,
    ] = await Promise.all([
    StudentProfile.findOne({ user_id: user._id }).lean(),
    UserSubscription.findOne({ userId: user._id, status: 'active' })
      .populate('planId', 'name code durationDays')
      .lean(),
    UserSubscription.find({ userId: user._id })
      .populate('planId', 'name code')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    PaymentModel.find({ userId: String(user._id) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    ManualPayment.find({ studentId: user._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(20)
      .lean(),
    FinanceTransaction.find({ studentId: user._id, isDeleted: { $ne: true } })
      .sort({ dateUTC: -1 })
      .limit(15)
      .lean(),
    StudentDueLedger.findOne({ studentId: user._id }).lean(),
    ExamResult.find({ student: user._id })
      .populate('exam', 'title deliveryMode')
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean(),
    ExamProfileSyncLog.find({ studentId: user._id })
      .populate('examId', 'title deliveryMode')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    NotificationDeliveryLog.find({ studentId: user._id })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    SupportTicket.find({ studentId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    StudentContactTimeline.find({ studentId: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('createdByAdminId', 'full_name')
      .lean(),
    GroupMembership.find({ studentId: user._id }).lean(),
  ]);

  // Resolve group details for memberships
  const groupIds = groupMemberships.map((m) => m.groupId);
  const groups = groupIds.length
    ? await StudentGroup.find({ _id: { $in: groupIds } }).select('name type').lean()
    : [];

  // ─── Build subscription section ────────────────────────────────────────
  const plan = activeSub?.planId as unknown as Record<string, unknown> | null;
  let subState: SubscriptionState = 'none';
  let daysRemaining: number | undefined;
  if (activeSub) {
    subState = 'active';
    const ms = new Date(activeSub.expiresAtUTC).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  } else if (subHistory.length > 0) {
    subState = 'expired';
  }

  // ─── Build payment section ─────────────────────────────────────────────
  const payments = [
    ...legacyPayments.map((payment) => {
      const row = payment as Record<string, unknown>;
      return {
        _id: String(row._id),
        amountBDT: Number(row.amountBDT) || 0,
        method: String(row.method || 'manual'),
        status: String(row.status || 'pending'),
        paidAt: row.paidAt ? new Date(String(row.paidAt)).toISOString() : undefined,
        createdAt: row.createdAt ? new Date(String(row.createdAt)).toISOString() : '',
      };
    }),
    ...manualPayments.map((payment) => {
      const row = payment as Record<string, unknown>;
      return {
        _id: String(row._id),
        amountBDT: Number(row.amount) || 0,
        method: String(row.method || 'manual'),
        status: String(row.status || 'pending'),
        paidAt: row.paidAt ? new Date(String(row.paidAt)).toISOString() : undefined,
        createdAt: row.createdAt
          ? new Date(String(row.createdAt)).toISOString()
          : (row.date ? new Date(String(row.date)).toISOString() : ''),
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountBDT, 0);
  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  // ─── Build finance section ─────────────────────────────────────────────
  const totalIncome = financeTxns
    .filter((t) => t.direction === 'income' && t.status !== 'cancelled')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalRefunds = financeTxns
    .filter((t) => t.status === 'refunded')
    .reduce((sum, t) => sum + t.amount, 0);

  // ─── Build communication section ──────────────────────────────────────
  let eligibility: CommunicationEligibility = 'eligible';
  if (user.status === 'blocked') eligibility = 'blocked';
  else if (!user.phone_number && !user.email) eligibility = 'no_phone';
  else if (!user.phone_number) eligibility = 'no_phone';
  else if (!user.email) eligibility = 'no_email';

  // ─── Assemble payload ─────────────────────────────────────────────────
  const payload: AdminStudentUnifiedPayload = {
    _id: String(user._id),
    full_name: user.full_name,
    username: user.username,
    email: user.email,
    phone_number: user.phone_number,
    profile_photo: user.profile_photo,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    lastLoginAtUTC: user.lastLoginAtUTC?.toISOString(),

    profile: profile
      ? {
          user_unique_id: (profile as Record<string, unknown>).user_unique_id as string | undefined,
          department: profile.department,
          gender: profile.gender,
          dob: profile.dob?.toISOString(),
          ssc_batch: profile.ssc_batch,
          hsc_batch: profile.hsc_batch,
          college_name: profile.college_name,
          college_address: profile.college_address,
          present_address: profile.present_address,
          permanent_address: profile.permanent_address,
          district: profile.district,
          country: profile.country,
          roll_number: profile.roll_number,
          registration_id: profile.registration_id,
          institution_name: profile.institution_name,
          profile_completion_percentage: profile.profile_completion_percentage ?? 0,
          points: profile.points ?? 0,
          rank: profile.rank,
        }
      : null,

    guardian: profile
      ? {
          guardian_name: profile.guardian_name,
          guardian_phone: profile.guardian_phone,
          guardian_email: profile.guardian_email,
          verificationStatus: profile.guardianPhoneVerificationStatus ?? 'unverified',
          verifiedAt: profile.guardianPhoneVerifiedAt?.toISOString(),
        }
      : null,

    subscription: {
      state: subState,
      planName: plan?.name as string | undefined,
      planCode: plan?.code as string | undefined,
      startDate: activeSub?.startAtUTC?.toISOString(),
      expiryDate: activeSub?.expiresAtUTC?.toISOString(),
      autoRenew: activeSub?.autoRenewEnabled ?? false,
      daysRemaining,
      assignedByAdmin: !!activeSub?.activatedByAdminId,
      history: subHistory.map((s) => {
        const p = s.planId as unknown as Record<string, unknown> | null;
        return {
          _id: String(s._id),
          planName: p?.name as string | undefined,
          status: s.status,
          startAtUTC: s.startAtUTC.toISOString(),
          expiresAtUTC: s.expiresAtUTC.toISOString(),
        };
      }),
    },

    payments: {
      totalPaid,
      pendingCount,
      recentPayments: payments.slice(0, 10),
    },

    finance: {
      totalIncome,
      totalRefunds,
      netDue: dueLedger?.netDue ?? 0,
      recentTransactions: financeTxns.slice(0, 10).map((t) => ({
        _id: String(t._id),
        txnCode: t.txnCode,
        direction: t.direction,
        amount: t.amount,
        description: t.description ?? '',
        status: t.status,
        dateUTC: t.dateUTC.toISOString(),
      })),
    },

    exams: {
      totalAttempted: examResults.length,
      upcomingCount: 0, // will be enriched in Phase 2
      identity: profile
        ? {
            serialId: (profile as Record<string, unknown>).examIdentity && typeof (profile as Record<string, unknown>).examIdentity === 'object'
              ? ((profile as Record<string, unknown>).examIdentity as Record<string, unknown>).serialId as string | undefined
              : undefined,
            rollNumber: (profile as Record<string, unknown>).examIdentity && typeof (profile as Record<string, unknown>).examIdentity === 'object'
              ? ((profile as Record<string, unknown>).examIdentity as Record<string, unknown>).rollNumber as string | undefined
              : undefined,
            registrationNumber: (profile as Record<string, unknown>).examIdentity && typeof (profile as Record<string, unknown>).examIdentity === 'object'
              ? ((profile as Record<string, unknown>).examIdentity as Record<string, unknown>).registrationNumber as string | undefined
              : undefined,
            admitCardNumber: (profile as Record<string, unknown>).examIdentity && typeof (profile as Record<string, unknown>).examIdentity === 'object'
              ? ((profile as Record<string, unknown>).examIdentity as Record<string, unknown>).admitCardNumber as string | undefined
              : undefined,
            examCenter: (profile as Record<string, unknown>).examIdentity && typeof (profile as Record<string, unknown>).examIdentity === 'object'
              ? ((profile as Record<string, unknown>).examIdentity as Record<string, unknown>).examCenter as string | undefined
              : undefined,
            latestResultSummary: (profile as Record<string, unknown>).latestExamResultSummary as string | undefined,
            lastSyncAt: profile.examDataLastSyncAt?.toISOString(),
            lastSyncSource: (profile as Record<string, unknown>).examDataLastSyncSource as string | undefined,
          }
        : undefined,
      recentResults: examResults.slice(0, 8).map((r) => {
        const exam = r.exam as unknown as Record<string, unknown> | null;
        return {
          _id: String(r._id),
          examTitle: exam?.title as string | undefined,
          percentage: r.percentage ?? 0,
          obtainedMarks: r.obtainedMarks ?? 0,
          totalMarks: r.totalMarks ?? 0,
          submittedAt: r.submittedAt?.toISOString() ?? '',
          status: r.status ?? 'submitted',
          source: (r as Record<string, unknown>).sourceType as string | undefined,
          examCenter: (r as Record<string, unknown>).examCenterName as string | undefined,
          syncStatus: (r as Record<string, unknown>).syncStatus as string | undefined,
        };
      }),
      syncHistory: examSyncLogs.slice(0, 8).map((log) => {
        const exam = log.examId as unknown as Record<string, unknown> | null;
        return {
          _id: String(log._id),
          examTitle: exam?.title as string | undefined,
          source: log.source,
          status: log.status,
          syncMode: log.syncMode,
          changedFields: log.changedFields || [],
          createdAt: log.createdAt.toISOString(),
        };
      }),
    },

    weakTopics: {
      count: 0,
      items: [], // populated after ExamResult aggregation in Phase 2
    },

    communication: {
      eligibility,
      totalSent: deliveryLogs.filter((l) => l.status === 'sent').length,
      lastSentAt: deliveryLogs.find((l) => l.status === 'sent')?.sentAtUTC?.toISOString(),
      recentLogs: deliveryLogs.slice(0, 10).map((l) => ({
        _id: String(l._id),
        channel: l.channel,
        status: l.status,
        to: l.to,
        sentAtUTC: l.sentAtUTC?.toISOString(),
        providerUsed: l.providerUsed ?? '',
      })),
    },

    crmTimeline: {
      totalEntries: timelineEntries.length,
      recentEntries: timelineEntries.slice(0, 15).map((e) => {
        const admin = e.createdByAdminId as unknown as Record<string, unknown> | null;
        return {
          _id: String(e._id),
          type: e.type,
          content: e.content,
          createdAt: e.createdAt.toISOString(),
          createdByAdmin: admin?.full_name as string | undefined,
        };
      }),
    },

    security: {
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      mustChangePassword: user.mustChangePassword ?? false,
      forcePasswordResetRequired: user.forcePasswordResetRequired ?? false,
      passwordLastChangedAt: user.passwordLastChangedAtUTC?.toISOString(),
      lastLoginAt: user.lastLoginAtUTC?.toISOString(),
      loginAttempts: user.loginAttempts ?? 0,
      lockUntil: user.lockUntil?.toISOString(),
      ip_address: user.ip_address,
      device_info: user.device_info,
      credentialsLastResentAt: user.credentialsLastResentAtUTC?.toISOString(),
    },

    support: {
      openTickets: tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
      totalTickets: tickets.length,
      recentTickets: tickets.slice(0, 5).map((t) => ({
        _id: String(t._id),
        ticketNo: t.ticketNo,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
      })),
    },

    groups: groups.map((g) => ({
      _id: String(g._id),
      name: g.name,
      type: g.type ?? 'manual',
    })),
  };

  return payload;
}
