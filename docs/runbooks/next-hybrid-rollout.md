# CampusWay Next.js Hybrid Rollout

## Goal
Enable incremental migration to Next.js for admin/student portals while legacy Vite frontend remains live.

## 1) Prerequisites
- Backend running (`http://localhost:5000`)
- Legacy frontend running (`http://localhost:5175` or `5173`)
- Next frontend running (`http://localhost:3000`)
- Feature flags in runtime settings:
  - `nextAdminEnabled`
  - `nextStudentEnabled`

## 2) Start Next frontend
```bash
cd frontend-next
npm install
npm run dev
```

## 3) Reverse proxy mapping
Route `admin` and `student` paths to Next app, keep other web routes on legacy Vite.

- `/admin-dashboard*` -> `http://localhost:3000/admin-dashboard*`
- `/student*` -> `http://localhost:3000/student*`
- `/api/*` -> `http://localhost:5000/api/*`
- all other routes -> legacy frontend

## 4) CORS setup
Backend supports comma-separated `CORS_ORIGIN`.
Example:
```bash
CORS_ORIGIN=http://localhost:5175,http://localhost:5173,http://localhost:3000
```

## 5) Auth token behavior
Both legacy and Next frontend use `campusway-token`.
If token expires/invalidates, user must re-login.

## 6) Cutover strategy
1. Enable Next routes for internal users only.
2. Validate admin flow:
   - students
   - plans
   - finance summary
   - expenses
   - payouts
   - dues
   - support tickets
   - backups
3. Validate student flow:
   - profile/subscription card
   - notice feed
   - support ticket create/list
4. Canary release for selected admins/students.
5. Full cutover after metrics stay stable.

## 7) Rollback
1. Disable `nextAdminEnabled` and `nextStudentEnabled`.
2. Remove proxy mapping for `/admin-dashboard*` and `/student*`.
3. Keep API unchanged (backward compatible).
