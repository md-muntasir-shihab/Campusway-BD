// ═══════════════════════════════════════════════════════════════════════════
// Student Management OS — Domain Types & Enums
// Canonical type surface for the admin student management redesign.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Student Status ──────────────────────────────────────────────────────
export const STUDENT_STATUSES = ['active', 'suspended', 'blocked', 'pending'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

// ─── Subscription State ──────────────────────────────────────────────────
export const SUBSCRIPTION_STATES = ['active', 'expired', 'pending', 'suspended', 'none'] as const;
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

// ─── Payment Status ──────────────────────────────────────────────────────
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ─── Communication Eligibility ───────────────────────────────────────────
export const COMM_ELIGIBILITY = ['eligible', 'no_phone', 'no_email', 'opted_out', 'blocked'] as const;
export type CommunicationEligibility = (typeof COMM_ELIGIBILITY)[number];

// ─── Guardian Verification ───────────────────────────────────────────────
export const GUARDIAN_VERIFICATION = ['unverified', 'pending', 'verified'] as const;
export type GuardianVerificationStatus = (typeof GUARDIAN_VERIFICATION)[number];

// ─── Security Event Types ────────────────────────────────────────────────
export const SECURITY_EVENT_TYPES = [
  'password_set_by_admin', 'password_changed_by_user', 'force_reset_enabled',
  'force_reset_disabled', 'session_revoked', 'account_suspended',
  'account_activated', 'account_blocked', 'login_attempt_failed',
  'login_success', '2fa_enabled', '2fa_disabled', 'credentials_resent',
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

// ─── CRM Timeline Event Categories ──────────────────────────────────────
export const CRM_EVENT_CATEGORIES = [
  'note', 'call', 'message', 'email', 'sms',
  'subscription_assigned', 'subscription_expired', 'subscription_extended',
  'payment_verified', 'payment_rejected', 'payment_refunded',
  'exam_attempted', 'result_published', 'profile_updated',
  'guardian_updated', 'group_added', 'group_removed',
  'account_created', 'account_suspended', 'account_activated',
  'password_reset', 'credentials_sent', 'support_ticket',
  'import', 'system',
] as const;
export type CrmEventCategory = (typeof CRM_EVENT_CATEGORIES)[number];

// ─── Weak-Topic Severity ────────────────────────────────────────────────
export const WEAK_TOPIC_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
export type WeakTopicSeverity = (typeof WEAK_TOPIC_SEVERITY)[number];

// ─── Student Detail Tab IDs (13-tab contract) ───────────────────────────
export const STUDENT_DETAIL_TABS = [
  'overview', 'profile', 'guardian', 'subscription', 'payments',
  'finance', 'exams', 'results', 'weak-topics', 'communication',
  'crm-timeline', 'security', 'support',
] as const;
export type StudentDetailTab = (typeof STUDENT_DETAIL_TABS)[number];

// ─── Unified Admin Student Detail Payload ────────────────────────────────
export interface AdminStudentUnifiedPayload {
  // Identity
  _id: string;
  full_name: string;
  username: string;
  email: string;
  phone_number?: string;
  profile_photo?: string;
  role: string;
  status: StudentStatus;
  createdAt: string;
  lastLoginAtUTC?: string;

  // Profile
  profile: {
    user_unique_id?: string;
    department?: string;
    gender?: string;
    dob?: string;
    ssc_batch?: string;
    hsc_batch?: string;
    college_name?: string;
    college_address?: string;
    present_address?: string;
    permanent_address?: string;
    district?: string;
    country?: string;
    roll_number?: string;
    registration_id?: string;
    institution_name?: string;
    profile_completion_percentage: number;
    points: number;
    rank?: number;
  } | null;

  // Guardian
  guardian: {
    guardian_name?: string;
    guardian_phone?: string;
    guardian_email?: string;
    verificationStatus: GuardianVerificationStatus;
    verifiedAt?: string;
  } | null;

  // Subscription summary
  subscription: {
    state: SubscriptionState;
    planName?: string;
    planCode?: string;
    startDate?: string;
    expiryDate?: string;
    autoRenew: boolean;
    daysRemaining?: number;
    assignedByAdmin?: boolean;
    history: Array<{
      _id: string;
      planName?: string;
      status: string;
      startAtUTC: string;
      expiresAtUTC: string;
    }>;
  };

  // Payment summary
  payments: {
    totalPaid: number;
    pendingCount: number;
    recentPayments: Array<{
      _id: string;
      amountBDT: number;
      method: string;
      status: string;
      paidAt?: string;
      createdAt: string;
    }>;
  };

  // Finance summary
  finance: {
    totalIncome: number;
    totalRefunds: number;
    netDue: number;
    recentTransactions: Array<{
      _id: string;
      txnCode: string;
      direction: string;
      amount: number;
      description: string;
      status: string;
      dateUTC: string;
    }>;
  };

  // Exam summary
  exams: {
    totalAttempted: number;
    upcomingCount: number;
    identity?: {
      serialId?: string;
      rollNumber?: string;
      registrationNumber?: string;
      admitCardNumber?: string;
      examCenter?: string;
      latestResultSummary?: string;
      lastSyncAt?: string;
      lastSyncSource?: string;
    };
    recentResults: Array<{
      _id: string;
      examTitle?: string;
      percentage: number;
      obtainedMarks: number;
      totalMarks: number;
      submittedAt: string;
      status: string;
      source?: string;
      examCenter?: string;
      syncStatus?: string;
    }>;
    syncHistory?: Array<{
      _id: string;
      examTitle?: string;
      source: string;
      status: string;
      syncMode: string;
      changedFields: string[];
      createdAt: string;
    }>;
  };

  // Weak topics summary
  weakTopics: {
    count: number;
    items: Array<{
      topic: string;
      accuracy: number;
      totalAttempts: number;
      severity: WeakTopicSeverity;
    }>;
  };

  // Communication summary
  communication: {
    eligibility: CommunicationEligibility;
    totalSent: number;
    lastSentAt?: string;
    recentLogs: Array<{
      _id: string;
      channel: string;
      status: string;
      to: string;
      sentAtUTC?: string;
      providerUsed: string;
    }>;
  };

  // CRM timeline summary
  crmTimeline: {
    totalEntries: number;
    recentEntries: Array<{
      _id: string;
      type: string;
      content: string;
      createdAt: string;
      createdByAdmin?: string;
    }>;
  };

  // Security metadata
  security: {
    twoFactorEnabled: boolean;
    mustChangePassword: boolean;
    forcePasswordResetRequired: boolean;
    passwordLastChangedAt?: string;
    lastLoginAt?: string;
    loginAttempts: number;
    lockUntil?: string;
    ip_address?: string;
    device_info?: string;
    credentialsLastResentAt?: string;
  };

  // Support summary
  support: {
    openTickets: number;
    totalTickets: number;
    recentTickets: Array<{
      _id: string;
      ticketNo: string;
      subject: string;
      status: string;
      priority: string;
      createdAt: string;
    }>;
  };

  // Groups
  groups: Array<{
    _id: string;
    name: string;
    type: string;
  }>;
}
