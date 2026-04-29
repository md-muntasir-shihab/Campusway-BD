# Integration Foundation — Implementation Report

Branch: `project-implementation-plan`
Status: foundation slice complete, both builds green, ready for PR review.

## What was delivered

This pass implements the **registry + control plane** layer required by the
1841-line full-integration spec. It is the safe, reviewable substrate every
later integration wiring (search, image, email, marketing, notifications,
analytics, backup) plugs into.

### Backend

| File | Purpose |
| --- | --- |
| `backend/src/models/IntegrationConfig.ts` | New `integration_configs` collection: one row per supported integration. Stores `enabled`, public `config`, AES-256-GCM `credentialsEncrypted`, and last connection-test result. Defaults to disabled. |
| `backend/src/services/integrations/integrationsRegistry.ts` | Static descriptor of the 10 supported integrations: `meilisearch`, `imgproxy`, `listmonk`, `mautic`, `novu`, `umami`, `plausible`, `b2_backup`, `smtp`, `cloudinary`. Defines config and secret fields per integration. |
| `backend/src/services/integrations/integrationsService.ts` | CRUD layer with secret encryption (`cryptoService`), idempotent seeding, runtime config accessor, and a connection-test dispatcher. Never returns plaintext secrets. |
| `backend/src/services/integrations/connectors/index.ts` | HTTP-only connection probes for each integration. 8s timeout, no SDK dependency, returns `'success' \| 'failed' \| 'skipped'`. |
| `backend/src/services/integrations/featureGate.ts` | 30-second-cached `isIntegrationEnabled / getIntegrationConfig / isIntegrationReady` helper for product code. Fails safe when disabled or misconfigured. |
| `backend/src/routes/adminIntegrationsRoutes.ts` | Admin REST API: list, get, update (enabled/config/secrets), toggle, test. Test endpoint is rate-limited to 5/min/admin via in-memory token bucket. Every mutation writes to `AuditLog`. |
| `backend/src/server.ts` | Mounts the routes under `/api/admin/integrations` and seeds rows on boot inside the existing core-data block. |

### Frontend

| File | Purpose |
| --- | --- |
| `frontend/src/services/integrationsApi.ts` | Typed API client (`listIntegrations`, `updateIntegration`, `toggleIntegration`, `testIntegration`). |
| `frontend/src/pages/AdminSettingsIntegrations.tsx` | New admin page at `/__cw_admin__/settings/integrations`. Per-integration card with enable toggle, config inputs, password-masked secret inputs (with "set" / "empty" indicators), connection-test button, and last-test status badge. Uses TanStack Query + react-hot-toast, scoped to `superadmin` and `admin`. |
| `frontend/src/adminRouteComponents.tsx` | Lazy export `AdminSettingsIntegrationsPage`. |
| `frontend/src/routes/adminPaths.ts` | New `ADMIN_PATHS.integrations`. |
| `frontend/src/pages/AdminSettingsCenter.tsx` | New "Integrations" card in the Settings Center grid. |
| `frontend/src/App.tsx` | New route registration for the page. |

### Documentation

- `docs/PROJECT_WORKFLOW_PLAN.md` — incremental delivery process.
- `docs/PHASE_0_AUDIT_REPORT.md` — repo audit with reusable patterns.

## Build verification

| Build | Result |
| --- | --- |
| `cd backend && npm run build` | passes (`tsc` clean) |
| `cd frontend && npm run build` | passes (Vite, ~17s) |

## Security posture

- Secrets are **only** ever written to `IntegrationConfig.credentialsEncrypted`
  via the existing `cryptoService.encrypt` (AES-256-GCM, key from
  `CREDENTIAL_VAULT_KEY`).
- The list/get/update endpoints **never** return plaintext secrets — only the
  names of secrets that are configured.
- `getRuntimeConfig` is a server-only helper; its return value is explicitly
  forbidden from being exposed over HTTP.
- All admin endpoints require `authenticate + authorize('superadmin','admin')`,
  matching the existing pattern in `adminProviderRoutes.ts`.
- Every mutation writes an `AuditLog` row with `module: 'integrations'`.
- The connection-test endpoint is rate-limited to 5 requests / minute /
  admin via an in-memory token bucket.

## Followup work (one PR each)

Each remaining integration is a thin product wiring on top of this foundation.
Recommended sequence:

1. **Meilisearch search** — wrap the existing search route handlers with
   `isIntegrationReady('meilisearch', ['adminApiKey'])`; add a `MeiliSearchService`
   that proxies `/indexes/:idx/search` and falls back to the current Mongo
   text-search when disabled. Add a backfill script.
2. **imgproxy** — sign image URLs in the existing `mediaService` only when
   `isIntegrationEnabled('imgproxy')` is true; otherwise return the original
   asset URL unchanged.
3. **Listmonk + SMTP** — route bulk emails through Listmonk when enabled,
   else fall back to direct SMTP. Both providers share secrets from the
   registry so swapping is a one-toggle operation.
4. **Mautic** — outbound contact sync from `User` model lifecycle hooks,
   guarded by the feature gate.
5. **Novu** — replace the current `notificationService` send adapter with a
   Novu trigger when enabled.
6. **Umami / Plausible** — inject the analytics script tag in `index.html` /
   `<head>` only when the corresponding integration is enabled (config is
   public, no secret needed).
7. **Backblaze B2 backup** — extend the existing `cron/backupJobs.ts` to
   upload archives via the B2 S3-compatible endpoint when enabled.
8. **Cloudinary** — optional alternative image CDN; signed-URL helper used by
   media uploads when enabled.

Each followup PR should follow the same incremental rule: **one integration,
backend wiring + frontend hook + tests, both builds green, then push.**
