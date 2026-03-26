# NEWS Check Report (Final)

## Scope

- Pages audited: **News** (`/news`, `/news/:slug`)
- Admin panel routes verified: `/__cw_admin__/news/*`, `/__cw_admin__/settings/news-settings`
- Backend endpoints verified: `GET /api/news`, `GET /api/news/:slug`, `GET /api/news/settings`, `GET /api/news/sources`, `POST /api/news/share/track`
- Admin endpoints verified: Full CRUD + workflow actions + RSS sources + settings + exports + audit

---

## A) Public News Page Requirements

### Route: `/news` — NewsPage (News.tsx, 794+ lines)

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 1 | RSS Reader layout (3-column: sources sidebar, feed, preview panel) | **PASS** | `appearance.layoutMode` controls layout; responsive collapse on mobile |
| 2 | Source filter sidebar with counts | **PASS** | `GET /api/news/sources` returns source list with published counts |
| 3 | Tag chip filter bar | **PASS** | Controlled by `appearance.showWidgets.tagChips` |
| 4 | Search input with debounce | **PASS** | Filters by title, summary, source name |
| 5 | Article cards with cover image, title, summary, source, date | **PASS** | Cover image fallback uses `defaultBannerUrl` when `coverSource=default` |
| 6 | Article preview panel (right side on desktop) | **PASS** | Controlled by `appearance.showWidgets.previewPanel` |
| 7 | Share buttons (WhatsApp, Facebook, Messenger, Telegram, Copy) | **PASS** | Templates from `shareTemplates` with `{title}`, `{summary}`, `{url}` interpolation |
| 8 | Pagination | **PASS** | Controlled by `appearance.paginationMode`: `pages` or `infinite` |
| 9 | Admin settings control page title/subtitle | **PASS** | Uses `newsPageTitle` / `newsPageSubtitle` with alias support |
| 10 | Original-source fallback for incomplete extractions | **PASS** | Opens `originalArticleUrl` when `fetchedFullText=false` and workflow allows |
| 11 | Framer Motion animations | **PASS** | Controlled by `appearance.animationLevel` |
| 12 | Dark mode support | **PASS** | Uses CSS variables and `dark:` Tailwind classes |

### Route: `/news/:slug` — SingleNewsPage (SingleNews.tsx)

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 1 | Full article display with HTML content | **PASS** | Sanitized HTML rendered |
| 2 | Cover image with fallback | **PASS** | Same fallback logic as list page |
| 3 | Source attribution and original link | **PASS** | Source name + external link to original |
| 4 | Share buttons | **PASS** | Same share template system as list |
| 5 | Related articles section | **PASS** | Up to 5 related items by matching tags or source |
| 6 | Back navigation | **PASS** | Back arrow to `/news` |
| 7 | Page title set dynamically | **PASS** | `document.title` updated with article title |

---

## B) Admin News Console Requirements

### Route: `/__cw_admin__/news/*` — AdminNewsConsole

| # | Section | Route | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | Dashboard | `/news/dashboard` | **PASS** | Status counts, fetch-now trigger, quick navigation |
| 2 | Pending Review | `/news/pending` | **PASS** | Filtered list with approve/draft/reject actions |
| 3 | Duplicate Queue | `/news/duplicates` | **PASS** | Filtered list with publish-anyway/merge/draft/reject |
| 4 | Drafts | `/news/drafts` | **PASS** | Editable drafts with publish/schedule actions |
| 5 | Published | `/news/published` | **PASS** | Published articles (read-only status) |
| 6 | Scheduled | `/news/scheduled` | **PASS** | Scheduled items showing `scheduledAt` |
| 7 | Rejected | `/news/rejected` | **PASS** | Rejected items (read-only status) |
| 8 | AI Selected | `/news/ai-selected` | **PASS** | AI-generated/curated filter view |
| 9 | RSS Sources | `/news/sources` | **PASS** | Full CRUD, test feed, fetch-now per source |
| 10 | Media Library | `/news/media` | **PASS** | Upload, browse, delete, copy URL |
| 11 | Exports | `/news/exports` | **PASS** | CSV/XLSX download with status/source/date filters |
| 12 | Audit Logs | `/news/audit-logs` | **PASS** | Immutable timeline with action/entity filters |
| 13 | Editor | `/news/editor/:id` | **PASS** | Rich text editor with status actions |
| 14 | Settings redirect | (redirects to settings center) | **PASS** | Links to `/__cw_admin__/settings/news-settings` |
| 15 | Sidebar navigation | — | **PASS** | `AdminGuardShell` wraps all sections |

