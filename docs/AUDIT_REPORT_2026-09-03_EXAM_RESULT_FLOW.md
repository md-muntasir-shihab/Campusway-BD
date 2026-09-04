# অডিট রিপোর্ট — Exam / Student / Question Bank / Subscription / Contact / Group

**তারিখ:** ২০২৬-০৯-০৩
**ব্রাঞ্চ:** `arena/01a068a5-campusway-bd` (base: `main` @ `5a7018a`)
**স্কোপ:** শিক্ষার্থীর পরীক্ষা ও ফলাফল ফ্লো-কে কেন্দ্র করে ৬টি মডিউল
**স্ট্যাটাস:** শুধু অডিট — **কোনো কোড পরিবর্তন করা হয়নি**

---

## ০. ভেরিফায়েড বেসলাইন (কাজ শুরুর আগের অবস্থা)

| চেক | ফলাফল |
|---|---|
| `backend: npx tsc --noEmit` | ✅ GREEN (০ error) |
| `frontend: npx tsc --noEmit` | ✅ GREEN (০ error) |
| `backend: vitest` (non-DB নমুনা: ResultEngineService + antiCheatEngine) | ✅ 22/22 pass |
| backend টেস্ট ফাইল সংখ্যা | ১৫৮টি (`src/__tests__/`) + ৯টি (`tests/`) |
| `vitest.config.ts` | `fileParallelism: false` **আগেই সেট আছে** ✅ |
| DB-নির্ভর টেস্ট | এই স্যান্ডবক্সে `mongod` নেই → DB টেস্ট চালানো যাবে না; unit/property টেস্টই ব্যবহার্য |

> **গুরুত্বপূর্ণ:** `vitest.setup.ts` `mongodb-memory-server`-কে mock করে `127.0.0.1:27017`/`MONGODB_URI`-তে redirect করে। তাই নতুন টেস্ট লেখার সময় **DB ছাড়া চলে এমন pure-function/unit টেস্ট** অগ্রাধিকার পাবে, যাতে CI ও এই সেশন দুই জায়গায়ই গ্রিন থাকে।

---

## ১. আপনার আগের ৬টি ফাইন্ডিং — আজকের যাচাই

| # | আগের ফাইন্ডিং | আজকের অবস্থা | মন্তব্য |
|---|---|---|---|
| 1 | কোথাও DB transaction নেই | ✅ **সত্য** | `startSession|withTransaction` কেবল ৩ ফাইলে: `backupController.ts`, `services/deleteSafetyService.ts`, `services/examSessionService.ts`(শুধু নামের কারণে — এটি transaction নয়, একটি `startSession()` exam-session ফাংশন)। অর্থাৎ **কোনো ব্যবসায়িক controller/service-এ transaction নেই**। |
| 2 | submitExam ডাবল-সাবমিট গার্ড non-atomic | ⚠️ **আংশিক সত্য — আপডেট দরকার** | গার্ড এখন `examController` নয়, `services/examFinalizationService.ts`-এ। `ExamResult`-এ `{exam,student,attemptNo}` **unique index আছে** (`ExamResult.ts:171`) এবং `E11000` catch করে duplicate ফেরত দেয় — তাই **ডুপ্লিকেট ExamResult row হবে না**। কিন্তু গার্ডটা এখনো check-then-act, ফলে **পাশাপাশি রিকোয়েস্টে side-effect দুইবার চলে** (নিচে B-1 দেখুন)। |
| 3 | exam start-এ TOCTOU | ✅ **সত্য** | `examController.ts:1653` — `ExamSession.findOne({isActive:true})` → `ExamSession.create()`; `ExamSession`-এ `{exam,student,attemptNo}` unique index **নেই** → দুইটা active session তৈরি হতে পারে। |
| 4 | examController ৩,৪৮৯ লাইন / subscriptionController ১,৭৭৫ | ✅ **সত্য (হুবহু)** | `examController.ts` = **3489**, `subscriptionController.ts` = **1775**। পাশাপাশি আরও বড়: `newsV2Controller.ts` 240KB, `adminExamController.ts` 164KB, `adminUserController.ts` 152KB। |
| 5 | import job inline প্রসেস হয় | ✅ **সত্য** | `questionBankController.bulkImportQuestions` (~line 870–1050) পুরো লুপ request handler-এ চালায়, তারপর **202 "Bulk import started"** ফেরত দেয় — অথচ কাজ শেষ। কোনো worker নেই। |
| 6 | সংযোগ-বিন্দুগুলো | ✅ **সত্য + একটি নতুন সমস্যা** | `getEligibilitySummary` (examController:891) subscription + profile-score + due-ledger + group একসাথে দেখে। কিন্তু group-gating **`StudentProfile.groupIds`** পড়ে, আর group CRUD **`GroupMembership`** লেখে → dual source of truth (নিচে C-1)। |

