# API_CONTRACT (Admin-Controlled + Critical Runtime Endpoints)

Date: March 4, 2026

## Scope
This document includes API endpoints actively used by admin modules and critical runtime flows validated in Phase 3 + Phase 4.

## Prefixes
- Canonical admin prefix: `/api/admin/*`
- Compatibility admin prefix: `/api/campusway-secure-admin/*`
- In this contract, `{admin}` means either prefix above.

## Auth / Session (Portal-Aware)
### `POST /api/auth/login`
Backward-compatible login endpoint for mixed clients.

Request (legacy + portal hint):
```json
{ "identifier": "user@example.com", "password": "***", "portal": "student" }
```
- `portal` is optional.
- Allowed values: `student`, `admin`, `chairman`.
- If `portal` does not match account role, response is `403`.

Response (success):
```json
{
  "token": "jwt",
  "user": { "_id": "...", "role": "student" },
  "redirectTo": "/dashboard"
}
```

### `POST /api/auth/admin/login`
- Strict admin-only login (`superadmin|admin|moderator|editor|viewer`).
- Protected by `adminLoginRateLimiter`.

Request:
```json
{ "identifier": "admin@example.com", "password": "***" }
```

Response (success):
```json
{
  "token": "jwt",
  "user": { "_id": "...", "role": "admin" },
  "redirectTo": "/__cw_admin__/dashboard"
}
```

### `POST /api/auth/chairman/login`
- Strict chairman-only login.

Request:
```json
{ "identifier": "chairman@example.com", "password": "***" }
```

Response (success):
```json
{
  "token": "jwt",
  "user": { "_id": "...", "role": "chairman" },
  "redirectTo": "/chairman/dashboard"
}
```

### `POST /api/auth/refresh`
Response:
```json
{ "token": "jwt" }
```

### `GET /api/auth/me`
Response:
```json
{ "user": { "_id": "...", "role": "admin", "permissions": {} } }
```

## Public Settings Contract
### `GET /api/settings/public`
Response includes compatibility aliases for branding:
```json
{
  "websiteName": "CampusWay",
  "siteName": "CampusWay",
  "logo": "/uploads/logo.png",
  "logoUrl": "/uploads/logo.png"
}
```

### `GET /api/settings/analytics`
Returns public-safe analytics toggles consumed by frontend tracking:
```json
{
  "enabled": true,
  "trackAnonymous": true,
  "eventToggles": {
    "university_apply_click": true,
    "news_view": true,
    "resource_download": true
  }
}
```

### `POST /api/events/track`
Privacy-safe event ingestion endpoint.

Request:
```json
{
  "eventName": "news_view",
  "module": "news",
  "meta": { "slug": "du-2026-admission-update" },
  "sessionId": "optional-session-id"
}
```

Response:
```json
{ "ok": true }
```

## Admin Summary
### `GET /api/{admin}/dashboard/summary`
Response:
```json
{
  "universities": { "total": 0, "active": 0, "featured": 0 },
  "home": { "highlightedCategories": 0, "featuredUniversities": 0, "enabledSections": 0 },
  "news": { "pendingReview": 0, "publishedToday": 0 },
  "exams": { "upcoming": 0, "live": 0 },
  "questionBank": { "totalQuestions": 0 },
  "students": { "totalActive": 0, "pendingPayment": 0, "suspended": 0 },
  "payments": { "pendingApprovals": 0, "paidToday": 0 },
  "supportCenter": { "unreadMessages": 0 },
  "systemStatus": { "db": "connected", "timeUTC": "..." }
}
```

## Admin Notifications + Analytics Settings
### `GET /api/{admin}/settings/notifications`
### `PUT /api/{admin}/settings/notifications`
Request sample (`PUT`):
```json
{
  "enabled": true,
  "triggers": {
    "examStartsSoon": true,
    "applicationClosingSoon": true,
    "paymentPending": true,
    "resultPublished": true,
    "profileScoreGate": true
  },
  "timings": {
    "examStartsSoonHours": [24, 3],
    "applicationClosingSoonHours": [48, 12]
  },
  "templates": {
    "examStartsSoon": "Your exam starts soon",
    "resultPublished": "Result is now published"
  }
}
```
Response sample:
```json
{ "settings": { "enabled": true, "triggers": {}, "timings": {}, "templates": {} } }
```

