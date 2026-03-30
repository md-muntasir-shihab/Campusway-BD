# CampusWay — Module Map

Backend module breakdown — routes, controllers, models, services.

---

## Backend Route Files

| File | Purpose | Size Signal |
|------|---------|-------------|
| `adminRoutes.ts` | Main admin endpoint handler | 109KB — very large, covers most admin APIs |
| `adminStudentMgmtRoutes.ts` | Student management, groups, subscriptions | 95KB — large |
| `adminNotificationRoutes.ts` | Notification, campaign, provider, trigger APIs | 42KB |
| `adminProviderRoutes.ts` | Provider CRUD and test-send | 8KB |
| `adminStudentSecurityRoutes.ts` | Student account security (force logout, etc.) | 5KB |
| `publicRoutes.ts` | Public-facing API (universities, news, home, etc.) | 15KB |
| `studentRoutes.ts` | Student portal API (dashboard, profile, results, etc.) | 5KB |
| `webhookRoutes.ts` | Payment webhook processing | 10KB |
| `exams/` | Exam engine routes | Subdirectory |

---

## Key Backend Models (128 total)

### Core Domain
| Model | Purpose |
|-------|---------|
| `User.ts` | Admin users (all roles) |
| `StudentProfile.ts` | Student accounts and profiles |
| `University.ts` | University records |
| `UniversityCategory.ts` | Category taxonomy |
| `UniversityCluster.ts` | Cluster groupings |
| `SubscriptionPlan.ts` | Subscription plan definitions |
| `UserSubscription.ts` | Student subscription assignments |
| `StudentGroup.ts` | Student group definitions |
| `GroupMembership.ts` | Group membership linking |

### Communication / Campaign
| Model | Purpose |
|-------|---------|
| `NotificationJob.ts` | Campaign/notification jobs |
| `NotificationTemplate.ts` | Message templates |
| `NotificationProvider.ts` | SMS/email provider config |
| `NotificationDeliveryLog.ts` | Delivery logs |
| `NotificationSettings.ts` | Notification system settings |
| `SubscriptionContactPreset.ts` | Saved contact presets |
| `SubscriptionAutomationLog.ts` | Automation execution logs |

### Content
| Model | Purpose |
|-------|---------|
| `News.ts` | News/notice articles |
| `NewsSource.ts` | RSS source definitions |
| `NewsFetchJob.ts` | RSS fetch job tracking |
| `Resource.ts` | Resources/documents |
| `HelpArticle.ts` | Help center articles |
| `HelpCategory.ts` | Help center categories |
| `ContentBlock.ts` | Generic CMS content blocks |

### Exams
| Model | Purpose |
|-------|---------|
| `Exam.ts` | Exam definitions (14KB — complex) |
| `ExamSession.ts` | Student exam attempt sessions |
| `ExamResult.ts` | Exam result storage |
| `Question.ts` | Question bank (9KB) |
| `QuestionBankSet.ts` | Question bank sets |

### Finance
| Model | Purpose |
|-------|---------|
| `FinanceTransaction.ts` | Transaction records |
| `FinanceInvoice.ts` | Invoice records |
| `FinanceBudget.ts` | Budget definitions |
| `FinanceVendor.ts` | Vendor records |
| `FinanceRefund.ts` | Refund records |

### Security / Audit
| Model | Purpose |
|-------|---------|
| `SecuritySettings.ts` | Security configuration (21KB) |
| `AuditLog.ts` | Admin action audit trail |
| `SecurityAlertLog.ts` | Security alerts |
| `ActiveSession.ts` | Active session tracking |
| `LoginActivity.ts` | Login audit |

### Home / Settings
| Model | Purpose |
|-------|---------|
| `HomeSettings.ts` | Homepage content control (25KB — very large) |
| `WebsiteSettings.ts` | Site-wide settings (21KB) |
| `Banner.ts` | Banner/slider items |
| `Settings.ts` | Generic settings |

### Support / Contact
| Model | Purpose |
|-------|---------|
| `SupportTicket.ts` | Support ticket records |
| `SupportTicketMessage.ts` | Support ticket messages |
| `ContactMessage.ts` | Public contact form submissions |

### Team / Access
| Model | Purpose |
|-------|---------|
| `TeamRole.ts` | Role definitions |
| `RolePermissionSet.ts` | Permission sets per role |
| `TeamInvite.ts` | Team invitation records |
| `ActionApproval.ts` | Two-person approval records |
| `MemberPermissionOverride.ts` | Per-member permission overrides |

---

## Backend Middleware

### `src/middlewares/` (main — 8 files)
| File | Purpose |
|------|---------|
| `auth.ts` | JWT validation, role verification, session management |
| `securityGuards.ts` | IP blocking, suspicious pattern detection |
| `securityRateLimit.ts` | Rate limiting per endpoint type |
| `sensitiveAction.ts` | Sensitive action verification (export, provider config, etc.) |
| `requestSanitizer.ts` | Input sanitization |
| `twoPersonApproval.ts` | Two-person approval flow |
| `validate.ts` | express-validator result handler |
| `requestId.ts` | Request ID injection |

### `src/middleware/` (thin wrappers — 3 files)
| File | Purpose |
|------|---------|
| `auth.ts` | Thin re-export (check if redundant) |
| `adminRateLimit.ts` | Admin-specific rate limit |
| `examRateLimit.ts` | Exam-specific rate limit |

> **Note**: The `middleware/` directory appears to be a legacy/thin wrapper of `middlewares/`. Phase 3 should consolidate these if safe.

---

## Frontend Key Components

### Layout
| Component | Purpose |
|-----------|---------|
| `Navbar` | Public navigation bar |
| `Footer` | Public footer |
| `StudentLayout` | Student portal wrapper |
| `AdminGuardShell` | Admin route protection wrapper |
| `StudentManagementLayout` | Student management OS shell |
| `FinanceLayout` | Finance center shell |

### Admin Components (`/components/admin/`)
| Directory | Purpose |
|-----------|---------|
| `students/` | Student management components |
| `finance/` | Finance center components |
| `team/` | Team access components |
| `campaigns/` | Campaign and notification components |
| `approvals/` | Action approval components |
| `help-center/` | Help center admin components |
| `news/` | News console components |

### Frontend Services / Hooks
| Hook/Service | Purpose |
|-------------|---------|
| `useAuth` | Auth context (login, logout, role check) |
| `useTheme` | Dark/light theme toggle |
| `useWebsiteSettings` | Admin-controlled site settings |
| `useModuleAccess` | Role-based module permission check |
| `useSubscriptionPlans` | Subscription plan data + mutations |
| `useHomeLiveUpdates` | SSE live homepage updates |
| `useAntiCheat` | Exam anti-cheat monitoring |

---

## Communication Hub Summary

The communication system is a major feature area:

```
CampaignConsolePage (63KB)
├── Campaigns tab (list, create, manage)
├── Notifications tab (targeted/broadcast)
├── Smart Triggers tab (SmartTriggersPanel — 29KB)
├── Providers tab (ProvidersPanel — 25KB)
├── Templates tab (template management)
└── Logs tab (delivery logs)

SubscriptionContactCenterPage (78KB)
├── Active / Expired / Renewal Due / Custom buckets
├── Member table with filters
├── Copy / Export panel (ExportCopyPanel — 11KB)
└── Personal outreach mode

NotificationOperationsPanel (62KB)
└── Targeted notification creation and management
```
