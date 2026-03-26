/**
 * Admin Student Security Routes
 *
 * Endpoints for admin-side student account control:
 * - Set/reset password for student
 * - Create student with password (and optional send)
 * - Resend account info
 * - Force password reset toggle
 * - Revoke student sessions
 * - Get student security metadata
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { getClientIp } from '../utils/requestMeta';
import {
    adminSetPassword,
    createStudentWithPassword,
    adminResendAccountInfo,
    toggleForceReset,
    adminRevokeStudentSessions,
    getStudentSecurityMeta,
} from '../services/accountControlService';

// AuthRequest is provided by global Express augmentation (express-user-augmentation.d.ts)
type AuthRequest = Request;

const router = Router();
const adminAuth = [authenticate, authorize('superadmin', 'admin')];

// Get student security metadata
router.get('/students/:id/security', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const meta = await getStudentSecurityMeta(String(req.params.id));
        if (!meta) { res.status(404).json({ message: 'Student not found' }); return; }
        res.json(meta);
    } catch (err) {
        console.error('GET /students/:id/security error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin set password for student
router.post('/students/:id/set-password', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await adminSetPassword({
            studentId: String(req.params.id),
            newPassword: req.body.newPassword,
            adminId: req.user!._id,
            ipAddress: getClientIp(req),
            sendVia: req.body.sendVia,
            revokeExistingSessions: req.body.revokeExistingSessions,
        });
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error('POST /students/:id/set-password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create student with password
router.post('/students/create-with-password', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await createStudentWithPassword({
            username: req.body.username,
            email: req.body.email,
            phone_number: req.body.phone_number,
            full_name: req.body.full_name,
            password: req.body.password,
            role: req.body.role,
            sendVia: req.body.sendVia,
            adminId: req.user!._id,
            ipAddress: getClientIp(req),
            profileData: req.body.profileData,
        });
        res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
        console.error('POST /students/create-with-password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Resend account info
router.post('/students/:id/resend-account-info', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await adminResendAccountInfo(
            String(req.params.id),
            req.body.channels ?? ['sms'],
            req.user!._id,
        );
        res.json(result);
    } catch (err) {
        console.error('POST /students/:id/resend-account-info error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Toggle force password reset
router.post('/students/:id/force-reset', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        await toggleForceReset(
            String(req.params.id),
            req.body.force ?? true,
            req.user!._id,
            getClientIp(req),
        );
        res.json({ message: 'Force reset updated' });
    } catch (err) {
        console.error('POST /students/:id/force-reset error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Revoke all sessions
router.post('/students/:id/revoke-sessions', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        await adminRevokeStudentSessions(String(req.params.id), req.user!._id, getClientIp(req));
        res.json({ message: 'All sessions revoked' });
    } catch (err) {
        console.error('POST /students/:id/revoke-sessions error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
