# CampusWay — Design System Notes

Current design constraints, component patterns, and UI consistency guidelines.
Last updated: Phase 0 Bootstrap.

---

## Philosophy

- **Premium, minimal, modern**: The UI should wow on first glance without being decorative noise
- **Functional density**: Information-rich without feeling cluttered
- **Responsive by default**: From 360px mobile to 1440px+ desktop
- **Dark/light theme from day one**: All components must work in both themes
- **Consistency over creativity**: Once a pattern is established, use it everywhere

---

## Technology Stack

| Tool | Purpose |
|------|---------|
| Tailwind CSS 3 | All layout, spacing, colors, typography, responsive |
| Framer Motion | Micro-animations, hover effects, staggered lists |
| Lucide React | Icons — all icons use lucide-react only |
| Inter / Outfit | Typography — configured via base stylesheet |

> **No Storybook** — deliberately deferred. Rely on consistent code comments and native usage patterns.

---

## Color / Theme Tokens

Use semantic Tailwind variants, not hardcoded colors.

### Theme-safe patterns:
```jsx
// ✅ Correct
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">

// ✅ Correct with primary
<button className="bg-primary-600 hover:bg-primary-700 text-white">

// ❌ Wrong — non-semantic raw color
<div style={{ background: '#1a1a2e' }}>
```

### Color palette (from `tailwind.config.js`):
- `primary-*`: Main brand color scale
- `neutral-*` / `gray-*`: Content areas
- `success-*`, `warning-*`, `error-*`: Status colors
- Always use the `dark:` variant for dark mode support

---

## Typography

```jsx
// Page headings
<h1 className="text-3xl font-bold text-gray-900 dark:text-white">

// Section headers
<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">

// Card titles
<h3 className="text-base font-medium text-gray-900 dark:text-white">

// Body text
<p className="text-sm text-gray-600 dark:text-gray-300">

// Help / meta text
<span className="text-xs text-gray-400 dark:text-gray-500">
```

---

## Spacing / Layout Rhythm

```jsx
// Page outer padding
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

// Section spacing
<section className="mb-12">

// Card grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

// Form field spacing
<div className="space-y-4">
```

---

## Card Patterns

```jsx
// Standard card
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200">

// Glassmorphism card (for hero/feature areas)
<div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 p-6">
```

---

## Status Chips / Badges

```jsx
// Active / Success
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
  Active
</span>

// Warning / Renewal Due
<span className="... bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">

// Expired / Error
<span className="... bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">

// Neutral / Draft
<span className="... bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
```

---

## Button System

```jsx
// Primary action
<button className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">

// Secondary action
<button className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150">

// Destructive action
<button className="... bg-red-600 hover:bg-red-700 text-white ...">

// Ghost / text action  
<button className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
```

---

## Animations (Framer Motion Patterns)

```jsx
// List item stagger
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

// Card hover lift
<motion.div whileHover={{ y: -4, shadow: 'lg' }} transition={{ duration: 0.2 }}>

// Page fade-in
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
```

---

## Table Patterns (Admin)

```jsx
<div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
    <thead className="bg-gray-50 dark:bg-gray-800">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
```

---

## Form Patterns

```jsx
// Input field
<input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">

// Label
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">

// Error message
<p className="mt-1 text-xs text-red-600 dark:text-red-400">
```

---

## Responsive Breakpoints

| Breakpoint | Use |
|-----------|-----|
| Default (mobile) | 360px+ — single column, touch-first |
| `sm:` | 640px — 2-column grids start |
| `md:` | 768px — side navigation visible |
| `lg:` | 1024px — full desktop layout |
| `xl:` | 1280px — wide tables, multi-column admin |
| `2xl:` | 1536px+ — ultra-wide refinements |

---

## University Card Rules

- Card must NOT break with long university names — use line-clamp or truncate
- Logo: Use `object-contain` — fallback to short name badge if no logo
- No ugly border around the entire logo container — use subtle ring/background instead
- Card height should be consistent across the grid — use `flex flex-col` with `flex-1` content

---

## Admin UX Rules

- Keep primary actions above the fold
- No more than 2 levels of nested tabs / submenus
- Bulk actions appear in sticky bottom bar when items selected
- Advanced/destructive options go behind a clear confirmation step
- Empty states must always have a descriptive message + call to action
- Loading states must use skeleton placeholders, not raw spinners alone
