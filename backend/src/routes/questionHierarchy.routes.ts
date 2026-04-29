import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth';
import { validateBody } from '../validators/validateBody';
import {
    createGroupSchema,
    updateGroupSchema,
    createSubGroupSchema,
    createSubjectSchema,
    createChapterSchema,
    createTopicSchema,
    reorderSchema,
    mergeSchema,
} from '../validators/questionHierarchy.validator';
import {
    getTree,
    createGroup,
    updateGroup,
    deleteGroup,
    createSubGroup,
    createSubject,
    createChapter,
    createTopic,
    reorderNodes,
    mergeNodes,
} from '../controllers/questionHierarchyController';

// ── Question Hierarchy Routes ───────────────────────────────
// Mount at: /api/v1/question-hierarchy
// Middleware chain: authenticate → requirePermission('question_bank', action) → zodValidate → controller
// Requirements: 1.1, 17.1, 17.4, 17.5, 17.6

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /tree — Full hierarchy tree (view permission)
router.get(
    '/tree',
    requirePermission('question_bank', 'view'),
    getTree,
);

// POST /groups — Create group (create permission)
router.post(
    '/groups',
    requirePermission('question_bank', 'create'),
    validateBody(createGroupSchema),
    createGroup,
);

// PUT /groups/:id — Update group (edit permission)
router.put(
    '/groups/:id',
    requirePermission('question_bank', 'edit'),
    validateBody(updateGroupSchema),
    updateGroup,
);

// DELETE /groups/:id — Delete group (delete permission)
router.delete(
    '/groups/:id',
    requirePermission('question_bank', 'delete'),
    deleteGroup,
);

// POST /sub-groups — Create sub-group (create permission)
router.post(
    '/sub-groups',
    requirePermission('question_bank', 'create'),
    validateBody(createSubGroupSchema),
    createSubGroup,
);

// POST /subjects — Create subject (create permission)
router.post(
    '/subjects',
    requirePermission('question_bank', 'create'),
    validateBody(createSubjectSchema),
    createSubject,
);

// POST /chapters — Create chapter (create permission)
router.post(
    '/chapters',
    requirePermission('question_bank', 'create'),
    validateBody(createChapterSchema),
    createChapter,
);

// POST /topics — Create topic (create permission)
router.post(
    '/topics',
    requirePermission('question_bank', 'create'),
    validateBody(createTopicSchema),
    createTopic,
);

// PUT /:level/:id/reorder — Reorder nodes at a hierarchy level (edit permission)
// The reorderSchema validates { level, orderedIds } in the body.
// The :level param is also in the URL for RESTful routing.
router.put(
    '/:level/:id/reorder',
    requirePermission('question_bank', 'edit'),
    validateBody(reorderSchema),
    reorderNodes,
);

// POST /:level/merge — Merge two nodes at the same hierarchy level (edit permission)
router.post(
    '/:level/merge',
    requirePermission('question_bank', 'edit'),
    validateBody(mergeSchema),
    mergeNodes,
);

export default router;
