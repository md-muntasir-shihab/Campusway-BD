/**
 * Unit tests for ExaminerAccountService
 *
 * Tests examiner application lifecycle (submit, approve, reject),
 * dashboard data retrieval, earnings calculation, and the pure
 * calculateCommission helper against an in-memory MongoDB.
 *
 * Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ExaminerApplication from '../models/ExaminerApplication';
import User from '../models/User';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import Exam from '../models/Exam';
import StudentGroup from '../models/StudentGroup';
import ExamResult from '../models/ExamResult';
import { PaymentModel } from '../models/payment.model';
import ExamPackage from '../models/ExamPackage';
import {
    submitApplication,
    approveApplication,
    rejectApplication,
    getExaminerDashboard,
    getExaminerEarnings,
    calculateCommission,
} from '../services/ExaminerAccountService';

let mongoServer: MongoMemoryServer;

// Shared test IDs
const adminId = new mongoose.Types.ObjectId().toString();
let userId: string;
let examinerUserId: string;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await ExaminerApplication.deleteMany({});
    await User.deleteMany({});
    await QuestionBankQuestion.deleteMany({});
    await Exam.deleteMany({});
    await StudentGroup.deleteMany({});
    await ExamResult.deleteMany({});
    await PaymentModel.deleteMany({});
    await ExamPackage.deleteMany({});

    // Create a test user
    const user = await User.create({
        full_name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword123',
        role: 'student',
        status: 'active',
    });
    userId = user._id.toString();

    // Create a second user for examiner tests
    const examinerUser = await User.create({
        full_name: 'Examiner User',
        username: 'examineruser',
        email: 'examiner@example.com',
        password: 'hashedpassword456',
        role: 'student',
        status: 'active',
    });
    examinerUserId = examinerUser._id.toString();
});

describe('ExaminerAccountService', () => {
    // ─── calculateCommission (pure helper) ──────────────────

    describe('calculateCommission', () => {
        it('calculates commission correctly for standard inputs', () => {
            expect(calculateCommission(1000, 20)).toBe(200);
            expect(calculateCommission(5000, 15)).toBe(750);
            expect(calculateCommission(100, 10)).toBe(10);
        });

        it('returns 0 for zero sales', () => {
            expect(calculateCommission(0, 20)).toBe(0);
        });

        it('returns 0 for zero commission rate', () => {
            expect(calculateCommission(1000, 0)).toBe(0);
        });

        it('returns 0 for negative sales', () => {
            expect(calculateCommission(-500, 20)).toBe(0);
        });

        it('returns 0 for negative commission rate', () => {
            expect(calculateCommission(1000, -5)).toBe(0);
        });

        it('clamps commission rate to 100%', () => {
            expect(calculateCommission(1000, 150)).toBe(1000);
        });

        it('handles fractional amounts with 2 decimal precision', () => {
            const result = calculateCommission(333, 20);
            expect(result).toBe(66.6);
        });
    });

    // ─── submitApplication ──────────────────────────────────

    describe('submitApplication', () => {
        it('creates a pending examiner application', async () => {
            const application = await submitApplication(userId, {
                reason: 'I want to create exams for my students',
                institutionName: 'Test Academy',
                experience: '5 years teaching',
                subjects: ['Physics', 'Math'],
            });

            expect(application.status).toBe('pending');
            expect(application.user.toString()).toBe(userId);
            expect(application.applicationData.reason).toBe('I want to create exams for my students');
            expect(application.applicationData.institutionName).toBe('Test Academy');
            expect(application.applicationData.subjects).toEqual(['Physics', 'Math']);
            expect(application.commissionRate).toBe(20); // default
        });

        it('throws if user already has a pending application', async () => {
            await submitApplication(userId, { reason: 'First application' });

            await expect(
                submitApplication(userId, { reason: 'Second application' }),
            ).rejects.toThrow('You already have a pending examiner application');
        });

        it('throws if user is already an approved examiner', async () => {
            const app = await submitApplication(userId, { reason: 'Apply' });
            await approveApplication(app._id.toString(), adminId);

            await expect(
                submitApplication(userId, { reason: 'Apply again' }),
            ).rejects.toThrow('You are already an approved examiner');
        });

        it('allows reapplication after rejection', async () => {
            const app = await submitApplication(userId, { reason: 'First try' });
            await rejectApplication(app._id.toString(), adminId);

            const newApp = await submitApplication(userId, { reason: 'Second try' });
            expect(newApp.status).toBe('pending');
            expect(newApp.applicationData.reason).toBe('Second try');
        });
    });

    // ─── approveApplication ─────────────────────────────────

    describe('approveApplication', () => {
        it('approves a pending application and grants examiner role', async () => {
            const app = await submitApplication(userId, { reason: 'Apply' });
            const approved = await approveApplication(app._id.toString(), adminId);

            expect(approved.status).toBe('approved');
            expect(approved.reviewedBy!.toString()).toBe(adminId);
            expect(approved.reviewedAt).toBeInstanceOf(Date);

            // Verify user role was updated
            const user = await User.findById(userId);
            expect(user!.role).toBe('examiner');
        });

        it('throws for non-existent application', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            await expect(approveApplication(fakeId, adminId)).rejects.toThrow(
                'Examiner application not found',
            );
        });

        it('throws when trying to approve a non-pending application', async () => {
            const app = await submitApplication(userId, { reason: 'Apply' });
            await rejectApplication(app._id.toString(), adminId);

            await expect(
                approveApplication(app._id.toString(), adminId),
            ).rejects.toThrow("Cannot approve application with status 'rejected'");
        });
    });

    // ─── rejectApplication ──────────────────────────────────

    describe('rejectApplication', () => {
        it('rejects a pending application', async () => {
            const app = await submitApplication(userId, { reason: 'Apply' });
            const rejected = await rejectApplication(app._id.toString(), adminId);

            expect(rejected.status).toBe('rejected');
            expect(rejected.reviewedBy!.toString()).toBe(adminId);
            expect(rejected.reviewedAt).toBeInstanceOf(Date);
        });

        it('throws for non-existent application', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            await expect(rejectApplication(fakeId, adminId)).rejects.toThrow(
                'Examiner application not found',
            );
        });

        it('throws when trying to reject a non-pending application', async () => {
            const app = await submitApplication(userId, { reason: 'Apply' });
            await approveApplication(app._id.toString(), adminId);

            await expect(
                rejectApplication(app._id.toString(), adminId),
            ).rejects.toThrow("Cannot reject application with status 'approved'");
        });
    });

    // ─── getExaminerDashboard ───────────────────────────────

    describe('getExaminerDashboard', () => {
        it('returns zero counts for examiner with no content', async () => {
            const dashboard = await getExaminerDashboard(examinerUserId);

            expect(dashboard.questionCount).toBe(0);
            expect(dashboard.examCount).toBe(0);
            expect(dashboard.groupCount).toBe(0);
            expect(dashboard.recentResults).toHaveLength(0);
        });

        it('returns correct counts for examiner-owned resources', async () => {
            const examinerObjId = new mongoose.Types.ObjectId(examinerUserId);

            // Create questions owned by examiner
            await QuestionBankQuestion.create([
                {
                    subject: 'Physics',
                    moduleCategory: 'Science',
                    question_en: 'Q1',
                    options: [{ key: 'A', text_en: 'A', isCorrect: true }],
                    correctKey: 'A',
                    marks: 1,
                    negativeMarks: 0,
                    difficulty: 'easy',
                    languageMode: 'en',
                    isActive: true,
                    isArchived: false,
                    contentHash: 'hash-1',
                    versionNo: 1,
                    created_by: examinerObjId,
                },
                {
                    subject: 'Math',
                    moduleCategory: 'Science',
                    question_en: 'Q2',
                    options: [{ key: 'A', text_en: 'A', isCorrect: true }],
                    correctKey: 'A',
                    marks: 1,
                    negativeMarks: 0,
                    difficulty: 'medium',
                    languageMode: 'en',
                    isActive: true,
                    isArchived: false,
                    contentHash: 'hash-2',
                    versionNo: 1,
                    created_by: examinerObjId,
                },
            ]);

            // Create an exam owned by examiner
            await Exam.create({
                title: 'Examiner Exam',
                subject: 'Physics',
                totalQuestions: 10,
                totalMarks: 10,
                duration: 30,
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                resultPublishDate: new Date(Date.now() + 86400000),
                createdBy: examinerObjId,
            });

            // Create a group owned by examiner
            await StudentGroup.create({
                name: 'Examiner Group',
                slug: 'examiner-group',
                createdByAdminId: examinerObjId,
            });

            const dashboard = await getExaminerDashboard(examinerUserId);

            expect(dashboard.questionCount).toBe(2);
            expect(dashboard.examCount).toBe(1);
            expect(dashboard.groupCount).toBe(1);
        });

        it('does not count resources owned by other users', async () => {
            const otherUserId = new mongoose.Types.ObjectId();

            // Create resources owned by another user
            await QuestionBankQuestion.create({
                subject: 'Physics',
                moduleCategory: 'Science',
                question_en: 'Other Q',
                options: [{ key: 'A', text_en: 'A', isCorrect: true }],
                correctKey: 'A',
                marks: 1,
                negativeMarks: 0,
                difficulty: 'easy',
                languageMode: 'en',
                isActive: true,
                isArchived: false,
                contentHash: 'hash-other',
                versionNo: 1,
                created_by: otherUserId,
            });

            await Exam.create({
                title: 'Other Exam',
                subject: 'Physics',
                totalQuestions: 10,
                totalMarks: 10,
                duration: 30,
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                resultPublishDate: new Date(Date.now() + 86400000),
                createdBy: otherUserId,
            });

            const dashboard = await getExaminerDashboard(examinerUserId);

            expect(dashboard.questionCount).toBe(0);
            expect(dashboard.examCount).toBe(0);
            expect(dashboard.groupCount).toBe(0);
        });

        it('returns recent student results from examiner exams', async () => {
            const examinerObjId = new mongoose.Types.ObjectId(examinerUserId);
            const studentObjId = new mongoose.Types.ObjectId();

            const exam = await Exam.create({
                title: 'Physics Mock',
                subject: 'Physics',
                totalQuestions: 10,
                totalMarks: 100,
                duration: 60,
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                resultPublishDate: new Date(Date.now() + 86400000),
                createdBy: examinerObjId,
            });

            await ExamResult.create({
                exam: exam._id,
                student: studentObjId,
                answers: [],
                totalMarks: 100,
                obtainedMarks: 75,
                correctCount: 7,
                wrongCount: 2,
                unansweredCount: 1,
                percentage: 75,
                submittedAt: new Date(),
            });

            const dashboard = await getExaminerDashboard(examinerUserId);

            expect(dashboard.recentResults).toHaveLength(1);
            expect(dashboard.recentResults[0].examTitle).toBe('Physics Mock');
            expect(dashboard.recentResults[0].obtainedMarks).toBe(75);
            expect(dashboard.recentResults[0].totalMarks).toBe(100);
            expect(dashboard.recentResults[0].percentage).toBe(75);
        });
    });

    // ─── getExaminerEarnings ────────────────────────────────

    describe('getExaminerEarnings', () => {
        it('returns zero earnings for examiner with no content', async () => {
            const earnings = await getExaminerEarnings(examinerUserId);

            expect(earnings.totalSales).toBe(0);
            expect(earnings.commissionAmount).toBe(0);
            expect(earnings.netEarnings).toBe(0);
            expect(earnings.transactionCount).toBe(0);
        });

        it('calculates earnings from paid exam payments', async () => {
            const examinerObjId = new mongoose.Types.ObjectId(examinerUserId);

            // Create approved application with 20% commission
            await ExaminerApplication.create({
                user: examinerObjId,
                status: 'approved',
                applicationData: { reason: 'Teaching' },
                commissionRate: 20,
                reviewedBy: new mongoose.Types.ObjectId(adminId),
                reviewedAt: new Date(),
            });

            // Create an exam
            const exam = await Exam.create({
                title: 'Paid Exam',
                subject: 'Physics',
                totalQuestions: 10,
                totalMarks: 100,
                duration: 60,
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                resultPublishDate: new Date(Date.now() + 86400000),
                createdBy: examinerObjId,
            });

            // Create paid payments for the exam
            await PaymentModel.create([
                {
                    userId: 'student1',
                    examId: exam._id.toString(),
                    amountBDT: 500,
                    method: 'bkash',
                    status: 'paid',
                },
                {
                    userId: 'student2',
                    examId: exam._id.toString(),
                    amountBDT: 500,
                    method: 'nagad',
                    status: 'paid',
                },
                {
                    userId: 'student3',
                    examId: exam._id.toString(),
                    amountBDT: 500,
                    method: 'bkash',
                    status: 'pending', // not paid — should be excluded
                },
            ]);

            const earnings = await getExaminerEarnings(examinerUserId);

            expect(earnings.totalSales).toBe(1000);
            expect(earnings.commissionRate).toBe(20);
            expect(earnings.commissionAmount).toBe(200);
            expect(earnings.netEarnings).toBe(800);
            expect(earnings.transactionCount).toBe(2);
        });

        it('uses default 20% commission when no application found', async () => {
            const examinerObjId = new mongoose.Types.ObjectId(examinerUserId);

            const exam = await Exam.create({
                title: 'Exam',
                subject: 'Math',
                totalQuestions: 5,
                totalMarks: 50,
                duration: 30,
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                resultPublishDate: new Date(Date.now() + 86400000),
                createdBy: examinerObjId,
            });

            await PaymentModel.create({
                userId: 'student1',
                examId: exam._id.toString(),
                amountBDT: 200,
                method: 'bkash',
                status: 'paid',
            });

            const earnings = await getExaminerEarnings(examinerUserId);

            expect(earnings.commissionRate).toBe(20);
            expect(earnings.commissionAmount).toBe(40);
            expect(earnings.netEarnings).toBe(160);
        });

        it('includes package payments in earnings', async () => {
            const examinerObjId = new mongoose.Types.ObjectId(examinerUserId);

            await ExaminerApplication.create({
                user: examinerObjId,
                status: 'approved',
                applicationData: { reason: 'Teaching' },
                commissionRate: 15,
                reviewedBy: new mongoose.Types.ObjectId(adminId),
                reviewedAt: new Date(),
            });

            const pkg = await ExamPackage.create({
                title: 'Physics Bundle',
                exams: [],
                priceBDT: 1000,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 86400000 * 30),
                createdBy: examinerObjId,
            });

            await PaymentModel.create({
                userId: 'student1',
                planId: pkg._id.toString(),
                amountBDT: 1000,
                method: 'bkash',
                status: 'paid',
            });

            const earnings = await getExaminerEarnings(examinerUserId);

            expect(earnings.totalSales).toBe(1000);
            expect(earnings.commissionRate).toBe(15);
            expect(earnings.commissionAmount).toBe(150);
            expect(earnings.netEarnings).toBe(850);
            expect(earnings.transactionCount).toBe(1);
        });
    });
});
