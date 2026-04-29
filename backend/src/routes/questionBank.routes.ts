import { Router } from 'express';
import multer from 'multer';
import { authenticate, requirePermission } from '../middlewares/auth';
import { validateBody } from '../validators/validateBody';
import { validateQuery } from '../middlewares/validate';
import {
    createQuestionSchema,
    updateQuestionSchema,
    questionFiltersSchema,
    bulkActionSchema,
    reviewActionSchema,
} from '../validators/question.validator';
import {
    listQuestions,
    createQuestionV2,
    getQuestionV2,
    updateQuestionV2,
    archiveQuestion,
    bulkAction,
    reviewQuestion,
    importQuestions,
    exportQuestionsV2,
} from '../controllers/questionBankController';

// ── Question Bank Routes ────────────────────────────────────
// Mount at: /api/v1/questions
// Middleware chain: authenticate → requirePermission('question_bank', action) → zodValidate → controller
// Requirements: 2.1, 2.6, 2.11, 2.13, 10.1, 11.1, 17.2, 17.4, 17.5, 17.6

const router = Router();

// Multer configured for in-memory file uploads (max 10 MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All routes require authentication
router.use(authenticate);

// GET / — List/search questions with filters and pagination (view permission)
router.get(
    '/',
    requirePermission('question_bank', 'view'),
    validateQuery(questionFiltersSchema),
    listQuestions,
);

// POST / — Create a new question (create permission)
router.post(
    '/',
    requirePermission('question_bank', 'create'),
    validateBody(createQuestionSchema),
    createQuestionV2,
);

// GET /export — Export questions to Excel or CSV (view permission)
// Placed before /:id to avoid route conflict
router.get(
    '/export',
    requirePermission('question_bank', 'view'),
    exportQuestionsV2,
);

// GET /:id — Get a single question (view permission)
router.get(
    '/:id',
    requirePermission('question_bank', 'view'),
    getQuestionV2,
);

// PUT /:id — Update a question (edit permission)
router.put(
    '/:id',
    requirePermission('question_bank', 'edit'),
    validateBody(updateQuestionSchema),
    updateQuestionV2,
);

// DELETE /:id — Archive (soft-delete) a question (delete permission)
router.delete(
    '/:id',
    requirePermission('question_bank', 'delete'),
    archiveQuestion,
);

// POST /bulk-action — Bulk operations (edit permission)
router.post(
    '/bulk-action',
    requirePermission('question_bank', 'edit'),
    validateBody(bulkActionSchema),
    bulkAction,
);

// POST /:id/review — Approve or reject a question (edit permission)
router.post(
    '/:id/review',
    requirePermission('question_bank', 'edit'),
    validateBody(reviewActionSchema),
    reviewQuestion,
);

// POST /import — Import questions from file (create permission)
router.post(
    '/import',
    requirePermission('question_bank', 'create'),
    upload.single('file'),
    importQuestions,
);

export default router;