---

## ২. নতুন পাওয়া বাগ — ঝুঁকি অনুযায়ী সাজানো

### 🔴 A. ক্রিটিক্যাল — ডেটা হারায় / ফলাফল দেখা যায় না / টাকার ভুল

---

#### **A-1 — দুইটা প্রতিযোগী exam engine একই collection-এ; একটা সম্পূর্ণ ভাঙা এবং cron-এ চালু আছে**

**ফাইল:** `src/services/examSessionService.ts`, `src/cron/modernExamJobs.ts`, `src/jobs/examAutoSubmitJob.ts`, `src/models/ExamSession.ts`

কোডবেসে exam attempt-এর **দুইটা আলাদা ইঞ্জিন** আছে, দুটোই `exam_attempts` collection ব্যবহার করে:

| | ইঞ্জিন A (আসল, ব্যবহৃত) | ইঞ্জিন B ("modern", ভাঙা) |
|---|---|---|
| কোড | `examController` + `examFinalizationService` | `examSessionService` |
| session ফিল্ড | `exam`, `student`, `expiresAt`, `isActive` | `examId`, `userId`, `expiresAtUTC`, `startedAtUTC` |
| উত্তর | `ExamSession.answers` (embedded) | `AnswerModel` (`answers` collection) |
| ফলাফল | `ExamResult` → collection **`student_results`** | `ResultModel` → collection **`results`** |

**সমস্যা:**

1. `ExamSession` schema-তে `examId`, `userId`, `expiresAtUTC`, `startedAtUTC`, `questionOrder`, `optionOrderMap` — এর **একটাও নেই**, আর `expiresAt` হলো `required: true`। তাই `examSessionService.startSession()` কল করলেই **ValidationError** — ইঞ্জিন B আসলে চলেই না।
2. তবু `server.ts:581` থেকে **`startModernExamCronJobs()` প্রতি মিনিটে চলছে** এবং query করছে `{status:'in_progress', expiresAtUTC:{$lt:...}}`। `expiresAtUTC` schema-তে নেই → **কোনো index নেই** → **প্রতি ৬০ সেকেন্ডে `exam_attempts`-এ full collection scan**, চিরকাল, কোনো লাভ ছাড়াই। attempt history বাড়লে খরচও বাড়বে।
3. যদি কোনো লিগ্যাসি ডকুমেন্টে `expiresAtUTC` **থাকে**, তখন আরও খারাপ: modern cron আগে `status='submitted'` বসিয়ে দেয় → এরপর সঠিক cron (`examJobs.ts`)-এর query (`status: {$in:['in_progress','expired']}`) আর মেলে না → **সেই attempt-এর `ExamResult` কখনো তৈরি হয় না, `isActive` চিরকাল `true` থেকে যায়** → শিক্ষার্থী ফলাফলও দেখে না, নতুন attempt-ও দিতে পারে না।

**প্রভাব:** নীরব পারফরম্যান্স ক্ষয় + expired attempt-এর ফলাফল হারানোর সম্ভাবনা।
**সুপারিশ:** `startModernExamCronJobs()` disable/মুছে দেওয়া (feature-flag সহ), ইঞ্জিন B-কে deprecated চিহ্নিত করা।

---

#### **A-2 — Question Bank analytics সবসময় শূন্য (কখনো লেখা হয় না এমন collection পড়ে)**

**ফাইল:** `src/services/questionBankAdvancedService.ts:977`

```ts
const answers = await AnswerModel.find({ questionId: {$in: snapshotIds}, examId: {$in: examIds} }).lean();
```

**`AnswerModel`-এ কোথাও কোনো write নেই** — গোটা রিপোতে শুধু ৫টা read (`examSessionService` ভাঙা, `examPdfController` unreachable, এই একটা live)। আসল উত্তর `ExamSession.answers`-এ embedded থাকে।

**প্রভাব:** `refreshAnalyticsForQuestion()` সবসময় `totalCorrect=0, totalWrong=0, totalSkipped=0` দেয় → প্রশ্নের difficulty/discrimination, `avg_correct_pct`, `quality_score` — সব ভুল। Question Bank-এর পুরো analytics feature নীরবে অকেজো।

---

#### **A-3 — Payment webhook: একই `tran_id`-তে retry হলে ৫০০ → gateway অসীম retry loop**