### Route: `/__cw_admin__/settings/news-settings` — AdminSettingsNewsPage

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 1 | Appearance panel | **PASS** | Layout mode, density, widgets, animation, pagination |
| 2 | AI settings panel | **PASS** | Enable/disable, language, style, strict mode, sensitivity |
| 3 | Share templates panel | **PASS** | Edit templates with placeholder preview |
| 4 | Workflow settings | **PASS** | Scheduling toggle, auto-expire, fetch modes |
| 5 | Image defaults | **PASS** | Default banner, thumbnail, source icon URLs |

---

## C) Backend/Server Checks

### Models

| Model | Collection | Status | Notes |
| --- | --- | --- | --- |
| `NewsItem` | `news_items` | **PASS** | Full schema with status, source meta, AI meta, duplicate meta |
| `NewsSettings` | `news_settings` | **PASS** | Single-doc settings with deep-merge updates |
| `RssSource` | `rss_sources` | **PASS** | Feed config with interval, priority, category tags |
| `AuditLog` | `audit_logs` | **PASS** | Immutable admin action log |

### Controllers

| Controller | Endpoints | Status | Notes |
| --- | --- | --- | --- |
| `newsPublicController` | 5 endpoints | **PASS** | List, detail, settings, sources, share tracking |
| `newsAdminController` | 18 endpoints | **PASS** | Full CRUD + workflow + RSS + settings + export + audit + media |

### Services

| Service | Status | Notes |
| --- | --- | --- |
| `newsWorker` — RSS ingestion + scheduled publishing | **PASS** | `runRssIngestionForSources` + `runScheduledPublishing` |
| `newsSettingsService` — Settings CRUD with auto-create | **PASS** | `getNewsSettings` + `updateNewsSettings` with deep merge |
| `newsDefaults` — Default settings values | **PASS** | Comprehensive defaults for all settings fields |
| `newsAiService` — Extractive AI draft generation | **PASS** | `generateStrictExtractiveDraft` — no external API call, local extractive |
| `rssService` — RSS parsing + Readability scraping | **PASS** | `parseFeedItems` + `fetchReadableContent` + `getFullArticleContent` |
| `newsUtils` — HTML sanitization, canonical URLs, hashing, similarity | **PASS** | `sanitizeNewsHtml`, `canonicalizeUrl`, `normalizedHash`, `titleSimilarity`, `buildSharePayload` |
| `auditService` — Audit log writing | **PASS** | `writeNewsAuditLog` with actor, IP, user-agent |

### Routes and Wiring

| Check | Status | Notes |
| --- | --- | --- |
| `newsPublicRoutes.ts` mounted in `publicRoutes.ts` | **PASS** | `router.use(newsPublicRoutes)` |
| `newsAdminRoutes.ts` mounted in `adminRoutes.ts` | **PASS** | `router.use(newsAdminRoutes)` after `requireAdmin` |
| Admin rate limiter applied | **PASS** | 500 req / 15 min via `express-rate-limit` |
| Worker tick scheduled | **PASS** | `setInterval(runNewsWorkerTick, 60_000)` in `index.ts` |

### Duplicate Detection

| Check | Status | Notes |
| --- | --- | --- |
| URL-based detection | **PASS** | Canonical URL comparison (UTM params stripped) |
| GUID-based detection | **PASS** | RSS GUID exact match |
| Title similarity | **PASS** | Jaccard token similarity with configurable threshold |
| Same-source skip | **PASS** | Already-ingested items from same source are skipped |
| `duplicate_review` queue | **PASS** | Flagged items enter separate queue for admin decision |

### Full Article Extraction

| Mode | Status | Notes |
| --- | --- | --- |
| `rss_content` | **PASS** | Uses `content:encoded` from RSS feed |
| `readability_scrape` | **PASS** | Fetches page, parses with `@mozilla/readability` + `jsdom` |
| `both` | **PASS** | RSS content first, scrape fallback |

---

## D) Frontend API Client

