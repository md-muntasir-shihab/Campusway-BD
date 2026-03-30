# CampusWay — Role Matrix

This document defines which modules and actions each role can access.

---

## Role Definitions

| Role | Code | Description |
|------|------|-------------|
| Super Admin | `superadmin` | Full system access. Can modify security, finance, config, billing. |
| Admin | `admin` | Full operational access. No system-level destructive actions. |
| Moderator | `moderator` | Content approval, news, notices, resources. No user deletion. |
| Editor | `editor` | Publishing only. No deletion or user management. |
| Chairman | `chairman` | Read-only strategic dashboard. |
| Student | `student` | Student portal only. |

---

## Admin Module Access Matrix

| Module | Super Admin | Admin | Moderator | Editor | Chairman |
|--------|------------|-------|-----------|--------|----------|
| Admin Dashboard | ✅ Full | ✅ Full | ✅ Read | ✅ Read | ✅ Read |
| Universities | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Categories / Clusters | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| News / Notice | ✅ Full | ✅ Full | ✅ Approve/Edit | ✅ Publish | ❌ |
| Resources | ✅ Full | ✅ Full | ✅ Approve/Edit | ✅ Publish | ❌ |
| Exams / Question Bank | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Student Management | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Student Groups | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Subscription Plans | ✅ Full | ✅ Full | ✅ Read | ❌ | ✅ Read |
| Subscriptions V2 | ✅ Full | ✅ Full | ✅ Read | ❌ | ✅ Read |
| Finance Center | ✅ Full | ✅ Full | ❌ | ❌ | ✅ Read |
| Communication Hub / Campaigns | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Subscription Contact Center | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Templates | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Providers | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| Smart Triggers | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| Delivery Logs | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Support Center | ✅ Full | ✅ Full | ✅ Read/Reply | ❌ | ❌ |
| Contact Messages | ✅ Full | ✅ Full | ✅ Read | ❌ | ❌ |
| Help Center | ✅ Full | ✅ Full | ✅ Edit | ✅ Publish | ❌ |
| Profile Approval Queue | ✅ Full | ✅ Full | ✅ Approve | ❌ | ❌ |
| Team & Access Control | ✅ Full | ✅ Manage | ❌ | ❌ | ❌ |
| Action Approvals | ✅ Full | ✅ Full | ✅ View | ❌ | ❌ |
| Home Control | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| Banner Manager | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| Site Settings | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| Security Center | ✅ Full | ✅ View | ❌ | ❌ | ❌ |
| System Logs | ✅ Full | ✅ View | ❌ | ❌ | ❌ |
| Reports | ✅ Full | ✅ Full | ✅ Read | ❌ | ✅ Read |
| University Settings | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| Notification Settings | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |

---

## Student Module Access

| Module | Authenticated Student | Unauthenticated |
|--------|----------------------|-----------------|
| Dashboard | ✅ | ❌ Redirect to login |
| Profile | ✅ | ❌ |
| Security Settings | ✅ | ❌ |
| Exams | ✅ Active sub required for gated exams | ✅ Public exams only |
| Results | ✅ | ❌ |
| Support | ✅ Active subscription recommended | ❌ |
| Notifications | ✅ | ❌ |
| Payments | ✅ | ❌ |
| Resources (student) | ✅ | ❌ |

---

## Sensitive Actions (Require Extra Protection in Phase 3)

| Action | Minimum Role |
|--------|-------------|
| Campaign Send | Admin |
| Export / Copy Contacts | Admin |
| Provider Configuration | Admin |
| Trigger Enable/Disable | Admin |
| Profile Approval | Admin / Moderator |
| Finance Operations | Admin |
| Security Center Modifications | Super Admin |
| Team Role Modifications | Super Admin |
| System Config Changes | Super Admin |
| Data Export (bulk) | Admin |

---

## Notes for Phase 3

- Route-level protection is split between frontend guard (`AdminGuardShell`) and backend JWT middleware
- Sensitive actions have a `sensitiveAction` middleware in `backend/src/middlewares/sensitiveAction.ts`
- Two-person approval is available in `backend/src/middlewares/twoPersonApproval.ts` for high-risk operations
- All access decisions must be validated server-side, not just frontend-guarded
