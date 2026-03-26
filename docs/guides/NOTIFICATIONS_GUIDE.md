# Notifications Guide

Date: 2026-03-04

## Purpose
CampusWay notification automation sends timely alerts to students for exam/application/payment/result/gating events.

## Admin Controls
Route: `/__cw_admin__/settings/notifications`

Configurable:
- Master toggle (`enabled`)
- Trigger toggles:
  - exam starts soon
  - application closing soon
  - payment pending reminder
  - result published
  - profile score gate warning
- Reminder windows:
  - hours/day offsets (e.g. 24h, 3h)
- Message templates (BN/EN/mixed support)

## Delivery Rules
- Notifications appear in student dashboard feed.
- Targeted notifications use `targetUserIds`.
- Global messages stay role-scoped.
- Read state is tracked per student.

## Runtime Flow
1. Cron reads notification automation settings.
2. Eligible reminders are generated.
3. Records inserted to student notifications collection.
4. Student feed endpoint returns unread/new items.
5. Student mark-read updates read state.

## Validation Checklist
1. Enable one trigger in admin settings.
2. Create test scenario (e.g., exam starting soon).
3. Run cron tick/wait schedule window.
4. Confirm notification appears for correct student.
5. Mark as read and verify badge count decreases.

## Troubleshooting
- No reminder generated:
  - verify trigger enabled
  - verify schedule window
  - verify cron process running
- Wrong recipients:
  - inspect `targetUserIds` and role gating
- Duplicate alerts:
  - verify dedupe logic and trigger interval