**ফাইল:** `src/routes/webhookRoutes.ts:117`

`PaymentWebhookEvent`-এ unique index আছে `{provider, providerEventId}` (`PaymentWebhookEvent.ts:35`)। কিন্তু replay-check শুধু `status:'processed'` খোঁজে:

```ts
const existingEvent = await PaymentWebhookEvent.findOne({ provider, providerEventId: tran_id, status: 'processed' });
...
const webhookEvent = await PaymentWebhookEvent.create({ provider, providerEventId: String(tran_id), status: 'received', ... });
```

প্রথম কলটা যদি মাঝপথে ফেল করে (status `received`/`failed` থেকে যায়), তাহলে SSLCommerz-এর retry-তে `findOne` কিছু পায় না → `create` **E11000** ছুড়ে দেয় → outer catch → **HTTP 500** → gateway আবার retry → আবার ৫০০… **স্থায়ীভাবে আটকে যায়, পেমেন্ট কখনো settle হয় না।**

---

#### **A-4 — Payment status transition non-atomic → ডাবল সাবস্ক্রিপশন + ডাবল income posting**

**ফাইল:** `src/routes/webhookRoutes.ts:135–160`

```ts
if (payment.status === 'paid') { /* idempotent return */ }
...
payment.status = 'paid'; await payment.save();
if (payment.entryType === 'subscription') await activateSubscriptionFromPayment(...);
await createIncomeFromPayment(...);
```

দুইটা IPN পাশাপাশি এলে **দুটোই** `status==='paid'` চেকে পাশ করে → `activateSubscriptionFromPayment` **দুইবার**, `createIncomeFromPayment` **দুইবার**, `emitFinanceTransaction` **দুইবার**।

**প্রভাব:** একই টাকার জন্য দুইবার revenue পোস্ট (Finance রিপোর্ট ভুল) + ডুপ্লিকেট `UserSubscription`। **`UserSubscription`-এ কোনো unique index নেই** — তাই একাধিক active subscription আটকানোর কিছুই নেই।
**ঠিক করার উপায়:** `ManualPayment.findOneAndUpdate({_id, status:{$ne:'paid'}}, {$set:{status:'paid'}}, {new:true})` — `null` ফিরলে অন্য কেউ আগে করেছে, চুপচাপ 200।

---

#### **A-5 — Renewal-এ বাকি দিনগুলো হারিয়ে যায়**

**ফাইল:** `src/services/subscriptionLifecycleService.ts:595` (`activateSubscriptionFromPayment`)

```ts
const startAtUTC = parseDate(payment.paidAt || payment.date, new Date()) || new Date();
const expiresAtUTC = buildExpiryDate(startAtUTC, plan);
...
subscription.startAtUTC = startAtUTC;
subscription.expiresAtUTC = expiresAtUTC;   // ← বিদ্যমান expiry ওভাররাইট
```

এটা **active** subscription-ও খুঁজে নেয় (`status: {$in:['pending','suspended','active']}`)। কেউ ১০ দিন আগে renew করলে **সেই ১০ দিন মুছে যায়**।

**প্রমাণ যে এটা বাগ, ইচ্ছাকৃত নয়:** একই রিপোর `renewalAutomationController.ts:116` ঠিক কাজটা করে —
```ts
const base = sub.expiresAtUTC && sub.expiresAtUTC > new Date() ? sub.expiresAtUTC : new Date();
sub.expiresAtUTC = new Date(base.getTime() + days*86400000);
```
দুই জায়গায় দুই আচরণ = inconsistency।

---

#### **A-6 — Autosave-এ lost update: শিক্ষার্থীর উত্তর মুছে যায়**

**ফাইল:** `src/controllers/examController.ts:1778` (`autosaveExam`)

পুরো `session.answers` array read-modify-write হয় `session.save()` দিয়ে। optimistic-concurrency আছে (`attemptRevision`) কিন্তু:

1. `expectedRevision` **অপশনাল** — `parseAttemptRevision` না পেলে `null` দেয় এবং চেকটাই স্কিপ হয় (`if (expectedRevision !== null && ...)`)। যে ক্লায়েন্ট `attemptRevision` পাঠায় না, তার **কোনো সুরক্ষা নেই**।
2. পাঠালেও চেকটা **check-then-save**, atomic নয় — দুইটা রিকোয়েস্ট একই `expectedRevision` নিয়ে দুটোই পাশ করে দুটোই save করতে পারে।

