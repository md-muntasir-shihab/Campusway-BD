### QA Report – Public News Module

#### Viewports & responsiveness
- [ ] Verify `/news` and `/news/:slug` render correctly at **360px**, **768px**, **1024px**, and **1440px** widths.
- [ ] Confirm RSS reader layout: source sidebar (left), compact feed (center), preview panel (right) on desktop; single-column cards and bottom-sheet filters on mobile.
- [ ] Check that admin and student headers/footers hide correctly on full-screen routes (no layout overlap).

#### Dark/light mode and typography
- [ ] Ensure background/text contrast is sufficient in both themes, particularly for body copy in article view.
- [ ] Confirm article content container uses `prose` with `dark:prose-invert` and that headings, links, code, and lists remain legible.

#### Default banner and media handling
- [ ] For news without `coverImageUrl` or with `coverSource/coverImageSource='default'`, confirm the banner and thumbnail use `news_settings.defaultBannerUrl`/`defaultThumbUrl`.
- [ ] Change default banner in `news-settings` and confirm **old items without images automatically pick up** the new banner.
- [ ] Validate that broken images fall back gracefully to `/logo.png` with object-contain styling where implemented.

#### Filters, sources, and tags
- [ ] In `/news`, confirm source filter, category chips, tag chips, and search work individually and in combination.
- [ ] Ensure the bottom-sheet filter on mobile shows the same options as the desktop sidebar.
- [ ] Validate that source counts and labels match backend statistics.

#### Share buttons and templates
- [ ] On list cards and article pages, verify WhatsApp/Facebook/Messenger/Telegram buttons open correct share URLs and include article URL/title.
- [ ] Confirm **Copy link** copies the canonical URL (slug-based) to the clipboard.
- [ ] Confirm **Copy text** includes at least title + URL and respects any configured share templates.
- [ ] Ensure share tracking calls `/api/news-v2/share/track` (or alias) and returns 2xx without blocking the UI on failure.

#### Data integrity & errors
- [ ] Confirm published-only items appear in public lists; drafts/pending/duplicate/scheduled/rejected never leak to public endpoints.
- [ ] Validate API calls from `/news` and `/news/:slug` return no 404/500 for happy paths.
- [ ] Check skeleton loaders and empty states render correctly when there is no news or filters eliminate all results.

