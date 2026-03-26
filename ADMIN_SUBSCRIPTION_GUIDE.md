# Admin Subscription Guide

## Admin Routes
- `/__cw_admin__/subscription-plans`
- `/__cw_admin__/subscription-plans/new`
- `/__cw_admin__/subscription-plans/:id/edit`

## Current Admin Capabilities
- Plan CRUD
- Plan enable/disable toggle
- Plan reorder
- Plan export
- Student plan assignment / suspension flow (existing + added API aliases)

## New Backend Controls Added
- Subscription settings endpoints for page-level config
- User subscription list and action endpoints by subscription record id
- Toggle featured endpoint for plans

## Recommended UI Wiring
- Settings screen should use:
  - `GET/PUT /api/admin/subscription-settings`
- User subscription management screen should use:
  - `GET /api/admin/user-subscriptions`
  - activation/suspend/expire endpoints
- Featured switch can call:
  - `PUT /api/admin/subscription-plans/:id/toggle-featured`

## Invalidation Guidance
After admin mutations, invalidate frontend keys:
- `['subscriptionPlans']`
- `['mySubscription']`
- legacy caches where applicable in existing pages
