# Admin Exams Guide

## Overview

The admin exam management panel provides full CRUD operations for exams, questions, results, and payments through a tab-based UI at `/__cw_admin__/exams`.

## Admin API Endpoints

| Method | Route | Purpose |
| ------ | ----- | ------- |
| GET | `/api/admin/exams` | List all exams |
| GET | `/api/admin/exams/:id` | Get exam detail |
| POST | `/api/admin/exams` | Create exam |
| PATCH | `/api/admin/exams/:id` | Update exam |
| DELETE | `/api/admin/exams/:id` | Delete exam |
| GET | `/api/admin/exams/:id/questions` | List questions |
| POST | `/api/admin/exams/:id/questions` | Create question |
| PATCH | `/api/admin/exams/:id/questions/:qid` | Update question |
| DELETE | `/api/admin/exams/:id/questions/:qid` | Delete question |
| POST | `/api/admin/exams/:id/questions/import-preview` | Preview XLSX import |
| POST | `/api/admin/exams/:id/questions/import-commit` | Commit imported questions |
| GET | `/api/admin/exams/:id/results` | List results |
| GET | `/api/admin/exams/:id/exports` | CSV export |
| POST | `/api/admin/exams/:id/results/publish` | Publish results |
| POST | `/api/admin/exams/:id/results/reset-attempt` | Reset student attempt |
| GET | `/api/admin/payments` | List payments |
| POST | `/api/admin/payments/:id/verify` | Verify payment |
| GET | `/api/admin/students` | List students |
| POST | `/api/admin/students/import` | Import students |
| GET | `/api/admin/student-groups` | List student groups |
| POST | `/api/admin/student-groups/import` | Import student groups |
| GET | `/api/admin/question-bank` | Question bank |
| GET | `/api/admin/exams/templates/questions` | XLSX template URL |
| GET | `/api/admin/exams/templates/students` | XLSX template URL |

## Admin Panel UI (AdminExamsPage.tsx)

### Tab Structure

The admin panel uses 6 tabs:

1. **List** — Search and browse all exams. Each card shows title, subject, status badge, and action buttons (Edit, Questions, Results, Delete).

2. **Create** — 3-section form:
   - *Basic Info*: Title (BN/EN), subject, category, duration (minutes), status (draft/live/ended)
   - *Schedule & Access*: Window start/end (datetime-local), attempt limit, result publish date, re-attempt toggle, payment required + price, subscription required
   - *Rules*: Negative marking + per-wrong value, shuffle questions/options, show timer/palette, auto-submit on timeout, solutions enabled + release rule, answer change limit

3. **Edit** — Same form as Create, pre-filled with selected exam data.

4. **Questions** — Add/edit questions for selected exam:
   - Question text (BN/EN textarea)
   - 4 options (A–D text inputs)
   - Correct key selector (A/B/C/D)
   - Marks, negative marks, order index
   - XLSX template download link
   - Question list with numbered badges and edit/delete actions

5. **Results** — View exam results table:
   - Columns: Student, Score, Percentage, Rank
   - Publish Results button
   - Legacy import/export (CSV upload/download)

6. **Payments** — View and manage payments:
   - Payment cards with student info, amount, status badge
   - Verify button for pending payments

### XLSX Template Support

Download links for standardized templates:

- Questions template: `/api/admin/exams/templates/questions`
- Students template: `/api/admin/exams/templates/students`

### Import/Preview/Commit Workflow

1. Upload XLSX file → POST `/import-preview` → server returns parsed preview
2. Review preview data in UI
3. Confirm → POST `/import-commit` → questions/students saved to DB
