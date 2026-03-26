 # NEWS API Contract

## Public Endpoints

### `GET /api/news`

Returns paginated published news list.

**Query Parameters:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | number | `1` | Page number |
| `limit` | number | `12` | Items per page (max 50) |
| `sourceId` | string | — | Filter by RSS source ID |
| `tag` | string | — | Filter by tag |
| `q` | string | — | Search title, summary, source name |

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "string",
        "status": "published",
        "title": "string",
        "slug": "string",
        "shortSummary": "string",
        "fullContent": "string (HTML)",
        "coverImageUrl": "string | null",
        "coverSource": "rss | admin | default",
        "tags": ["string"],
        "category": "string",
        "sourceName": "string",
        "sourceUrl": "string",
        "originalArticleUrl": "string",
        "publishedAt": "ISO datetime",
        "rssPublishedAt": "ISO datetime | null",
        "fetchedFullText": true,
        "isAiGenerated": false,
        "shareText": { "whatsapp": "...", "facebook": "...", "messenger": "...", "telegram": "..." },
        "shareLinks": { "whatsapp": "url", "facebook": "url", "messenger": "url", "telegram": "url" },
        "shareUrl": "string",
        "createdAt": "ISO datetime",
        "updatedAt": "ISO datetime"
      }
    ],
    "total": 42,
    "page": 1,
    "pages": 4
  }
}
```

### `GET /api/news/:slug`

Returns single published news item by slug with related articles.

**Response:**

```json
{
  "success": true,
  "data": {
    "item": {
      "_id": "string",
      "title": "string",
      "slug": "string",
      "shortSummary": "string",
      "fullContent": "string (HTML)",
      "coverImageUrl": "string | null",
      "coverSource": "rss | admin | default",
      "tags": ["string"],
      "category": "string",
      "sourceName": "string",
      "sourceUrl": "string",
      "originalArticleUrl": "string",
      "publishedAt": "ISO datetime",
      "shareText": {},
      "shareLinks": {},
      "shareUrl": "string"
    },
    "related": [
      { "_id": "string", "title": "string", "slug": "string", "coverImageUrl": "string | null" }
    ]
  }
}
```

### `GET /api/news/settings`

Returns public-safe news settings (no API keys or admin-only fields).

**Response:**

```json
{
  "success": true,
  "data": {
    "newsPageTitle": "CampusWay News",
    "newsPageSubtitle": "Latest verified updates",
    "defaultBannerUrl": "string",
    "defaultThumbUrl": "string",
    "defaultSourceIconUrl": "string",
    "appearance": {
      "layoutMode": "rss_reader",
      "density": "comfortable",
      "showWidgets": {
        "trending": true,
        "latest": true,
        "sourceSidebar": true,
        "tagChips": true,
        "previewPanel": true,
        "breakingTicker": false
      },
      "animationLevel": "normal",
      "paginationMode": "pages"
    },
    "shareTemplates": {
      "whatsapp": "{title}\n{url}",
      "facebook": "{title} {url}",
      "messenger": "{title} {url}",
      "telegram": "{title}\n{url}"
    },
    "workflow": { "allowScheduling": true }
  }
}
```

### `GET /api/news/sources`

Returns enabled RSS sources with published article counts.

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "string",
        "name": "string",
        "rssUrl": "string",
        "siteUrl": "string",
        "iconUrl": "string",
        "categoryTags": ["string"],
        "count": 12
      }
    ]
  }
}
```

### `POST /api/news/share/track`

Tracks a share event (analytics).

**Body:** `{ "slug": "string", "channel": "whatsapp | facebook | messenger | telegram" }`

**Response:** `{ "success": true, "data": { "ok": true, "slug": "...", "channel": "..." } }`

---

## Admin Endpoints

All admin endpoints require `Authorization: Bearer <JWT>` and admin role. Prefix: `/api/admin`.

### `GET /api/admin/news`

Returns paginated admin news list with optional filters.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `status` | string | — | Filter: `pending_review`, `duplicate_review`, `draft`, `published`, `scheduled`, `rejected`, `all` |
| `sourceId` | string | — | Filter by source ObjectId |
| `isAiSelected` | string | — | `true` to filter AI-selected items |
| `q` | string | — | Search title, summary, source name |

**Response:** `{ "success": true, "data": { "items": [...], "total": N, "page": N, "pages": N } }`

### `GET /api/admin/news/:id`

Returns single news item by ID (any status).

### `POST /api/admin/news`

Creates a manually-authored news item.

**Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | string | yes | Article title |
| `shortSummary` | string | no | Summary text |
| `fullContent` | string | no | HTML content |
| `status` | string | no | Default `draft` |
| `tags` | string[] | no | Tags array |
| `category` | string | no | Default `education` |
| `coverImageUrl` | string | no | Cover image URL |
| `coverSource` | string | no | `rss`, `admin`, or `default` |
| `scheduledAt` | string | no | ISO datetime for scheduling |
| `originalArticleUrl` | string | no | Original source URL |
| `sourceName` | string | no | Default `CampusWay` |

### `PUT /api/admin/news/:id`

Updates an existing news item (same body as create).

### `DELETE /api/admin/news/:id`

Deletes a news item permanently.

### `POST /api/admin/news/:id/approve-publish`

Approves and publishes an item. Validates status transition rules.

### `POST /api/admin/news/:id/reject`

Rejects an item. Only from `pending_review`, `duplicate_review`, or `draft`.

### `POST /api/admin/news/:id/schedule`

Schedules an item for future publishing.

**Body:** `{ "scheduledAt": "ISO datetime" }`

Requires `workflow.allowScheduling = true` in settings.

### `POST /api/admin/news/:id/move-to-draft`

Moves an item to draft status.

### `POST /api/admin/news/:id/duplicate/publish-anyway`

Publishes a `duplicate_review` item despite duplicate flag.

### `POST /api/admin/news/:id/duplicate/merge`

Merges a `duplicate_review` item into its duplicate target.

**Body:** `{ "targetNewsId": "string" }`

Merges tags and appends source link to target's content. Rejects the source item.

---

## RSS Source Endpoints

### `GET /api/admin/rss-sources`

Lists all RSS sources sorted by priority.

### `POST /api/admin/rss-sources`

Creates a new RSS source.

**Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Display name |
| `rssUrl` | string | yes | Feed URL |
| `siteUrl` | string | no | Homepage URL |
| `iconType` | string | no | `upload` or `url` |
| `iconUrl` | string | no | Icon URL |
| `categoryTags` | string[] | no | Default tags |
| `enabled` | boolean | no | Default `true` |
| `fetchIntervalMinutes` | number | no | `15`, `30`, `60`, or `360` (default `30`) |
| `priority` | number | no | Sort order (default `0`) |

### `PUT /api/admin/rss-sources/:id`

Updates an RSS source (partial patch).

### `DELETE /api/admin/rss-sources/:id`

Deletes an RSS source.

### `POST /api/admin/rss-sources/:id/test`

Parses the source feed and returns first 5 preview items without saving.

### `POST /api/admin/rss/fetch-now`

Triggers immediate RSS ingestion.

**Body:** `{ "sourceIds": ["id1", "id2"] }` (empty array = all enabled sources)

---

## Settings Endpoints

### `GET /api/admin/news-settings`

Returns full news settings document.

### `PUT /api/admin/news-settings`

Updates news settings with deep-merge semantics.

---

## Export & Audit Endpoints

### `GET /api/admin/news/export`

Downloads news data as CSV or XLSX.

| Param | Type | Description |
| --- | --- | --- |
| `type` | string | `csv` or `xlsx` (default `xlsx`) |
| `status` | string | Filter by status |
| `sourceId` | string | Filter by source |
| `dateRange` | string | `from,to` ISO dates |

### `GET /api/admin/audit-logs`

Returns paginated audit logs.

| Param | Type | Description |
| --- | --- | --- |
| `module` | string | Filter by module (e.g. `news`) |
| `page` | number | Page number |
| `limit` | number | Items per page (max 100, default 50) |

### `POST /api/admin/media/upload`

Uploads a media file (multipart, max 10 MB).

Returns `{ "url": "/uploads/filename", "filename": "...", "size": N }`.

---

## Collections

| Collection | Model | Description |
| --- | --- | --- |
| `news_items` | `NewsItem` | All news articles (RSS and manual) |
| `news_settings` | `NewsSettings` | Single-document settings (key `default`) |
| `rss_sources` | `RssSource` | RSS feed source configurations |
| `audit_logs` | `AuditLog` | Admin action audit trail |

## Indexes

| Collection | Index | Purpose |
| --- | --- | --- |
| `news_items` | `{ status: 1, createdAt: -1 }` | Status queue queries |
| `news_items` | `{ originalArticleUrl: 1 }` | Duplicate detection by URL |
| `news_items` | `{ rssGuid: 1 }` | Duplicate detection by GUID |
| `news_items` | `{ duplicateKeyHash: 1 }` | Hash-based duplicate lookup |
| `news_items` | `{ scheduledAt: 1 }` | Scheduled publishing queries |
| `news_items` | `{ slug: 1 }` (unique) | Public slug lookup |
| `rss_sources` | `{ enabled: 1, priority: 1 }` | Worker source selection |
| `rss_sources` | `{ updatedAt: -1 }` | Recent activity |