**প্রভাব:** ট্যাব/মোবাইল থেকে সমান্তরাল autosave → **last-write-wins পুরো array-তে → উত্তর হারায়**। এটাই সম্ভবত "উত্তর মুছে গেছে" অভিযোগের মূল।
**সঠিক রূপ:** `ExamSession.findOneAndUpdate({_id, attemptRevision: expected}, {$set:{answers,...}, $inc:{attemptRevision:1}}, {new:true})`; `null` → 409।

---

### 🟠 B. উচ্চ — race / duplicate / ৫০০ error

#### **B-1 — submitExam-এর side-effect ডুপ্লিকেট হয় (unique index শুধু row বাঁচায়)**
`examFinalizationService.ts`: `existingResult` চেকের পর, `ExamResult.create()`-এর **আগেই** প্রতি প্রশ্নে fire-and-forget `$inc` চলে:
```ts
void Question.findByIdAndUpdate(question._id, { $inc: { totalAttempted: ..., totalCorrect: ... } }).exec();
```
পাশাপাশি দুইটা submit → দুটোই এখানে পৌঁছায় → `$inc` **দুইবার** (idempotent নয়), যদিও একটাই E11000-এ হারে। ফলে প্রশ্নের attempt/correct কাউন্টার স্ফীত হয়।
এছাড়া `void ... .exec()` unhandled rejection-এর ঝুঁকি এবং transaction-এ আনা যায় না।

#### **B-2 — Certificate issue-এ race → শিক্ষার্থী ৫০০ পায়**
`examController.ts:3072` — `ExamCertificate.findOne(...)` → `create(...)`। `ExamCertificate`-এ `{examId,studentId,attemptNo}` unique index আছে (`ExamCertificate.ts:29`) কিন্তু **E11000 catch নেই** → ডাবল-ক্লিক/দুই ট্যাবে **HTTP 500**। `certificateId` collision-এর `while` লুপও unbounded।

#### **B-3 — Certificate verify: টোকেন খালি হলে চেক পুরোপুরি বাইপাস (PII লিক)**
`examController.ts:3164`
```ts
if (token && token !== String(certificate.verifyToken || '')) { 401 }
```
`token` না দিলে `token` falsy → পুরো শর্ত skip → **যেকেউ শুধু `certificateId` জেনে** শিক্ষার্থীর `full_name`, `email`, নম্বর, শতকরা পেয়ে যায়। তুলনা `crypto.timingSafeEqual` নয় (timing leak)।

#### **B-4 — exam start TOCTOU (আপনার ফাইন্ডিং ৩) — নিশ্চিত**
`examController.ts:1653` findOne → 1721 create। `ExamSession`-এ `{exam,student,attemptNo}` unique index নেই → **দুইটা active session**। এরপর submit শুধু `sort({attemptNo:-1})`-এর একটাকে finalize করে; অন্যটা চিরকাল `isActive:true` → শিক্ষার্থী আটকে যায় এবং `attemptsUsed` ভুল হয়।

#### **B-5 — একই লাইনে template literal ভুল করে single-quote**
`examController.ts:1643`
```ts
ResponseBuilder.error('VALIDATION_ERROR', 'Maximum attempt limit (${exam.attemptLimit}) reached.')
```
backtick-এর বদলে single quote → শিক্ষার্থী আক্ষরিক `${exam.attemptLimit}` দেখে। (একই মেসেজ ১৫৬৭ লাইনে সঠিকভাবে backtick দিয়ে লেখা।)

#### **B-6 — `assignSubscriptionLifecycle`-এ ২-মিনিটের সময়ভিত্তিক duplicate গার্ড**
`subscriptionLifecycleService.ts:526` `findRecentEquivalentAssignment` — `createdAt >= now-2min` + মিলিয়ে দেখা। এটা idempotency key নয়, heuristic। একই মুহূর্তে দুইটা রিকোয়েস্ট → দুটোতেই `null` → **২টা `UserSubscription` + ২টা `ManualPayment` + ২টা FinanceTransaction**।
রিপোতে **`IdempotencyKey` model + `idempotencyGuardService` ইতিমধ্যেই আছে** (এখন শুধু campaign-এ ব্যবহৃত) — পুনর্ব্যবহারের সুযোগ।