### `GET /api/{admin}/settings/analytics`
### `PUT /api/{admin}/settings/analytics`
Request sample (`PUT`):
```json
{
  "enabled": true,
  "trackAnonymous": true,
  "retentionDays": 180,
  "eventToggles": {
    "university_apply_click": true,
    "news_share": true,
    "exam_submitted": true
  }
}
```
Response sample:
```json
{ "settings": { "enabled": true, "trackAnonymous": true, "retentionDays": 180, "eventToggles": {} } }
```

## Site + Home Settings
### `GET /api/{admin}/settings/site`
### `PUT /api/{admin}/settings/site`
- Multipart allowed for `logo`, `favicon`.
- Used by Site Settings panel.

### `GET /api/{admin}/settings/home`
### `PUT /api/{admin}/settings/home`
- Home settings access for Settings hub (compat path for admin home controls).

### `GET /api/{admin}/home-settings`
### `PUT /api/{admin}/home-settings`
### `GET /api/{admin}/home-settings/defaults`
### `POST /api/{admin}/home-settings/reset-section`
Request sample (`PUT`):
```json
{
  "sectionVisibility": { "hero": true, "subscriptionBanner": true },
  "highlightedCategories": [{ "category": "Engineering", "order": 1, "enabled": true }],
  "featuredUniversities": [{ "universityId": "...", "order": 1, "enabled": true, "badgeText": "Featured" }]
}
```
Response sample:
```json
{ "message": "...", "homeSettings": { "sectionVisibility": {}, "highlightedCategories": [], "featuredUniversities": [] } }
```

### `PUT /api/{admin}/home/settings`
- Branding/settings write path used by Site Settings (FormData contract).

## Social Links Manager
### `GET /api/{admin}/social-links`
### `POST /api/{admin}/social-links`
### `PUT /api/{admin}/social-links/:id`
### `DELETE /api/{admin}/social-links/:id`
Request sample:
```json
{
  "platformName": "facebook",
  "targetUrl": "https://facebook.com/campusway",
  "iconUploadOrUrl": "https://.../icon.png",
  "description": "Official page",
  "enabled": true,
  "placements": ["header", "footer", "home"]
}
```
Response sample:
```json
{ "items": [{ "id": "...", "platformName": "facebook", "targetUrl": "...", "placements": ["header"] }] }
```

## Security + Runtime + Logs
### `GET /api/{admin}/security-settings`
### `PUT /api/{admin}/security-settings`
### `POST /api/{admin}/security-settings/reset-defaults`
### `POST /api/{admin}/security-settings/force-logout-all`
### `POST /api/{admin}/security-settings/admin-panel-lock`

### `GET /api/{admin}/settings/runtime`
### `PUT /api/{admin}/settings/runtime`
Request sample:
```json
{ "featureFlags": { "webNextEnabled": true } }
```
Response sample:
```json
{ "featureFlags": { "webNextEnabled": true }, "updatedAt": "..." }
```

### `GET /api/{admin}/audit-logs`
- Read-only logs used by System Logs panel.

## News Admin
### `GET /api/{admin}/news-settings`
### `PUT /api/{admin}/news-settings`
### `PATCH /api/{admin}/news-settings`

### `GET /api/{admin}/news`
### `POST /api/{admin}/news`
### `GET /api/{admin}/news/:id`
### `PUT /api/{admin}/news/:id`
### `DELETE /api/{admin}/news/:id`
### `POST /api/{admin}/news/:id/approve`
### `POST /api/{admin}/news/:id/reject`
### `POST /api/{admin}/news/:id/publish-now`
### `POST /api/{admin}/news/:id/schedule`
### `POST /api/{admin}/news/:id/submit-review`

### `GET /api/{admin}/rss-sources`
### `POST /api/{admin}/rss-sources`
### `PUT /api/{admin}/rss-sources/:id`
### `DELETE /api/{admin}/rss-sources/:id`
### `POST /api/{admin}/rss-sources/:id/test`
### `POST /api/{admin}/rss/fetch-now`

### `GET /api/{admin}/news-v2/dashboard`
### `GET /api/{admin}/news-v2/items`
### `POST /api/{admin}/news-v2/items`
### `PUT /api/{admin}/news-v2/items/:id`
### `DELETE /api/{admin}/news-v2/items/:id`
### `POST /api/{admin}/news-v2/items/:id/approve`
### `POST /api/{admin}/news-v2/items/:id/reject`
### `POST /api/{admin}/news-v2/items/:id/publish-now`
### `POST /api/{admin}/news-v2/items/:id/schedule`
### `GET /api/{admin}/news-v2/audit-logs`

