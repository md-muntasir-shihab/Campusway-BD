### CampusWay News Workflow

- **Sources**: RSS feeds configured in `NewsSource` (rss_sources) and manual/AI-created items.
- **Ingest**: `startNewsV2CronJobs` runs `runDueSourceIngestion`, which calls `ingestFromSources` in `newsV2Controller` to fetch enabled sources on their `fetchIntervalMinutes`.
- **Full article fetch**: For each RSS item, `resolveFullArticleContent` decides whether to use RSS content, Readability scraping, or both based on `news_settings.fetchFullArticleEnabled` and `fullArticleFetchMode`, always sanitizing HTML.
- **Duplicate check**: Ingest computes `duplicateKeyHash` from canonical URL/guid/title and probes existing `News` by URL, guid, and title similarity to decide between `status='pending_review'` and `status='duplicate_review'`.
- **Queues**: New items enter either the **Pending Review** queue (`pending_review`) or the **Duplicate Review** queue (`duplicate_review`) and remain there until an explicit admin action (publish/schedule/draft/reject/delete).
- **AI drafts (optional)**: If `aiSettings.enabled=true`, RSS items in `pending_review` may get AI-generated title/summary/content/tags via strict prompts that only use `rssRaw*` fields and must not hallucinate; insufficient content yields `aiNotes='insufficient content'`.
- **Admin decisions**: From the admin console, each item can be **Approve & Publish**, **Schedule**, **Edit then Publish**, **Save as Draft**, or **Reject`; duplicates additionally support **Publish anyway**, **Merge into existing**, or **Keep as Draft**.
- **Publish & schedule**: Immediate publish changes `status` to `published` and sets `publishedAt`; scheduled items use `status='scheduled'` and `scheduledAt`, and `runScheduledNewsPublish` promotes them to `published` when due.
- **Public display**: Public `/news` and `/news/:slug` consume only `published` items, applying default banners/thumbs from `news_settings` whenever `coverImageUrl` is missing or `coverSource/coverImageSource='default'`.

