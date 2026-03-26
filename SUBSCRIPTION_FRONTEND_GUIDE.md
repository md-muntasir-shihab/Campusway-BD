# CampusWay Subscription Frontend Guide

## Scope
- Public route: `/subscription-plans`
- Student routes: `/dashboard` (subscription widget placeholder), `/payments` (CTA-only placeholder)
- Stack: React + TypeScript + Tailwind + React Query + Framer Motion

## Implemented Frontend Files
- `frontend/src/pages/SubscriptionPlans.tsx`
- `frontend/src/components/subscription/PlanCard.tsx`
- `frontend/src/hooks/useSubscriptionQueries.ts`
- `frontend/src/services/subscriptionApi.ts`
- `frontend/src/mocks/subscriptionPlans.ts`

## Data Contracts (Backend-ready)
### GET `/api/subscription-plans`
Response shape:
- `items: SubscriptionPlanItem[]`
- `settings?: SubscriptionPlansSettings`

`SubscriptionPlanItem`:
- `id: string`
- `name: string`
- `type: "free" | "paid"`
- `priceBDT: number`
- `durationDays: number`
- `bannerImageUrl?: string | null`
- `shortDescription?: string | null`
- `features: string[]`
- `enabled: boolean`
- `displayOrder: number`
- `isFeatured: boolean`
- `contactCtaLabel: string`
- `contactCtaUrl: string`

`SubscriptionPlansSettings`:
- `pageTitle?: string`
- `pageSubtitle?: string`
- `headerBannerUrl?: string | null`
- `defaultPlanBannerUrl?: string | null`
- `currencyLabel?: string`
- `showFeaturedFirst?: boolean`

### GET `/api/subscriptions/me`
Response shape:
- `status: "active" | "expired" | "pending" | "none"`
- `planName?: string`
- `expiresAtUTC?: string | null`
- `daysLeft?: number | null`

## React Query Keys
- `['subscriptionPlans']`
- `['mySubscription']`

## Mock API Mode
- Set `VITE_USE_MOCK_API=true`
- Source: `frontend/src/mocks/subscriptionPlans.ts`
- Hooks automatically switch between mock and real API.

## Page Structure (`/subscription-plans`)
Exactly 5 core sections:
1. Header (title/subtitle/banner)
2. Filter row (All/Free/Paid + Search)
3. Featured row (if featured plans exist)
4. Plans grid (1/2/3 responsive columns)
5. FAQ accordion (lightweight)

Plus optional user-state card:
- `My Subscription` widget below header when logged-in.

## UX Behaviors
- Plan card CTA always present.
- `How to subscribe` modal provides static steps.
- Contact flow modal includes copyable text template.
- Feature list supports expand/collapse (`Show more`).

## Admin Controls Expected Later
The frontend is already prepared for admin-controlled values:
- Plan visibility (`enabled`)
- Plan ordering (`displayOrder`)
- Featured prioritization (`isFeatured`, `showFeaturedFirst`)
- Page copy and banners (`settings`)
- Currency label (`settings.currencyLabel`)
- CTA labels/URLs per plan
