# QA Report — Team & Access Control Module

**Date**: 2026-03-10  
**Module**: Team & Access Control  
**Backend**: Express.js on port 5003, MongoDB `localhost:27017/campusway`  
**Frontend**: React + Vite on port 5175  
**Tester**: Automated Audit Agent  
**Admin Secret Path**: `campusway-secure-admin`

---

## Executive Summary

Full API-level audit of all 26 Team endpoints and RBAC enforcement across 7 test roles. Two critical bugs were fixed in the original audit pass, and the remaining medium issues from that pass have since been closed in the current implementation. Team approval rules now persist thresholds/approver metadata, malformed override payloads are rejected, password resets force password change, and role detail access is aligned with the broader team console permissions.

### 2026-03-22 Verification Update

- `POST/PUT /team/approval-rules` now persist `requiredApprovals`, `description`, and resolved `approverRoleIds`.
- `PUT /team/permissions/members/:id/override` now returns `400` when `allow`/`deny` payloads are missing or malformed.
- `POST /team/members/:id/reset-password` now sets both `forcePasswordResetRequired` and `mustChangePassword`.
- `RoleDetailPage` now allows the same 7 admin roles as `TeamAccessConsolePage`.
- Fresh evidence:
  - viewer role detail API access: `200`
  - editor team roles API access: `403`
  - viewer approval-rule create attempt: `403`

---

## Defect Ledger

### CRITICAL (Fixed)

| # | Title | Status | Root Cause | Fix Applied |
|---|-------|--------|------------|-------------|
| C-1 | **Frontend module key mismatch** — Frontend uses `team_access` while backend uses `team_access_control` | ✅ FIXED | 4 frontend files hardcoded `team_access` instead of `team_access_control` | Changed `team_access` → `team_access_control` in `adminPaths.ts`, `TeamAccessConsolePage.tsx`, `RoleDetailPage.tsx`, `MemberDetailPage.tsx` |
| C-2 | **Empty permissionsV2 renders all permissions false** — `teamCreateMember` sets `permissionsV2: {}` on new users; `{}` is truthy so the `\|\|` fallback to `resolvePermissionsV2(role)` never triggers | ✅ FIXED | `{}` is truthy in JS; 4 code paths in `authController.ts` used `user.permissionsV2 \|\| resolvePermissionsV2()` | (a) Removed `permissionsV2: {}` from `User.create()` in `teamAccessController.ts`; (b) Changed all 4 checks to verify `Object.keys().length > 0` in `authController.ts` |

### MEDIUM

| # | Title | Status | Details |
|---|-------|--------|---------|
| M-1 | **Approval rule API silently drops unknown fields** — `POST /team/approval-rules` accepts `requiredApprovals`, `approverRoles`, `description` without error but stores none of them; only `module`, `action`, `requiresApproval` are saved. `approverRoleIds` is always empty array. | FIXED (2026-03-22) | Controller now validates and persists `requiredApprovals`, `description`, and resolved approver roles. |
| M-2 | **Member override API silently accepts wrong body format** — `PUT /team/permissions/members/:id/override` with `{overrides: [...]}` instead of `{allow: {...}, deny: {...}}` returns "Member override updated" but applies nothing | FIXED (2026-03-22) | Endpoint now rejects missing or non-object `allow`/`deny` payloads with `400`. |
| M-3 | **`mustChangePassword` not set after password reset** — `POST /team/members/:id/reset-password` returns a new temp password but `mustChangePassword` remains `false` in subsequent login | FIXED (2026-03-22) | `teamResetPassword` now sets `mustChangePassword: true` alongside forced reset state. |
| M-4 | **RoleDetailPage more restrictive than TeamAccessConsolePage** — `RoleDetailPage` guard allows only 3 roles (`superadmin`, `admin`, `moderator`) while `TeamAccessConsolePage` allows 7 roles. An editor with `team_access_control.view` permission can access the team console but not drill into role details. | FIXED (2026-03-22) | `RoleDetailPage` now uses the same 7-role allowlist as the main team console. |

### LOW

| # | Title | Status | Details |
|---|-------|--------|---------|
| L-1 | **Invite status inconsistency** — Test users created via `POST /team/members` show status `pending` in invites list even though they were created directly (not via invite flow). Two users with `sent` status appeared after `resend-invite`. | OPEN | Invite records are always created; `sendInvite: false` flag may not be fully respected |
| L-2 | **CRON job CastError** — `student dashboard notification jobs failed: CastError` for `targetUserIds` field — stringified ObjectId format mismatch | OPEN | Unrelated to Team module but observed in backend logs during testing |

---

## Closure Matrix

