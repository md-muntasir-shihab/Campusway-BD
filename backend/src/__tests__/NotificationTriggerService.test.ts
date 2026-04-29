/**
 * Unit tests for NotificationTriggerService
 *
 * Tests all 8 notification trigger functions against an in-memory MongoDB.
 * Validates: Requirements 24.1, 24.2, 24.3, 24.6
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';

import Notification from '../models/Notification';
import GroupMembership from '../models/GroupMembership';
import Exam from '../models/Exam';
import DoubtThread from '../models/DoubtThread';
import StreakRecord from '../models/StreakRecord';

import {
    triggerExamPublished,
    triggerExamStartingSoon,
    triggerResultPublished,
    triggerStreakWarning,
    triggerBattleChallenge,
    triggerPaymentConfirmation,
    triggerRoutineReminder,
    triggerDoubtReply,
} from '../services/NotificationTriggerService';

// ─── Setup ──────────────────────────────────────────────────

beforeAll(async () => {
    await setupTestDb();
}, 30_000);

afterEach(async () => {
    await clearTestDb();
});

afterAll(async () => {
    await teardownTestDb();
}, 30_000);

// ─── Helpers ────────────────────────────────────────────────

function oid(): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId();
}

async function createExamWithGroups(groupIds: mongoose.Types.ObjectId[]) {
    const exam = await Exam.create({
        title: 'Test Exam',
        subject: 'Physics',
        totalQuestions: 10,
        totalMarks: 100,
        duration: 60,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        resultPublishDate: new Date(Date.now() + 172800000),
        targetGroupIds: groupIds,
        status: 'scheduled',
        createdBy: oid(),
    });
    return exam;
}

async function createGroupMemberships(groupId: mongoose.Types.ObjectId, studentIds: mongoose.Types.ObjectId[]) {
    await GroupMembership.insertMany(
        studentIds.map((sid) => ({
            groupId,
            studentId: sid,
            membershipStatus: 'active',
        })),
    );
}

// ─── Tests ──────────────────────────────────────────────────

describe('NotificationTriggerService', () => {
    describe('triggerExamPublished', () => {
        it('creates a notification for all active group members', async () => {
            const groupId = oid();
            const student1 = oid();
            const student2 = oid();

            await createGroupMemberships(groupId, [student1, student2]);
            const exam = await createExamWithGroups([groupId]);

            await triggerExamPublished(exam._id as string);

            const notifications = await Notification.find({ type: 'exam_published' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].category).toBe('exam');
            expect(notifications[0].priority).toBe('high');
            expect(notifications[0].targetUserIds).toHaveLength(2);

            const targetIds = notifications[0].targetUserIds!.map((id) => id.toString());
            expect(targetIds).toContain(student1.toString());
            expect(targetIds).toContain(student2.toString());
        });

        it('does nothing when exam does not exist', async () => {
            await triggerExamPublished(oid().toString());
            const count = await Notification.countDocuments();
            expect(count).toBe(0);
        });

        it('does nothing when exam has no target groups', async () => {
            const exam = await createExamWithGroups([]);
            await triggerExamPublished(exam._id as string);
            const count = await Notification.countDocuments();
            expect(count).toBe(0);
        });

        it('deduplicates students across multiple groups', async () => {
            const group1 = oid();
            const group2 = oid();
            const student = oid();

            await createGroupMemberships(group1, [student]);
            await createGroupMemberships(group2, [student]);
            const exam = await createExamWithGroups([group1, group2]);

            await triggerExamPublished(exam._id as string);

            const notifications = await Notification.find({ type: 'exam_published' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].targetUserIds).toHaveLength(1);
        });

        it('excludes removed/archived group members', async () => {
            const groupId = oid();
            const activeStudent = oid();
            const removedStudent = oid();

            await createGroupMemberships(groupId, [activeStudent]);
            await GroupMembership.create({
                groupId,
                studentId: removedStudent,
                membershipStatus: 'removed',
            });

            const exam = await createExamWithGroups([groupId]);
            await triggerExamPublished(exam._id as string);

            const notifications = await Notification.find({ type: 'exam_published' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].targetUserIds).toHaveLength(1);
            expect(notifications[0].targetUserIds![0].toString()).toBe(activeStudent.toString());
        });
    });

    describe('triggerExamStartingSoon', () => {
        it('creates an urgent notification for group members', async () => {
            const groupId = oid();
            const student = oid();

            await createGroupMemberships(groupId, [student]);
            const exam = await createExamWithGroups([groupId]);

            await triggerExamStartingSoon(exam._id as string);

            const notifications = await Notification.find({ type: 'exam_starting_soon' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].priority).toBe('urgent');
            expect(notifications[0].category).toBe('exam');
        });
    });

    describe('triggerResultPublished', () => {
        it('creates a notification when results are published', async () => {
            const groupId = oid();
            const student = oid();

            await createGroupMemberships(groupId, [student]);
            const exam = await createExamWithGroups([groupId]);

            await triggerResultPublished(exam._id as string);

            const notifications = await Notification.find({ type: 'result_published' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].category).toBe('exam');
            expect(notifications[0].priority).toBe('high');
            expect(notifications[0].targetRoute).toContain('/result');
        });
    });

    describe('triggerStreakWarning', () => {
        it('creates a warning for student with active streak and no activity today', async () => {
            const studentId = oid();

            await StreakRecord.create({
                student: studentId,
                currentStreak: 5,
                longestStreak: 10,
                lastActivityDate: new Date(Date.now() - 86400000), // yesterday
            });

            await triggerStreakWarning(studentId.toString());

            const notifications = await Notification.find({ type: 'streak_warning' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].priority).toBe('high');
            expect(notifications[0].message).toContain('5');
        });

        it('does not warn if student already had activity today', async () => {
            const studentId = oid();

            await StreakRecord.create({
                student: studentId,
                currentStreak: 3,
                longestStreak: 5,
                lastActivityDate: new Date(), // today
            });

            await triggerStreakWarning(studentId.toString());

            const count = await Notification.countDocuments();
            expect(count).toBe(0);
        });

        it('does not warn if student has no streak', async () => {
            const studentId = oid();

            await StreakRecord.create({
                student: studentId,
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: new Date(Date.now() - 86400000),
            });

            await triggerStreakWarning(studentId.toString());

            const count = await Notification.countDocuments();
            expect(count).toBe(0);
        });

        it('does not warn if no streak record exists', async () => {
            await triggerStreakWarning(oid().toString());
            const count = await Notification.countDocuments();
            expect(count).toBe(0);
        });
    });

    describe('triggerBattleChallenge', () => {
        it('notifies the opponent of a challenge', async () => {
            const challengerId = oid();
            const opponentId = oid();
            const battleId = oid();

            await triggerBattleChallenge(
                challengerId.toString(),
                opponentId.toString(),
                battleId.toString(),
            );

            const notifications = await Notification.find({ type: 'battle_challenge' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].targetUserIds).toHaveLength(1);
            expect(notifications[0].targetUserIds![0].toString()).toBe(opponentId.toString());
            expect(notifications[0].actorUserId!.toString()).toBe(challengerId.toString());
            expect(notifications[0].sourceId).toBe(battleId.toString());
        });
    });

    describe('triggerPaymentConfirmation', () => {
        it('creates a payment confirmation notification', async () => {
            const studentId = oid();

            await triggerPaymentConfirmation(studentId.toString(), {
                amount: 500,
                method: 'bKash',
                transactionId: 'TXN123',
                description: 'Physics Mock Test Package',
            });

            const notifications = await Notification.find({ type: 'payment_confirmation' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].category).toBe('update');
            expect(notifications[0].priority).toBe('normal');
            expect(notifications[0].message).toContain('500');
            expect(notifications[0].message).toContain('bKash');
            expect(notifications[0].message).toContain('TXN123');
        });

        it('handles payment without transaction ID', async () => {
            const studentId = oid();

            await triggerPaymentConfirmation(studentId.toString(), {
                amount: 200,
                method: 'Nagad',
            });

            const notifications = await Notification.find({ type: 'payment_confirmation' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].message).not.toContain('TXN');
        });
    });

    describe('triggerRoutineReminder', () => {
        it('creates a routine reminder notification', async () => {
            const studentId = oid();

            await triggerRoutineReminder(studentId.toString(), {
                subject: 'পদার্থবিজ্ঞান',
                topic: 'গতিবিদ্যা',
                goal: '৩টি MCQ সেট সম্পন্ন করুন',
            });

            const notifications = await Notification.find({ type: 'routine_reminder' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].message).toContain('পদার্থবিজ্ঞান');
            expect(notifications[0].message).toContain('গতিবিদ্যা');
            expect(notifications[0].message).toContain('৩টি MCQ সেট সম্পন্ন করুন');
        });

        it('handles routine item without topic', async () => {
            const studentId = oid();

            await triggerRoutineReminder(studentId.toString(), {
                subject: 'গণিত',
                goal: 'অনুশীলন করুন',
            });

            const notifications = await Notification.find({ type: 'routine_reminder' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].message).toContain('গণিত');
            expect(notifications[0].message).toContain('অনুশীলন করুন');
        });
    });

    describe('triggerDoubtReply', () => {
        it('notifies the thread creator when someone else replies', async () => {
            const creatorId = oid();
            const replyAuthorId = oid();
            const questionId = oid();

            const thread = await DoubtThread.create({
                question: questionId,
                createdBy: creatorId,
                status: 'open',
            });

            await triggerDoubtReply(
                (thread._id as mongoose.Types.ObjectId).toString(),
                replyAuthorId.toString(),
            );

            const notifications = await Notification.find({ type: 'doubt_reply' }).lean();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].targetUserIds).toHaveLength(1);
            expect(notifications[0].targetUserIds![0].toString()).toBe(creatorId.toString());
            expect(notifications[0].actorUserId!.toString()).toBe(replyAuthorId.toString());
        });

        it('does not notify when the creator replies to their own thread', async () => {
            const creatorId = oid();
            const questionId = oid();

            const thread = await DoubtThread.create({
                question: questionId,
                createdBy: creatorId,
                status: 'open',
            });

            await triggerDoubtReply(
                (thread._id as mongoose.Types.ObjectId).toString(),
                creatorId.toString(),
            );

            const count = await Notification.countDocuments();
            expect(count).toBe(0);
        });

        it('does nothing when thread does not exist', async () => {
            await triggerDoubtReply(oid().toString(), oid().toString());
            const count = await Notification.countDocuments();
            expect(count).toBe(0);
        });
    });
});
