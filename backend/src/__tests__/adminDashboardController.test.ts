import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { adminIssueGuardianOtp } from '../controllers/adminDashboardController';
import StudentProfile from '../models/StudentProfile';
import { broadcastStudentDashboardEvent } from '../realtime/studentDashboardStream';
import crypto from 'crypto';

vi.mock('../models/StudentProfile', () => ({
    default: {
        findOne: vi.fn()
    }
}));

vi.mock('../realtime/studentDashboardStream', () => ({
    broadcastStudentDashboardEvent: vi.fn()
}));

vi.mock('../utils/responseBuilder', () => ({
    ResponseBuilder: {
        success: vi.fn((data, msg) => ({ data, msg })),
        error: vi.fn((code, msg) => ({ code, msg })),
        send: vi.fn((res, status, payload) => {
            res.status(status).json(payload);
        })
    }
}));

vi.mock('crypto', async () => {
    const originalCrypto = await vi.importActual('crypto');
    return {
        default: {
            ...originalCrypto,
            randomInt: vi.fn(() => 123456),
            createHash: vi.fn(() => ({
                update: vi.fn().mockReturnThis(),
                digest: vi.fn(() => 'hashed-otp')
            }))
        }
    };
});

describe('adminIssueGuardianOtp', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {
            params: { studentId: 'student-123' }
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        vi.clearAllMocks();
    });

    it('should issue a guardian OTP using cryptographically secure random generator', async () => {
        const saveMock = vi.fn();
        (StudentProfile.findOne as any).mockResolvedValue({
            save: saveMock
        });

        await adminIssueGuardianOtp(req as Request, res as Response);

        expect(crypto.randomInt).toHaveBeenCalledWith(100000, 1000000);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ otp: '123456' }),
                msg: 'OTP issued'
            })
        );
        expect(saveMock).toHaveBeenCalled();
        expect(broadcastStudentDashboardEvent).toHaveBeenCalled();
    });

    it('should return 404 if profile not found', async () => {
        (StudentProfile.findOne as any).mockResolvedValue(null);

        await adminIssueGuardianOtp(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'NOT_FOUND',
                msg: 'Student profile not found'
            })
        );
    });
});
