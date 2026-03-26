# ADMIN_BINDINGS_MAP

Date: 2026-03-03
Source of truth: `frontend/src/lib/adminBindings.ts`

Legend:
- `{admin}` => `admin` or `campusway-secure-admin`
- Invalidation keys are React Query key labels used in frontend registry

## Site Branding / Site Settings
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Settings > Site Settings > Identity | websiteName,motto,metaTitle,metaDescription,logo,favicon | `WebsiteSettings.websiteName,motto,metaTitle,metaDescription,logo,favicon` | `PUT /api/{admin}/home/settings` | FormData fields | `settings.*` | `public_settings, site_settings, home, header, footer` |
| Settings > Site Settings > Contact | contactEmail,contactPhone | `WebsiteSettings.contactEmail,contactPhone` | `PUT /api/{admin}/home/settings` | `contactEmail, contactPhone` | `settings.contactEmail, settings.contactPhone` | `public_settings, site_settings, home` |
| Settings > Site Settings > Theme/UI + Pricing | theme.*,socialUi.*,pricingUi.* | `WebsiteSettings.theme.*,socialUi.*,pricingUi.*` | `PUT /api/{admin}/home/settings` | `theme,socialUi,pricingUi` | `settings.theme, settings.socialUi, settings.pricingUi` | `public_settings, site_settings, plans` |
| Settings > Site Settings > Subscription Page | subscriptionPageTitle,subtitle,defaultBanner,loggedOutCtaMode | `WebsiteSettings.subscriptionPage*` | `PUT /api/{admin}/home/settings` | `subscriptionPage*` fields | `settings.subscriptionPage*` | `public_settings, site_settings, plans, home` |

## Social Links Manager
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Settings > Site Settings > Social Links Manager | platformName,targetUrl,iconUploadOrUrl,description,enabled,placements[] | `SiteSettings.socialLinks[].platform,url,icon,description,enabled,placements[]` | `POST /api/{admin}/social-links` / `PUT /api/{admin}/social-links/:id` / `DELETE /api/{admin}/social-links/:id` | social link payload | `items[]` | `public_settings, home, footer, header` |

## Home Control
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Settings > Home Control > Section Visibility | sectionVisibility.* | `HomeSettings.sectionVisibility.*` | `PUT /api/{admin}/home-settings` | `sectionVisibility` | `homeSettings.sectionVisibility` | `home, home_settings, universityCategories` |
| Settings > Home Control > Highlighted Categories | category,order,enabled,badgeText | `HomeSettings.highlightedCategories[]` | `PUT /api/{admin}/home-settings` | `highlightedCategories[]` | `homeSettings.highlightedCategories[]` | `home, home_settings, universityCategories` |
| Settings > Home Control > Featured Universities | universityId,order,enabled,badgeText | `HomeSettings.featuredUniversities[]` | `PUT /api/{admin}/home-settings` | `featuredUniversities[]` | `homeSettings.featuredUniversities[]` | `home, home_settings, universities, universityCategories` |
| Settings > Home Control > University Card Config | defaultUniversityLogo | `HomeSettings.universityCardConfig.defaultUniversityLogo` | `PUT /api/{admin}/home-settings` | `universityCardConfig.defaultUniversityLogo` | `homeSettings.universityCardConfig.defaultUniversityLogo` | `home, home_settings, universities` |

## Subscription Plans
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Admin Subscription Plans | name,code,type,price,duration,features,tags,cta,enabled,isFeatured | `SubscriptionPlan.name,code,type,priceBDT,durationDays,features,tags,contactCtaLabel,contactCtaUrl,enabled,isFeatured` | `POST /api/{admin}/subscription-plans` / `PUT /api/{admin}/subscription-plans/:id` / `PUT /api/{admin}/subscription-plans/:id/toggle` / `DELETE /api/{admin}/subscription-plans/:id` | plan payload | `item` | `plans, home, student_me` |
| Admin Subscription Plans > List | display order | `SubscriptionPlan.displayOrder,sortOrder,priority` | `PUT /api/{admin}/subscription-plans/reorder` | `{order:[id...]}` | `message` | `plans, home, student_me` |

## News Settings / RSS / AI / Share
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Settings > Site Settings > News Settings | page title/subtitle + default images | `NewsSystemSettings.config.pageTitle,pageSubtitle,headerBannerUrl,defaultBannerUrl,defaultThumbUrl,defaultSourceIconUrl` | `PUT /api/{admin}/news-settings` | settings payload | `settings` | `news_settings, news, home` |
| Settings > Site Settings > News Settings | workflow.*,aiSettings.*,shareTemplates.*,share.shareButtons.* | `NewsSystemSettings.config.workflow.*,aiSettings.*,shareTemplates.*,share.shareButtons.*` | `PUT /api/{admin}/news-settings` | settings payload | `settings.workflow,settings.aiSettings,settings.shareTemplates` | `news_settings, news, home` |
| Admin News > Sources | source metadata + fetch policy | `NewsSource.name,feedUrl,iconUrl,categoryDefault,tagsDefault,fetchIntervalMin,maxItemsPerFetch,isActive` | `POST/PUT/DELETE /api/{admin}/news/rss-sources` | source payload | `item` | `news_settings, news, home` |

## Exam Gating
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Admin Dashboard > Exams > Create/Edit | allowed plan codes | `Exam.accessControl.allowedPlanCodes[]` | `POST /api/{admin}/exams` / `PUT /api/{admin}/exams/:id` | `accessControl.allowedPlanCodes[]` | `exam.accessControl.allowedPlanCodes[]` | `home` |
| Settings > Security Center > Site & Exam Protection | requireProfileScoreForExam + profileScoreThreshold | `SecuritySettings.examProtection.requireProfileScoreForExam,profileScoreThreshold` | `PUT /api/{admin}/security-settings` | `examProtection` | `settings.examProtection` | `home, student_me` |

