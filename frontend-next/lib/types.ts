export type ApiListResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  pages?: number;
  message?: string;
};

export type StudentRow = {
  _id: string;
  username?: string;
  full_name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  userUniqueId?: string;
  phoneNumber?: string;
  batch?: string;
  department?: string;
  admittedAt?: string;
  groups?: Array<{ _id: string; name: string; slug?: string }>;
  subscription?: {
    plan?: string;
    planCode?: string;
    planName?: string;
    startDate?: string | null;
    expiryDate?: string | null;
    isActive?: boolean;
    daysLeft?: number;
  };
};

export type PlanRow = {
  _id: string;
  code: string;
  name: string;
  durationDays?: number;
  durationValue?: number;
  durationUnit?: 'days' | 'months';
  price?: number;
  isActive?: boolean;
};

export type PaymentRow = {
  _id: string;
  amount: number;
  method: 'bkash' | 'cash' | 'manual' | 'bank';
  date: string;
  entryType: 'subscription' | 'due_settlement' | 'other_income';
  reference?: string;
  studentId?: {
    _id: string;
    username?: string;
    email?: string;
    full_name?: string;
  };
};

export type ExpenseRow = {
  _id: string;
  category: string;
  amount: number;
  date: string;
  vendor?: string;
};

export type StaffPayoutRow = {
  _id: string;
  role: string;
  amount: number;
  paidAt: string;
  periodMonth: string;
};

export type DueRow = {
  _id: string;
  studentId?: {
    _id: string;
    username?: string;
    email?: string;
  };
  netDue: number;
  computedDue: number;
  manualAdjustment: number;
  waiverAmount: number;
  updatedAt?: string;
};

export type NoticeRow = {
  _id: string;
  title: string;
  message: string;
  isActive?: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

export type TicketRow = {
  _id: string;
  ticketNo: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
};

export type BackupRow = {
  _id: string;
  type: 'full' | 'incremental';
  storage: 'local' | 's3' | 'both';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  localPath?: string;
  s3Key?: string;
};

export type FinanceSummary = {
  totalIncome: number;
  totalExpenses: number;
  directExpenses: number;
  salaryPayouts: number;
  netProfit: number;
};

export type StudentDashboardProfile = {
  user?: {
    username?: string;
    email?: string;
  };
  name?: string;
  profilePicture?: string;
  profileCompletionPercentage?: number;
  overallRank?: number | null;
  groupRank?: number | null;
  welcomeMessage?: string;
  subscription?: {
    isActive?: boolean;
    planId?: string;
    planSlug?: string;
    planCode?: string;
    planName?: string;
    expiryDate?: string | null;
    daysLeft?: number | null;
    ctaLabel?: string;
    ctaUrl?: string;
    ctaMode?: string;
  };
};

export type RuntimeSettingsPayload = {
  featureFlags?: {
    studentRegistrationEnabled?: boolean;
    financeDashboardV1?: boolean;
    smsReminderEnabled?: boolean;
    emailReminderEnabled?: boolean;
    backupS3MirrorEnabled?: boolean;
    nextAdminEnabled?: boolean;
    nextStudentEnabled?: boolean;
  };
};

export type CurrentUserPayload = {
  user?: {
    _id: string;
    username?: string;
    email?: string;
    role?: string;
    permissions?: {
      canRevealPasswords?: boolean;
      canManageFinance?: boolean;
      canManagePlans?: boolean;
      canManageTickets?: boolean;
      canManageBackups?: boolean;
      canManageStudents?: boolean;
    };
  };
};

export type NewsAppearanceConfig = {
  layoutMode?: 'rss_reader' | 'grid' | 'list';
  showSourceIcons?: boolean;
  showTrendingWidget?: boolean;
  showCategoryWidget?: boolean;
  showShareButtons?: boolean;
  animationLevel?: 'none' | 'subtle' | 'rich';
  cardDensity?: 'compact' | 'comfortable';
  thumbnailFallbackUrl?: string;
};

export type NewsItem = {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content?: string;
  category: string;
  publishDate: string;
  sourceName?: string;
  sourceType?: string;
  sourceIconUrl?: string;
  originalLink?: string;
  featuredImage?: string;
  coverImage?: string;
  thumbnailImage?: string;
  shareUrl?: string;
  views?: number;
};
