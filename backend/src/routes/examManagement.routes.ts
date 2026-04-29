import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth';
import { validateBody } from '../validators/validateBody';
import {
    examInfoSchema,
    questionSelectionSchema,
    autoPickSchema,
    examSettingsSchema,
    examSchedulingSchema,
} from '../validators/examBuilder.validator';
import {
    startExamSchema,
    saveAnswersSchema,
    submitExamSchema,
} from '../validators/examSession.validator';
import {
    createDraft,
    updateQuestions,
    autoPick,
    updateSettings,
    updateScheduling,
    previewExam,
    publishExam,
    cloneExam,
    startExamSession,
    saveAnswers,
    submitExamSession,
    getResult,
    getExamLeaderboardHandler,
} from '../controllers/examManagementController';

// ── Exam Management Routes ──────────────────────────────────
// Mount at: /api/v1/exams
// Admin routes: authenticate → requirePermission('exams', action) → zodValidate → controller
// Student routes: authenticate → zodValidate → controller
// Requirements: 4.1, 5.1, 7.4, 8.3, 17.3, 17.4, 17.5, 17.6

const router = Router();

// All routes require authentication
router.use(authenticate);

// ═══════════════════════════════════════════════════════════
// Admin Routes — Exam Builder Wizard
// ═══════════════════════════════════════════════════════════

// POST / — Create a new exam draft (Step 1)
router.post(
    '/',
    requirePermission('exams', 'create'),
    validateBody(examInfoSchema),
    createDraft,
);

// PUT /:id/questions — Set selected questions (Step 2 manual)
router.put(
    '/:id/questions',
    requirePermission('exams', 'edit'),
    validateBody(questionSelectionSchema),
    updateQuestions,
);

// POST /:id/auto-pick — Auto-select questions by difficulty (Step 2 auto)
router.post(
    '/:id/auto-pick',
    requirePermission('exams', 'edit'),
    validateBody(autoPickSchema),
    autoPick,
);

// PUT /:id/settings — Update exam settings (Step 3)
router.put(
    '/:id/settings',
    requirePermission('exams', 'edit'),
    validateBody(examSettingsSchema),
    updateSettings,
);

// PUT /:id/scheduling — Update scheduling and pricing (Step 4)
router.put(
    '/:id/scheduling',
    requirePermission('exams', 'edit'),
    validateBody(examSchedulingSchema),
    updateScheduling,
);

// GET /:id/preview — Preview exam with questions
router.get(
    '/:id/preview',
    requirePermission('exams', 'view'),
    previewExam,
);

// POST /:id/publish — Publish a draft exam (Step 5)
router.post(
    '/:id/publish',
    requirePermission('exams', 'edit'),
    publishExam,
);

// POST /:id/clone — Clone an existing exam as a new draft
router.post(
    '/:id/clone',
    requirePermission('exams', 'create'),
    cloneExam,
);

// ═══════════════════════════════════════════════════════════
// Student Routes — Exam Session Lifecycle
// ═══════════════════════════════════════════════════════════

// POST /:id/start — Start an exam session
router.post(
    '/:id/start',
    validateBody(startExamSchema),
    startExamSession,
);

// PATCH /sessions/:id/answers — Auto-save answers
router.patch(
    '/sessions/:id/answers',
    validateBody(saveAnswersSchema),
    saveAnswers,
);

// POST /:id/submit — Submit an exam session
router.post(
    '/:id/submit',
    validateBody(submitExamSchema),
    submitExamSession,
);

// GET /:id/result — Get exam result for authenticated student
router.get(
    '/:id/result',
    getResult,
);

// GET /:id/leaderboard — Get exam leaderboard
router.get(
    '/:id/leaderboard',
    getExamLeaderboardHandler,
);

export default router;
