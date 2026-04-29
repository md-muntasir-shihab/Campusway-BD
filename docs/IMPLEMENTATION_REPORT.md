# Integration Foundation — Implementation Report

Branch: `project-implementation-plan`
Status: registry + control plane + all 8 product helpers shipped, both builds
green, ready for PR review.

## What was delivered

This branch implements the **registry + control plane** layer required by the
1841-line full-integration spec, **plus** thin feature-gated server helpers
and one frontend tracker for every integration in the spec. Every helper is a
no-op when its integration is disabled, so this branch is safe to merge with
zero environment changes.

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

## Product helpers (server-side, feature-gated)

All helpers live under `backend/src/services/integrations/` and use
`isIntegrationReady()` internally. Callers never need an explicit guard.

| File | Surface | Behavior when disabled |
| --- | --- | --- |
| `searchHelper.ts` (Meilisearch) | `indexDocument`, `deleteDocument`, `search` | `search` returns `null` so the caller can fall back to its existing Mongo text-search path. Index/delete are no-ops returning `false`. |
| `imageHelper.ts` (imgproxy) | `transformUrl(sourceUrl, opts)` | Returns the original `sourceUrl` unchanged. |
| `emailHelper.ts` (SMTP / Listmonk) | `sendTransactionalEmail`, `subscribeToList` | Both return `false`. SMTP uses `nodemailer` via dynamic require so the dep stays optional. |
| `marketingHelper.ts` (Mautic) | `trackContact`, `trackEvent` | Return `false`. |
| `notificationHelper.ts` (Novu) | `triggerWorkflow(workflowId, subscriber, payload)` | Returns `false`. |
| `analyticsHelper.ts` (Umami / Plausible) | `getPublicAnalyticsConfig()` | Returns `null` when neither is enabled. Umami is preferred when both are configured. |
| `backupHelper.ts` (Backblaze B2) | `uploadBuffer(remotePath, data, contentType)` | Returns `false`. Implements the native B2 three-step API (`b2_authorize_account`, `b2_get_upload_url`, signed POST upload) with SHA-1 verification, no SDK. |

## Public + frontend wiring

| File | Purpose |
| --- | --- |
| `backend/src/routes/publicIntegrationsRoutes.ts` | `GET /api/integrations/analytics-config` — unauthenticated, 60s `Cache-Control`, returns the non-secret tracker bits the browser needs. |
| `frontend/src/components/AnalyticsTracker.tsx` | Mounted inside `<BrowserRouter>` in `App.tsx`. Fetches the public config once and injects the appropriate `<script>` tag with the right `data-*` attributes. Best-effort, fails silently. |

## Commit log on this branch

1. `docs: phase 0 audit + workflow plan`
2. `feat(backend): integration registry foundation - model, service, connectors`
3. `feat(backend): admin integrations routes mounted under /api/admin/integrations`
4. `feat(frontend): admin Integrations settings page`
5. `feat: integration feature gate, boot-time seed, type alignment`
6. `feat(backend): feature-gated helpers for search, image, email, marketing`
7. `feat: notifications (Novu) helper, analytics public config + tracker`
8. `feat(backend): Backblaze B2 backup helper (feature-gated)`
9. `docs: implementation report`

Every commit was made only after both `cd backend && npm run build` and
`cd frontend && npm run build` were green, per the workflow plan.

## Next steps (one small PR each)

These are now product-side wirings, not foundation work. Each is a single
call into the relevant helper, fully optional, and can be merged
independently:

- Replace the search route's Mongo text-search call with `searchHelper.search`,
  with a `null` fallback to the existing implementation, and add a one-shot
  `npm run script:backfill-meilisearch` backfill script.
- In `mediaService.getPublicUrl`, pipe the URL through `imageHelper.transformUrl`.
- In bulk-email senders, prefer `emailHelper.subscribeToList` for newsletters
  and `emailHelper.sendTransactionalEmail` for one-off mails, falling back to
  the current direct SMTP code when both return `false`.
- In `User` lifecycle hooks, call `marketingHelper.trackContact` (already
  no-op when disabled).
- In `notificationService.send`, call `notificationHelper.triggerWorkflow`
  with the existing in-app fallback.
- In `cron/backupJobs.ts`, after writing the local archive call
  `backupHelper.uploadBuffer` with the file contents.
