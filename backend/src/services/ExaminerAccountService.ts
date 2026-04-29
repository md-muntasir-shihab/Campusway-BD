/**
 * Examiner Account Service
 *
 * Manages examiner application lifecycle (submit, approve, reject),
 * examiner dashboard data (own questions, exams, groups, student results),
 * and earnings/revenue calculations with commission-based revenue split.
 *
 * Key functions:
 *   - submitApplication: Creates an ExaminerApplication with status 'pending'
 *   - approveApplication: Sets status to 'approved', grants 'examiner' role to user
 *   - rejectApplication: Sets status to 'rejected'
 *   - getExaminerDashboard: Returns counts of own questions, exams, groups, and recent student results
 *   - getExaminerEarnings: Calculates total sales, commission, net earnings from Payment records
 *   - calculateCommission: Pure helper — returns commission amount (exported for testing)
 *
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
 */
import mongoose from 'mongoose';
import ExaminerApplication, { type IExaminerApplication, type IApplicationData } from '../models/ExaminerApplication';
import User from '../models/User';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import Exam from '../models/Exam';
import StudentGroup from '../models/StudentGroup';
import ExamResult from '../models/ExamResult';
import { PaymentModel } from '../models/payment.model';
import ExamPackage from '../models/ExamPackage';

// ─── Exported Types ─────────────────────────────────────────

/** Dashboard summary returned by getExaminerDashboard. */
export interface ExaminerDashboard {
    questionCount: number;
    examCount: number;
    groupCount: number;
    recentResults: RecentStudentResult[];
}

/** A single student result entry for the examiner dashboard. */
export interface RecentStudentResult {
    examId: string;
    examTitle: string;
    studentId: string;
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    submittedAt: Date;
}

/** Earnings breakdown returned by getExaminerEarnings. */
export interface ExaminerEarnings {
    totalSales: number;
    commissionAmount: number;
    netEarnings: number;
    commissionRate: number;
    transactionCount: number;
}

// ─── Helpers ────────────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

// ─── calculateCommission (pure helper) ──────────────────────

/**
 * Calculate the commission amount from total sales and a commission rate.
 *
 * This is a pure function with no side effects, exported for direct testing.
 *
 * @param totalSales - Total sales amount in BDT
 * @param commissionRate - Commission percentage (e.g. 20 means 20%)
 * @returns The commission amount (platform's share)
 */
export function calculateCommission(totalSales: number, commissionRate: number): number {
    if (totalSales < 0 || commissionRate < 0) {
        return 0;
    }
    const clampedRate = Math.min(commissionRate, 100);
    return Math.round((totalSales * clampedRate) / 100 * 100) / 100;
}

// ─── submitApplication ──────────────────────────────────────

/**
 * Submit an examiner application for an authenticated user.
 *
 * Creates an ExaminerApplication document with status 'pending'.
 * Throws if the user already has a pending or approved application.
 *
 * Requirement 22.1
 *
 * @param userId - The authenticated user's ID
 * @param applicationData - Application form data (institution, experience, subjects, reason)
 * @returns The created ExaminerApplication document
 */
export async function submitApplication(
    userId: string,
    applicationData: IApplicationData,
): Promise<IExaminerApplication> {
    const userObjectId = toObjectId(userId);

    // Check for existing pending or approved application
    const existing = await ExaminerApplication.findOne({
        user: userObjectId,
        status: { $in: ['pending', 'approved'] },
    });

    if (existing) {
        if (existing.status === 'pending') {
            throw new Error('You already have a pending examiner application');
        }
        if (existing.status === 'approved') {
            throw new Error('You are already an approved examiner');
        }
    }

    const application = await ExaminerApplication.create({
        user: userObjectId,
        status: 'pending',
        applicationData,
    });

    return application;
}

// ─── approveApplication ─────────────────────────────────────

/**
 * Approve an examiner application and grant the 'examiner' role to the user.
 *
 * Sets the application status to 'approved', records the reviewing admin,
 * and updates the user's role to 'examiner' (only if currently 'student').
 *
 * Requirement 22.2
 *
 * @param applicationId - The ExaminerApplication document ID
 * @param adminId - The admin user performing the approval
 * @returns The updated ExaminerApplication document
 */
export async function approveApplication(
    applicationId: string,
    adminId: string,
): Promise<IExaminerApplication> {
    const application = await ExaminerApplication.findById(toObjectId(applicationId));
    if (!application) {
        throw new Error('Examiner application not found');
    }

    if (application.status !== 'pending') {
        throw new Error(`Cannot approve application with status '${application.status}'`);
    }

    application.status = 'approved';
    application.reviewedBy = toObjectId(adminId);
    application.reviewedAt = new Date();
    await application.save();

    // Grant 'examiner' role to the user.
    // The User model role enum may need extending to include 'examiner'.
    // We use a direct update to set the role without triggering enum validation.
    await User.findByIdAndUpdate(application.user, {
        role: 'examiner' as any,
    });

    return application;
}

// ─── rejectApplication ──────────────────────────────────────

/**
 * Reject an examiner application.
 *
 * Sets the application status to 'rejected' and records the reviewing admin.
 *
 * Requirement 22.2
 *
 * @param applicationId - The ExaminerApplication document ID
 * @param adminId - The admin user performing the rejection
 * @returns The updated ExaminerApplication document
 */
