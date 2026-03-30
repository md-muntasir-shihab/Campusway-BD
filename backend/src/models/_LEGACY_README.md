# Models Directory — Naming Convention & Architecture

## ⚠️ DO NOT DELETE ANY MODEL FILES WITHOUT READING THIS

This directory contains two **distinct model systems** that coexist by design:

### 1. PascalCase Files (e.g., `Exam.ts`, `AuditLog.ts`)
- **Role**: Modern, full-featured models with TypeScript interfaces
- **Collection**: Each uses its own collection (e.g., `exam_collection`, `auditlogs`)
- **Usage**: Primary models for the modern CampusWay platform

### 2. `.model.ts` Files (e.g., `exam.model.ts`, `auditLog.model.ts`)
- **Role**: Simpler schemas used by specific subsystems (exam engine, question bank, payments)
- **Collection**: Use **different collections** from PascalCase counterparts (e.g., `exams`, `audit_logs`)
- **Usage**: Active imports in `examController.ts`, `adminExamController.ts`, `questionBankAdvancedService.ts`, `adminStudentUnifiedService.ts`

### Critical: These Are NOT Duplicates

| `.model.ts` File | Collection | PascalCase File | Collection |
|---|---|---|---|
| `exam.model.ts` | `exams` | `Exam.ts` | `exam_collection` |
| `auditLog.model.ts` | `audit_logs` | `AuditLog.ts` | `auditlogs` |
| `examQuestion.model.ts` | `exam_questions` | *(no equivalent)* | — |
| `answer.model.ts` | `answers` | *(no equivalent)* | — |
| `payment.model.ts` | `payments` | *(no equivalent)* | — |
| `examSession.model.ts` | `examsessions` | `ExamSession.ts` | `examsessions` |
| `user.model.ts` | — | `User.ts` | — |
| `newsItem.model.ts` | — | `News.ts` | — |
| `result.model.ts` | — | `ExamResult.ts` | — |
| `rssSource.model.ts` | — | `NewsSource.ts` | — |
| `subscription.model.ts` | — | `SubscriptionPlan.ts` | — |
| `newsSettings.model.ts` | — | `NewsSystemSettings.ts` | — |

### Active Import Map

```
examController.ts          → ExamQuestionModel (from examQuestion.model.ts)
adminExamController.ts     → ExamQuestionModel (from examQuestion.model.ts)
questionBankAdvancedService → ExamQuestionModel + AnswerModel (from .model.ts files)
adminStudentUnifiedService  → PaymentModel (from payment.model.ts)
adminStudentMgmtRoutes      → PaymentModel (from payment.model.ts)
```

### Future Consolidation Notes

- Consolidation requires **data migration** for models pointing to different collections
- `exam.model.ts` → `exams`, `Exam.ts` → `exam_collection` would need collection merge
- Safe to consolidate only when both schemas point to the **same collection**
- Last audited: March 2026
