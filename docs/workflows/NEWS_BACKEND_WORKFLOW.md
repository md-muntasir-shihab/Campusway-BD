# NEWS_BACKEND_WORKFLOW

Date: 2026-03-05

## Backend Services
- RSS worker: minute scheduler + per-source interval gating.
- Full-article resolver: `rss_content` / `readability_scrape` / `both`.
- Duplicate router: `pending_review` vs `duplicate_review`.
- Optional AI draft processor with strict RSS-only input.
- Scheduled publisher: promotes due `scheduled` items to `published`.

## Ingestion Guarantees
1. Fetch enabled/due sources.
2. Parse RSS item meta (title, guid, link, date, description/content).
3. Resolve full text by settings mode.
4. Sanitize HTML before save.
5. Detect duplicates (url/guid/title hash + similarity sensitivity).
6. Persist every incoming item into queue; no silent drops.

If full-text extraction fails:
- Persist with `fetchedFullText=false`.
- Public UI can route `Read` CTA to `originalArticleUrl` when `workflow.openOriginalWhenExtractionIncomplete=true`.

## AI Guardrails
- AI is optional (`aiSettings.enabled`).
- AI source text is restricted to `rssRaw*` fields.
- Generated output is attribution-safe and sanitized.
- If content is insufficient, `aiNotes="insufficient content"` is set.
- Publish always requires admin action.

## Contract Endpoints
Public:
- `GET /api/news`
- `GET /api/news/:slug`
- `GET /api/news/sources`
- `GET /api/news/settings`

Admin:
- `GET /api/admin/news/dashboard`
- `GET /api/admin/news?status=&sourceId=&q=&page=&limit=`
- `GET /api/admin/news/:id`
- `PUT /api/admin/news/:id`
- `POST /api/admin/news/:id/approve-publish`
- `POST /api/admin/news/:id/reject`
- `POST /api/admin/news/:id/schedule`
- `POST /api/admin/news/:id/move-to-draft`
- `POST /api/admin/news/:id/publish-anyway`
- `POST /api/admin/news/:id/merge`
- `DELETE /api/admin/news/:id`
- `GET|POST|PUT|DELETE /api/admin/rss-sources`
- `POST /api/admin/rss-sources/:id/test`
- `POST /api/admin/rss/fetch-now` (alias: `/api/admin/news/fetch-now`)
- `PUT /api/admin/news-settings`
- `GET /api/admin/news/export?type=csv|xlsx&status=&dateRange=&sourceId=`
- `GET /api/admin/audit-logs?module=news`
- `POST /api/admin/media/upload`

## Security + Integrity
- Admin endpoints: JWT + RBAC + admin rate-limit.
- HTML is sanitized server-side before persistence.
- Duplicate items are intentionally kept in duplicate queue for admin review.
- Default banner is runtime fallback only; old records with missing image remain untouched for retroactive banner updates.
