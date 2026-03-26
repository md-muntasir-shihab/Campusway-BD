# NEWS Admin Guide

## Admin Routes

| Route | Purpose |
| --- | --- |
| `/__cw_admin__/news/dashboard` | News dashboard — status counts, fetch-now button, quick access |
| `/__cw_admin__/news/pending` | Pending Review queue — incoming RSS items awaiting admin action |
| `/__cw_admin__/news/duplicates` | Duplicate Queue — items flagged by duplicate detection |
| `/__cw_admin__/news/drafts` | Drafts — saved or AI-generated drafts before publishing |
| `/__cw_admin__/news/published` | Published articles — live on public `/news` page |
| `/__cw_admin__/news/scheduled` | Scheduled articles — will auto-publish at `scheduledAt` |
| `/__cw_admin__/news/rejected` | Rejected articles — items removed from queues |
| `/__cw_admin__/news/ai-selected` | AI Selected — articles flagged as AI-generated or AI-curated |
| `/__cw_admin__/news/sources` | RSS Sources — CRUD for RSS feed sources |
| `/__cw_admin__/news/media` | Media Library — upload and manage cover images |
| `/__cw_admin__/news/exports` | Exports — download news data as CSV/XLSX |
| `/__cw_admin__/news/audit-logs` | Audit Logs — immutable timeline of admin actions |
| `/__cw_admin__/news/editor/:id` | Article Editor — edit title, content, tags, cover, status |
| `/__cw_admin__/settings/news-settings` | News Settings Center — appearance, AI, share templates, workflow |

---

## What Each Admin Section Controls

### 1) News Dashboard — `/__cw_admin__/news/dashboard`

| Feature | Description |
| --- | --- |
| Status counts | Pending, duplicates, drafts, published, scheduled, rejected totals |
| Fetch Now button | Triggers manual RSS ingestion for all enabled sources |
| Quick links | Navigate to any status queue or settings |

### 2) Article Queues — `/__cw_admin__/news/{status}`

Each queue (pending, duplicates, drafts, published, scheduled, rejected) shows a filtered list of news items with inline actions.

#### Available Actions Per Item

| Action | From Statuses | Result |
| --- | --- | --- |
| Approve & Publish | `pending_review`, `duplicate_review`, `draft` | Sets status to `published`, sets `publishedAt` |
| Schedule | `pending_review`, `draft` | Sets status to `scheduled`, sets `scheduledAt` |
| Save as Draft | `pending_review`, `duplicate_review` | Sets status to `draft` |
| Reject | `pending_review`, `duplicate_review`, `draft` | Sets status to `rejected` |
| Publish Anyway | `duplicate_review` only | Publishes despite duplicate flag |
| Merge Duplicate | `duplicate_review` only | Merges content/tags into the original, rejects this item |
| Edit | Any | Opens inline editor or `/news/editor/:id` |

#### Status Transition Rules

| From | Allowed Transitions |
| --- | --- |
| `pending_review` | `published`, `scheduled`, `draft`, `rejected` |
| `duplicate_review` | `published`, `draft`, `rejected` |
| `draft` | `published`, `scheduled`, `rejected` |
| `published` | — (terminal) |
| `scheduled` | `published` (auto or manual) |
| `rejected` | — (terminal) |

### 3) RSS Sources — `/__cw_admin__/news/sources`

| Setting | Field | Effect |
| --- | --- | --- |
| Source name | `name` | Display label for this feed |
| RSS URL | `rssUrl` | Feed URL to parse (required, unique) |
| Site URL | `siteUrl` | Homepage of the source |
| Icon type | `iconType` | `upload` or `url` |
| Icon URL | `iconUrl` | Source favicon/logo |
| Category tags | `categoryTags[]` | Default tags applied to items from this source |
| Enabled toggle | `enabled` | Whether this source is fetched by the worker |
| Fetch interval | `fetchIntervalMinutes` | `15`, `30`, `60`, or `360` minutes |
| Priority | `priority` | Lower = fetched first |
| Test source | — | Parses feed and previews first 5 items without saving |
| Fetch Now | — | Forces immediate ingestion for selected sources |

### 4) News Settings — `/__cw_admin__/settings/news-settings`

#### Appearance Settings

