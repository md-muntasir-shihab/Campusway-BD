// Feature: student-verification-approval, Property 12: Bulk registration approval processes all selected students

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval, Property 12: Bulk registration approval processes all selected students
 *
 * **Validates: Requirements 10.3**
 *
 * For any non-empty subset of pending student User IDs, a bulk approval action SHALL set
 * the status of every selected student to `active` (or `blocked` for bulk reject) and
 * SHALL not modify the status of any unselected pending students.
 */

// ---------------------------------------------------------------------------
// Mock bcrypt with simple passthrough
// ---------------------------------------------------------------------------
vi.spyOn(bcrypt, 'hash').mockImplementation(async (data: string) => `hashed:${data}`);
vi.spyOn(bcrypt, 'compare').mockImplementation(async (data: string, hash: string) => hash === `hashed:${data}`);

// ---------------------------------------------------------------------------
// Mock notification provider service
// ---------------------------------------------------------------------------
vi.mock('../services/notificationProviderService', () => ({
    sendSMS: vi.fn().mockResolvedValue({ success: true }),
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
    sendNotificationToStudent: vi.fn().mockResolvedValue(undefined),
    getActiveProvider: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        type: 'sms',
        provider: 'twilio',
        isEnabled: true,
    }),
}));

import User from '../models/User';
import { bulkApproveRejectStudents } from '../services/profileApprovalService';

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
    await User.deleteMany({});
});

// ---------------------------------------------------------------------------
// Helper: create N pending students, return their IDs
// ---------------------------------------------------------------------------
async function createPendingStudents(count: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
        const id = new mongoose.Types.ObjectId();
        const hex = id.toHexString();
        await User.create({
            _id: id,
            full_name: `Student ${hex}`,
            username: `bulk_stu_${hex}`,
            email: `bulk_${hex}@test.com`,
            password: 'hashedpassword123',
            role: 'student',
            status: 'pending',
        });
        ids.push(hex);
    }
    return ids;
}

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 12: Bulk registration approval processes all selected students', () => {
    it('bulk approve sets all selected students to active and does not affect unselected', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 5 }),
                fc.integer({ min: 1, max: 4 }),
                async (selectedCount, unselectedCount) => {
                    // Ensure selectedCount doesn't exceed total
                    const totalCount = selectedCount + unselectedCount;
                    await User.deleteMany({});

                    const allIds = await createPendingStudents(totalCount);
                    const selectedIds = allIds.slice(0, selectedCount);
                    const unselectedIds = allIds.slice(selectedCount);
                    const adminId = new mongoose.Types.ObjectId().toHexString();

                    const result = await bulkApproveRejectStudents({
                        userIds: selectedIds,
                        adminId,
                        action: 'approve',
                    });

                    expect(result.processed).toBe(selectedCount);
                    expect(result.failed).toBe(0);

                    // All selected students should be active
                    for (const id of selectedIds) {
                        const user = await User.findById(id).lean();
                        expect(user!.status).toBe('active');
                    }

                    // All unselected students should still be pending
                    for (const id of unselectedIds) {
                        const user = await User.findById(id).lean();
                        expect(user!.status).toBe('pending');
                    }
                },
            ),
            { numRuns: 10 },
        );
    });

    it('bulk reject sets all selected students to blocked and does not affect unselected', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 5 }),
                fc.integer({ min: 1, max: 4 }),
                async (selectedCount, unselectedCount) => {
                    const totalCount = selectedCount + unselectedCount;
                    await User.deleteMany({});

                    const allIds = await createPendingStudents(totalCount);
                    const selectedIds = allIds.slice(0, selectedCount);
                    const unselectedIds = allIds.slice(selectedCount);
                    const adminId = new mongoose.Types.ObjectId().toHexString();

                    const result = await bulkApproveRejectStudents({
                        userIds: selectedIds,
                        adminId,
                        action: 'reject',
                        reason: 'Bulk rejection test',
                    });

                    expect(result.processed).toBe(selectedCount);
                    expect(result.failed).toBe(0);

                    // All selected students should be blocked
                    for (const id of selectedIds) {
                        const user = await User.findById(id).lean();
                        expect(user!.status).toBe('blocked');
                    }

                    // All unselected students should still be pending
                    for (const id of unselectedIds) {
                        const user = await User.findById(id).lean();
                        expect(user!.status).toBe('pending');
                    }
                },
            ),
            { numRuns: 10 },
        );
    });
});