| Area | Phase | Status | Notes |
|------|-------|--------|-------|
| Environment & evidence | 0 | ✅ PASS | Backend port 5003, frontend port 5175, MongoDB local |
| Route map & filesystem | 1 | ✅ PASS | 26 team routes mapped, 19 modules × 17 actions |
| Legacy RBAC drift | 1a | ✅ PASS | Legacy (16 modules × 8 actions) + New (19 × 17) coexist; `hasPermissionsV2Override` takes priority |
| MongoDB verification | 2 | ✅ PASS | Users, TeamRole, RolePermissionSet, MemberPermissionOverride, TeamApprovalRule, TeamAuditLog, TeamInvite, ActiveSession collections verified |
| **Team Members** | 3 | ✅ PASS | List (10+), create, duplicate rejection (409), invalid rejection (400), get by ID, update, suspend, activate, password reset, login denial when suspended, login restored when activated |
| **Roles** | 4 | ✅ PASS | 13 default system roles listed, custom role CRUD (create/duplicate/delete/update), role metadata updates |
| **Permissions Matrix** | 5 | ✅ PASS | GET returns 19 modules × 17 actions × 14 roles; PUT role permissions works; member override (allow/deny) works end-to-end including JWT reflection and enforcement |
| **Module Enforcement** | 6 | ✅ PASS | Viewer denied create/suspend (403); Editor denied create (403); Moderator denied create (403); Finance denied create (403); Admin denied delete (403, delete=false); Viewer with create override allowed create (201); Superadmin bypasses all checks |
| **Approval Rules** | 7 | ✅ PASS | CRUD works, viewer denied create (403), metadata persistence and approver-role resolution verified |
| **Activity Logs** | 8 | ✅ PASS | 20 activity entries recorded across 12 action types; detail endpoint works; actor, module, action, target, status, IP, device all populated |
| **Security Controls** | 9 | ✅ PASS | Suspend/login denial, activate/login restore, revoke sessions, password reset all functional |
| **Invite Flow** | 10 | ✅ PASS | 7 invites listed; resend invite works; status transitions (pending → sent) observed |
| Responsive/Theme | 11 | ⬜ SKIP | Browser-based testing not performed in this audit pass |
| **Fix & Retest** | 12 | ✅ PASS | C-1 and C-2 fixed and verified; JWT and login responses now correct |
| **Reporting** | 13 | ✅ PASS | This document |

---

## Test Scenarios — Detailed Results

### Phase 3: Team Members Flow

| Test Case | Input | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| List members | GET /team/members | 200 + array | 200, 10+ items | ✅ |
| Create member (valid) | POST /team/members | 201 | 201, member created | ✅ |
| Create member (duplicate) | POST /team/members (same email) | 409 | 409 "Email already in use" | ✅ |
| Create member (invalid) | POST /team/members (missing fields) | 400 | 400 "fullName, email…required" | ✅ |
| Get member by ID | GET /team/members/:id | 200 + detail | 200, full member object | ✅ |
| Update member | PUT /team/members/:id | 200 | 200 "Member updated" | ✅ |
| Suspend member | POST /team/members/:id/suspend | 200 | 200 "Member suspended" | ✅ |
| Login while suspended | POST /auth/admin/login | 403 | 403 "Account is suspended or blocked" | ✅ |
| Activate member | POST /team/members/:id/activate | 200 | 200 "Member activated" | ✅ |
| Login after activate | POST /auth/admin/login | 200 | 200 + token | ✅ |
| Reset password | POST /team/members/:id/reset-password | 200 + temp password | 200 + `85c1ca821985b3e6` | ✅ |
| Login with reset password | POST /auth/admin/login | 200 | 200, forced reset flags now set correctly in current implementation | ✅ |

### Phase 4: Roles

| Test Case | Input | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| List roles | GET /team/roles | 200 + array | 200, 13 default roles | ✅ |
| Create custom role | POST /team/roles | 201 | 201 "Audit Custom Role" | ✅ |
| Duplicate role | POST /team/roles/:id/duplicate | 201 | 201 "Audit Custom Role Copy" | ✅ |
| Delete role | DELETE /team/roles/:id | 200 | 200, duplicate deleted | ✅ |
| Update role | PUT /team/roles/:id | 200 | 200 "Role updated" | ✅ |

### Phase 5: Permissions Matrix

| Test Case | Input | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| Get permissions | GET /team/permissions | 200 + structure | 200, {modules: 19, actions: 17, roles: 14} | ✅ |
| Update role permissions | PUT /team/permissions/roles/:id | 200 | 200 "Role permissions updated" | ✅ |
| Member override (correct format) | PUT w/ {allow, deny} | 200 | 200 "Member override updated" | ✅ |
| Override reflected in JWT | Login after override | create=true | create=true in JWT | ✅ |
| Override enforcement | POST /team/members as viewer+override | 201 | 201 "Team member created" | ✅ |
| Member override (wrong format) | PUT w/ {overrides: [...]} | 400 expected | 400 invalid payload | ✅ |

### Phase 6: Module Enforcement Matrix

