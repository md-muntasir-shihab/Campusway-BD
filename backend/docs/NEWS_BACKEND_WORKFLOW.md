### CampusWay News Backend Workflow

- **Models**
  - `NewsSource` (`rss_sources`): RSS feed configuration including `rssUrl/feedUrl`, `siteUrl`, `iconType`, `iconUrl`, `categoryTags`, `enabled/isActive`, `fetchIntervalMinutes`, `priority/order`, `lastFetchedAt`, and defaults for tags/category.
  - `News` (`news_items`): Core article document with status (`pending_review`, `duplicate_review`, `draft`, `published`, `scheduled`, `rejected`), `title`, `slug`, `shortSummary/shortDescription`, `fullContent/content`, cover fields (`coverImageUrl`, `coverImageSource`/`coverSource`), `tags`, `category`, AI flags (`aiUsed`, `aiSelected/isAiSelected`, `aiMeta`), duplicate meta (`duplicateKeyHash`, `duplicateOfNewsId`, `duplicateReasons`, `dedupe`), and source meta (`sourceId`, `sourceName`, `sourceUrl`, `originalArticleUrl`, `rssGuid`, `rssPublishedAt`, `rssRawTitle`, `rssRawDescription`, `rssRawContent`, `fetchedFullText`, `fetchedFullTextAt`).
  - `NewsSystemSettings` (`news_settings`): Single-doc config (`key='default'`) whose `config` holds page title/subtitle, default images, appearance, share templates, AI settings (enabled/language/style/strictNoHallucination/maxLength/duplicateSensitivity), workflow (defaultIncomingStatus/allowScheduling/autoExpireDays), and full-article flags (`fetchFullArticleEnabled`, `fullArticleFetchMode`).
  - `NewsAuditEvent` (`audit_logs`): Per-action audit with `actorId`, `action`, `entityType` (`'news'|'source'|'settings'|'media'|'export'|'workflow'`), `entityId`, `before`, `after`, `meta`, `ip`, `userAgent`, and `createdAt`.

- **RSS ingestion & full article fetch**
  - `startNewsV2CronJobs` in `backend/src/cron/newsJobs.ts` runs every minute and calls:
    - `runDueSourceIngestion()` → loads `NewsSystemSettings` via `getOrCreateNewsSettings`, finds enabled sources due by `fetchIntervalMinutes`, and delegates to `ingestFromSources`.
    - `ingestFromSources` (in `newsV2Controller`) parses RSS using `rss-parser`, caps items per source by `maxItemsPerFetch`, and normalizes title/link/guid/pubDate and description/content.
  - For each RSS item:
    - Duplicate key and candidate: `buildDuplicateKeyHash` and `findDuplicateCandidate` compute `duplicateKeyHash` and search by canonical URL, `rssGuid`, and title similarity using a threshold derived from `aiSettings.duplicateSensitivity`.
    - Existing-ingest guard: `alreadyIngestedFromSource` prevents double-ingestion of the same item.
    - Full article resolution: `resolveFullArticleContent` uses:
      - `fetchFullArticleEnabled=false`: returns sanitized RSS content/description.
      - `fullArticleFetchMode='rss_content'`: uses sanitized RSS content if it has enough length.
      - `fullArticleFetchMode='readability_scrape'`: fetches the HTML from `originalArticleUrl`, runs `Readability` + structural fallbacks, sanitizes HTML, and uses it if long enough.
      - `fullArticleFetchMode='both'`: prefers strong RSS content, falls back to readable scrape, else to sanitized summary.
    - Sanitization: all rich HTML passes through `sanitizeRichHtml` to strip unsafe tags/attributes and mitigate XSS.
    - Initial status and fields:
      - If a duplicate candidate exists → `status='duplicate_review'`, duplicate meta populated.
      - Otherwise → `status='pending_review'`.
      - Cover image extracted via `extractRssImage`; if missing, `coverImageSource='default'` and `thumbnailImage` uses default banner/thumb from settings.

- **Duplicate detection**
  - Duplicate signals:
    - Matching `originalArticleUrl` (canonicalized link).
    - Matching `rssGuid`.
    - Title similarity above threshold (configurable via `aiSettings.duplicateSensitivity`).
  - Ingest-time decisions:
    - If a duplicate is found but the item is not yet stored, a new `News` doc is created with `status='duplicate_review'`, `duplicateKeyHash`, `duplicateOfNewsId`, and `duplicateReasons`.
    - If an item is already ingested from the same source by URL/guid/hash → skip insertion.
  - Background cleanup:
    - `markDuplicateNewsRecords(settings)` groups already-stored records by dedupe hash and auto-marks duplicates when allowed, incrementing duplicate counts in RSS job stats.

