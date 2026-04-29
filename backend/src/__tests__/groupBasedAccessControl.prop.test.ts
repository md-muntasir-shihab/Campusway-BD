import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import Exam from '../models/Exam';
import ExamSession from '../models/ExamSession';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import GroupMembership from '../models/GroupMembership';
import StudentGroup from '../models/StudentGroup';
import { startExam, DeviceInfo } from '../services/ExamRunnerService';

/**
 * Feature: exam-management-system
 * Property 22: Group-Based Access Control
 *
 * **Validates: Requirements 13.2, 13.3, 13.4**
 *
 * Access to an exam is granted if and only if:
 * - The exam's visibilityMode is 'all_students' (open to everyone), OR
 * - The student is an active member of at least one of the exam's assigned groups
 *
 * Conversely, a student who is NOT a member of any assigned group
 * receives an "Access denied" error.
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
    await ExamSession.deleteMany({});
    await QuestionBankQuestion.deleteMany({});
    await GroupMembership.deleteMany({});
    await StudentGroup.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_DEVICE_INFO: DeviceInfo = {
    ipAddress: '127.0.0.1',
    deviceInfo: 'Test Device',
    browserInfo: 'Test Browser',
    userAgent: 'TestAgent/1.0',
    deviceFingerprint: 'test-fp-group-access',
};

/**
 * Create a minimal published exam with at least one question.
 * Returns the exam document and question IDs.
 */
async function createPublishedExam(overrides: Record<string, unknown> = {}) {
    const question = await QuestionBankQuestion.create({
        subject: 'Physics',
        moduleCategory: 'Mechanics',
        difficulty: 'medium',
        correctKey: 'A',
        question_en: 'Test question for group access',
        question_bn: 'গ্রুপ অ্যাক্সেস পরীক্ষার প্রশ্ন',
        options: [
            { key: 'A', text_en: 'Option A', isCorrect: true },
            { key: 'B', text_en: 'Option B' },
            { key: 'C', text_en: 'Option C' },
            { key: 'D', text_en: 'Option D' },
        ],
        marks: 1,
        isActive: true,
        isArchived: false,
        status: 'published',
    });

    const now = new Date();
    const exam = await Exam.create({
        title: 'Group Access Test Exam',
        subject: 'Physics',
        totalQuestions: 1,
        totalMarks: 1,
        duration: 60,
        isPublished: true,
        status: 'live',
        startDate: new Date(now.getTime() - 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 60 * 60 * 1000),
        resultPublishDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        createdBy: new mongoose.Types.ObjectId(),
        questionOrder: [question._id],
        exam_schedule_type: 'practice',
        ...overrides,
    });

    return { exam, questionIds: [question._id as mongoose.Types.ObjectId] };
}

/**
 * Create a student group and return its document.
 */
async function createGroup(name: string, slug: string) {
    return StudentGroup.create({
        name,
        slug,
        isActive: true,
        type: 'manual',
    });
}

/**
 * Create an active group membership for a student in a group.
 */
async function createMembership(
    groupId: mongoose.Types.ObjectId,
    studentId: mongoose.Types.ObjectId,
) {
    return GroupMembership.create({
        groupId,
        studentId,
        membershipStatus: 'active',
        joinedAtUTC: new Date(),
    });
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 22: Group-Based Access Control', () => {
    it('students who are members of an assigned group CAN start the exam', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Number of groups assigned to the exam (1 to 4)
                fc.integer({ min: 1, max: 4 }),
                // Which group index the student belongs to (0-based)
                fc.integer({ min: 0, max: 100 }),
                async (groupCount, memberGroupRaw) => {
                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});
                    await GroupMembership.deleteMany({});
                    await StudentGroup.deleteMany({});

                    // Create groups
                    const groups = [];
                    for (let i = 0; i < groupCount; i++) {
                        const group = await createGroup(
                            `Group ${i}`,
                            `group-access-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        );
                        groups.push(group);
                    }

                    const groupIds = groups.map(
                        (g) => g._id as mongoose.Types.ObjectId,
                    );

                    // Student is a member of one of the assigned groups
                    const memberGroupIdx = memberGroupRaw % groupCount;
                    const studentId = new mongoose.Types.ObjectId();

                    await createMembership(groupIds[memberGroupIdx], studentId);

                    // Create exam assigned to these groups
                    const { exam } = await createPublishedExam({
                        visibilityMode: 'group_only',
                        accessMode: 'specific',
                        targetGroupIds: groupIds,
                    });

                    // Act: student starts the exam — should succeed
                    const result = await startExam(
                        (exam._id as mongoose.Types.ObjectId).toString(),
                        studentId.toString(),
                        DEFAULT_DEVICE_INFO,
                    );

                    // Assert: session was created successfully
                    expect(result).toBeDefined();
                    expect(result.session).toBeDefined();
                    expect(result.session.student.toString()).toBe(
                        studentId.toString(),
                    );
                },
            ),
            { numRuns: 15 },
        );
    });

    it('students who are NOT members of any assigned group get "Access denied" error', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Number of groups assigned to the exam (1 to 4)
                fc.integer({ min: 1, max: 4 }),
                async (groupCount) => {
                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});
                    await GroupMembership.deleteMany({});
                    await StudentGroup.deleteMany({});

                    // Create groups
                    const groups = [];
                    for (let i = 0; i < groupCount; i++) {
                        const group = await createGroup(
                            `Restricted Group ${i}`,
                            `restricted-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        );
                        groups.push(group);
                    }

                    const groupIds = groups.map(
                        (g) => g._id as mongoose.Types.ObjectId,
                    );

                    // Student is NOT a member of any group
                    const outsiderStudentId = new mongoose.Types.ObjectId();

                    // Create exam assigned to these groups
                    const { exam } = await createPublishedExam({
                        visibilityMode: 'group_only',
                        accessMode: 'specific',
                        targetGroupIds: groupIds,
                    });

                    // Act & Assert: student should be denied access
                    await expect(
                        startExam(
                            (exam._id as mongoose.Types.ObjectId).toString(),
                            outsiderStudentId.toString(),
                            DEFAULT_DEVICE_INFO,
                        ),
                    ).rejects.toThrow(/access denied/i);
                },
            ),
            { numRuns: 15 },
        );
    });

    it('when visibilityMode is "all_students", any student can start the exam', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Number of random students to test (1 to 5)
                fc.integer({ min: 1, max: 5 }),
                async (studentCount) => {
                    // Clean slate
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});
                    await GroupMembership.deleteMany({});
                    await StudentGroup.deleteMany({});

                    // Create exam with visibilityMode 'all_students'
                    // No groups assigned — open to everyone
                    const { exam } = await createPublishedExam({
                        visibilityMode: 'all_students',
                        accessMode: 'all',
                        targetGroupIds: [],
                    });

                    // Each random student (no group memberships) should succeed
                    for (let i = 0; i < studentCount; i++) {
                        const studentId = new mongoose.Types.ObjectId();

                        const result = await startExam(
                            (exam._id as mongoose.Types.ObjectId).toString(),
                            studentId.toString(),
                            {
                                ...DEFAULT_DEVICE_INFO,
                                deviceFingerprint: `fp-all-students-${i}-${Date.now()}`,
                            },
                        );

                        expect(result).toBeDefined();
                        expect(result.session).toBeDefined();
                        expect(result.session.student.toString()).toBe(
                            studentId.toString(),
                        );
                    }
                },
            ),
            { numRuns: 10 },
        );
    });
});