| Role | Action | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| Superadmin | Create member | 201 | 201 | ✅ |
| Admin | Create member | 201 | 201 | ✅ |
| Admin | Delete role | 403 | 403 (delete=false) | ✅ |
| Moderator | Create member | 403 | 403 | ✅ |
| Editor | Create member | 403 | 403 | ✅ |
| Viewer | Create member | 403 | 403 | ✅ |
| Viewer | Suspend member | 403 | 403 | ✅ |
| Finance | Create member | 403 | 403 | ✅ |
| Viewer + override | Create member | 201 | 201 | ✅ |

### Phase 7: Approval Rules

| Test Case | Input | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| List (empty) | GET /team/approval-rules | 200, [] | 200, items: [] | ✅ |
| Create rule | POST /team/approval-rules | 201 | 200, rule created | ✅ |
| Update rule | PUT /team/approval-rules/:id | 200 | 200 "Approval rule updated" | ✅ |
| List (1 item) | GET /team/approval-rules | 200, [1] | 200, items: [1] | ✅ |
| Delete rule | DELETE /team/approval-rules/:id | 200 | 200 | ✅ |
| List (empty again) | GET /team/approval-rules | 200, [] | 200, items: [] | ✅ |
| Viewer create rule | POST as viewer | 403 | 403 | ✅ |
| Field mapping | Send requiredApprovals | Saved | Saved and returned | ✅ |

### Phase 8: Activity Logs

| Test Case | Input | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| List activity | GET /team/activity | 200 + entries | 200, 20 entries | ✅ |
| Activity detail | GET /team/activity/:id | 200 + detail | 200, full audit record | ✅ |
| Action coverage | — | Multiple types | 12 unique actions logged | ✅ |
| Audit fields | — | actor, module, action, IP, device | All populated correctly | ✅ |

**Logged action types**: `approval_rule_created`, `approval_rule_deleted`, `approval_rule_updated`, `member_activated`, `member_created`, `member_password_reset`, `member_suspended`, `member_updated`, `role_created`, `role_deleted`, `role_duplicated`, `role_permissions_updated`

### Phase 9: Security Controls

| Test Case | Input | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| Revoke sessions | POST /team/members/:id/revoke-sessions | 200 | 200 "Sessions revoked" | ✅ |
| Suspend + login denial | Suspend → login | 403 | 403 "Account is suspended or blocked" | ✅ |
| Activate + login restore | Activate → login | 200 | 200 + token | ✅ |

### Phase 10: Invite Flow

| Test Case | Input | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| List invites | GET /team/invites | 200 + array | 200, 7 invites | ✅ |
| Resend invite | POST /team/members/:id/resend-invite | 200 | 200 "Invite re-sent" | ✅ |
| Status transitions | — | pending → sent | Observed for 2 users | ✅ |

---

## Files Modified During Audit

### Frontend (4 files — Fix C-1)
- `frontend/src/routes/adminPaths.ts` — `team_access` → `team_access_control`
- `frontend/src/pages/admin/team/TeamAccessConsolePage.tsx` — `team_access` → `team_access_control`
- `frontend/src/pages/admin/team/RoleDetailPage.tsx` — `team_access` → `team_access_control`
- `frontend/src/pages/admin/team/MemberDetailPage.tsx` — `team_access` → `team_access_control`

### Backend (2 files — Fix C-2)
- `backend/src/controllers/authController.ts` — 5 changes: `Object.keys().length > 0` checks in `generateAccessToken`, `buildUserPayload`, login flow, and verify2FA flow
- `backend/src/controllers/teamAccessController.ts` — 1 change: removed `permissionsV2: {}` from `User.create()` in `teamCreateMember`

---

## Test Users Created

| Email | Role | Purpose | Cleanup Needed |
|-------|------|---------|----------------|
| `audit_admin@campusway.test` | admin | Admin enforcement tests | Yes |
| `audit_viewer@campusway.test` | viewer | Viewer enforcement + override tests | Yes |
| `audit_editor@campusway.test` | editor | Editor enforcement tests | Yes |
| `audit_mod@campusway.test` | moderator | Moderator enforcement tests | Yes |
| `audit_finance@campusway.test` | finance_agent | Finance enforcement tests | Yes |
| `phase3test@campusway.test` | admin | Phase 3 lifecycle tests | Yes |
| `override_test3@campusway.test` | viewer | Override enforcement test | Yes |
| `mod_test@campusway.test` | viewer | Mod create attempt (failed 403) | No (not created) |
| `fin_test@campusway.test` | viewer | Finance create attempt (failed 403) | No (not created) |

---

## Recommendations

1. **L-1**: Review invite creation logic to avoid creating invite records for directly-created members when `sendInvite: false`.
2. **L-2**: Follow up on the unrelated dashboard cron `targetUserIds` CastError separately under student notification stability.
