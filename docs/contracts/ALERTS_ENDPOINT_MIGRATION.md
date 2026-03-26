# Alerts Endpoint Migration

Date: 2026-03-04

## Canonical Admin Endpoint
Use:
- `GET /api/{ADMIN_PATH}/home-alerts`
- `POST /api/{ADMIN_PATH}/home-alerts`
- `PUT /api/{ADMIN_PATH}/home-alerts/:id`
- `DELETE /api/{ADMIN_PATH}/home-alerts/:id`
- `PATCH /api/{ADMIN_PATH}/home-alerts/:id/toggle`
- `PUT /api/{ADMIN_PATH}/home-alerts/:id/publish`

## Frontend Contract
Admin wrappers in `frontend/src/services/api.ts` now map to `/home-alerts`:
- `adminGetAlerts`
- `adminCreateAlert`
- `adminUpdateAlert`
- `adminPublishAlert`
- `adminDeleteAlert`

## Backward Compatibility
Deprecated aliases remain available in backend routes for transitional callers:
- `/api/{ADMIN_PATH}/alerts`
- `/api/{ADMIN_PATH}/alerts/:id`
- `/api/{ADMIN_PATH}/alerts/:id/toggle`
- `/api/{ADMIN_PATH}/alerts/:id/publish`

Plan: remove aliases in a later cleanup phase after all old callers are gone.
