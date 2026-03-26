# DESIGN TOKENS (StitchMCP DNA)

## Source workflow
Generated via StitchMCP-inspired token set for premium educational marketplace aesthetics with mobile-first hierarchy.

## Core tokens
- Colors: surface/card/text/muted/primary/accent/border.
- Radius: `--radius-lg: 1rem`.
- Spacing: `--spacing-section: clamp(2rem, 4vw, 4rem)`.
- Shadow: `--shadow-card`.

## Usage rules
1. Use CSS variables from `client/src/styles/theme.css` only.
2. Reuse `token-card` and `section-wrap` utility classes.
3. Avoid raw hex in components.
4. Theme parity required: same component structure in light/dark.
5. Compact theme toggle fixed at `h-9 w-9`.
