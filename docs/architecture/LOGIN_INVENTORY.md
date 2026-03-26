# Login Inventory (Phase 5+6)

| Route | Component/File | Current usage | Status |
|---|---|---|---|
| `/login` | `frontend/src/pages/Login.tsx` | Canonical student login route in `App.tsx` (`STUDENT_LOGIN`) | `KEEP` |
| `/chairman/login` | `frontend/src/pages/chairman/ChairmanLogin.tsx` | Canonical chairman login route in `App.tsx` (`CHAIRMAN_LOGIN`) | `KEEP` |
| `/__cw_admin__/login` | `frontend/src/pages/AdminSecretLogin.tsx` | Canonical admin secret login route in `App.tsx` (`ADMIN_LOGIN`) | `KEEP` |
| `/student/login` | Redirect in `frontend/src/App.tsx` | Legacy alias for student login | `REDIRECT` |
| `/student-login` | Redirect in `frontend/src/App.tsx` | Legacy alias for student login | `REDIRECT` |
| `/admin/login` | Redirect in `frontend/src/App.tsx` | Legacy alias for admin secret login | `REDIRECT` |
| `/admin/*` | Redirect handler `LegacyAdminRedirect` in `frontend/src/App.tsx` | Legacy admin route compatibility to secret admin base | `REDIRECT` |
| `/campusway-secure-admin` | Redirect in `frontend/src/App.tsx` | Legacy admin dashboard alias | `REDIRECT` |
| `/admin-dashboard` | Redirect in `frontend/src/App.tsx` | Legacy admin dashboard alias | `REDIRECT` |
| *(no route in router)* | `frontend/src/pages/student/StudentLogin.tsx` | No router import/use; duplicate legacy student login UI | `DELETE` |
| *(no route in router)* | `frontend/src/pages/admin-news/AdminNewsLogin.tsx` | No router import/use; duplicate legacy admin login UI | `DELETE` |

