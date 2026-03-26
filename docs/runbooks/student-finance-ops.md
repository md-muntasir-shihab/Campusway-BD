# Student Management + Finance Operations Runbook

## Scope
This runbook covers the new admin-controlled finance and support APIs:
- Manual payments
- Expenses
- Staff payouts
- Dues and reminders
- Notices and support tickets
- Backup and restore
- Superadmin password reveal flow

## 1) Enable/Disable Registration
1. Update runtime settings: `PUT /api/admin/settings/runtime`
2. Set `featureFlags.studentRegistrationEnabled`:
- `false` => public student registration blocked
- `true` => public student registration allowed

## 2) Manual Payment Workflow
1. Record payment: `POST /api/admin/payments`
2. Update payment entry: `PUT /api/admin/payments/:id`
3. View student timeline: `GET /api/admin/students/:id/payments`

## 3) Expense + Payout Workflow
1. Add expense: `POST /api/admin/expenses`
2. Add staff payout: `POST /api/admin/staff-payouts`
3. Review summary:
- `GET /api/admin/finance/summary`
- `GET /api/admin/finance/expense-breakdown`
- `GET /api/admin/finance/cashflow`
- `GET /api/admin/finance/test-board`

## 4) Dues Workflow
1. List dues: `GET /api/admin/dues`
2. Update a student ledger: `PATCH /api/admin/dues/:studentId`
3. Trigger reminder log: `POST /api/admin/dues/:studentId/remind`
4. Dispatch batch reminders: `POST /api/admin/reminders/dispatch`

## 5) Notices + Support
1. Create/toggle notice:
- `POST /api/admin/notices`
- `PATCH /api/admin/notices/:id/toggle`
2. Student endpoints:
- `GET /api/student/notices`
- `POST /api/student/support-tickets`
- `GET /api/student/support-tickets`
3. Admin ticket handling:
- `GET /api/admin/support-tickets`
- `PATCH /api/admin/support-tickets/:id/status`
- `POST /api/admin/support-tickets/:id/reply`

## 6) Password Reveal (Superadmin Only)
1. Get MFA confirmation token: `POST /api/admin/auth/mfa/confirm`
2. Reveal password: `POST /api/admin/students/:id/password/reveal`
3. Required body:
- `mfaToken`
- `reason`

## 7) Backup and Restore
1. Run backup: `POST /api/admin/backups/run`
2. List backup jobs: `GET /api/admin/backups`
3. Download backup: `GET /api/admin/backups/:id/download`
4. Restore backup: `POST /api/admin/backups/:id/restore`
5. Restore confirmation text format:
- `RESTORE <backupJobId>`

## 8) Restore Safety Rules
- Restore is destructive to target collections.
- System auto-creates a pre-restore snapshot before applying restore.
- Use restore only during maintenance windows.

## 9) Migration
Run once in backend:

```bash
npm run migrate:finance-dashboard-v1
```

## 10) Monitoring Hints
- Subscribe to SSE: `GET /api/admin/finance/stream`
- Track `finance-updated`, `payment-recorded`, `expense-recorded`, `payout-recorded`, `due-updated`.
