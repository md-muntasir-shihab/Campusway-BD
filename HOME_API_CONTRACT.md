# HOME API Contract (`GET /api/home`)

## Endpoint

```
GET /api/home
Authorization: optional (Bearer JWT via cookie/header)
```

Returns different `onlineExamsPreview.loggedIn` / `hasActivePlan` values based on auth state.

---

## Required Top-Level Keys

All of the following MUST be present in every successful response:

| Key | Type | Description |
|-----|------|-------------|
| `siteSettings` | object | Global site branding (name, logo, social links) |
| `homeSettings` | object | All home page settings (section visibility, thresholds, counts, texts) |
| `campaignBannersActive` | array | Active + scheduled `home_ads` slot banners |
| `featuredUniversities` | array | Admin-ordered featured universities |
| `universityCategories` | array | Categories with per-category clusterGroups |
| `deadlineUniversities` | array | Universities with deadline within `deadlineWithinDays` |
| `upcomingExamUniversities` | array | Universities with exam within `examWithinDays` |
| `onlineExamsPreview` | object | Online exam items + auth/subscription state |
| `newsPreviewItems` | array | Latest published news (capped by `newsPreview.maxItems`) |
| `resourcePreviewItems` | array | Public resources (capped by `resourcesPreview.maxItems`) |

---

## Backward-Compatible Keys (still returned)

| Key | Notes |
|-----|-------|
| `globalSettings` | Same as `siteSettings` + `theme` field |
| `homeAdsBanners` | Alias for `campaignBannersActive` |
| `examsWidget` | Alias: `{ liveNow, upcoming }` for online exams |
| `newsPreview` | Alias for `newsPreviewItems` |
| `resourcesPreview` | Alias for `resourcePreviewItems` |

---

## Full Response Shape

```ts
{
  // ── REQUIRED KEYS ──────────────────────────────────────────────────────────

  siteSettings: {
    websiteName: string;
    logoUrl: string;
    motto: string;
    contactEmail: string;
    contactPhone: string;
    socialLinks: {
      facebook?: string;
      whatsapp?: string;
      telegram?: string;
      twitter?: string;
      youtube?: string;
      instagram?: string;
    };
  };

  homeSettings: {
    sectionVisibility: {
      hero: boolean;
      subscriptionBanner: boolean;
      stats: boolean;
      timeline: boolean;
      universityDashboard: boolean;
      closingExamWidget: boolean;
      examsWidget: boolean;
      newsPreview: boolean;
      resourcesPreview: boolean;
      socialStrip: boolean;
      adsSection: boolean;
      footer: boolean;
    };
    hero: {
      pillText: string;
      title: string;
      subtitle: string;
      showSearch: boolean;
      searchPlaceholder: string;
      primaryCTA: { label: string; url: string };
      secondaryCTA: { label: string; url: string };
      heroImageUrl: string;
    };
    universityPreview: {
      enabled: boolean;
      maxFeaturedItems: number;
      maxDeadlineItems: number;
      maxExamItems: number;
      deadlineWithinDays: number;
      examWithinDays: number;
      featuredMode: 'manual' | 'auto';
      enableClusterFilter: boolean;
      defaultActiveCategory: string;
    };
    newsPreview: {
      enabled: boolean;
      title: string;
      subtitle: string;
      maxItems: number;
      ctaLabel: string;
      ctaUrl: string;
    };
    resourcesPreview: {
      enabled: boolean;
      title: string;
      subtitle: string;
      maxItems: number;
      ctaLabel: string;
      ctaUrl: string;
    };
    examsWidget: {
      enabled: boolean;
      title: string;
      subtitle: string;
      maxLive: number;
      maxUpcoming: number;
      showLockedExamsToUnsubscribed: 'show_locked' | 'hide';
      loginRequiredText: string;
      subscriptionRequiredText: string;
    };
    adsSection: { enabled: boolean; title: string };
    universityCardConfig: {
      defaultUniversityLogo: string;
      showSeats: boolean;
      showExamDates: boolean;
      showAddress: boolean;
      showEmail: boolean;
      showApplicationProgress: boolean;
      closingSoonDays: number;
      cardDensity: 'compact' | 'comfortable';
      defaultSort: 'nearest_deadline' | 'alphabetical';
    };
    // ... stats, timeline, subscriptionBanner, socialStrip, footer, ui sections
  };

  campaignBannersActive: Array<{
    _id: string;
    title?: string;
    subtitle?: string;
    imageUrl: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
  }>;

  featuredUniversities: ApiUniversityCardPreview[];   // ordered per admin settings

  universityCategories: Array<{
    categoryName: string;
    count: number;
    clusterGroups: string[];   // empty array when no clusters for this category
  }>;

  deadlineUniversities: ApiUniversityCardPreview[];   // within deadlineWithinDays

  upcomingExamUniversities: ApiUniversityCardPreview[];  // within examWithinDays

  onlineExamsPreview: {
    loggedIn: boolean;
    hasActivePlan: boolean;
    liveNow: HomeExamWidgetItem[];
    upcoming: HomeExamWidgetItem[];
    items: HomeExamWidgetItem[];   // liveNow + upcoming combined
  };

  newsPreviewItems: Array<{
    _id: string;
    title: string;
    slug?: string;
    shortSummary?: string;
    shortDescription?: string;
    category?: string;
    sourceName?: string;
    publishDate?: string;
    coverImageUrl?: string;
    featuredImage?: string;
    thumbnailImage?: string;
  }>;

  resourcePreviewItems: Array<{
    _id: string;
    title: string;
    description?: string;
    type?: string;
    fileUrl?: string;
    externalUrl?: string;
    thumbnailUrl?: string;
    category?: string;
    isFeatured?: boolean;
    publishDate?: string;
  }>;

  // ── ADDITIONAL KEYS ────────────────────────────────────────────────────────

  uniSettings: {
    enableClusterFilterOnHome: boolean;
    defaultCategory: string;
  };

  stats: {
    values: Record<string, number>;
    items: Array<{ key: string; label: string; enabled: boolean; value: number }>;
  };

  timeline: {
    serverNow: string;
    closingSoonItems: HomeTimelineItem[];
    examSoonItems: HomeTimelineItem[];
  };

  universityDashboardData: {
    categories: Array<{ key: string; label: string; count: number; isHighlighted?: boolean; badgeText?: string }>;
    filtersMeta: {
      totalItems: number;
      statuses: Array<{ value: string; label: string; count: number }>;
      defaultCategory: string;
      showFilters: boolean;
      defaultSort: 'nearest_deadline' | 'alphabetical';
      clusterGroups: string[];
    };
    highlightedCategories: Array<{ category: string; order: number; badgeText?: string }>;
    featuredItems: ApiUniversityCardPreview[];
    itemsPreview: ApiUniversityCardPreview[];
  };

  subscriptionPlans: AdminSubscriptionPlan[];
  subscriptionBannerState: { loggedIn: boolean; hasActivePlan: boolean; expiry: string | null; reason: string };
  socialLinks: Record<string, string>;

  // backward-compat aliases
  globalSettings: { websiteName: string; logoUrl: string; motto: string; contactEmail: string; contactPhone: string; theme: Record<string, unknown>; socialLinks: Record<string, string> };
  homeAdsBanners: typeof campaignBannersActive;
  examsWidget: { liveNow: HomeExamWidgetItem[]; upcoming: HomeExamWidgetItem[] };
  newsPreview: typeof newsPreviewItems;
  resourcesPreview: typeof resourcePreviewItems;
}
```