## Subscription Plans
### `GET /api/{admin}/subscription-plans`
### `GET /api/{admin}/subscription-plans/:id`
### `POST /api/{admin}/subscription-plans`
### `PUT /api/{admin}/subscription-plans/reorder`
### `PUT /api/{admin}/subscription-plans/:id`
### `PUT /api/{admin}/subscription-plans/:id/toggle`
### `PATCH /api/{admin}/subscription-plans/:id/toggle`
### `DELETE /api/{admin}/subscription-plans/:id`

### `POST /api/{admin}/subscriptions/assign`
### `POST /api/{admin}/subscriptions/suspend`
### `GET /api/{admin}/subscriptions/export`

## Universities + Categories + Import
### `GET /api/{admin}/universities`
### `POST /api/{admin}/universities`
### `PUT /api/{admin}/universities/:id`
### `DELETE /api/{admin}/universities/:id`
### `PATCH /api/{admin}/universities/:id/toggle-status`
### `GET /api/{admin}/universities/categories`
### `GET /api/{admin}/university-categories`
### `POST /api/{admin}/university-categories`
### `PUT /api/{admin}/university-categories/:id`
### `PATCH /api/{admin}/university-categories/:id/toggle`
### `DELETE /api/{admin}/university-categories/:id`

### `POST /api/{admin}/universities/import-excel`
### `POST /api/{admin}/universities/import/init`
### `POST /api/{admin}/universities/import/:jobId/validate`
### `POST /api/{admin}/universities/import/:jobId/commit`
### `GET /api/{admin}/universities/import/:jobId`
### `GET /api/{admin}/universities/import/:jobId/errors.csv`

## Student Import + Groups
### `GET /api/{admin}/students/import/template`
### `POST /api/{admin}/students/import/init`
### `GET /api/{admin}/students/import/:id`
### `POST /api/{admin}/students/import/:id/validate`
### `POST /api/{admin}/students/import/:id/commit`

### `GET /api/{admin}/student-groups`
### `POST /api/{admin}/student-groups`
### `PUT /api/{admin}/student-groups/:id`
### `DELETE /api/{admin}/student-groups/:id`
### `GET /api/{admin}/student-groups/export`
### `POST /api/{admin}/student-groups/import`

## Support Center
### `GET /api/{admin}/support-tickets`
### `PATCH /api/{admin}/support-tickets/:id/status`
### `POST /api/{admin}/support-tickets/:id/reply`

### `GET /api/{admin}/notices`
### `POST /api/{admin}/notices`
### `PATCH /api/{admin}/notices/:id/toggle`

## Question Bank
### `GET /api/{admin}/question-bank`
### `GET /api/{admin}/question-bank/:id`
### `POST /api/{admin}/question-bank`
### `PUT /api/{admin}/question-bank/:id`
### `DELETE /api/{admin}/question-bank/:id`
### `POST /api/{admin}/question-bank/:id/approve`
### `POST /api/{admin}/question-bank/:id/lock`
### `POST /api/{admin}/question-bank/search/similar`
### `POST /api/{admin}/question-bank/bulk-import`
### `GET /api/{admin}/question-bank/import/:jobId`
### `POST /api/{admin}/question-bank/export`

## Resources + Payments
### `GET /api/{admin}/resources`
### `POST /api/{admin}/resources`
### `PUT /api/{admin}/resources/:id`
### `DELETE /api/{admin}/resources/:id`

### `GET /api/{admin}/payments`
### `POST /api/{admin}/payments`
### `PUT /api/{admin}/payments/:id`
### `GET /api/{admin}/students/:id/payments`
### `POST /api/{admin}/finance/payments/:id/approve`

## Reports + Insights (Admin)
### `GET /api/{admin}/reports/summary`
Summary KPI payload for admin reports dashboard.

### `GET /api/{admin}/reports/export?format=csv|xlsx&from=...&to=...`
Exports summary metrics in CSV/XLSX.

### `GET /api/{admin}/reports/analytics?from=...&to=...&module=all|universities|news|resources|exams|subscription|support`
Returns event analytics overview and top events.

### `GET /api/{admin}/reports/events/export?format=csv|xlsx&from=...&to=...&module=...`
Exports event logs in CSV/XLSX.

### `GET /api/{admin}/reports/exams/:examId/insights`
Returns per-exam insights:
- question-wise accuracy
- topic weakness
- time-spent distribution
- top scorers
- suspicious activity summary (if enabled)

### `GET /api/{admin}/reports/exams/:examId/insights/export?format=csv|xlsx`
Exports exam insights in CSV/XLSX.

