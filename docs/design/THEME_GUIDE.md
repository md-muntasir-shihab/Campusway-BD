# THEME_GUIDE

## Overview
CampusWay theme system is class-based (`html.dark`) with three modes:
- `light`
- `dark`
- `system`

Persistence key:
- `localStorage["campusway_theme"]`

Core implementation:
- `frontend/src/hooks/useTheme.tsx`
- `frontend/src/components/ui/ThemeSwitchPro.tsx`
- `frontend/src/styles/theme.css`
- `frontend/src/styles/index.css`
- `frontend/tailwind.config.js`

## Theme Lifecycle
1. On first load, app checks `campusway_theme`.
2. If value exists, it applies that mode.
3. If value is missing, mode resolves from system preference (`prefers-color-scheme: dark`).
4. `ThemeSwitchPro` updates mode immediately and writes `campusway_theme`.
5. `useLayoutEffect` applies `html.dark` before paint to reduce layout/theme flash.

## Required Token Set
Single source: `frontend/src/styles/theme.css`

Defined tokens:
- `--bg`
- `--surface`
- `--surface2`
- `--text`
- `--muted`
- `--border`
- `--primary`
- `--primaryFg`
- `--danger`
- `--warning`
- `--success`
- `--shadowColor`

Migration compatibility aliases are kept for legacy `--color-*` usage.

## Utility Classes
Reusable token helpers (in `index.css`):
- `.cw-bg`
- `.cw-surface`
- `.cw-text`
- `.cw-muted`
- `.cw-border`

Use these for layout shells/panels where direct Tailwind token mapping is not enough.

## Tailwind Integration
Tailwind semantic colors are mapped to CSS vars in `tailwind.config.js` so components can use semantic classes while still following global token values.

## Theme Toggle Standard
Control is compact icon-only (`h-8 w-8`):
- Public navbar
- Student header/navbar
- Admin topbar

## Component Theming Rules
1. Prefer token/semantic classes, avoid hardcoded random hex in new UI.
2. Buttons must keep consistent size/focus ring between light/dark.
3. Cards should use rounded-2xl baseline and token-aware border/surface.
4. Inputs/selects/textareas must keep visible focus ring in both modes.
5. Tables on mobile must be horizontally scrollable or card-stacked.

## Rich Content Rule
Long-form/article render blocks should use:
- `prose dark:prose-invert`

## Home Resilience Rule
`frontend/src/pages/HomeModern.tsx` now uses fallback-normalized payload when `/api/home` fails, so the page stays usable and shows warning banner instead of hard failure state.

## How To Theme New Components
1. Start with semantic layout classes (`bg-surface`, `text-text`, `border-border`).
2. For shell areas, add `.cw-*` helpers.
3. Reuse existing button/input/card utility classes.
4. Validate both `html.dark` on and off.
5. Validate 360px and desktop widths before merge.
