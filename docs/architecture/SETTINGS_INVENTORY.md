# SETTINGS_INVENTORY

Date: 2026-03-03
Method:
1. Source usage scan in frontend admin components and backend admin routes/controllers.
2. Endpoint existence check in `backend/src/routes/adminRoutes.ts`.
3. Runtime save/invalidation verification with C1/C2/C3 smoke pack and mutation wiring review.

## USED (Persisting + Routed)
| Module | UI control group | Persistence target | API |
|---|---|---|---|
| Site Settings | Branding, contact, theme, pricing, subscription-page controls | `WebsiteSettings` | `/api/{admin}/home/settings` |
| Social Links Manager | platform/url/icon/description/enabled/placements | `SiteSettings.socialLinks[]` + mirror to `WebsiteSettings.socialLinks` | `/api/{admin}/social-links` |
| Home Control | sectionVisibility, hero, subscriptionBanner, categories, featured universities, card config, footer/ui | `HomeSettings` | `/api/{admin}/home-settings` |
| News Settings Hub | page metadata, defaults, workflow, AI presets, share templates/buttons | `NewsSystemSettings.config` | `/api/{admin}/news-settings` |
| News Sources | RSS source CRUD + test/reorder | `NewsSource` | `/api/{admin}/news/rss-sources*` |
| Subscription Plans | CRUD + reorder + toggle + assign/suspend/export | `SubscriptionPlan`, `UserSubscription`, `User.subscription` cache | `/api/{admin}/subscription-plans*`, `/api/{admin}/subscriptions*` |
| Security Center | policy/session/admin/site/exam/log/rate-limit toggles | `SecuritySettings` | `/api/{admin}/security-settings*` |
| Runtime Flags | feature flag toggles | `SiteSettings.featureFlags` | `/api/{admin}/settings/runtime` |
| System Logs | audit filters (read-only) | `AuditLog` query | `/api/{admin}/audit-logs` |
| Support Center | ticket status/reply + notices | `SupportTicket`, `AnnouncementNotice` | `/api/{admin}/support-tickets*`, `/api/{admin}/notices*` |
| Student Groups | group CRUD + membership + export/import | `StudentGroup`, `StudentProfile.groupIds` | `/api/{admin}/student-groups*` |
| Student Import | init/validate/commit pipeline | `StudentImportJob`, `User`, `StudentProfile` | `/api/{admin}/students/import*` |

## DUPLICATE
| Module | Control | Duplicate of | Action |
|---|---|---|---|
| Site Settings | Quick Social URL Map block | Social Links Manager | Removed from `SiteSettingsPanel` (single-writer policy) |

## UNUSED / REMOVED
| Module | Control | Reason | Migration note |
|---|---|---|---|
| Site Settings | Quick Social URL Map | Conflicting write path to same social output | Use Social Links Manager only; it syncs to public settings and placements |

## Verified Route Ownership Cleanup
- News appearance/AI/share settings were moved under Settings Center ownership path (`/admin/settings/site-settings`).
- Legacy settings-style routes are kept only as redirects for compatibility.

## Verification Notes
- No orphan settings control was kept in deliverable scope without endpoint and persistence mapping.
- Any new admin field must be added to `frontend/src/lib/adminBindings.ts` before UI release.