## Student Import / Export / Groups
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Admin Students > Import Wizard | file,mapping,defaults,commit | `StudentImportJob.rawRows,mapping,defaults,normalizedRows,validationSummary,commitSummary` | `POST /api/{admin}/students/import/init` + `POST /api/{admin}/students/import/:id/validate` + `POST /api/{admin}/students/import/:id/commit` | multipart + mapping/defaults | `data.validationSummary,data.summary` | `students, student-groups, home` |
| Admin Students > Groups | group metadata + membership | `StudentGroup.*` + `StudentProfile.groupIds[]` | `POST /api/{admin}/student-groups` + `PUT /api/{admin}/student-groups/:id` + `DELETE /api/{admin}/student-groups/:id` | group payload + `addStudentIds/removeStudentIds` | `item` | `students, student-groups, home` |
| Admin Students > Groups | export groups | projection export | `GET /api/{admin}/student-groups/export` | query only | rows array | none |

## Support Center / Unread Badge
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Admin Support Center > Ticket Detail | status + reply message | `SupportTicket.status,timeline[]` | `PATCH /api/{admin}/support-tickets/:id/status` + `POST /api/{admin}/support-tickets/:id/reply` | `{status}` / `{message}` | `item.status,item.timeline` | `admin.support-tickets` |
| Admin Support Center > Notices | title,message,target,startAt,endAt,isActive | `AnnouncementNotice.title,message,target,targetIds,startAt,endAt,isActive` | `POST /api/{admin}/notices` + `PATCH /api/{admin}/notices/:id/toggle` | notice payload | `item` | `admin.support-notices, admin.support-tickets` |
| Admin Dashboard Summary | unread support count | derived from `SupportTicket` | `GET /api/{admin}/dashboard/summary` | n/a | `supportCenter.unreadMessages` | `admin.support-tickets` |

## Security + Logs
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Settings > Security Center | passwordPolicy/login/session/admin/site/exam/logging/rateLimit | `SecuritySettings.*` | `PUT /api/{admin}/security-settings` | security payload | `settings` | `admin.security-settings, admin.runtime-settings` |
| Settings > Security Center > Runtime Flags | featureFlags.* | `SiteSettings.featureFlags.*` | `PUT /api/{admin}/settings/runtime` | `{featureFlags}` | `featureFlags` | `admin.runtime-settings` |
| Settings > Security Center > Critical Actions | force logout all | session invalidation | `POST /api/{admin}/security-settings/force-logout-all` | `{reason}` | `terminatedCount` | `admin.security-settings, student_me` |
| Settings > Security Center > Critical Actions | admin panel lock/unlock | `SecuritySettings.adminAccess.adminPanelEnabled` | `POST /api/{admin}/security-settings/admin-panel-lock` | `{adminPanelEnabled}` | `settings.adminAccess.adminPanelEnabled` | `admin.security-settings` |
| Settings > System Logs | audit filters (read-only) | `AuditLog` query | `GET /api/{admin}/audit-logs` | query params | `logs[]` | none |

## Phase 4 Pipeline Controls
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Admin News > Sources > Fetch Now | sourceIds[] (manual ingest trigger) | `NewsSource.lastFetchedAt`, `News.status=pending_review`, `News.dedupe.*` | `POST /api/{admin}/rss/fetch-now` | `{sourceIds:[...]}` | `stats.createdCount,stats.duplicateCount` | `news_settings, news, home` |
| Admin News > Editor > Schedule | scheduleAt | `News.status=scheduled`, `News.scheduleAt` | `POST /api/{admin}/news/:id/schedule` | `{scheduleAt}` | `item.status,item.scheduleAt` | `news, home` |
| Admin Payments > Approve | status=paid/rejected,remarks | `ManualPayment.status,approvedBy,approvedAt,paidAt` + `User.subscription.*` (on paid subscription) | `POST /api/{admin}/finance/payments/:id/approve` | `{status,remarks}` | `item.status,message` | `payments, student_me, home` |
| Admin/News/System Logs | audit scope filters | `AuditLog` / `NewsAuditEvent` | `GET /api/{admin}/audit-logs` or `GET /api/{admin}/news-v2/audit-logs` | query params | `items[]/logs[]` | none |

## Removed / Duplicate Control
| UI location | Field | Status | Reason |
|---|---|---|---|
| Settings > Site Settings | Quick Social URL Map | Removed | Duplicate writer for social URLs; conflicted with canonical Social Links Manager CRUD flow. |

## Admin Navigation Stability (UI Contract)
| UI location | Field | DB key path | API | Request body | Response path | Invalidate keys |
|---|---|---|---|---|---|---|
| Admin Shell Sidebar | `ADMIN_MENU_ITEMS[]` route mapping | n/a | n/a | n/a | n/a | n/a |
| Dashboard Summary Cards | `actionTab -> routeFromDashboardActionTab()` | n/a | n/a | n/a | n/a | n/a |
| Legacy Admin Routes | `LEGACY_ADMIN_PATH_REDIRECTS` | n/a | n/a | n/a | n/a | n/a |

Notes:
- Source of truth for admin route mapping: `frontend/src/routes/adminPaths.ts`.
- Canonical admin prefix remains `/__cw_admin__/...`.
- Legacy `/admin/*` is redirect-only compatibility path.