#### **B-7 — Group membership add-এ TOCTOU + drift কখনো সারে না**
`groupMembershipService.ts:80` `addMembership`: findOne(active) → findOneAndUpdate(archived) → create। `GroupMembership`-এ partial unique index আছে (`{groupId,studentId}` where `membershipStatus:'active'`) → পাশাপাশি add-এ **E11000 throw**, যা `bulkAddMembers` "error" হিসেবে দেখায় (অথচ আসলে duplicate)।
আরও: already-active হলে `return false` — কিন্তু তখন **`StudentProfile.groupIds` sync করা হয় না**, তাই একবার drift হলে আর সারে না।
`moveMembers` = remove তারপর add, transaction ছাড়া → মাঝপথে ফেল করলে **শিক্ষার্থী কোনো গ্রুপেই থাকে না**।

---

### 🟡 C. মধ্যম — consistency / স্কেল / UX

#### **C-1 — Group সদস্যপদের dual source of truth (exam access-কে প্রভাবিত করে)**
- লেখা হয়: `GroupMembership` (canonical) **এবং** `StudentProfile.groupIds` (mirror)
- পড়া হয় (exam gating): `examController.ts:894` → `StudentProfile.groupIds`; `adminExamController.ts:631` → `StudentProfile.find({groupIds: {$in: ...}})`
- পড়া হয় (group UI): `GroupMembership`

mirror স্টেল হলে → শিক্ষার্থী **group-only পরীক্ষায় ঢুকতে পারে না** (বা উল্টো, না পাওয়ার কথা এমন পরীক্ষায় ঢুকে যায়)। কোনো reconciliation job নেই (`syncAllGroupCounts` শুধু count ঠিক করে, membership নয়)।

#### **C-2 — Profile-completion threshold দুই জায়গায় দুইভাবে**
- `examController.getProfileCompletionThreshold()` → security config, না হলে `StudentDashboardConfig.profileCompletionThreshold`, না হলে 70
- `studentHubController` (line ~56) → security config, না হলে **hardcoded 70**

`StudentDashboardConfig`-এ 60 সেট করলে hub বলবে "eligible", অথচ `startExam` 403 দেবে। **Confusing 403**।

#### **C-3 — Bulk question import inline; 202 মিথ্যা বলে**
`questionBankController.ts:870+`: প্রতি row-এ `validateImageUrl()` (নেটওয়ার্ক কল), `QuestionMedia.create`, duplicate detection, `Question.create`, `createQuestionRevision`, আরেকটা `save()` — সব sequential, request-এর ভেতরে। বড় ফাইলে **HTTP/proxy timeout**, আর তখন job `processing`-এ আটকে থাকে (recovery নেই)। `ExamImportJob`/`QuestionImportJob` model আছে, worker নেই।
পাশাপাশি: duplicate detection candidate pool **হার্ডকোডেড `.limit(600)`** → বড় বাংকে duplicate ধরা পড়ে না, ফলাফল অস্থিতিশীল।

#### **C-4 — `ExamSession`-এ unbounded array → ডকুমেন্ট ফুলে যায়**
`autosaveExam`: `session.autoSaves += 1`, `session.tabSwitchEvents.push(...)`, `session.cheat_flags = [...prev, ...new]`, প্রতি উত্তরে `answerHistory.push`। ৩ ঘণ্টার পরীক্ষায় ৫ সেকেন্ড interval = ~২১৬০ autosave → **16MB ডকুমেন্ট লিমিটের ঝুঁকি**, এবং প্রতিবার পুরো doc rewrite (write amplification)।

#### **C-5 — `recomputeStudentDueLedger` read-modify-write**
`subscriptionLifecycleService.ts:223` — `existing` পড়ে `manualAdjustment`/`waiverAmount` নেয়, তারপর `netDue` লিখে। একই সময়ে অ্যাডমিন `manualAdjustment` বদলালে **lost update → netDue ভুল** → exam payment gate ভুল সিদ্ধান্ত নেয় (`getEligibilitySummary` `netDue` দেখে)।

#### **C-6 — Result publish: `resultPublishDate` না থাকলে ফলাফল কখনো publish হয় না**
`isExamResultPublished` (examController:1126): mode default `'scheduled'`; `resultPublishDate` অনুপস্থিত/invalid → `return false`, **চিরকাল**। নতুন exam-এ `adminExamController:166` fallback দেয় (`endDate`), কিন্তু **পুরনো/import করা exam-এ ফাঁদ**। কোনো "manual publish now" নিরাপত্তা-জাল নেই।

#### **C-7 — Certificate `passOnly` চেক আসলে dead code**
`certificateEligibility` (examController:3025): `exam.passMarks ?? exam.pass_marks ?? minPercentage` — **`Exam` schema-তে `passMarks`/`pass_marks` কোনোটাই নেই**। তাই `passThreshold` সর্বদা `minPercentage`, আর `passOnly` চেক `minPercentage` চেকের হুবহু নকল। "পাস করলেই সার্টিফিকেট" নিয়মটা কার্যত নেই।

