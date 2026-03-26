// ═══════════════════════════════════════════════════════════════════════════
// Student Management OS — Frontend Domain Types
// Mirror of backend/src/types/studentManagement.ts for type-safe API usage.
// ═══════════════════════════════════════════════════════════════════════════

export const STUDENT_STATUSES = ['active', 'suspended', 'blocked', 'pending'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const SUBSCRIPTION_STATES = ['active', 'expired', 'pending', 'suspended', 'none'] as const;
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const COMM_ELIGIBILITY = ['eligible', 'no_phone', 'no_email', 'opted_out', 'blocked'] as const;
export type CommunicationEligibility = (typeof COMM_ELIGIBILITY)[number];

export const GUARDIAN_VERIFICATION = ['unverified', 'pending', 'verified'] as const;
export type GuardianVerificationStatus = (typeof GUARDIAN_VERIFICATION)[number];

export const WEAK_TOPIC_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
export type WeakTopicSeverity = (typeof WEAK_TOPIC_SEVERITY)[number];

export const STUDENT_DETAIL_TABS = [
  'overview', 'profile', 'guardian', 'subscription', 'payments',
  'finance', 'exams', 'results', 'weak-topics', 'communication',
  'crm-timeline', 'security', 'support',
] as const;
export type StudentDetailTab = (typeof STUDENT_DETAIL_TABS)[number];

export interface AdminStudentUnifiedPayload {
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

  guardian: {
    guardian_name?: string;
    guardian_phone?: string;
    guardian_email?: string;
    verificationStatus: GuardianVerificationStatus;
    verifiedAt?: string;
  } | null;

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

  exams: {
    totalAttempted: number;
    upcomingCount: number;
    recentResults: Array<{
      _id: string;
      examTitle?: string;
      percentage: number;
      obtainedMarks: number;
      totalMarks: number;
      submittedAt: string;
      status: string;
    }>;
  };

  weakTopics: {
    count: number;
    items: Array<{
      topic: string;
      accuracy: number;
      totalAttempts: number;
      severity: WeakTopicSeverity;
    }>;
  };

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

  groups: Array<{
    _id: string;
    name: string;
    type: string;
  }>;
}