- **AI draft generation (optional, strict)**
  - `callAiProvider` is guarded by `aiSettings.enabled`; if disabled, it returns with a warning and no drafts are generated.
  - When `workflow.autoDraftFromRSS` and AI are enabled:
    - `ingestFromSources` constructs a **strict input** from `rssRawTitle`, `rssRawDescription`, `rssRawContent`, and source metadata only.
    - For very short content, it skips AI, sets `aiNotes='insufficient content'`, and builds a minimal, attributed summary.
    - Otherwise, it asks the provider for `title`, `summary`, and `content`, wraps them with `ensureAiAttribution` (injecting source name + original URL), and stores:
      - `aiUsed=true`, `aiModel`, `aiLanguage`, `aiPromptVersion`, `aiMeta` (provider/model/confidence/citations/noHallucinationPassed/warning).
  - No AI path can auto-publish; every AI-enhanced item still requires explicit admin approval.

- **Scheduling publisher**
  - `runScheduledNewsPublish` in `newsV2Controller` finds `status='scheduled'` items with due `scheduleAt/scheduledAt` and updates them to:
    - `status='published'`, setting `publishedAt`.
  - This is invoked from the same cron job as RSS ingestion, so scheduling and fetching are co-ordinated.

- **Default images & retroactive behavior**
  - Settings-based fallback:
    - `resolveDefaultNewsBanner` uses `defaultBannerUrl`, `defaultThumbUrl`, `appearance.thumbnailFallbackUrl`, or `/logo.png`.
  - Ingest/update time:
    - `applyDefaultBannerToNewsPayload` ensures:
      - When `coverImageSource='default'` or no cover is present, cover fields are empty, but `fallbackBanner` is set to the configured default.
      - `thumbnailImage` falls back to either cover or default banner when missing.
  - Output time:
    - `resolveCoverAndThumbForOutput` resolves `coverImageUrl` and `thumbnailImage` for API responses:
      - If `coverImageSource='default'` or no stored cover → both are the current default banner.
      - Otherwise → use stored cover/thumbnail, falling back to the banner.
    - This preserves legacy documents with `coverImageUrl=null/''` so that **new defaults automatically apply** to old items.

- **Admin & public APIs (overview)**
  - Public (via `publicRoutes`):
    - `/api/news` → `getPublicNewsV2List` with filters (`sourceId`, `tag`, `category`, `q`, `page`, `limit`).
    - `/api/news/:slug` → `getPublicNewsV2BySlug`.
    - `/api/news/sources` → `getPublicNewsV2Sources`.
    - `/api/news/settings` → `getPublicNewsV2Settings` (public subset of `news_settings`).
    - `/api/news-v2/*` alias endpoints for widgets, appearance, and share tracking.
  - Admin (via `adminRoutes`, under `/api/${ADMIN_SECRET_PATH}` and `/api/admin`):
    - `/news-v2/items` → list with `status`, `sourceId`, `aiOnly`, `aiSelected`, `duplicateFlagged`, `q`, `page`, `limit`.
    - `/news-v2/items/:id` → get/update/delete single items.
    - Actions:
      - Approve/reject/publish/schedule: `/news-v2/items/:id/approve`, `/approve-publish`, `/reject`, `/publish-now`, `/schedule`, `/move-to-draft`, `/publish-anyway`, `/merge`, `/submit-review`.
      - Bulk moderation: `/news-v2/items/bulk-approve`, `/bulk-reject`.
    - Sources:
      - `/news-v2/sources` and `/rss-sources` for CRUD/reorder/test.
      - `/rss/fetch-now` and `/news-v2/fetch-now` for manual ingest.
    - Settings:
      - `/news-v2/settings/*` and `/news-settings` for appearance, AI, share templates, and combined settings.
    - Media & exports:
      - `/news-v2/media*`, `/news-v2/exports/*`, `/news/export`, `/news/rss-sources/export`.
    - Audit logs:
      - `/news-v2/audit-logs` for module-scoped audit events.
      - `/audit-logs?module=news` for admin-wide audit with news scope delegation.

