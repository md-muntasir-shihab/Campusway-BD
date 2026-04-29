import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import Exam from '../models/Exam';
import ExamPackage from '../models/ExamPackage';
import { PaymentModel } from '../models/payment.model';
import {
    purchasePackage,
    createPackage,
    computeFinalPrice,
    validateCouponPure,
} from '../services/ExamPackageService';
import type { ICouponCode } from '../models/ExamPackage';

/**
 * Feature: exam-management-system
 * Property 31: Package Purchase Grants Exam Access
 *
 * **Validates: Requirements 23.2**
 *
 * For any student who has purchased an exam package, the student should be
 * added to `allowedUsers` of every exam included in that package.
 * Students should NOT be added to exams outside the package.
 * Multiple students purchasing the same package each get access independently.
 * Coupon discount is correctly applied to the final price.
 */

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Exam.deleteMany({});
    await ExamPackage.deleteMany({});
    await PaymentModel.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create N exams and return their IDs.
 */
async function createExams(count: number): Promise<mongoose.Types.ObjectId[]> {
    const ids: mongoose.Types.ObjectId[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
        const exam = await Exam.create({
            title: `Exam ${i}`,
            subject: 'Physics',
            totalQuestions: 10,
            totalMarks: 10,
            duration: 30,
            startDate: new Date(now - 86400000),
            endDate: new Date(now + 86400000 * 30),
            resultPublishDate: new Date(now + 86400000 * 30),
            createdBy: new mongoose.Types.ObjectId(),
            share_link: `share-pkg-test-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
        ids.push(exam._id as mongoose.Types.ObjectId);
    }
    return ids;
}

/**
 * Create an active exam package with the given exam IDs and price.
 */
async function createActivePackage(
    examIds: mongoose.Types.ObjectId[],
    priceBDT: number,
    discountPercentage: number = 0,
    couponCodes: { code: string; discountPercent: number; maxUses: number; expiresAt: Date }[] = [],
): Promise<mongoose.Types.ObjectId> {
    const now = new Date();
    const adminId = new mongoose.Types.ObjectId();
    const pkg = await createPackage(adminId.toString(), {
        title: `Test Package ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        exams: examIds.map((id) => id.toString()),
        priceBDT,
        discountPercentage,
        couponCodes,
        validFrom: new Date(now.getTime() - 86400000),
        validUntil: new Date(now.getTime() + 86400000 * 30),
    });
    return pkg._id as mongoose.Types.ObjectId;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 31: Package Purchase Grants Exam Access', () => {
    it('purchasing a package grants access to every included exam', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Number of exams in the package (1–4)
                fc.integer({ min: 1, max: 4 }),
                // Number of exams NOT in the package (0–3)
                fc.integer({ min: 0, max: 3 }),
                async (packageExamCount, outsideExamCount) => {
                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamPackage.deleteMany({});
                    await PaymentModel.deleteMany({});

                    // Create exams for the package and outside the package
                    const packageExamIds = await createExams(packageExamCount);
                    const outsideExamIds = await createExams(outsideExamCount);

                    // Create the package with only packageExamIds
                    const packageId = await createActivePackage(packageExamIds, 500);

                    // Student purchases the package
                    const studentId = new mongoose.Types.ObjectId();
                    const result = await purchasePackage(
                        studentId.toString(),
                        packageId.toString(),
                    );

                    // Assert: all package exams are granted
                    expect(result.examsGranted).toHaveLength(packageExamCount);

                    // Assert: student is in allowedUsers of every package exam
                    for (const examId of packageExamIds) {
                        const exam = await Exam.findById(examId).lean();
                        const allowedUserStrings = (exam!.allowedUsers || []).map((u) =>
                            u.toString(),
                        );
                        expect(allowedUserStrings).toContain(studentId.toString());
                    }

                    // Assert: student is NOT in allowedUsers of outside exams
                    for (const examId of outsideExamIds) {
                        const exam = await Exam.findById(examId).lean();
                        const allowedUserStrings = (exam!.allowedUsers || []).map((u) =>
                            u.toString(),
                        );
                        expect(allowedUserStrings).not.toContain(studentId.toString());
                    }
                },
            ),
            { numRuns: 15 },
        );
    });

    it('multiple students purchasing the same package each get independent access', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Number of students (2–4)
                fc.integer({ min: 2, max: 4 }),
                // Number of exams in the package (1–3)
                fc.integer({ min: 1, max: 3 }),
                async (studentCount, examCount) => {
                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamPackage.deleteMany({});
                    await PaymentModel.deleteMany({});

                    const examIds = await createExams(examCount);
                    const packageId = await createActivePackage(examIds, 300);

                    // Each student purchases the package
                    const studentIds: mongoose.Types.ObjectId[] = [];
                    for (let i = 0; i < studentCount; i++) {
                        const studentId = new mongoose.Types.ObjectId();
                        studentIds.push(studentId);
                        await purchasePackage(
                            studentId.toString(),
                            packageId.toString(),
                        );
                    }

                    // Assert: every student is in allowedUsers of every exam
                    for (const examId of examIds) {
                        const exam = await Exam.findById(examId).lean();
                        const allowedUserStrings = (exam!.allowedUsers || []).map((u) =>
                            u.toString(),
                        );
                        for (const studentId of studentIds) {
                            expect(allowedUserStrings).toContain(studentId.toString());
                        }
                    }
                },
            ),
            { numRuns: 10 },
        );
    });

    it('coupon discount is correctly applied to the final price (pure)', () => {
        fc.assert(
            fc.property(
                // Base price (10–5000 BDT)
                fc.integer({ min: 10, max: 5000 }),
                // Package discount (0–50%)
                fc.integer({ min: 0, max: 50 }),
                // Coupon discount (0–50%)
                fc.integer({ min: 0, max: 50 }),
                (basePriceBDT, packageDiscount, couponDiscount) => {
                    const result = computeFinalPrice(basePriceBDT, packageDiscount, couponDiscount);

                    // Result must be non-negative
                    expect(result).toBeGreaterThanOrEqual(0);

                    // Result must be <= base price
                    expect(result).toBeLessThanOrEqual(basePriceBDT);

                    // Manually compute expected value
                    const afterPkg = basePriceBDT * (1 - packageDiscount / 100);
                    const afterCoupon = afterPkg * (1 - couponDiscount / 100);
                    const expected = Math.max(0, Math.round(afterCoupon * 100) / 100);

                    expect(result).toBeCloseTo(expected, 2);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('validateCouponPure correctly validates coupon codes (pure)', () => {
        fc.assert(
            fc.property(
                // Coupon code
                fc.string({ minLength: 3, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
                // Discount percent (1–50)
                fc.integer({ min: 1, max: 50 }),
                // Max uses (1–100)
                fc.integer({ min: 1, max: 100 }),
                // Used count (0–100)
                fc.integer({ min: 0, max: 100 }),
                // Whether coupon is expired
                fc.boolean(),
                (code, discountPercent, maxUses, usedCount, isExpired) => {
                    const now = new Date();
                    const expiresAt = isExpired
                        ? new Date(now.getTime() - 86400000) // expired yesterday
                        : new Date(now.getTime() + 86400000); // expires tomorrow

                    const coupons: ICouponCode[] = [
                        { code, discountPercent, maxUses, usedCount, expiresAt },
                    ];

                    // Test with matching code
                    const result = validateCouponPure(code, coupons, now);

                    if (isExpired) {
                        expect(result.valid).toBe(false);
                        expect(result.message).toContain('expired');
                    } else if (usedCount >= maxUses) {
                        expect(result.valid).toBe(false);
                        expect(result.message).toContain('maximum usage');
                    } else {
                        expect(result.valid).toBe(true);
                        expect(result.discountPercent).toBe(discountPercent);
                    }

                    // Test with non-matching code — always invalid
                    const wrongResult = validateCouponPure('NONEXISTENT_CODE_XYZ', coupons, now);
                    expect(wrongResult.valid).toBe(false);
                    expect(wrongResult.message).toContain('not found');
                },
            ),
            { numRuns: 50 },
        );
    });
});
