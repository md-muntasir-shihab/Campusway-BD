# Reports Guide

## Admin Routes
- `/__cw_admin__/reports`
- `/__cw_admin__/settings/reports`

## Data Sources
- Students: `users` (`role=student`)
- Payments: `manual_payments`
- Exams: `exam_sessions`, `exam_results`
- News: `news`
- Support: `support_tickets`
- Resources: `resources`
- Events: `event_logs`

## Summary Widgets
- Daily new students
- Active subscriptions
- Payment received/pending
- Exams attempted/submitted
- Top news sources
- Support opened/resolved
- Resource download metrics

## Filters
- Date range (`from`, `to`)
- Analytics module filter (`all|universities|news|resources|exams|subscription|support`)

## Exports
- Summary export: CSV/XLSX
- Event logs export: CSV/XLSX
- Exam insights export per exam: CSV/XLSX

## Notes
- Summary and analytics endpoints are read-only and guarded by admin permissions.
- Large exports are capped server-side to prevent memory spikes.
