### QA Report – News Admin & Backend

#### RSS ingestion & full article fetch
- [ ] From admin dashboard, trigger **Fetch Now** and confirm new items appear in the **Pending Review** queue with `status='pending_review'`.
- [ ] With `fetchFullArticleEnabled=true` and `fullArticleFetchMode='rss_content'`, verify `fullContent` contains rich RSS content and is sanitized (no script/style injection).
- [ ] With `fullArticleFetchMode='readability_scrape'`, verify articles use scraped HTML from `originalArticleUrl` when available and fall back to RSS summary otherwise.
- [ ] With `fullArticleFetchMode='both'`, confirm the system prefers high-quality RSS content but uses scraped content when RSS is too short.
- [ ] When full-article fetch fails, ensure items still land in `pending_review` with `fetchedFullText=false` and the original summary intact.

#### Duplicate detection & queues
- [ ] Ingest two feeds with the same URL or GUID and confirm the second item is stored as `status='duplicate_review'` with `duplicateOfNewsId` populated.
- [ ] Create items with highly similar titles and confirm they are flagged as duplicates when `duplicateSensitivity` is `strict`, but not when it is `loose`.
- [ ] In the Duplicate Queue, verify actions:
  - [ ] **Publish anyway** creates a separate published item.
  - [ ] **Merge into existing** updates the target article and preserves duplicate audit trails.
  - [ ] **Keep as Draft** moves the duplicate into `draft` status.
  - [ ] **Reject** sets `status='rejected'` and removes it from queues.
- [ ] Confirm duplicate items never disappear from queues until one of these actions is taken.

#### AI optional flow
- [ ] With `aiSettings.enabled=false`, ingest RSS and confirm no AI calls occur and **Approve & Publish** instantly publishes from the Pending queue.
- [ ] With `aiSettings.enabled=true` and `workflow.autoDraftFromRSS` enabled:
  - [ ] Verify AI drafts are generated only from `rssRawTitle`, `rssRawDescription`, `rssRawContent`, and source metadata.
  - [ ] Confirm AI output references `sourceName` and `originalArticleUrl` and stores `aiUsed`, `aiModel`, `aiLanguage`, `aiGeneratedAt`, `aiNotes`.
  - [ ] For weak content, confirm `aiNotes='insufficient content'` and a minimal, attributed summary is stored.
- [ ] Ensure no AI flow auto-publishes; admin must always explicitly approve/publish.

#### Admin queues & actions
- [ ] Verify **Pending Review** page shows all `pending_review` items until they are explicitly approved, scheduled, drafted, rejected, or deleted.
- [ ] Confirm **Approve & Publish**, **Schedule**, **Save as Draft**, and **Reject** work for pending items and update statuses accordingly.
- [ ] Confirm **Duplicate Queue** shows all `duplicate_review` items with a clear “Duplicate of …” reference when available.
- [ ] Ensure bulk approve/reject actions operate only on selected items and update counts in the dashboard.
- [ ] Validate that scheduled items are auto-published at `scheduledAt` by cron and appear in public `/news` without manual refresh of backend.

#### Default banner & retroactive behavior
- [ ] Create old items with no `coverImageUrl` and `coverImageSource='default'` (or empty) and confirm they display the current `defaultBannerUrl` on public pages.
- [ ] Change the default banner in `news-settings` and confirm those old items update visually without modifying stored documents.

#### Admin UI & React Query sync
- [ ] Verify admin news console pages (`/__cw_admin__/news/...`) are responsive (drawer sidebar on mobile, sticky topbar).
- [ ] Confirm navigating between dashboard, queues, duplicates, sources, media, exports, and audit logs does not cause layout flicker or full remounts.
- [ ] Perform each admin mutation (approve, reject, schedule, move-to-draft, merge duplicate, create/update news, source CRUD) and confirm:
  - [ ] Public `/news` and `/news/:slug` lists/details update correctly.
  - [ ] Admin lists (`pending`, `duplicates`, `drafts`, `published`, `scheduled`, `rejected`, `ai-selected`) update without stale items.
  - [ ] News settings edits invalidate `['newsSettings']` and relevant admin/public views.

#### Exports & audit logs
- [ ] Trigger CSV and XLSX exports via the admin exports section and confirm the files download, include requested columns, and respect status/date filters.
- [ ] Hit `/api/admin/audit-logs?module=news` and ensure news-specific audit events are present with correct `actorId`, `action`, `targetType/targetId` semantics.
- [ ] Cross-check a few actions (e.g. publish, reject, merge) against audit logs for accurate before/after state.

