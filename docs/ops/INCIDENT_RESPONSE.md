# INCIDENT_RESPONSE

Date: March 4, 2026

## Panic Mode Controls (Security Center)
Backend-enforced toggles:
- `panic.readOnlyMode`
- `panic.disableStudentLogins`
- `panic.disablePaymentWebhooks`
- `panic.disableExamStarts`

## Immediate Effects
1. `readOnlyMode`
- Middleware: `enforceAdminReadOnlyMode`
- Effect: blocks non-GET admin mutations for non-superadmin
- Response: `423 { code: "READ_ONLY_MODE" }`

2. `disableStudentLogins`
- Enforced in auth controller (`/auth/login`, `/auth/register` for student portal)
- Response: `423 { code: "STUDENT_LOGIN_DISABLED" }`

3. `disablePaymentWebhooks`
- Enforced in webhook route (`/api/webhooks/sslcommerz/ipn`)
- Response: `423 { code: "PAYMENT_WEBHOOKS_DISABLED" }`

4. `disableExamStarts`
- Enforced in exam start endpoint for students
- Response: `423 { code: "EXAM_STARTS_DISABLED" }`

## Two-Person Approval (Risk Control)
When enabled (`twoPersonApproval.enabled=true`), risky actions are queued for second approval:
- students bulk delete
- universities bulk delete
- news delete actions
- publish exam result
- publish breaking news
- mark payment refunded

Queue endpoints:
- `GET /api/{admin}/approvals/pending`
- `POST /api/{admin}/approvals/:id/approve`
- `POST /api/{admin}/approvals/:id/reject`

## Incident Playbook
1. Enable needed panic toggles from Security Center.
2. Verify blocked responses via API.
3. Watch `job_run_logs` + `audit_logs` for drift.
4. Keep toggles enabled until root cause is resolved.
5. Disable toggles gradually and re-check health endpoints.
