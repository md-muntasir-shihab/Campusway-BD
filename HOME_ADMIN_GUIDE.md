# HOME Admin Guide

## Admin Routes

| Route | Purpose |
|-------|---------|
| `/__cw_admin__/settings/home-control` | All home page section text, visibility toggles, thresholds, counts, hero/banner/exam/news/resources settings |
| `/__cw_admin__/settings/university-settings` | Featured university ordering, default category, cluster filter toggles |
| `/__cw_admin__/settings/site-settings` | Global branding: logo, site name, social links, contact info |
| `/__cw_admin__/settings/banner-manager` | Campaign banners CRUD: create/edit/delete, reorder, schedule (start/end date), enable/disable, slot assignment (`home_ads`) |

---

## What Each Admin Setting Controls on Home

### 1) Home Control — `/__cw_admin__/settings/home-control`

#### Search Bar (Home Section 1)
| Setting | Field | Effect |
|---------|-------|--------|
| Search placeholder text | `hero.searchPlaceholder` | Sticky search bar placeholder |
| Show search bar toggle | `hero.showSearch` | Show/hide search bar entirely |

#### Hero Banner (Home Section 2)
| Setting | Field | Effect |
|---------|-------|--------|
| Pill text | `hero.pillText` | Small label above title |
| Title | `hero.title` | Main hero heading |
| Subtitle | `hero.subtitle` | Hero description paragraph |
| Hero image URL | `hero.heroImageUrl` | Right-side hero image (desktop only) |
| Primary CTA label + URL | `hero.primaryCTA` | Left primary button |
| Secondary CTA label + URL | `hero.secondaryCTA` | Left secondary button |
| Hero section visibility | `sectionVisibility.hero` | Toggle entire hero section |

#### Campaign Banners (Home Section 3)
| Setting | Field | Effect |
|---------|-------|--------|
| Ads section enabled | `adsSection.enabled` + `sectionVisibility.adsSection` | Show/hide campaign banners section |
| Ads section title | `adsSection.title` | Section heading |
| Banner CRUD + schedule | Banner Manager (`home_ads` slot) | Add/remove/reorder banners; set start/end datetime; enable/disable individually |

#### Featured Universities (Additional Row — between Campaign Banners and Deadlines)
| Setting | Location | Effect |
|---------|----------|--------|
| Featured university slugs (ordered) | University Settings → Featured Slugs | Drives ordering of  `featuredUniversities` returned by API |
| Max featured items | `universityPreview.maxFeaturedItems` / University Settings | Caps how many appear |
| Featured mode | `universityPreview.featuredMode` | `manual` = slug list; `auto` = nearest deadline |

#### Admission Deadline Cards (Home Section 4)
| Setting | Field | Effect |
|---------|-------|--------|
| Deadline window (days) | `universityPreview.deadlineWithinDays` | Universities closing within N days |
| Max deadline cards | `universityPreview.maxDeadlineItems` | How many cards shown |
| University area visibility | `universityPreview.enabled` + `sectionVisibility.universityDashboard` | Toggle deadline + exam + featured area |

#### Upcoming Exams Cards (Home Section 5)
| Setting | Field | Effect |
|---------|-------|--------|
| Exam window (days) | `universityPreview.examWithinDays` | Universities with exam within N days |
| Max exam cards | `universityPreview.maxExamItems` | How many cards shown |

#### Category + Cluster Filters (on Deadline / Exam sections)
| Setting | Field / Location | Effect |
|---------|-----------------|--------|
| Highlighted categories | `highlightedCategories` in Home Control | Which categories appear first/highlighted |
| Default category | `universityPreview.defaultActiveCategory` | Which chip is selected by default |
| Enable cluster filter | `universityPreview.enableClusterFilter` | Enables cluster chips on Home |
| Cluster filter global toggle | University Settings → `enableClusterFilterOnHome` | Master switch for cluster chips |

