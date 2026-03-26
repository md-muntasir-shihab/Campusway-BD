# Question Bank Operations Runbook

## 1) Bulk Import Rollback

1. Export the import job report: `GET /api/admin/qbank/import/:jobId`.
2. Identify inserted rows by `created_by` + `createdAt` window from the job.
3. Soft rollback (recommended): set `status=archived` for impacted rows.
4. Hard rollback (manual approval required): delete matched rows after DB backup.
5. Regenerate indexes if large rollback volume is applied.

## 2) Reprocess Failed Rows

1. Download `failed_rows.csv` from importer report.
2. Fix row-level errors shown in the `reason` column.
3. Re-upload using Question Importer with corrected mapping.
4. Validate with `/api/admin/qbank/import/:jobId` until status is `completed`.

## 3) Media Pending Approval

1. Find pending media in `question_media` where `status='pending'`.
2. Verify image URL/file integrity and Bengali `alt_text_bn`.
3. Approve media by updating `status='approved'`, `approvedBy`, `approvedAt`.
4. Re-run question moderation for affected questions if blocked by policy.

## 4) Duplicate Detection Threshold

1. Current threshold is `QBANK_DUPLICATE_THRESHOLD` (default `0.84`).
2. Increase threshold to reduce false positives; lower to catch more duplicates.
3. Restart backend after env change and re-run similarity checks.

## 5) Revision Audit and Revert

1. Open question detail (`GET /api/admin/qbank/:id`) to inspect revisions.
2. Revert with `POST /api/admin/qbank/:id/revert/:revisionNo`.
3. Confirm `revision_no` increments and a new audit log entry exists.
4. Validate business-critical questions in Exam Builder picker after revert.

## 6) RBAC Validation Checklist

1. Moderator/Admin can approve/reject/lock/export.
2. Editor can create/edit/search (no approve/delete unless explicitly granted).
3. Student role has no access to `/api/admin/qbank/*`.

## 7) Safety Notes

1. All destructive changes require manual approval and a backup snapshot.
2. Keep import batches under operational limits to avoid lock contention.
3. Validate image links before mass import to prevent broken media rows.

## 8) Hybrid Admin/Student Migration (Next.js)

1. See detailed rollout guide: `docs/runbooks/next-hybrid-rollout.md`.
2. New Next app lives under `frontend-next/`.
3. Keep legacy routes active while gradually proxying:
   - `/admin-dashboard*`
   - `/student*`
4. Ensure runtime feature flags are explicitly managed during rollout:
   - `nextAdminEnabled`
   - `nextStudentEnabled`