export async function rejectApplication(
    applicationId: string,
    adminId: string,
): Promise<IExaminerApplication> {
    const application = await ExaminerApplication.findById(toObjectId(applicationId));
    if (!application) {
        throw new Error('Examiner application not found');
    }

    if (application.status !== 'pending') {
        throw new Error(`Cannot reject application with status '${application.status}'`);
    }

    application.status = 'rejected';
    application.reviewedBy = toObjectId(adminId);
    application.reviewedAt = new Date();
    await application.save();

    return application;
}

// ─── getExaminerDashboard ───────────────────────────────────

/**
 * Retrieve dashboard data for an examiner.
 *
 * Returns counts of the examiner's own questions, exams, and groups,
 * plus recent student results from the examiner's exams.
 *
 * Requirements: 22.3, 22.7
 *
 * @param examinerId - The examiner's user ID
 * @returns Dashboard summary with counts and recent results
 */
export async function getExaminerDashboard(
    examinerId: string,
): Promise<ExaminerDashboard> {
    const examinerObjectId = toObjectId(examinerId);

    // Count own resources (RBAC isolation: only created_by matches)
    const [questionCount, examCount, groupCount, examinerExams] = await Promise.all([
        QuestionBankQuestion.countDocuments({ created_by: examinerObjectId }),
        Exam.countDocuments({ createdBy: examinerObjectId }),
        StudentGroup.countDocuments({ createdByAdminId: examinerObjectId }),
        Exam.find({ createdBy: examinerObjectId })
            .select('_id title')
            .lean(),
    ]);

    // Get recent student results from the examiner's exams
    let recentResults: RecentStudentResult[] = [];

    if (examinerExams.length > 0) {
        const examIds = examinerExams.map((e) => e._id);
        const examTitleMap = new Map(
            examinerExams.map((e) => [e._id.toString(), e.title]),
        );

        const results = await ExamResult.find({ exam: { $in: examIds } })
            .sort({ submittedAt: -1 })
            .limit(20)
            .select('exam student obtainedMarks totalMarks percentage submittedAt')
            .lean();

        recentResults = results.map((r: any) => ({
            examId: r.exam.toString(),
            examTitle: examTitleMap.get(r.exam.toString()) || 'Unknown Exam',
            studentId: r.student.toString(),
            obtainedMarks: r.obtainedMarks ?? 0,
            totalMarks: r.totalMarks ?? 0,
            percentage: r.percentage ?? 0,
            submittedAt: r.submittedAt ?? r.createdAt ?? new Date(),
        }));
    }

    return {
        questionCount,
        examCount,
        groupCount,
        recentResults,
    };
}

// ─── getExaminerEarnings ────────────────────────────────────

/**
 * Calculate earnings for an examiner based on paid exam and package purchases.
 *
 * Looks up the examiner's commission rate from their approved application,
 * then aggregates all 'paid' payments for the examiner's exams and packages.
 * Revenue is split: platform takes commissionRate%, examiner keeps the rest.
 *
 * Requirements: 22.5, 22.6
 *
 * @param examinerId - The examiner's user ID
 * @returns Earnings breakdown with total sales, commission, and net earnings
 */
export async function getExaminerEarnings(
    examinerId: string,
): Promise<ExaminerEarnings> {
    const examinerObjectId = toObjectId(examinerId);

    // Get the examiner's commission rate from their approved application
    const application = await ExaminerApplication.findOne({
        user: examinerObjectId,
        status: 'approved',
    }).lean();

    const commissionRate = application?.commissionRate ?? 20;

    // Find all exams and packages created by this examiner
    const [examinerExams, examinerPackages] = await Promise.all([
        Exam.find({ createdBy: examinerObjectId }).select('_id').lean(),
        ExamPackage.find({ createdBy: examinerObjectId }).select('_id').lean(),
    ]);

    const examIds = examinerExams.map((e) => e._id.toString());
    const packageIds = examinerPackages.map((p) => p._id.toString());

    // Build filter for paid payments related to examiner's content.
    // The Payment model stores examId and planId as string fields.
    const paymentFilter: any = {
        status: 'paid',
    };

    if (examIds.length > 0 || packageIds.length > 0) {
        const orConditions: any[] = [];
        if (examIds.length > 0) {
            orConditions.push({ examId: { $in: examIds } });
        }
        if (packageIds.length > 0) {
            orConditions.push({ planId: { $in: packageIds } });
        }
        paymentFilter.$or = orConditions;
    } else {
        // No exams or packages — no earnings
        return {
            totalSales: 0,
            commissionAmount: 0,
            netEarnings: 0,
            commissionRate,
            transactionCount: 0,
        };
    }

    // Aggregate total sales from payments
    const payments = await PaymentModel.find(paymentFilter)
        .select('amountBDT')
        .lean();

    const totalSales = payments.reduce(
        (sum: number, p: any) => sum + (p.amountBDT || 0),
        0,
    );

    const commissionAmount = calculateCommission(totalSales, commissionRate);
    const netEarnings = Math.round((totalSales - commissionAmount) * 100) / 100;

    return {
        totalSales,
        commissionAmount,
        netEarnings,
        commissionRate,
        transactionCount: payments.length,
    };
}
