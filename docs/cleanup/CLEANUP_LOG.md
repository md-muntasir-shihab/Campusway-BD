# Cleanup Log

Date: 2026-03-03
Scope: Subscription Plans module migration + legacy Services/Pricing surface cleanup (safe, reference-verified only)

## Removed Files

| File | Why Removed | Verification Steps |
|---|---|---|
| `frontend/src/pages/Pricing.tsx` | Route no longer uses page component (`/pricing` is redirect alias to `/subscription-plans`) and file had no imports/references. | `rg -n "PricingPage|pages/Pricing" frontend/src` returned no references before deletion except file itself. `npm run lint` + `npm run build` passed after removal. |
| `frontend/src/pages/Services.tsx` | Home and navigation now use Subscription Plans; `/services` route is redirect-only and page component was unreferenced. | `rg -n "ServicesPage|pages/Services" frontend/src` returned only self-reference before deletion. Route behavior validated by `App.tsx` redirects + Playwright home order test. |
| `frontend/src/pages/ServiceDetail.tsx` | `/services/:slug` now redirects to `/subscription-plans`; detail page was unreferenced and unreachable. | `rg -n "ServiceDetail|pages/ServiceDetail|getServiceBySlug\(" frontend/src` showed no active imports/routes. Build + lint passed post-removal. |
| `frontend/src/components/admin/ServicesPanel.tsx` | Admin Services panel replaced by dedicated Subscription Plans admin module (`/admin/subscription-plans`); component had no imports. | `rg -n "ServicesPanel|components/admin/ServicesPanel" frontend/src` returned only self-reference before deletion. `npm run build` passed after removal. |

## Kept (Intentionally)

- Legacy service APIs in `frontend/src/services/api.ts` were retained for backward compatibility and to avoid accidental breakage in non-migrated integrations.
- Backend legacy service endpoints were not removed in this pass because they may still be referenced outside currently active UI routes.

## Stop-Gate Verification

- Backend build: `npm run build` (backend) -> PASS
- Frontend lint: `npm run lint` (frontend) -> PASS (warnings only)
- Frontend build: `npm run build` (frontend) -> PASS
- Runtime smoke:
  - `/api/home` contract/order checks -> PASS (Playwright)
  - `/admin/settings/home` update reflected in `/api/home` -> PASS (Playwright)
  - Legacy subscription assignment endpoint compatibility -> PASS after patch (`PUT /api/campusway-secure-admin/students/:id/subscription`)