---

## Key Types

### `ApiUniversityCardPreview`
```ts
{
  id: string;
  name: string;
  shortForm: string;         // 'N/A' when missing
  slug: string;
  category: string;
  clusterGroup: string;
  contactNumber: string;
  established: number | null;
  address: string;
  email: string;
  website: string;
  admissionWebsite: string;
  totalSeats: string;        // 'N/A' or numeric string
  scienceSeats: string;
  artsSeats: string;
  businessSeats: string;
  applicationStartDate: string;  // ISO string or ''
  applicationEndDate: string;
  scienceExamDate: string;
  artsExamDate: string;
  businessExamDate: string;
  examCentersPreview: string[];  // city names, max 6
  shortDescription: string;
  logoUrl: string;
}
```

### `HomeExamWidgetItem`
```ts
{
  id: string;
  title: string;
  subject: string;
  status: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  isLocked: boolean;
  lockReason: 'none' | 'login_required' | 'subscription_required';
  canJoin: boolean;
  joinUrl: string;
}
```

---

## Admin-Controlled Feed-Through

| Admin Setting | Effect on `/api/home` |
|---------------|----------------------|
| `homeSettings.hero.*` | Hero text, search placeholder, CTAs, image |
| `homeSettings.universityPreview.deadlineWithinDays` | Filters `deadlineUniversities` window |
| `homeSettings.universityPreview.maxDeadlineItems` | Caps `deadlineUniversities` count |
| `homeSettings.universityPreview.examWithinDays` | Filters `upcomingExamUniversities` window |
| `homeSettings.universityPreview.maxExamItems` | Caps `upcomingExamUniversities` count |
| `homeSettings.universityPreview.maxFeaturedItems` | Caps `featuredUniversities` count |
| `homeSettings.universityPreview.featuredMode` | `'manual'` (slug list) or `'auto'` (nearest deadline) |
| `homeSettings.newsPreview.maxItems` | Caps `newsPreviewItems` count |
| `homeSettings.resourcesPreview.maxItems` | Caps `resourcePreviewItems` count |
| `homeSettings.adsSection.enabled` | Controls campaign banners section visibility |
| `uniSettings.featuredUniversitySlugs` | Ordered slugs → `featuredUniversities` order |
| `uniSettings.defaultCategory` | Default category chip on Home |
| `uniSettings.enableClusterFilterOnHome` | Enables cluster chips on Home |
| `uniSettings.categoryOrder` | Sort order of `universityCategories` |
| `siteSettings.*` | `websiteName`, `logoUrl`, `socialLinks` in `siteSettings` |
| Active `home_ads` banners | Populate `campaignBannersActive` (schedule-filtered) |

---

## Reliability Guarantees

- All array fields normalized to `[]` defensively (no crash on missing data).
- Frontend: React Query key `['home']`, `staleTime=60s`, `refetchInterval=90s`, `retry=1`.
- Skeleton shown during load; error state has inline retry button.
