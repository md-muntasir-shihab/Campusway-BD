### Home UI – Featured Universities & Cluster Filters

- **Shared `UniversityCard` usage**: The existing `UniversityCard` component (used by `UniversityGrid` and timeline items) is now also the single card used for the featured universities row, admission deadline previews, and upcoming exam previews, ensuring one consistent visual style across all university cards.
- **Universities area integration**: Inside `HomeModernPage`, the universities-related section (`universityDashboard`) continues to host filters and the main grid; the **Featured Universities** row is rendered as a horizontal, snap-scrolling sub-block within this card, while deadline and exam previews use the same card component via `TimelineList`, satisfying the “no new numbered section” requirement.
- **Cluster filters**: Category chips are backed by `data.universityDashboardData.categories`, while cluster chips now respect `uniSettings.enableClusterFilterOnHome` and derive available cluster groups from the current category; the selected cluster is applied consistently to:
  - the main universities grid,
  - the Featured Universities row,
  - the closing-soon and exam-soon timelines (both the “Happening Now” section and the closing/exam widget).
- **Search behavior**: The hero search input now filters:
  - universities (dashboard grid and featured row) via `matchesUniversityFilters`,
  - admission deadline & upcoming exam previews via filtered `closingSoonItems` / `examSoonItems`,
  - news preview cards,
  - resources preview cards,
  while the quick search dropdown suggests top matches across universities, news, exams, and resources.
- **Adapter for `/api/home`**: `normalizeHomePayload` continues to act as the adapter from raw `/api/home` responses (and legacy fallbacks) into the `HomeApiResponse` UI model; the new filter logic operates solely on this normalized shape so backend extensions like `universityCategories`, `uniSettings`, and future `featuredUniversities`/`deadlineUniversities` can be wired in without breaking the UI.
- **Animation & theme**: All new/updated pieces (featured row, filtered timelines) use the existing `Card` + Framer Motion helpers and token-based Tailwind classes, so dark/light contrast, hover lift (desktop only), and fade-in behavior remain consistent with the rest of the page.

