# SCREENSHOT_FINDINGS

## Screenshot 1: Public Header (`input_file_0.png`)

- **Route:** `/` (Public Home/Universities/Exams/etc.)
- **Visible Problems:**
  - **Header Layout:** The navigation links ("Home", "Universities", "Exams", etc.) seem well-placed, but the active state for "Universities" is a solid blue button. This might not be consistent with other nav items if they only show an underline or color change on hover.
  - **Search/User Section:** The theme toggle, "Plans" button, and user avatar are present.
  - **Responsiveness:** At this desktop width, it looks okay. Need to verify behavior at smaller widths.
- **Root Cause Hypothesis:** CSS/Tailwind configuration for active nav links.
- **Potential Files:** `frontend/src/components/layout/Header.tsx` (or similar), `frontend/src/App.tsx` (routing).

## Screenshot 2: Admin News System (`input_file_1.png`)

- **Route:** `/__cw_admin__/news` (specifically Pending Review)
- **Visible Problems:**
  - **Sidebar Consistency:** Sidebar has many items. Ensure they all lead to `/__cw_admin__/...` routes.
  - **Tabs/Filters:** Multiple levels of filters (Home, News Portal, etc. then Pending Review, Drafts, etc.). This might be confusing or duplicative.
  - **News Cards:**
    - Images have different aspect ratios.
    - Text in Bengali is present, ensure font support is consistent.
    - Buttons ("Edit", "Approve", "Reject", "Publish", "Schedule") are small; ensure they are easy to click.
  - **Empty Space:** Large padding/margin on the right side of the cards.
- **Root Cause Hypothesis:** Layout component for Admin News; missing responsive grid adjustments.
- **Potential Files:** `frontend/src/pages/admin/news/PendingReview.tsx`, `frontend/src/components/admin/NewsCard.tsx`.

## Screenshot 3: Admin Dashboard (`input_file_2.png`)

- **Route:** `/__cw_admin__/dashboard`
- **Visible Problems:**
  - **Sidebar Content:** The sidebar has a "Student Dashboard" item with a collapse arrow. This might be confusing if it's actually an admin item.
  - **Summary Cards:** 8 cards (Universities, Home Highlights, News, Exams, Question Bank, Students, Payments, Support Center).
    - Icons and styles are inconsistent (some use outlined icons, some solid).
    - "Open X" buttons could be more prominent.
  - **System Status:** "OK" card at the bottom.
  - **Responsiveness:** Cards are fixed-width or large-grid. On mobile, this will likely overflow or stack poorly.
- **Root Cause Hypothesis:** `AdminDashboard` layout; missing mobile-first grid.
- **Potential Files:** `frontend/src/pages/admin/Dashboard.tsx`, `frontend/src/components/admin/SummaryCard.tsx`.

## Screenshot 4: Admin Reports (`input_file_3.png`)

- **Route:** `/__cw_admin__/reports`
- **Visible Problems:**
  - **Filter Section:** Date inputs (dd/mm/yyyy) are present.
  - **Dashboard Cards:**
    - Text "Active Subscriptions", "Payments Received", etc.
    - "Top News Sources" list has "Unknown" entries.
  - **Export Buttons:** "Export CSV", "Export XLSX" at the top right.
  - **UI Alignment:** "Exam Insights" section below.
- **Root Cause Hypothesis:** `AdminReports` page; data fetching logic for "Unknown" sources.
- **Potential Files:** `frontend/src/pages/admin/Reports.tsx`, `backend/src/controllers/admin/reportController.ts`.

## Screenshot 5: Admin Subscription Plans (`input_file_4.png`)

- **Route:** `/__cw_admin__/subscription-plans`
- **Visible Problems:**
  - **List Items:** Very long bars for plan items. Reordering handle is visible.
  - **Buttons Overlay:** Action buttons ("Edit", "Toggle", "Delete") are aligned right.
  - **Information Density:** Includes internal IDs like `1772356745847`. Might be better to hide technical IDs if not needed.
  - **Theme:** Dark theme looks consistent here, but verify text contrast.
- **Root Cause Hypothesis:** `SubscriptionPlans` page; list item component.
- **Potential Files:** `frontend/src/pages/admin/SubscriptionPlans.tsx`, `frontend/src/components/admin/PlanListItem.tsx`.

---

## Overall Observations Across All Admin Screenshots

1. **Navigation:** Ensure `adminPaths.ts` is the source of truth.
2. **Redirects:** Many screenshots show `localhost:5175/...`. Verify if any legacy `/admin/...` routes still exist.
3. **Responsiveness:** Admin screens look very "desktop-first". Significant work needed for mobile-first (sidebar drawer, wrapping cards).
4. **Consistency:** Typography and button styles vary slightly between the dashboard and specific module pages (e.g., News vs. Plans).
5. **Dark Mode:** Mostly consistent dark theme, but need to check if light mode is equally polished.

---

## Fix Tickets (High Level)

### Ticket 1: Admin Navigation Stabilization

- **Problem:** Potential flicker and wrong routing.
- **Expected Behavior:** Stable routes under `/__cw_admin__/`. sidebar uses `NavLink`.
- **Verification:** Click every sidebar item; route must remain stable without full reload.

### Ticket 2: Admin Responsiveness Sweep

- **Problem:** Fixed layouts/grids that overflow on mobile.
- **Expected Behavior:** Sidebar becomes drawer < 768px. Cards stack single column.
- **Verification:** Test at 360px width.

### Ticket 3: Settings Restructure

- **Problem:** Scattered settings pages/components.
- **Expected Behavior:** Centralized heart at `/settings` with 12 categories.
- **Verification:** Navigating to each category works and saves properly.
