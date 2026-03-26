# QA Report: Contact Frontend

## Build / Type Safety
- Target app: `frontend`
- Command: `npm --prefix frontend run build`
- Status: Pass (after implementation changes)

## Route and Shell
- Route: `/contact`
- Navbar visibility: persistent (route is in public shell, not fullscreen exclusions)
- Footer visibility: persistent

## Responsiveness Matrix

### 360px (mobile-first)
- Single-column section flow confirmed.
- Quick contact cards: 1-column, tappable controls with `min-h-[44px]`.
- Social links grid: 2 columns.
- Contact form: all fields full width.
- No horizontal overflow introduced by page layout.

### 768px (tablet)
- Header and cards scale correctly.
- Social links remain readable and spaced.
- Form remains stable with balanced spacing.

### 1024px (desktop)
- Quick cards switch to multi-column layout.
- Form fields use 2-column layout where appropriate.
- Desktop-only hover lift active on quick cards.

### 1440px (large desktop)
- Comfortable spacing retained using section container.
- Visual hierarchy and contrast preserved.

## Dark / Light Theme Check
- Uses shared tokens (`card-flat`, `btn-*`, `input-field`, `select-field` styles).
- Labels, helper text, placeholders, borders remain readable in both modes.
- Focus rings remain visible.
- Disabled states remain distinguishable.

## Functional Flow Check
- Settings fetch via React Query:
  - Query key: `contactKeys.publicSettings()`
  - Supports mock mode and normalized payload handling.
- Submit flow:
  - Inline validation works for required fields and message length.
  - Consent required gate works.
  - Pending state disables submit.
  - Success state displays message + optional ticket ID.
  - Error path triggers toast and allows retry.
- Quick cards:
  - Missing links show disabled + `Not Available`.
- Social grid:
  - Built-in + custom platforms rendered.
  - Disabled style applied when unavailable/disabled.

## Mock API Check
- Env flag `VITE_USE_MOCK_API=true`:
  - Loads mock public settings.
  - Simulates submit response with `ticketId`.

## Backend Dependencies (Known)
- Live endpoint expected: `GET /api/settings/public`
- Live endpoint expected: `POST /api/contact/messages`
- Temporary compatibility fallback exists for legacy submit route (`/api/contact`) only when `/contact/messages` returns `404`.

