/**
 * Exam Package Service
 *
 * Manages exam package CRUD, coupon code validation, and the purchase flow
 * that grants students access to all exams included in a package.
 *
 * Key functions:
 *   - createPackage: Create a new exam package with title, exams, price, coupons, validity dates
 *   - updatePackage: Update package details (title, description, exams, pricing, coupons, validity)
 *   - listPackages: List active packages for students with pagination
 *   - getPackageById: Get a single package by ID with populated exam details
 *   - purchasePackage: Handle purchase flow — validate coupon, create Payment, grant exam access
 *   - validateCoupon: Validate a coupon code (exists, not expired, not maxed out)
 *   - deactivatePackage: Soft-deactivate a package (set isActive = false)
 *
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 */
import mongoose from 'mongoose';
import ExamPackage, { type IExamPackage, type ICouponCode } from '../models/ExamPackage';
import Exam from '../models/Exam';
import { PaymentModel } from '../models/payment.model';

// ─── Exported Types ─────────────────────────────────────────

/** Input for creating a new exam package. */
export interface CreatePackageInput {
    title: string;
    title_bn?: string;
    description?: string;
    exams: string[];
    priceBDT: number;
    discountPercentage?: number;
    couponCodes?: {
        code: string;
        discountPercent: number;
        maxUses: number;
        expiresAt: Date;
    }[];
    validFrom: Date;
    validUntil: Date;
}

/** Input for updating an existing exam package. */
export interface UpdatePackageInput {
    title?: string;
    title_bn?: string;
    description?: string;
    exams?: string[];
    priceBDT?: number;
    discountPercentage?: number;
    couponCodes?: {
        code: string;
        discountPercent: number;
        maxUses: number;
        expiresAt: Date;
    }[];
    validFrom?: Date;
    validUntil?: Date;
}

/** Pagination options for listing packages. */
export interface PaginationOptions {
    page: number;
    limit: number;
}

/** Paginated result wrapper. */
export interface PaginatedResult<T> {
    data: T[];
    page: number;
    limit: number;
    total: number;
}

/** Coupon validation result. */
export interface CouponValidationResult {
    valid: boolean;
    discountPercent: number;
    message: string;
}

/** Purchase result returned after a successful purchase. */
export interface PurchaseResult {
    paymentId: string;
    packageId: string;
    amountPaid: number;
    examsGranted: string[];
}

// ─── Pure Helpers ───────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

/**
 * Compute the final price after applying package discount and optional coupon discount.
 * Pure function — no DB access.
 *
 * @param basePriceBDT - Original package price
 * @param packageDiscountPercent - Package-level discount percentage (0–100)
 * @param couponDiscountPercent - Coupon discount percentage (0–100)
 * @returns Final price in BDT (minimum 0)
 */
export function computeFinalPrice(
    basePriceBDT: number,
    packageDiscountPercent: number,
    couponDiscountPercent: number,
): number {
    const afterPackageDiscount = basePriceBDT * (1 - packageDiscountPercent / 100);
    const afterCouponDiscount = afterPackageDiscount * (1 - couponDiscountPercent / 100);
    return Math.max(0, Math.round(afterCouponDiscount * 100) / 100);
}

/**
 * Validate a coupon code against a package's coupon list.
 * Pure function — no DB access.
 *
 * Checks:
 *   1. Coupon code exists in the package's couponCodes array
 *   2. Coupon has not expired (expiresAt > now)
 *   3. Coupon has not reached maxUses (usedCount < maxUses)
 *
 * @param couponCode - The coupon code string to validate
 * @param couponCodes - The package's coupon codes array
 * @param now - Current date for expiry check
 * @returns Validation result with discount percent and message
 */
export function validateCouponPure(
    couponCode: string,
    couponCodes: ICouponCode[],
    now: Date,
): CouponValidationResult {
    const coupon = couponCodes.find(
        (c) => c.code.toLowerCase() === couponCode.toLowerCase(),
    );

    if (!coupon) {
        return { valid: false, discountPercent: 0, message: 'Coupon code not found' };
    }

    if (new Date(coupon.expiresAt).getTime() <= now.getTime()) {
        return { valid: false, discountPercent: 0, message: 'Coupon code has expired' };
    }

    if (coupon.usedCount >= coupon.maxUses) {
        return { valid: false, discountPercent: 0, message: 'Coupon code has reached maximum usage limit' };
    }

    return {
        valid: true,
        discountPercent: coupon.discountPercent,
        message: `Coupon applied: ${coupon.discountPercent}% discount`,
    };
}

// ─── Service Functions ──────────────────────────────────────

/**
 * Create a new exam package.
 *
 * Validates that all referenced exam IDs exist, then creates the package document.
 *
 * Requirement 23.1, 23.4
 *
 * @param createdBy - The user ID of the admin/examiner creating the package
 * @param input - Package creation data
 * @returns The created ExamPackage document
 */
