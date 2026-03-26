# Admin Manual

Date: 2026-03-04

## Authentication
- Student login: `/login`
- Chairman login: `/chairman/login`
- Admin login: `/__cw_admin__/login`

## Admin Navigation
- Dashboard: `/__cw_admin__/dashboard`
- Universities: `/__cw_admin__/universities`
- News: `/__cw_admin__/news`
- Exams: `/__cw_admin__/exams`
- Students: `/__cw_admin__/students`
- Payments: `/__cw_admin__/payments`
- Resources: `/__cw_admin__/resources`
- Support: `/__cw_admin__/support-center`
- Subscription Plans: `/__cw_admin__/subscription-plans`
- Settings Center: `/__cw_admin__/settings`
- Reports: `/__cw_admin__/reports`

## Settings Center Modules
- Home Control: section toggles, featured universities, highlighted categories.
- Site Settings: branding, logo, social links, default media.
- Banner Manager: home/banner assets and defaults.
- Security Center: session/security controls, runtime safety toggles.
- System Logs: read-only operational/audit logs.
- Notifications: automation triggers and reminder timings.
- Analytics: event tracking privacy/toggle controls.

## Non-Coder Training Mode
- Enable `Training Mode` from security/runtime settings.
- Effect:
  - contextual hints are shown in major forms
  - critical actions are explained before submit
  - safer defaults are easier to follow

## Destructive Action Guard
- If `Require "DELETE" confirm` is enabled:
  - bulk destructive actions require typing `DELETE`.
- Used in high-risk operations such as bulk hard delete.

## Content Operations
### Universities
1. Add/edit university.
2. Verify category, application dates, official/apply links.
3. Save and verify public `/universities`.

### News
1. Review pending feed/manual entries.
2. Approve, reject, or schedule publish.
3. Verify listing + article page on public `/news`.

### Plans
1. Create/update plan details and price.
2. Save and verify public `/subscription-plans`.

## Reports
- Use `/__cw_admin__/reports` for:
  - summary KPIs
  - exam insights
  - CSV/XLSX exports

## Verification Checklist (After Any Save)
1. Success toast/message received.
2. Relevant list refreshes immediately.
3. Public/student page reflects update.
4. No console/network errors.

