# NEWS_WORKFLOW

Date: 2026-03-05

## 1) End-to-End Lifecycle
1. RSS/manual ingest creates a `news` item.
2. Duplicate detection routes item to:
- `pending_review` (normal queue)
- `duplicate_review` (duplicate queue)
3. Optional AI draft runs only when AI is enabled.
4. Admin action decides final state:
- `approve/publish now`
- `schedule`
- `save draft`
- `reject`
5. Scheduler publishes due `scheduled` items at `scheduledAt`.

Queue safety rule:
- `pending_review` and `duplicate_review` items are not auto-removed.
- Items leave queues only via explicit admin action or delete.

## 2) Public Routes and Data Flow
- `/news` -> `GET /api/news`, `GET /api/news/settings`, `GET /api/news/sources`, `GET /api/news-v2/widgets`
- `/news/:slug` -> `GET /api/news/:slug`, `POST /api/news/share/track`

Image fallback rule:
- If item cover is missing or `coverSource/coverImageSource="default"`, UI renders settings default banner.

Original-source fallback rule:
- If `fetchedFullText=false` and `workflow.openOriginalWhenExtractionIncomplete=true`, “Read” behavior opens original URL.

## 3) Admin Routes and Data Flow
- `/__cw_admin__/news/dashboard` -> queue and fetch health summaries
- `/__cw_admin__/news/pending` -> normal review queue
- `/__cw_admin__/news/duplicates` -> duplicate review queue
- `/__cw_admin__/news/drafts`
- `/__cw_admin__/news/published`
- `/__cw_admin__/news/scheduled`
- `/__cw_admin__/news/rejected`
- `/__cw_admin__/news/ai-selected`
- `/__cw_admin__/news/sources` (legacy `/__cw_admin__/news/rss-sources` remains compatible)
- `/__cw_admin__/news/editor/:id`

Settings center ownership:
- `/__cw_admin__/settings/site-settings`
- `/__cw_admin__/settings/banner-manager`
- `/__cw_admin__/settings/news-settings`

## 4) API Contract Notes (Compatibility Hardened)
Public settings response now supports both:
- `pageTitle` + `pageSubtitle`
- `newsPageTitle` + `newsPageSubtitle`

News item responses now support both:
- `coverImageSource` + `coverSource`
- `aiSelected` + `isAiSelected`

This keeps legacy and strict-contract clients working simultaneously.

## 5) React Query Sync Rules
Public keys:
- `["newsSettings"]`
- `["newsList", filters]`
- `["newsDetail", slug]`
- `["newsSources"]`

Admin keys:
- `["adminNewsDashboard"]`
- `["adminNewsList", status, filters]`
- `["adminNewsItem", id]`
- `["adminRssSources"]`
- `["adminNewsSettings"]`

Mutation invalidation:
- approve/reject/publish/schedule/edit/delete/source-change/settings-change
- invalidate both public and admin news keys to prevent stale UI.

## 6) Command Examples
```bash
# Trigger RSS fetch immediately
curl -X POST "$BASE_URL/api/admin/rss/fetch-now" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Approve and publish now
curl -X POST "$BASE_URL/api/admin/news/<NEWS_ID>/approve" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Schedule publish
curl -X POST "$BASE_URL/api/admin/news/<NEWS_ID>/schedule" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scheduleAt":"2026-03-06T10:00:00.000Z"}'

# Reject
curl -X POST "$BASE_URL/api/admin/news/<NEWS_ID>/reject" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Verification failed"}'
```

