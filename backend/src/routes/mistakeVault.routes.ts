import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
    getMistakes,
    createRetrySession,
} from '../controllers/mistakeVaultController';

// ── Mistake Vault Routes ────────────────────────────────────
// Mount at: /api/v1/mistake-vault
// All routes are student-facing and require authentication only.
// Requirements: 20.2, 20.3, 17.4

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / — List the student's mistake vault entries (Requirement 20.2)
router.get('/', getMistakes);

// POST /retry-session — Create a retry practice session (Requirement 20.3)
router.post('/retry-session', createRetrySession);

export default router;