#### **C-8 — Cron multi-instance guard নেই**
`server.ts:579–589` ১০+ cron module চালু করে। `render.yaml`-এ একাধিক instance হলে **প্রতি instance-এ সব cron চলবে** → ডুপ্লিকেট auto-submit, ডুপ্লিকেট নোটিফিকেশন, `LeaderboardEntry.deleteMany` একাধিকবার। কোনো distributed lock/leader election নেই (`jobRunLogService` লগ রাখে, lock নেয় না)।

---

### 🟢 D. নিম্ন — পরিচ্ছন্নতা, কিন্তু ব্যবহারকারী দেখে

#### **D-1 — `questionBankController.ts`-এ বাংলা লেখা নষ্ট (mojibake) — ১২টি স্ট্রিং**
ফাইলটি UTF-8 (em-dash `—` অটুট আছে: বাইট `E2 80 94`), কিন্তু বাংলা অক্ষরগুলো literal `?` (0x3F) হয়ে গেছে — কোনো এক non-UTF8 write-এ **ডেটা হারিয়েছে, শুধু ডিসপ্লে সমস্যা নয়**:

```
:474  '????????? ?????? ?????? ??? ????? — ??????? ??? ???'
:668  '?????? ???? ???????? ??, ?????? ??????? ??? ?????'
:769  errors.includes('?????? ????? ???')      ← ⚠️ এটা তুলনার ভিত্তি!
:932  `????? ????? ?? ?? ??????: ${errors.join(', ')}`
:945  '??? ???? ???? ??? ???? ???? ????? ???? (Max 5MB)'
:1017 `????? ????? ?? ?? ??????: ${(error as Error).message}`
:1158,1182,1188 (একই 5MB মেসেজ)
:568, :797 (একই duplicate warning)
```
`:769`-এর `errors.includes('?????? ????? ???')` বিশেষভাবে বিপজ্জনক — এটা একটা **string তুলনা**, তাই `normalizeQuestionPayload` যদি আসল বাংলা মেসেজ ফেরত দেয় তবে ম্যাচ করবে না। রিপোর আর কোনো ফাইলে এই সমস্যা নেই (শুধু এই একটা ফাইল)।

#### **D-2 — `routes/exams/adminExamRoutes.ts` = dead code, ভুল collection পড়ে**
কোথাও mount করা নেই (`server.ts` শুধু `studentExamRoutes` mount করে)। কিন্তু ভেতরে `GET /exams/:id/results` ও CSV/XLSX export **`ResultModel` (collection `results`)** পড়ে, অথচ আসল ফলাফল `ExamResult` (collection `student_results`)-এ যায়। ভবিষ্যতে কেউ mount করলেই **admin ফলাফল তালিকা ও export সবসময় খালি**। এখনই মুছে/স্পষ্ট deprecate করা উচিত।

#### **D-3 — `examPdfController.generateAnswersPdf`-এ unreachable শাখা**
`resolveExamContext` সর্বদা `kind:'legacy'` ফেরত দেয়, তাই `if (context.kind === 'modern')` (line 462, যেখানে `AnswerModel` পড়া হয়) কখনোই চলে না — dead code, বিভ্রান্তিকর।

#### **D-4 — Contact form-এ zod নেই**
`contactController.submitContactMessage` হাতে-লেখা `String(...).trim()` + regex ব্যবহার করে, অথচ রিপোর স্ট্যান্ডার্ড `src/validators/` + zod। `phone` একেবারেই validate হয় না, `topic` free-text। rate-limit + AppCheck আছে (`publicRoutes.ts:285`) তাই abuse ঝুঁকি সীমিত, কিন্তু duplicate dedupe নেই → একই মেসেজ N বার = N admin alert + N timeline event।

#### **D-5 — Mongoose duplicate index warning**
টেস্ট চালাতেই দেখা যায়: `Duplicate schema index on {"student":1}` (২ বার) — কোনো model-এ `index:true` ও `schema.index()` দুটোই আছে।

---

## ৩. ইন্টিগ্রেশন প্ল্যান — রিপো-হেলথ যাচাই সহ

আপনার নিয়ম: **শেষ commit ≤৬ মাস, MIT/Apache, npm downloads**। আজ (২০২৬-০৯-০৩) যাচাই করলাম:

