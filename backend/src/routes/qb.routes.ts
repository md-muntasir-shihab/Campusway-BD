import { Router } from 'express';
import multer from 'multer';
import { authenticate, requirePermission } from '../middleware/auth';
import { validateBody } from '../validators/validateBody';
import { validateQuery } from '../middleware/validate';

// ── Hierarchy validators & controllers ──────────────────────
import {
    createGroupSchema,
    updateGroupSchema,
    createSubGroupSchema,
    updateSubGroupSchema,
    createSubjectSchema,
    updateSubjectSchema,
    createChapterSchema,
    updateChapterSchema,
    createTopicSchema,
    updateTopicSchema,
    reorderSchema,
    mergeSchema,
} from '../validators/questionHierarchy.validator';
import {
    getTree,
    createGroup,
    updateGroup,
    deleteGroup,
    createSubGroup,
    updateSubGroup,
    deleteSubGroup,
    createSubject,
    updateSubject,
    deleteSubject,
    createChapter,
    updateChapter,
    deleteChapter,
    createTopic,
    updateTopic,
    deleteTopic,
    reorderNodes,
    mergeNodes,
} from '../controllers/questionHierarchyController';

// ── Question Bank validators & controllers ──────────────────
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
    checkDuplicate,
} from '../controllers/questionBankController';

// ── Question Bank Routes — Unified /api/qb ──────────────────
// Merges hierarchy CRUD and question CRUD under a single mount.
// Requirements: 1.1–1.13, 2.1–2.13, 10.1, 11.1, 17.1–17.6

const router = Router();

// Multer configured for in-memory file uploads (max 10 MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All routes require authentication
router.use(authenticate);

// ═══════════════════════════════════════════════════════════
// HIERARCHY CRUD (Group → SubGroup → Subject → Chapter → Topic)
// ═══════════════════════════════════════════════════════════

// GET /tree — Full hierarchy tree
router.get('/tree', requirePermission('question_bank', 'view'), getTree);

// ── Groups ─────────────────────────────────
router.post('/groups', requirePermission('question_bank', 'create'), validateBody(createGroupSchema), createGroup);
router.put('/groups/:id', requirePermission('question_bank', 'edit'), validateBody(updateGroupSchema), updateGroup);
router.delete('/groups/:id', requirePermission('question_bank', 'delete'), deleteGroup);

// ── Sub-Groups ─────────────────────────────
router.post('/sub-groups', requirePermission('question_bank', 'create'), validateBody(createSubGroupSchema), createSubGroup);
router.put('/sub-groups/:id', requirePermission('question_bank', 'edit'), validateBody(updateSubGroupSchema), updateSubGroup);
router.delete('/sub-groups/:id', requirePermission('question_bank', 'delete'), deleteSubGroup);

// ── Subjects ───────────────────────────────
router.post('/subjects', requirePermission('question_bank', 'create'), validateBody(createSubjectSchema), createSubject);
router.put('/subjects/:id', requirePermission('question_bank', 'edit'), validateBody(updateSubjectSchema), updateSubject);
router.delete('/subjects/:id', requirePermission('question_bank', 'delete'), deleteSubject);

// ── Chapters ───────────────────────────────
router.post('/chapters', requirePermission('question_bank', 'create'), validateBody(createChapterSchema), createChapter);
router.put('/chapters/:id', requirePermission('question_bank', 'edit'), validateBody(updateChapterSchema), updateChapter);
router.delete('/chapters/:id', requirePermission('question_bank', 'delete'), deleteChapter);

// ── Topics ─────────────────────────────────
router.post('/topics', requirePermission('question_bank', 'create'), validateBody(createTopicSchema), createTopic);
router.put('/topics/:id', requirePermission('question_bank', 'edit'), validateBody(updateTopicSchema), updateTopic);
router.delete('/topics/:id', requirePermission('question_bank', 'delete'), deleteTopic);

// ── Reorder & Merge ────────────────────────
router.put('/:level/:id/reorder', requirePermission('question_bank', 'edit'), validateBody(reorderSchema), reorderNodes);
router.post('/:level/merge', requirePermission('question_bank', 'edit'), validateBody(mergeSchema), mergeNodes);

// ═══════════════════════════════════════════════════════════
// QUESTION CRUD
// ═══════════════════════════════════════════════════════════

// GET /questions — List/search questions
router.get('/questions', requirePermission('question_bank', 'view'), validateQuery(questionFiltersSchema), listQuestions);

// POST /questions — Create question
router.post('/questions', requirePermission('question_bank', 'create'), validateBody(createQuestionSchema), createQuestionV2);

// GET /questions/export — Export questions (before /:id)
router.get('/questions/export', requirePermission('question_bank', 'view'), exportQuestionsV2);

// POST /questions/bulk-action — Bulk operations
router.post('/questions/bulk-action', requirePermission('question_bank', 'edit'), validateBody(bulkActionSchema), bulkAction);

// POST /questions/import — Import questions from file
router.post('/questions/import', requirePermission('question_bank', 'create'), upload.single('file'), importQuestions);

// POST /questions/check-duplicate — Check for duplicates
router.post('/questions/check-duplicate', requirePermission('question_bank', 'view'), checkDuplicate);

// GET /questions/:id — Get single question
router.get('/questions/:id', requirePermission('question_bank', 'view'), getQuestionV2);

// PUT /questions/:id — Update question
router.put('/questions/:id', requirePermission('question_bank', 'edit'), validateBody(updateQuestionSchema), updateQuestionV2);

// DELETE /questions/:id — Archive question
router.delete('/questions/:id', requirePermission('question_bank', 'delete'), archiveQuestion);

// PATCH /questions/:id/review — Approve or reject question
router.patch('/questions/:id/review', requirePermission('question_bank', 'edit'), validateBody(reviewActionSchema), reviewQuestion);

export default router;