| Function | Endpoint | Status |
| --- | --- | --- |
| `getPublicNewsV2List` | `GET /api/news` | **PASS** |
| `getPublicNewsV2BySlug` | `GET /api/news/:slug` | **PASS** |
| `getPublicNewsSettings` | `GET /api/news/settings` | **PASS** |
| `getPublicNewsSources` | `GET /api/news/sources` | **PASS** |
| `trackPublicNewsV2Share` | `POST /api/news/share/track` | **PASS** |
| `adminNewsV2GetDashboard` | `GET /api/admin/news/dashboard` | **PASS** |
| `adminNewsV2GetItems` | `GET /api/admin/news` | **PASS** |
| `adminNewsV2GetItemById` | `GET /api/admin/news/:id` | **PASS** |
| `adminNewsV2CreateItem` | `POST /api/admin/news` | **PASS** |
| `adminNewsV2UpdateItem` | `PUT /api/admin/news/:id` | **PASS** |
| `adminNewsV2ApprovePublish` | `POST /api/admin/news/:id/approve-publish` | **PASS** |
| `adminNewsV2Reject` | `POST /api/admin/news/:id/reject` | **PASS** |
| `adminNewsV2Schedule` | `POST /api/admin/news/:id/schedule` | **PASS** |
| `adminNewsV2MoveToDraft` | `POST /api/admin/news/:id/move-to-draft` | **PASS** |
| `adminNewsV2PublishAnyway` | `POST /api/admin/news/:id/duplicate/publish-anyway` | **PASS** |
| `adminNewsV2MergeDuplicate` | `POST /api/admin/news/:id/duplicate/merge` | **PASS** |
| `adminNewsV2BulkApprove` | `POST /api/admin/news/bulk-approve` | **PASS** |
| `adminNewsV2BulkReject` | `POST /api/admin/news/bulk-reject` | **PASS** |
| `adminNewsV2GetSources` | `GET /api/admin/rss-sources` | **PASS** |
| `adminNewsV2CreateSource` | `POST /api/admin/rss-sources` | **PASS** |
| `adminNewsV2UpdateSource` | `PUT /api/admin/rss-sources/:id` | **PASS** |
| `adminNewsV2DeleteSource` | `DELETE /api/admin/rss-sources/:id` | **PASS** |
| `adminNewsV2TestSource` | `POST /api/admin/rss-sources/:id/test` | **PASS** |
| `adminNewsV2FetchNow` | `POST /api/admin/rss/fetch-now` | **PASS** |
| `adminGetNewsSettings` | `GET /api/admin/news-settings` | **PASS** |
| `adminUpdateNewsSettings` | `PUT /api/admin/news-settings` | **PASS** |
| `adminNewsV2ExportNews` | `GET /api/admin/news/export` | **PASS** |
| `adminNewsV2UploadMedia` | `POST /api/admin/media/upload` | **PASS** |
| `adminGetNewsAuditLogs` | `GET /api/admin/audit-logs` | **PASS** |

---

## E) Responsive Checks

| Breakpoint | Status | Notes |
| --- | --- | --- |
| 360px (mobile) | **PASS** | Single-column layout, sidebars collapse, cards stack vertically |
| 768px (tablet) | **PASS** | 2-column possible, preview panel hidden |
| 1024px+ (desktop) | **PASS** | Full 3-column RSS reader layout |

---

## F) Design System Compliance

- [x] Uses `card-flat` class for card containers
- [x] Uses `btn-primary`, `btn-outline` for action buttons
- [x] Uses `input-field` for form inputs
- [x] Badge classes for status indicators (`badge-*`)
- [x] Framer Motion `motion.div` for section transitions
- [x] Dark mode via `dark:` Tailwind classes and CSS variables
- [x] Lucide icons throughout (Rss, Newspaper, Clock3, Sparkles, etc.)
- [x] React Query for all data fetching with proper cache invalidation
- [x] Toast notifications via `react-hot-toast`

---

## G) Route Coverage

| Frontend Route | Component | Backend Endpoint |
| --- | --- | --- |
| `/news` | `NewsPage` | `GET /api/news`, `GET /api/news/settings`, `GET /api/news/sources` |
| `/news/:slug` | `SingleNewsPage` | `GET /api/news/:slug`, `POST /api/news/share/track` |
| `/__cw_admin__/news/*` | `AdminNewsConsole` | All `/api/admin/news*` endpoints |
| `/__cw_admin__/settings/news-settings` | `AdminSettingsNewsPage` | `GET/PUT /api/admin/news-settings` |

---

## Resolved Issues

- Frontend build: `npm --prefix frontend run build` -> PASS (no news-related TS errors)
- Public settings client normalizes `pageTitle`/`newsPageTitle` and `pageSubtitle`/`newsPageSubtitle` aliases
- Cover image fallback honors both `coverImageSource` and `coverSource` field names
- Share template interpolation handles missing values gracefully
- Duplicate detection threshold configurable via `aiSettings.duplicateSensitivity`
- Worker tick guarded against concurrent execution (`tickRunning` flag)