| প্রস্তাব | লাইসেন্স | সর্বশেষ রিলিজ | স্বাস্থ্য | রায় |
|---|---|---|---|---|
| **`pavlov99/gift`** *(আপনার প্রস্তাব)* | MIT | GitHub push **২০২১-০৮-১০** | ⭐ **১ star**, ৫ বছর নিষ্ক্রিয়, ব্যবহারযোগ্য npm রিলিজ নেই | ❌ **বাতিল — আপনার নিজের হেলথ-চেকে ফেল** |
| `gift-pegjs` (`fuhrmanator/GIFT-grammar-PEG.js`) | MIT | npm **১.০.২ / ২০২৪-০৯-১৫** (repo push ২০২৫-১১-১৮, ৩৮ stars) | npm রিলিজ ~২৪ মাস পুরনো | ⚠️ **borderline — ≤৬ মাস নিয়মে ফেল** |
| **BullMQ** | MIT | **৬.৩.৪ / ২০২৬-০৯-০১** (২ দিন আগে) | **~৮.৪M weekly downloads** | ✅ **অনুমোদিত** |
| `ioredis` (BullMQ peer) | MIT | ৬.০.০ / ২০২৬-০৭-৩১ | Redis-এর official | ✅ **অনুমোদিত** |
| `meilisearch` (JS client) | MIT | ০.৬০.০ / ২০২৬-০৭-২২ | সক্রিয় | ✅ **অনুমোদিত** |

### GIFT সম্পর্কে আমার সুপারিশ (গুরুত্বপূর্ণ পরিবর্তন)

দুটো GIFT অপশনই আপনার হেলথ-চেকে ফেল করে। কিন্তু GIFT একটা **হিমায়িত, ডকুমেন্টেড ফরম্যাট** — ভাষা বদলায় না। তাই:

