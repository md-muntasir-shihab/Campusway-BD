### QA Report – Home Featured Universities & Cluster Filters

#### Layout & sections
- [ ] Verify the home page still renders the existing sections in their original order (search/hero, banners, university area, exams, news, resources, etc.) with no unexpected new top-level sections.
- [ ] Confirm the **Featured Universities** row appears as a sub-block inside the universities-related card (not as a standalone numbered section), with horizontal snap-scroll on mobile and a tidy multi-column layout on larger screens.

#### University cards and reuse
- [ ] Inspect Featured, deadline, and upcoming exam university cards to confirm they all use the same visual style (logo, name + shortForm, category/cluster badges where applicable, seats, buttons) via the shared `UniversityCard` component.
- [ ] Check that cards look consistent between:
  - Featured row
  - Main university grid
  - Timeline-based deadline/exam previews (in Happening Now and closing/exam widgets).

#### Category & cluster filters
- [ ] Switch between categories in the universities filter bar and verify:
  - The main grid updates to the selected category.
  - The Featured row shows only items from that category when category-specific featured items exist.
  - The closing/exam timelines show only items whose university belongs to that category.
- [ ] For categories that have cluster groups:
  - [ ] Confirm cluster chips appear only when cluster groups exist for the current category.
  - [ ] Selecting a cluster chip filters the main grid, Featured row, and deadline/exam timelines to that cluster.
- [ ] For categories without cluster groups:
  - [ ] Confirm the cluster chip bar is hidden entirely.

#### Search behavior
- [ ] Use the hero search input to filter:
  - [ ] Featured universities row.
  - [ ] Admission deadline previews (closing-soon timelines).
  - [ ] Upcoming exam previews (exam-soon timelines and closing/exam widget).
  - [ ] News preview cards.
  - [ ] Resources preview cards.
- [ ] Validate that the quick search dropdown includes matches from:
  - [ ] Universities,
  - [ ] News,
  - [ ] Exams,
  - [ ] Resources.

#### Responsiveness & theme
- [ ] On 360px width:
  - [ ] Verify the Featured row scrolls horizontally with snap and no horizontal overflow of the page.
  - [ ] Ensure filters (categories, clusters, statuses) wrap neatly without clipping.
- [ ] On tablet and desktop widths, confirm Featured universities render in a compact grid-style layout with consistent card sizing.
- [ ] In dark mode:
  - [ ] Check that card borders, text, and badges are readable across all university-related sections.
  - [ ] Ensure no section has mismatched backgrounds or low-contrast text.

#### Stability
- [ ] Navigate the home page and interact with filters/search extensively; confirm there are **no console errors or React warnings**.
- [ ] Refresh after several interactions and verify the same filters/search state produces the same visible results.

