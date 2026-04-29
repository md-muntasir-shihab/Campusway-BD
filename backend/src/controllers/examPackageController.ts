import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as ExamPackageService from '../services/ExamPackageService';

// ── Exam Package Controller ─────────────────────────────────
// Thin handlers delegating to ExamPackageService.
// Requirements: 23.1, 23.3

/**
 * POST / — Create a new exam package.
 * Body: { title, title_bn?, description?, exams, priceBDT, discountPercentage?, validFrom, validUntil, couponCodes? }
 */
export async function createPackage(req: AuthRequest, res: Response): Promise<void> {
    try {
        const createdBy = req.user?._id?.toString();
        if (!createdBy) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const pkg = await ExamPackageService.createPackage(createdBy, req.body);
        ResponseBuilder.send(res, 201, ResponseBuilder.created(pkg, 'Exam package created'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('must be before') ? 400
                : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('PACKAGE_ERROR', message));
    }
}

/**
 * GET / — List active exam packages (paginated).
 * Query: page?, limit?
 */
export async function listPackages(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

        const result = await ExamPackageService.listPackages({ page, limit });
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(result.data, result.page, result.limit, result.total),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * POST /:id/purchase — Purchase an exam package.
 * Body: { couponCode? }
 */
export async function purchasePackage(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const packageId = String(req.params.id);
        const { couponCode } = req.body;
        const result = await ExamPackageService.purchasePackage(studentId, packageId, couponCode);
        ResponseBuilder.send(res, 201, ResponseBuilder.created(result, 'Package purchased successfully'));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        const status = message.includes('not found') ? 404
            : message.includes('already purchased') || message.includes('no longer active') || message.includes('outside its validity') ? 400
                : message.includes('coupon') ? 400
                    : 500;
        ResponseBuilder.send(res, status, ResponseBuilder.error('PACKAGE_ERROR', message));
    }
}
