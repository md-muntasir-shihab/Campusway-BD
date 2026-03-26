# Security Center Runbook

## Admin Route
- UI: `/admin/security`
- API base route: `/api/admin/security-settings`

## Available Controls
- Password policy
- Login/session controls
- Admin access controls (2FA, IP allowlist, admin panel lock)
- Site and exam protections
- Dynamic rate limiting thresholds
- Logging controls

## Critical Actions
- **Force logout all users**: invalidates all active sessions immediately.
- **Lock admin panel**: blocks all admin roles except `superadmin`.
- **Reset defaults**: restores hardening defaults.

## Public Security Config Endpoint
- `GET /api/security/public-config`
- Returns only safe values:
  - `maintenanceMode`
  - `blockNewRegistrations`
  - `requireProfileScoreForExam`
  - `profileScoreThreshold`

## Safety Notes
- Keep `require2FAForAdmins=true` in production.
- Keep `allowedAdminIPs` non-empty in production.
- Keep `adminPanelEnabled=true` except during incident response.
