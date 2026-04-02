# CampusWay Ultimate QA & Testing Master Inventory

## 1. PUBLIC / FRONTEND
**Tech Stack:** React, Vite, Tailwind CSS (port 5175), Next.js (port 3000)
**Core Routes (`App.tsx`):**
- `/` - HomePage
- `/universities`, `/universities/:slug`, `/universities/category/:categorySlug`, `/universities/cluster/:clusterSlug`
- `/news`, `/news/:slug`
- `/resources`, `/resources/:slug`
- `/subscription-plans`, `/subscription-plans/:planId`, `/subscription-plans/checkout/:slug`
- `/contact`, `/help-center`

## 2. STUDENT SIDE
**Core Routes:**
- `/login` (auth)
- `/exams`, `/exam/:examId`, `/exam/:examId/result`, `/exam/:examId/solutions`
- `/certificate/verify/:certificateId`
**Backend APIs (`studentRoutes.ts`):** 
- `/profile`, `/dashboard`
- `/me/exams`, `/me/results`
- `/notifications`, `/support-tickets`

## 3. ADMIN SIDE
**UI Base:** `/__cw_admin__`
**Core Screens (`appRoutes.ts`):**
- `/dashboard`
- `/universities`, `/featured`
- `/student-management/list`, `/students-v2`, `/student-groups-v2`
- `/exams`, `/question-bank`, `/live-monitor`
- `/subscriptions-v2`, `/subscriptions/plans`
- `/finance/dashboard`
- `/support-center`, `/contact`
- `/notification-center`, `/alerts`
- `/news/pending`, `/resources`, `/banners`, `/settings/home-control`
- `/reports`, `/users`, `/team/members`, `/settings/security-center`

## 4. CROSS-SYSTEM RELATIONSHIPS
- **Frontend <> Backend:** API calls via Axios (base URL configurable).
- **Admin <> Public Reflection:** Changes in `/__cw_admin__/universities` or `/__cw_admin__/news` MUST reflect at `/universities` and `/news`.
- **Subscription <> Access:** Student exams or premium universities must be gated by the active subscription plan.
- **Firebase Auth <> Azure Backend:** System relies on Firebase tokens to authenticate with a robust Azure NodeJS backend.

## 5. CLASSIFICATION OF DISCOVERED ITEMS
- **Already Good:** Core MongoDB schema, Auth structures, Basic routing setups.
- **Needs Runtime Proof:** Login handshakes, webhook execution, Azure/Firebase Environment Variables reflection.
- **Requires DB/API Proof:** Student Profile update workflow (admin approval -> student visible).
- **Duplicate/Junk Risk:** V2 vs V1 admin screens (`students-v2` vs `students`, `subscriptions-v2` vs `subscriptions`).
- **Security-Risky:** Exposure of Admin paths without token verification, SSR leaks in Next.js app.