| Setting | Field | Effect |
| --- | --- | --- |
| Page title | `newsPageTitle` | Heading on public `/news` page |
| Page subtitle | `newsPageSubtitle` | Subheading on public `/news` page |
| Default banner URL | `defaultBannerUrl` | Fallback cover image for items without a cover |
| Default thumbnail URL | `defaultThumbUrl` | Fallback thumbnail for card views |
| Default source icon URL | `defaultSourceIconUrl` | Fallback icon for sources without one |
| Layout mode | `appearance.layoutMode` | `rss_reader`, `grid`, or `list` |
| Density | `appearance.density` | `compact` or `comfortable` |
| Animation level | `appearance.animationLevel` | `off`, `minimal`, or `normal` |
| Pagination mode | `appearance.paginationMode` | `infinite` scroll or `pages` |
| Show trending widget | `appearance.showWidgets.trending` | Toggle trending sidebar |
| Show latest widget | `appearance.showWidgets.latest` | Toggle latest sidebar |
| Show source sidebar | `appearance.showWidgets.sourceSidebar` | Toggle source filter sidebar |
| Show tag chips | `appearance.showWidgets.tagChips` | Toggle tag filter bar |
| Show preview panel | `appearance.showWidgets.previewPanel` | Toggle article preview pane |
| Show breaking ticker | `appearance.showWidgets.breakingTicker` | Toggle top breaking-news ticker |

#### AI Settings

| Setting | Field | Effect |
| --- | --- | --- |
| AI enabled | `aiSettings.enabled` | When off, RSS items stored as-is; when on, extractive draft is generated |
| Language | `aiSettings.language` | `bn`, `en`, or `mixed` |
| Style preset | `aiSettings.stylePreset` | `short`, `standard`, or `detailed` |
| Strict no-hallucination | `aiSettings.strictNoHallucination` | Enforces source-only content in AI drafts |
| Max length | `aiSettings.maxLength` | Max character count for AI-generated summary |
| Duplicate sensitivity | `aiSettings.duplicateSensitivity` | `strict` (0.92), `medium` (0.85), or `loose` (0.75) title-similarity threshold |

#### Share Templates

| Setting | Field | Effect |
| --- | --- | --- |
| WhatsApp template | `shareTemplates.whatsapp` | Template with `{title}`, `{summary}`, `{url}` placeholders |
| Facebook template | `shareTemplates.facebook` | Template for Facebook sharing |
| Messenger template | `shareTemplates.messenger` | Template for Messenger sharing |
| Telegram template | `shareTemplates.telegram` | Template for Telegram sharing |

#### Workflow Settings

| Setting | Field | Effect |
| --- | --- | --- |
| Default incoming status | `workflow.defaultIncomingStatus` | Status for new RSS items (always `pending_review`) |
| Allow scheduling | `workflow.allowScheduling` | Enable/disable scheduling for items |
| Auto-expire days | `workflow.autoExpireDays` | Optional auto-expiry for old items (null = disabled) |

#### Full Article Fetch

| Setting | Field | Effect |
| --- | --- | --- |
| Fetch full article | `fetchFullArticleEnabled` | Whether to attempt full-text extraction |
| Fetch mode | `fullArticleFetchMode` | `rss_content` (use RSS body), `readability_scrape` (Readability.js), or `both` (RSS first, scrape fallback) |

### 5) Media Library — `/__cw_admin__/news/media`

| Feature | Description |
| --- | --- |
| Upload file | Uploads image (max 10 MB) to `/uploads/` |
| From URL | Downloads image from a URL |
| Browse media | Paginated grid of uploaded media with search |
| Delete media | Removes uploaded file |
| Copy URL | Copy media URL for use in article editor |

### 6) Exports — `/__cw_admin__/news/exports`

| Feature | Description |
| --- | --- |
| Export news | Download filtered news items as CSV or XLSX |
| Export sources | Download RSS source list as CSV or XLSX |
| Export audit logs | Download audit log as CSV or XLSX |
| Filters | Status, source, date range |

### 7) Audit Logs — `/__cw_admin__/news/audit-logs`

| Feature | Description |
| --- | --- |
| Log entries | Immutable timeline: create, edit, publish, reject, schedule, delete, export, fetch, mark_duplicate |
| Filter by action | Filter logs by action type |
| Filter by entity | Filter by target type (news, rss_source, news_settings, media) |
| Pagination | Paginated with 50 items per page |

---

## News Item Lifecycle

```text
RSS Feed → Parse → Duplicate Check → [AI Draft (if enabled)] → Queue as pending_review or duplicate_review
                                                                           ↓
                                                            Admin Review (Dashboard)
                                                                           ↓
                                                    ┌──────────┬───────────┬──────────┐
                                                    ↓          ↓           ↓          ↓
                                                 Publish   Schedule    Draft      Reject
                                                    ↓          ↓           ↓
                                                  Live     Cron auto   Edit more
                                                           publishes
```

---

## Backend Worker

The news worker runs every 60 seconds via `setInterval` in the server entry point. Each tick:

1. Fetches all enabled RSS sources that are due (based on `fetchIntervalMinutes` and `lastFetchedAt`)
2. Parses feed items and checks for duplicates (URL, GUID, title similarity)
3. Optionally generates AI extractive drafts
4. Creates `news_items` documents with appropriate status
5. Publishes any `scheduled` items whose `scheduledAt` has passed
