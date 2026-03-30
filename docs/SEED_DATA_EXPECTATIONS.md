# CampusWay — Seed / Test Data Expectations

Full seed and test data requirements for E2E testing, quality assurance, and phase validation.
Last updated: Phase 0 Bootstrap.

---

## Test User Accounts Required

### Admin Users

| Role | Email | Purpose |
|------|-------|---------|
| Super Admin | `superadmin@campusway.test` | Full system access — tests all admin operations |
| Admin | `admin@campusway.test` | Standard admin — tests CRU operations |
| Moderator | `moderator@campusway.test` | Tests content approval flow |
| Editor | `editor@campusway.test` | Tests publish-only access |
| Chairman | `chairman@campusway.test` | Tests read-only strategic dashboard |

> Check `backend/INITIAL_ACCESS_INFO.txt` for seeded default credentials.

### Student Users

| Account | Email | State | Purpose |
|---------|-------|-------|---------|
| Active Subscriber | `student-active@campusway.test` | Active subscription | Tests full student portal access |
| Expired Subscriber | `student-expired@campusway.test` | Expired subscription | Tests gating/locked behavior |
| Renewal Due | `student-renewal@campusway.test` | Renewal due status | Tests renewal reminder targeting |
| Cancelled | `student-cancelled@campusway.test` | Cancelled subscription | Tests exclusion from subscriber comms |
| New Student (unsubscribed) | `student-new@campusway.test` | No subscription | Tests registration → subscription funnel |
| Student with Pending Update | `student-pending@campusway.test` | Profile update pending | Tests admin approval queue |

---

## Academic Structure Data Required

### Universities
- Minimum 5 universities across at least 2 categories and 2 clusters
- At least 1 featured university
- At least 1 university with no logo (to test fallback short-name behavior)
- At least 1 university with a very long name (to test card layout integrity)

### Categories
- Minimum 3 categories (e.g., Engineering, Medical, General)

### Clusters
- Minimum 2 clusters (e.g., Dhaka Cluster, Chittagong Cluster)

---

## Student Groups
- Minimum 2 groups (e.g., "Batch 2024", "Premium Group")
- Active student accounts should be assigned to at least 1 group
- At least 1 exam should have `allowedGroups` targeting one of these groups

---

## Subscription Plans
- Minimum 3 plans (e.g., Basic, Standard, Premium)
- At least 1 plan marked as featured
- Plans should have distinct pricing and feature lists

---

## Content Data

### News / Notices
- 2 published news articles
- 1 news article in draft state
- 1 notice type article
- At least 1 news item visible on homepage (featuredOnHome: true)

### Resources
- Minimum 2 published resources
- At least 1 resource with a category

---

## Exam Data

### Exams
- 1 upcoming public exam
- 1 group-restricted exam (allowedGroups → one test group)
- Minimum 10 questions per exam for meaningful testing
- 1 completed exam with results for `student-active@campusway.test`

### Results
- At least 1 completed exam result for active student test account

---

## Communication Data

### Notification Templates
- 1 SMS template (e.g., welcome message)
- 1 email template (e.g., renewal reminder)

### Campaign
- 1 completed campaign (status: completed) with mock delivery log
- 1 draft campaign (to test campaign list UI)

### Smart Triggers
- 1 trigger configured for `subscription.expiring` event
- 1 trigger configured for `news.published` event

---

## Support / Contact Data

### Support Tickets
- 1 open ticket (from `student-active@campusway.test`)
- 1 closed ticket (from `student-expired@campusway.test`)
- At least 1 ticket with a reply thread

### Contact Messages
- 2 contact form submissions (one with phone, one without)
- 1 unread message for admin visibility test

---

## Financial Data (for Finance Center testing)
- Minimum 3 transactions (2 income, 1 expense)
- 1 invoice (pending)
- 1 invoice (paid)

---

## Profile Update Request Data
- 1 pending profile update request (from `student-pending@campusway.test`)
- 1 approved profile update request (historical)

---

## Home Settings Data
- Hero section with headline and CTA configured
- 2+ banner items in banner manager
- Featured universities set (pointing to test university records)
- Stats section with sample numbers

---

## Execution

```bash
# Primary seed (users + base config):
cd backend && npm run seed

# Content pipeline (news, universities, etc.):
npm run seed:content

# Default users:
npm run seed:default-users

# E2E full preparation (sets all this up):
npm run e2e:prepare
```

> **Note**: After running `seed:content` and `e2e:prepare`, verify data using the admin dashboard before starting E2E test runs.

---

## Important Notes

- Seeded test passwords should be documented in `INITIAL_ACCESS_INFO.txt` (not committed)
- After production deployments, the seed scripts should NOT be run unless explicitly resetting local dev
- Guardian phone + email fields in student records must be populated for at least 2 test students to verify the Subscription Contact Center guardian contact features
