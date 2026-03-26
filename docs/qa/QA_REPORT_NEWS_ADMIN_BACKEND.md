# QA_REPORT_NEWS_ADMIN_BACKEND

Date: 2026-03-05

## Scope
Admin + backend contract and workflow validation for News module.

## Implemented Checks
- [x] RSS ingestion stores every new item in queue (`pending_review` or `duplicate_review`).
- [x] Duplicate queue behavior is explicit and persistent until admin action.
- [x] Full-article extraction modes are implemented: `rss_content`, `readability_scrape`, `both`.
- [x] AI optional flow is enforced:
- AI off: no AI draft call
- AI on: RSS-only draft generation with strict source-attribution path
- [x] Approve/publish endpoints active:
- `/api/admin/news/:id/approve-publish`
- `/api/admin/news/:id/publish-now`
- `/api/admin/news/:id/approve`
- [x] Scheduler publishes due scheduled posts.
- [x] Duplicate actions active:
- publish anyway
- merge duplicate
- move to draft
- [x] Export + audit endpoints active:
- `/api/admin/news/export`
- `/api/admin/audit-logs?module=news`
- [x] RSS source contract aliases hardened:
- `/api/admin/rss-sources/*`
- `/api/admin/news/sources*`
- [x] Fetch-now aliases active:
- `/api/admin/rss/fetch-now`
- `/api/admin/news/fetch-now`
- [x] Dashboard alias active:
- `/api/admin/news/dashboard`

## Admin Route Coverage
- [x] `/__cw_admin__/news/dashboard`
- [x] `/__cw_admin__/news/pending`
- [x] `/__cw_admin__/news/duplicates`
- [x] `/__cw_admin__/news/drafts`
- [x] `/__cw_admin__/news/published`
- [x] `/__cw_admin__/news/scheduled`
- [x] `/__cw_admin__/news/rejected`
- [x] `/__cw_admin__/news/ai-selected`
- [x] `/__cw_admin__/news/sources`
- [x] `/__cw_admin__/news/editor/:id`

## Validation Notes
- Frontend build passed on this run: `npm --prefix frontend run build`.
- Backend full TypeScript compile still has existing global project issues unrelated to this news patch set.

## Remaining Runtime QA
- [ ] Live RSS fetch with external feeds in target deployment.
- [ ] Timed schedule-publish verification with real server clock.
- [ ] Full responsive admin visual pass (360/768/1024/1440).
