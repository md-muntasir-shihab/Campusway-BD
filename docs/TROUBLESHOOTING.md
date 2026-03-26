# Troubleshooting

Date: 2026-03-04

## 1) API/CORS/Base URL Issues
Symptoms:
- `Network Error`, CORS errors, repeated 401 redirects.

Checks:
- Frontend `.env`:
  - `VITE_API_BASE_URL`
  - `VITE_API_PROXY_TARGET`
- Backend running and reachable.
- Browser devtools network tab for failing endpoint.

Fix:
- Ensure frontend and backend base URLs point to the same active server.
- Restart both dev servers after env changes.

## 2) Admin Login/Route Problems
Symptoms:
- Admin pages redirect unexpectedly.

Checks:
- Use canonical admin URL: `/__cw_admin__/login`.
- Verify session token exists and role is admin-compatible.
- Confirm no stale cookie/session from another portal.

Fix:
- Logout and login again via admin secret path.
- Clear site storage if role context is stuck.

## 3) Upload Issues (Logo/Banner/Media)
Symptoms:
- File upload fails or image not visible.

Checks:
- Backend upload directory permissions.
- File size/type restrictions.
- Returned file URL in API response.

Fix:
- Use allowed format and reasonable size.
- Re-upload and verify URL resolves directly in browser.

## 4) RSS/News Pipeline Issues
Symptoms:
- RSS items not appearing in pending list.

Checks:
- RSS source enabled.
- `fetch-now` endpoint response.
- Dedup rules (guid/link/title hash).

Fix:
- Test source from admin RSS test action.
- Confirm item exists in pending review list before publish.

## 5) Exam Gating Issues
Symptoms:
- Student cannot start exam.

Checks:
- Login status
- Active subscription
- Profile score threshold (>= 70)
- Payment status (if required by exam rule)

Fix:
- Resolve missing gate condition in order above.
- Retry from exam landing page.

## 6) Stale UI After Save
Symptoms:
- Save successful but public/student UI unchanged.

Checks:
- Mutation response success
- Query invalidation keys triggered
- No JS error in console

Fix:
- Verify key map in `frontend/src/lib/queryKeys.ts`.
- Re-run save and confirm invalidate hooks run.

## 7) Background Automation Not Running
Symptoms:
- Notifications/reports not generated on time.

Checks:
- Backend cron process running.
- Audit/system logs for cron ticks and errors.

Fix:
- Restart backend worker/server process.
- Inspect latest cron audit entries in logs panel.