> **নতুন dependency না নিয়ে, আমাদের দরকারি GIFT subset-এর জন্য একটা ছোট in-house parser লিখি** — `src/services/integrations/giftAdapter.ts`, ~২৫০ লাইন, পুরো ইউনিট-টেস্ট সহ। Subset: `::title::`, `// comment`, MCQ (`{=সঠিক ~ভুল}`), True/False (`{T}`/`{F}`), short answer, `#feedback`, `####general feedback`, `\` escape।

এর লাভ: **শূন্য নতুন dependency, শূন্য লাইসেন্স ঝুঁকি, শূন্য supply-chain ঝুঁকি**, আর ইন্টারফেসটা এমন থাকবে যে পরে চাইলে `gift-pegjs`-কে ঠিক একই adapter-এর পেছনে বসানো যাবে। এটা আপনার "adapter প্যাটার্ন" নিয়মকে আরও ভালোভাবে মানে।

### Tier 2 (শুধু ডিজাইন পড়া, কোড কপি নয়) — নিশ্চিত
TCExam, Moodle question engine — **GPL, কোড কপি সম্পূর্ণ নিষিদ্ধ**। শুধু ধারণা: attempt state machine, per-question grading strategy, violation-event taxonomy। কোনো ফাইল/স্নিপেট আসবে না; শুধু আমাদের নিজের কোডে ধারণা প্রয়োগ।

### Tier 3 (পরে) — নিশ্চিত
pix2tex/LaTeX-OCR আলাদা Python সার্ভিস, human-review বাধ্যতামূলক। এখন নয়।

---

## ৪. প্রস্তাবিত ধাপভিত্তিক রোডম্যাপ

প্রতিটা ধাপ = **আলাদা ছোট commit**, আগে-পরে `tsc --noEmit` + eslint + প্রভাবিত টেস্ট, গ্রিন না হলে এগোবো না।

> **ভিত্তি প্রথমে** — কোনো নতুন লাইব্রেরি ধাপ ৫-এর আগে ঢুকবে না।

### **ধাপ ১ — অ্যাটমিক গার্ড (transaction ছাড়াই, তাই যেকোনো Mongo-তে চলে)** ← *আপনার অনুমোদন চাই*
1. `submitExam` / `finalizeExamSession`: `ExamSession.findOneAndUpdate({_id, isActive:true, ...}, {$set:{...}})` দিয়ে **claim-then-work**; `null` → ইতিমধ্যে সাবমিটেড (200, বিদ্যমান রেসপন্স-শেপ অটুট)। `Question` `$inc` claim পাওয়ার পরেই।  → **A-1/B-1**
2. `autosaveExam`: `findOneAndUpdate({_id, attemptRevision: expected}, {$set:{answers}, $inc:{attemptRevision:1}})`; `expectedRevision` না এলেও server-side revision দিয়ে CAS। → **A-6**
3. `startExam`: `ExamSession`-এ `{exam, student, attemptNo}` unique index (**backward-compatible**, partial) + E11000 → বিদ্যমান session resume। → **B-4**
4. `getExamCertificate`: `findOneAndUpdate(..., {upsert:true, setDefaultsOnInsert:true})` অথবা E11000 catch → বিদ্যমান certificate ফেরত (৫০০ আর নয়)। → **B-2**
5. B-3 (certificate token bypass) + B-5 (template literal) — এক লাইনের নিরাপত্তা/UX ফিক্স।
6. **টেস্ট:** নতুন pure-unit টেস্ট (DB ছাড়া) claim-logic ও token-compare-এর জন্য; বিদ্যমান কোনো টেস্ট ভাঙবে না।

### **ধাপ ২ — Transaction helper (opt-in, flag-এ, fallback সহ)**
`src/services/txnRunner.ts` — `withOptionalTransaction(fn)`; replica-set না থাকলে বা flag off থাকলে **transaction ছাড়াই একই কোড চালায়** (standalone Mongo-তে ভাঙবে না)। প্রথমে শুধু ৩টা critical path: exam submit, subscription activate, group move। অ্যাডমিন প্যানেল থেকে টগল।

### **ধাপ ৩ — Payment/subscription অখণ্ডতা**
A-3 (webhook 500-loop), A-4 (atomic payment claim), A-5 (renewal extend, `renewalAutomationController`-এর সঠিক লজিক পুনর্ব্যবহার), B-6 (বিদ্যমান `idempotencyGuardService` দিয়ে assign idempotency), C-5 (`$inc`-ভিত্তিক due ledger)। **নতুন dependency নেই।**

### **ধাপ ৪ — নীরব ভাঙা জিনিস + consistency**
A-2 (analytics-কে `ExamSession.answers`/`ExamResult` থেকে পড়ানো), A-1-এর cron disable (flag), C-1 (group reconciliation job + একটাই read path), C-2 (একটাই threshold helper), C-6 (publish safety-net), C-7, D-1 (১২টা বাংলা স্ট্রিং পুনরুদ্ধার), D-2/D-3 (dead code সরানো), D-5।

### **ধাপ ৫ — GIFT adapter (in-house, শূন্য dependency)**
`giftAdapter.ts` — `parseGift(text) → NormalizedQuestionPayload[]`, তারপর **বিদ্যমান `validateQuestionPayload`-এ যায়** (পুরনো CSV/XLSX পথ হাত দেওয়া হবে না)। অ্যাডমিন টগল: `questionImport.giftEnabled`।

### **ধাপ ৬ — BullMQ background worker (flag + fallback)**
`src/services/queue/queueAdapter.ts` — চিকন ইন্টারফেস (`enqueue`, `process`)। Redis/flag না থাকলে **inline fallback = আজকের ঠিক আচরণ**। প্রথম consumer: question/exam import (C-3), তারপর certificate ও result recompute। controller-এ কখনো `bullmq` import হবে না।

### **ধাপ ৭ — Meilisearch (flag + Mongo fallback)** ও **ধাপ ৮ — controller ভাঙা (৪)**
ধাপ ১–৬ স্থিতিশীল হওয়ার পর। controller বিভাজন pure-refactor হিসেবে, রুট/রেসপন্স-শেপ অপরিবর্তিত।

---

## ৫. আপনার অনুমোদনের জন্য প্রশ্ন

1. **ধাপ ১ (অ্যাটমিক গার্ড + ৫টা ফিক্স + টেস্ট)** — শুরু করব?
2. **GIFT:** `pavlov99/gift` বাতিল করে **in-house adapter** — এই পরিবর্তনে সম্মত?
3. **Transaction:** replica-set ছাড়া প্রোডাকশনে সমস্যা হবে না এমন **opt-in helper** (ধাপ ২) — নাকি সরাসরি বাধ্যতামূলক transaction চান? (আপনার Mongo standalone না replica-set, জানালে ভালো)
4. **A-1-এর `startModernExamCronJobs()`** — flag দিয়ে বন্ধ করব (নিরাপদ) নাকি একেবারে মুছে দেব?
5. **D-1 (বাংলা mojibake):** আমি অর্থ অনুযায়ী নতুন বাংলা লিখব, নাকি আপনি ১২টা স্ট্রিং-এর সঠিক বাংলা দেবেন?

**অনুমোদন পেলেই ধাপ ১ শুরু করব — প্রতিটা উপ-ধাপে আলাদা commit + push, ধাপ শেষে PR।**
