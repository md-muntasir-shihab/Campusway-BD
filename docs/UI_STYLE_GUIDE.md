# UI Style Guide

Date: 2026-03-04

## Theme Modes
- Supported: `light`, `dark`, `system`
- Storage key: `campusway_theme`
- Dark mode strategy: `html.dark` class

## Core Theme Tokens
Defined in theme styles:
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

Helper classes:
- `.cw-bg`
- `.cw-surface`
- `.cw-text`
- `.cw-muted`
- `.cw-border`

## Component Baselines
### Buttons
- Variants: Primary, Secondary, Outline, Ghost, Destructive
- Height target: touch-friendly (`>=44px` where possible)
- Must include visible focus ring.

### Cards
- Default radius: `rounded-2xl`
- Use tokenized border/shadow/background.

### Forms
- Consistent label spacing and error text.
- Inputs/selects/textareas must support both themes.
- Validation states must be obvious.

### Badges
- Status badge set: pending/approved/open/closed/locked.
- Use semantic colors from token system.

### Modals
- Consistent overlay and close behavior.
- Prevent background scroll leakage.

### Toasts
- Success and error variants readable in both themes.

## Responsive Rules
- Mobile-first at `360px`.
- No horizontal overflow.
- University grid target: `3/2/1` (desktop/tablet/mobile).
- Large tables should become horizontal scroll or card stacks on mobile.

## Accessibility
- Keyboard focus visible everywhere.
- Icon-only controls must have `aria-label`.
- Aim for WCAG AA contrast where feasible.