## Exam Runtime + Cron Dependencies
### `POST /api/exams/:id/start`
### `POST /api/exams/:examId/attempt/:attemptId/answer`
### `POST /api/exams/:examId/attempt/:attemptId/submit`
### `POST /api/exams/:examId/attempt/:attemptId/event`
### `GET /api/exams/:examId/attempt/:attemptId`
### `GET /api/exams/:id/result`

Cron worker reference:
- `backend/src/cron/examJobs.ts` auto-submits expired active attempts every minute.

## Payment Webhook (Gateway Optional)
### `POST /api/payments/sslcommerz/ipn`
- Signature validated server-side.
- Duplicate/replay events are logged and ignored safely.
- Successful subscription payments sync to user subscription and finance stream.

## Query Invalidation Contract (Frontend)
After admin mutations, frontend invalidates central keys from `frontend/src/lib/queryKeys.ts`:
- Home save: `home`, `home_settings`, `universityCategories`
- Site save: `public_settings`, `site_settings`, `home`
- Social save: `public_settings`, `home`, `footer`, `header`
- News save: `news_settings`, `news`, `home`
- Plans save: `plans`, `home`, `student_me`
- University CRUD/import: `universities`, `universityCategories`, `home`

## Audit/Logs Access Contract
- `GET /api/{admin}/audit-logs`
  - `superadmin`: full system audit stream
  - `admin/moderator/editor`: restricted; use scoped news audits where required
- `GET /api/{admin}/news-v2/audit-logs`
  - role-safe news workflow audit stream

## Frontend Login + Admin Route Contract
Canonical UI routes:
- Student login: `/login`
- Chairman login: `/chairman/login`
- Admin login: `/__cw_admin__/login`
- Student dashboard: `/dashboard`
- Chairman dashboard: `/chairman/dashboard`
- Admin dashboard base: `/__cw_admin__/dashboard`

Legacy compatibility redirects:
- `/student/login` -> `/login`
- `/student-login` -> `/login`
- `/admin/login` -> `/__cw_admin__/login`
- `/admin/*` -> `/__cw_admin__/*` equivalent
- `/campusway-secure-admin` -> `/__cw_admin__/dashboard`
- `/admin-dashboard` -> `/__cw_admin__/dashboard`

## Phase 9/10 Ops Addendum (March 4, 2026)

### Standardized Forbidden Response
Any backend authorization denial now uses:
```json
{
  "errorCode": "FORBIDDEN",
  "message": "You are not allowed to <action> <module>.",
  "module": "<optional-module>",
  "action": "<optional-action>"
}
```

### Permissions Matrix Introspection
#### `GET /api/{admin}/permissions/matrix`
Query:
- `format=markdown` (optional)

Response:
```json
{
  "modules": ["site_settings", "home_control"],
  "actions": ["view", "create", "edit", "delete", "publish", "approve", "export", "bulk"],
  "roles": { "superadmin": { "site_settings": { "view": true } } },
  "markdown": "# PERMISSIONS_MATRIX ..."
}
```

### Two-Person Approval Endpoints
#### `GET /api/{admin}/approvals/pending`
Response:
```json
{ "items": [{ "_id": "...", "actionKey": "students.bulk_delete", "status": "pending_second_approval" }], "total": 1 }
```

#### `POST /api/{admin}/approvals/:id/approve`
Response:
```json
{ "message": "Second approval successful and action executed.", "item": { "status": "executed" } }
```

#### `POST /api/{admin}/approvals/:id/reject`
Request:
```json
{ "reason": "optional reason" }
```
Response:
```json
{ "message": "Approval request rejected.", "item": { "status": "rejected" } }
```

### Jobs Observability Endpoints
#### `GET /api/{admin}/jobs/runs?limit=100`
Response:
```json
{ "items": [{ "jobName": "news.rss_fetch_publish", "status": "success", "durationMs": 1200 }], "total": 1 }
```

#### `GET /api/{admin}/jobs/health?hours=24`
Response:
```json
{
  "hours": 24,
  "totals": { "success": 10, "failed": 1, "running": 0 },
  "byJob": [{ "jobName": "retention.archiver", "success": 1, "failed": 0, "running": 0 }]
}
```

### Panic Policy Responses
#### Student login disabled
`423 { "code": "STUDENT_LOGIN_DISABLED", "message": "..." }`

#### Exam starts disabled
`423 { "code": "EXAM_STARTS_DISABLED", "message": "..." }`

#### Payment webhooks disabled
`423 { "code": "PAYMENT_WEBHOOKS_DISABLED", "message": "..." }`

#### Admin read-only mode
`423 { "code": "READ_ONLY_MODE", "message": "..." }`