#### Online Exam Preview (Home Section 6)
| Setting | Field | Effect |
|---------|-------|--------|
| Exams widget visibility | `sectionVisibility.examsWidget` + `examsWidget.enabled` | Toggle entire online exams section |
| Max live exams | `examsWidget.maxLive` | Cap on live exam cards |
| Max upcoming exams | `examsWidget.maxUpcoming` | Cap on upcoming exam cards |
| Show locked exams | `examsWidget.showLockedExamsToUnsubscribed` | `show_locked` = show with lock badge; `hide` = hidden |
| Login required text | `examsWidget.loginRequiredText` | Message shown on locked exam cards |
| Subscription required text | `examsWidget.subscriptionRequiredText` | Message shown for subscribed-only exams |

#### Latest News Preview (Home Section 7)
| Setting | Field | Effect |
|---------|-------|--------|
| News preview visibility | `sectionVisibility.newsPreview` + `newsPreview.enabled` | Toggle news preview section |
| Section title / subtitle | `newsPreview.title`, `newsPreview.subtitle` | Heading and description |
| Max news items | `newsPreview.maxItems` | How many news cards shown (1–12) |
| View all CTA | `newsPreview.ctaLabel`, `newsPreview.ctaUrl` | "View all" button text and target |

#### Resources Preview (Home Section 8)
| Setting | Field | Effect |
|---------|-------|--------|
| Resources preview visibility | `sectionVisibility.resourcesPreview` + `resourcesPreview.enabled` | Toggle resources section |
| Section title / subtitle | `resourcesPreview.title`, `resourcesPreview.subtitle` | Heading and description |
| Max resource items | `resourcesPreview.maxItems` | How many resource cards shown (1–12) |
| View all CTA | `resourcesPreview.ctaLabel`, `resourcesPreview.ctaUrl` | "View all" button text and target |

---

### 2) University Settings — `/__cw_admin__/settings/university-settings`

| Setting | Effect on Home |
|---------|---------------|
| `featuredUniversitySlugs` (drag-reorder) | Controls order of Featured Universities row |
| `maxFeaturedItems` | Caps how many featured universities shown |
| `defaultCategory` | Default category chip selected on Home |
| `enableClusterFilterOnHome` | Master toggle for Home cluster chips |
| `categoryOrder` | Order of category chips on Home |
| `highlightedCategories` | Which categories appear first/highlighted in chips |

---

### 3) Site Settings — `/__cw_admin__/settings/site-settings`

| Setting | Effect on Home |
|---------|---------------|
| `websiteName` | Exposed in `siteSettings.websiteName` (used in page title) |
| `logo` | Exposed in `siteSettings.logoUrl` (used in Navbar) |
| `motto` | Exposed in `siteSettings.motto` |
| `contactEmail` | Exposed in `siteSettings.contactEmail` |
| `contactPhone` | Exposed in `siteSettings.contactPhone` |
| Social links (facebook/whatsapp/telegram/twitter/youtube/instagram) | `siteSettings.socialLinks` (social strip on Home) |

---

## Save Behavior and Instant Home Refresh

### Home Control save
- API: `PUT /api/<admin_path>/home-settings`
- Frontend: success/error toast + invalidates `['home']` React Query key
- Backend: broadcasts `home-updated` via SSE stream

### University Settings save
- API: `PUT /api/<admin_path>/settings/university`
- Frontend: success/error toast + invalidates `['home']`, `['university-categories']`, `['universities']` keys
- Backend: broadcasts `category-updated` via SSE stream

### Site Settings save
- API: `PUT /api/<admin_path>/settings/site`
- Frontend: success/error toast + invalidates site/home/plans query groups

### Banner Manager save
- Changes to `home_ads` banners immediately affect `campaignBannersActive` in next `/api/home` call
- Schedule enforcement (start/end dates) is applied server-side

---

## UX and Reliability

- Save buttons are **disabled while mutation is pending** in all three admin sections.
- **Success / error toasts** present in all save flows.
- Home page auto-refreshes within 90 seconds via React Query `refetchInterval`.
- SSE stream (`/api/home/stream`) triggers instant React Query invalidation on admin saves.