export async function createPackage(
    createdBy: string,
    input: CreatePackageInput,
): Promise<IExamPackage> {
    const examObjectIds = input.exams.map(toObjectId);

    // Validate that all referenced exams exist
    const existingExams = await Exam.find({ _id: { $in: examObjectIds } })
        .select('_id')
        .lean();

    if (existingExams.length !== examObjectIds.length) {
        const foundIds = new Set(existingExams.map((e) => e._id.toString()));
        const missing = input.exams.filter((id) => !foundIds.has(id));
        throw new Error(`Exams not found: ${missing.join(', ')}`);
    }

    // Validate validity dates
    if (new Date(input.validFrom).getTime() >= new Date(input.validUntil).getTime()) {
        throw new Error('validFrom must be before validUntil');
    }

    const pkg = await ExamPackage.create({
        title: input.title,
        title_bn: input.title_bn || '',
        description: input.description || '',
        exams: examObjectIds,
        priceBDT: input.priceBDT,
        discountPercentage: input.discountPercentage ?? 0,
        couponCodes: (input.couponCodes || []).map((c) => ({
            code: c.code,
            discountPercent: c.discountPercent,
            maxUses: c.maxUses,
            usedCount: 0,
            expiresAt: c.expiresAt,
        })),
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        createdBy: toObjectId(createdBy),
        isActive: true,
        purchaseCount: 0,
    });

    return pkg;
}

/**
 * Update an existing exam package.
 *
 * Validates exam references if exams are being updated.
 *
 * Requirement 23.4
 *
 * @param packageId - The package document ID
 * @param input - Fields to update
 * @returns The updated ExamPackage document
 */
export async function updatePackage(
    packageId: string,
    input: UpdatePackageInput,
): Promise<IExamPackage> {
    const pkg = await ExamPackage.findById(toObjectId(packageId));
    if (!pkg) {
        throw new Error('Exam package not found');
    }

    // If exams are being updated, validate they exist
    if (input.exams && input.exams.length > 0) {
        const examObjectIds = input.exams.map(toObjectId);
        const existingExams = await Exam.find({ _id: { $in: examObjectIds } })
            .select('_id')
            .lean();

        if (existingExams.length !== examObjectIds.length) {
            const foundIds = new Set(existingExams.map((e) => e._id.toString()));
            const missing = input.exams.filter((id) => !foundIds.has(id));
            throw new Error(`Exams not found: ${missing.join(', ')}`);
        }

        pkg.exams = examObjectIds;
    }

    // Validate validity dates if both are provided or one is changing
    if (input.validFrom !== undefined || input.validUntil !== undefined) {
        const from = input.validFrom ? new Date(input.validFrom) : pkg.validFrom;
        const until = input.validUntil ? new Date(input.validUntil) : pkg.validUntil;
        if (from.getTime() >= until.getTime()) {
            throw new Error('validFrom must be before validUntil');
        }
    }

    if (input.title !== undefined) pkg.title = input.title;
    if (input.title_bn !== undefined) pkg.title_bn = input.title_bn;
    if (input.description !== undefined) pkg.description = input.description;
    if (input.priceBDT !== undefined) pkg.priceBDT = input.priceBDT;
    if (input.discountPercentage !== undefined) pkg.discountPercentage = input.discountPercentage;
    if (input.validFrom !== undefined) pkg.validFrom = input.validFrom;
    if (input.validUntil !== undefined) pkg.validUntil = input.validUntil;

    if (input.couponCodes !== undefined) {
        pkg.couponCodes = input.couponCodes.map((c) => ({
            code: c.code,
            discountPercent: c.discountPercent,
            maxUses: c.maxUses,
            usedCount: 0,
            expiresAt: c.expiresAt,
        }));
    }

    await pkg.save();
    return pkg;
}

/**
 * List active exam packages for students with pagination.
 *
 * Returns only packages that are active and within their validity window.
 *
 * Requirement 23.3
 *
 * @param options - Pagination options (page, limit)
 * @returns Paginated list of active packages
 */
export async function listPackages(
    options: PaginationOptions,
): Promise<PaginatedResult<IExamPackage>> {
    const { page, limit } = options;
    const now = new Date();

    const filter = {
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
    };

    const [data, total] = await Promise.all([
        ExamPackage.find(filter)
            .populate('exams', 'title title_bn totalQuestions subject status')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        ExamPackage.countDocuments(filter),
    ]);

    return {
        data: data as unknown as IExamPackage[],
        page,
        limit,
        total,
    };
}

/**
 * Get a single exam package by ID with populated exam details.
 *
 * Requirement 23.3
 *
 * @param packageId - The package document ID
 * @returns The package document or null if not found
 */
