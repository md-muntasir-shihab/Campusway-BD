# CampusWay — Frontend Route Map

All routes are defined in `frontend/src/App.tsx`. Admin routes use the `/__cw_admin__/` prefix.

---

## Public Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `HomeModern` | Homepage |
| `/universities` | `Universities` | University listing |
| `/universities/category/:categorySlug` | `UniversityCategoryBrowse` | Category filter |
| `/universities/cluster/:clusterSlug` | `UniversityClusterBrowse` | Cluster filter |
| `/university/:slug` | `UniversityDetails` | University detail |
| `/universities/:slug` | `UniversityDetails` | Alias |
| `/news` | `News` | News listing |
| `/news/:slug` | `SingleNews` | News article |
| `/exams` | `ExamsListPage` | Public exam list |
| `/exam/:examId` | `ExamRunnerPage` | Exam runner |
| `/exam/:examId/result` | `ExamResultPage` | Exam result |
| `/exam/:examId/solutions` | `ExamSolutionsPage` | Exam solutions |
| `/certificate/verify/:certificateId` | `CertificateVerify` | Certificate check |
| `/resources` | `Resources` | Resources listing |
| `/resources/:slug` | `ResourceDetail` | Resource detail |
| `/contact` | `Contact` | Contact page |
| `/help-center` | `HelpCenter` | Help center index |
| `/help-center/:slug` | `HelpArticle` | Help article |
| `/subscription-plans` | `SubscriptionPlans` | Plans listing |
| `/subscription-plans/:planId` | `SubscriptionPlanDetail` | Plan detail |
| `/subscription-plans/checkout/:slug` | `SubscriptionPlanCheckout` | Checkout |
| `/about` | `About` | About page (stub) |
| `/terms` | `Terms` | Terms page (stub) |
| `/privacy` | `Privacy` | Privacy page (stub) |
| `/pricing` | Redirect → `/subscription-plans` | Legacy redirect |
| `/services` | Redirect → `/subscription-plans` | Legacy redirect |
| `/subscription` | Redirect → `/subscription-plans` | Legacy redirect |
| `/subscriptions` | Redirect → `/subscription-plans` | Legacy redirect |

---

## Auth Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | `Login` | Student login |
| `/student/register` | `StudentRegister` | Student registration |
| `/student/forgot-password` | `StudentForgotPassword` | Forgot password |
| `/student/reset-password` | `StudentResetPassword` | Reset password |
| `/otp-verify` | `OtpVerification` | OTP verification |
| `/chairman/login` | `ChairmanLogin` | Chairman login |
| `/profile-center` | `Profile` | Legacy profile redirect |

---

## Student Portal Routes (inside `StudentLayout`)

| Path | Component | Notes |
|------|-----------|-------|
| `/dashboard` | `StudentDashboard` | Student dashboard |
| `/profile` | `StudentProfile` | Student profile |
| `/profile/security` | `StudentSecurity` | Security settings |
| `/results` | `StudentResults` | Results list |
| `/results/:examId` | `StudentResultDetail` | Result detail |
| `/payments` | `StudentPayments` | Payments (stub) |
| `/notifications` | `StudentNotifications` | Notifications |
| `/support` | `StudentSupport` | Support tickets |
| `/support/:ticketId` | `StudentSupportThread` | Ticket thread |
| `/student/resources` | `StudentResources` | Resources |
| `/student/exams-hub` | `StudentExamsHub` | Exams hub |
| `/exams/:examId` | `StudentExamDetail` | Exam detail |
| `/student/applications` | `StudentApplications` | Applications |

---

## Admin Routes (prefix: `/__cw_admin__/`)

| Path | Page/Component |
|------|---------------|
| `/__cw_admin__/dashboard` | Admin Dashboard |
| `/__cw_admin__/universities` | University Management |
| `/__cw_admin__/news/*` | News Console (tabbed) |
| `/__cw_admin__/exams` | Exams Management |
| `/__cw_admin__/question-bank` | Question Bank |
| `/__cw_admin__/student-management/*` | Student Management OS |
| `/__cw_admin__/student-management/list` | Student List |
| `/__cw_admin__/student-management/create` | Create Student |
| `/__cw_admin__/student-management/groups` | Student Groups |
| `/__cw_admin__/student-management/groups/:id` | Group Detail |
| `/__cw_admin__/student-management/profile-requests` | Profile Approvals |
| `/__cw_admin__/subscriptions/plans` | Subscription Plans |
| `/__cw_admin__/subscriptions/v2` | Subscriptions V2 |
| `/__cw_admin__/resources` | Resources |
| `/__cw_admin__/support-center` | Support Center |
| `/__cw_admin__/contact` | Contact Messages |
| `/__cw_admin__/help-center` | Help Center Admin |
| `/__cw_admin__/finance/*` | Finance Center |
| `/__cw_admin__/campaigns/dashboard` | Campaign Console |
| `/__cw_admin__/campaigns/contact-center` | Subscription Contact Center |
| `/__cw_admin__/campaigns/templates` | Campaign Templates |
| `/__cw_admin__/campaigns/settings` | Campaign Settings (Providers) |
| `/__cw_admin__/campaigns/logs` | Campaign Logs |
| `/__cw_admin__/campaigns/new` | New Campaign |
| `/__cw_admin__/team/members` | Team Members |
| `/__cw_admin__/team/roles` | Team Roles |
| `/__cw_admin__/team/permissions` | Permissions |
| `/__cw_admin__/approvals` | Action Approvals |
| `/__cw_admin__/settings` | Settings Center |
| `/__cw_admin__/settings/home-control` | Home Control |
| `/__cw_admin__/settings/university-settings` | University Settings |
| `/__cw_admin__/settings/banner-manager` | Banner Manager |
| `/__cw_admin__/settings/site-settings` | Site Settings |
| `/__cw_admin__/settings/security-center` | Security Center |
| `/__cw_admin__/settings/system-logs` | System Logs |
| `/__cw_admin__/settings/notifications` | Notification Settings |
| `/__cw_admin__/settings/news` | News Settings |
| `/__cw_admin__/settings/resource-settings` | Resource Settings |
| `/__cw_admin__/settings/admin-profile` | Admin Profile |
| `/__cw_admin__/reports` | Reports |

---

## Admin Login Path

The admin login path is configurable via `ADMIN_SECRET_PATH` env variable.
Default: `/campusway-secure-admin` (redirects to `/__cw_admin__/...`).

> **Security note**: The `/__cw_admin__/` prefix is the actual admin route. The `campusway-secure-admin` path was a legacy path and redirects cleanly.

---

## Legacy Redirects

Many legacy paths (e.g., `/admin/*`, `/admin-dashboard`, `/campusway-secure-admin/*`) redirect to the canonical `/__cw_admin__/` paths via `LegacyAdminRedirect`.

## Chairman Dashboard

| Path | Component |
|------|-----------|
| `/chairman/login` | `ChairmanLogin` |
| `/chairman/dashboard` | `ChairmanDashboard` |
