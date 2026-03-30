# CampusWay — Data Model Summary

Key data relationships and model structures for development reference.

---

## Core Entity Relationships

```
University ──────────────── UniversityCategory (many-to-one)
         └──────────────── UniversityCluster (many-to-one)
         └──────────────── HomeSettings.featuredUniversities (ref)

StudentProfile ───────────── UserSubscription (one-to-many)
               └──────────── GroupMembership → StudentGroup (via group)
               └──────────── ExamSession → Exam (many-to-many)
               └──────────── ExamResult (one-to-many)
               └──────────── SupportTicket (one-to-many)
               └──────────── ProfileUpdateRequest (one-to-many)
               └──────────── Notification (one-to-many)

SubscriptionPlan ─────────── UserSubscription (one-to-many)

StudentGroup ─────────────── GroupMembership (one-to-many)
             └──────────── Exam.allowedGroups (ref)

NotificationJob ─────────── NotificationTemplate (one-to-one ref)
                └──────────── NotificationProvider (one-to-one ref)
                └──────────── NotificationDeliveryLog (one-to-many)

News ─────────────────────── NewsCategory (many-to-one)
     └──────────────────── NewsSource (many-to-one, for RSS items)
     └──────────────────── NotificationJob (publish → send flow)

Exam ─────────────────────── Question (many-to-many)
     └──────────────────── StudentGroup (allowedGroups — many-to-many)
     └──────────────────── ExamSession (one-to-many per student)
     └──────────────────── ExamResult (one-to-many)
```

---

## Key Model Field Notes

### StudentProfile
- `userId`: Reference to `User` model (admin-created login)
- `groupIds`: Array of `StudentGroup` refs
- `subscriptionStatus`: Derived from `UserSubscription` — do NOT store separately except for cache
- `phone`, `guardianPhone`: Contact fields used in Subscription Contact Center
- `profileCompleteness`: Float 0–1, drives contact center scoring

### UserSubscription
- `studentId`: Reference to `StudentProfile`
- `planId`: Reference to `SubscriptionPlan`
- `status`: `active | expired | renewal_due | cancelled | paused`
- `expiresAt`: Expiry timestamp, drives renewal reminders
- `renewalDue`: Boolean flag, set by cron job

### SubscriptionPlan
- `isActive`: Whether plan is publicly visible
- `isFeatured`: Featured on subscription plans page
- `features`: Array of feature strings
- `maxGroupCount`, `maxExamCount`: Plan limits

### Exam
- `type`: `internal | external`
- `allowedGroups`: Student groups that can see this exam
- `isPublic`: Public visibility flag
- `status`: `draft | published | archived`

### News
- `type`: `news | notice | announcement`
- `status`: `draft | review | published | archived`
- `source`: RSS source reference if RSS-imported
- `featuredOnHome`: Boolean for homepage preview section
- `distributionJobId`: Linked notification job (publish+send)

### NotificationJob (Campaign/Trigger)
- `type`: `campaign | trigger | system`
- `channel`: `sms | email | both`
- `audienceFilter`: Structured filter object (plan, status, group, etc.)
- `templateId`: Reference to `NotificationTemplate`
- `providerId`: Reference to `NotificationProvider`
- `status`: `draft | scheduled | running | completed | failed`
- `deliveryStats`: Counters for sent, failed, pending

### NotificationProvider
- `type`: `sms | email`
- `credentialData`: AES-256-GCM encrypted — never expose plaintext
- `isDefault`: Single default per type
- `isActive`: Administrative enable/disable

### SecuritySettings
- Large model (21KB) — covers:
  - IP whitelist/blacklist
  - Rate limit overrides
  - Login attempt tracking config
  - Force-logout capabilities
  - Audit log settings

### HomeSettings
- Large model (25KB) — covers:
  - Hero content
  - Featured university IDs
  - Featured category IDs
  - Banner items
  - Homepage section ordering
  - Stats counters
  - Footer content

---

## Subscription Status Lifecycle

```
PENDING → ACTIVE → RENEWAL_DUE → EXPIRED
                 │                    │
                 └── CANCELLED ←──────┘
                 └── PAUSED
```

- `ACTIVE`: Full access
- `RENEWAL_DUE`: Access continues, renewal reminder sent
- `EXPIRED`: Access restricted, win-back eligible
- `CANCELLED`: No access, manually set
- `PAUSED`: Temporarily suspended

---

## Important Index Notes

The following fields should have MongoDB indexes (verify via `migrate:ops-indexes-v1`):

| Model | Field | Index Type |
|-------|-------|-----------|
| `StudentProfile` | `phone`, `email` | Index |
| `UserSubscription` | `studentId`, `status`, `expiresAt` | Compound index |
| `StudentGroup` | `name` | Index |
| `News` | `status`, `publishedAt`, `slug` | Compound index |
| `NotificationJob` | `status`, `scheduledAt` | Compound index |
| `NotificationDeliveryLog` | `jobId`, `status` | Compound index |
| `Exam` | `status`, `allowedGroups` | Compound index |
| `ExamSession` | `studentId`, `examId` | Compound index |
| `AuditLog` | `userId`, `createdAt` | Compound index |

---

## Model Quality Notes

- **129 models** total — very large model surface area
- Several older `.model.ts` files exist alongside newer PascalCase `.ts` files (e.g., `exam.model.ts` vs `Exam.ts`)
- Phase 1 cleanup should confirm which are active vs legacy wrappers
- `subscription.model.ts`, `user.model.ts`, `newsItem.model.ts` etc. may be early versions

> Verify in Phase 1: Do the `*.model.ts` lowercase files import the PascalCase ones, or are they standalone duplicates?