export async function getPackageById(
    packageId: string,
): Promise<IExamPackage | null> {
    const pkg = await ExamPackage.findById(toObjectId(packageId))
        .populate('exams', 'title title_bn totalQuestions totalMarks subject duration status')
        .lean();

    return pkg as IExamPackage | null;
}

/**
 * Validate a coupon code for a specific package.
 *
 * Checks that the coupon exists in the package, is not expired, and has not
 * reached its maximum usage count.
 *
 * Requirement 23.5
 *
 * @param packageId - The package document ID
 * @param couponCode - The coupon code to validate
 * @returns Validation result with discount percent and message
 */
export async function validateCoupon(
    packageId: string,
    couponCode: string,
): Promise<CouponValidationResult> {
    const pkg = await ExamPackage.findById(toObjectId(packageId)).lean();
    if (!pkg) {
        return { valid: false, discountPercent: 0, message: 'Package not found' };
    }

    return validateCouponPure(couponCode, pkg.couponCodes, new Date());
}

/**
 * Purchase an exam package.
 *
 * Flow:
 *   1. Validate the package exists, is active, and within validity window
 *   2. Check if student already purchased this package
 *   3. Validate coupon code if provided
 *   4. Compute final price (package discount + coupon discount)
 *   5. Create a Payment record with status 'paid'
 *   6. Grant access to all included exams (add student to each exam's allowedUsers)
 *   7. Increment coupon usedCount if coupon was used
 *   8. Increment package purchaseCount
 *
 * Requirement 23.2
 *
 * @param studentId - The purchasing student's user ID
 * @param packageId - The package to purchase
 * @param couponCode - Optional coupon code for additional discount
 * @returns Purchase result with payment ID, amount paid, and exams granted
 */
export async function purchasePackage(
    studentId: string,
    packageId: string,
    couponCode?: string,
): Promise<PurchaseResult> {
    const pkg = await ExamPackage.findById(toObjectId(packageId));
    if (!pkg) {
        throw new Error('Exam package not found');
    }

    if (!pkg.isActive) {
        throw new Error('This package is no longer active');
    }

    const now = new Date();
    if (now < new Date(pkg.validFrom) || now > new Date(pkg.validUntil)) {
        throw new Error('This package is outside its validity period');
    }

    // Check if student already purchased this package
    const existingPayment = await PaymentModel.findOne({
        userId: studentId,
        planId: packageId,
        status: 'paid',
    }).lean();

    if (existingPayment) {
        throw new Error('You have already purchased this package');
    }

    // Validate coupon if provided
    let couponDiscountPercent = 0;
    if (couponCode) {
        const couponResult = validateCouponPure(couponCode, pkg.couponCodes, now);
        if (!couponResult.valid) {
            throw new Error(couponResult.message);
        }
        couponDiscountPercent = couponResult.discountPercent;
    }

    // Compute final price
    const finalPrice = computeFinalPrice(
        pkg.priceBDT,
        pkg.discountPercentage,
        couponDiscountPercent,
    );

    // Create payment record
    const payment = await PaymentModel.create({
        userId: studentId,
        examId: null,
        planId: packageId,
        amountBDT: finalPrice,
        method: 'manual',
        status: 'paid',
        reference: `pkg-${packageId}`,
        notes: couponCode ? `Coupon applied: ${couponCode}` : undefined,
        paidAt: now,
    });

    // Grant access to all included exams by adding student to allowedUsers
    const studentObjectId = toObjectId(studentId);
    const examIds = pkg.exams.map((e) => e.toString());

    await Exam.updateMany(
        { _id: { $in: pkg.exams } },
        { $addToSet: { allowedUsers: studentObjectId } },
    );

    // Increment coupon usedCount if coupon was used
    if (couponCode) {
        await ExamPackage.updateOne(
            {
                _id: toObjectId(packageId),
                'couponCodes.code': { $regex: new RegExp(`^${escapeRegex(couponCode)}$`, 'i') },
            },
            { $inc: { 'couponCodes.$.usedCount': 1 } },
        );
    }

    // Increment package purchaseCount
    await ExamPackage.updateOne(
        { _id: toObjectId(packageId) },
        { $inc: { purchaseCount: 1 } },
    );

    return {
        paymentId: (payment._id as mongoose.Types.ObjectId).toString(),
        packageId,
        amountPaid: finalPrice,
        examsGranted: examIds,
    };
}

/**
 * Soft-deactivate an exam package.
 *
 * Sets isActive to false. Existing purchases remain valid.
 *
 * Requirement 23.4
 *
 * @param packageId - The package document ID
 * @returns The updated (deactivated) package document
 */
export async function deactivatePackage(
    packageId: string,
): Promise<IExamPackage> {
    const pkg = await ExamPackage.findById(toObjectId(packageId));
    if (!pkg) {
        throw new Error('Exam package not found');
    }

    pkg.isActive = false;
    await pkg.save();
    return pkg;
}

// ─── Internal Helpers ───────────────────────────────────────

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
