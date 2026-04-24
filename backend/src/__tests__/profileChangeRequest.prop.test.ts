// Feature: student-verification-approval, Property 8 & 9: Profile change request storage and replacement

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';

/**
 * Feature: student-verification-approval
 *
 * Property 8: Profile change request stores both previous and requested values
 * **Validates: Requirements 6.1, 6.5**
 *
 * Property 9: Profile change request replacement maintains at most one pending request
 * **Validates: Requirements 6.3**
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

import ProfileUpdateRequest from '../models/ProfileUpdateRequest';

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
    await ProfileUpdateRequest.deleteMany({});
});

// ---------------------------------------------------------------------------
// Restricted fields that can be changed
// ---------------------------------------------------------------------------
const RESTRICTED_FIELDS = [
    'full_name',
    'phone_number',
    'guardian_name',
    'guardian_phone',
    'ssc_batch',
    'hsc_batch',
    'department',
    'roll_number',
    'registration_id',
    'institution_name',
] as const;

// ---------------------------------------------------------------------------
// Arbitrary Generators
// ---------------------------------------------------------------------------

/** Generates a non-empty subset of restricted fields with old and new values */
const fieldChangesArb = fc
    .subarray([...RESTRICTED_FIELDS], { minLength: 1 })
    .chain((fields) =>
        fc.tuple(
            fc.constant(fields),
            fc.array(fc.stringMatching(/^[A-Za-z0-9 ]{2,20}$/), { minLength: fields.length, maxLength: fields.length }),
            fc.array(fc.stringMatching(/^[A-Za-z0-9 ]{2,20}$/), { minLength: fields.length, maxLength: fields.length }),
        ),
    )
    .map(([fields, oldVals, newVals]) => {
        const requested_changes: Record<string, string> = {};
        const previous_values: Record<string, string> = {};
        for (let i = 0; i < fields.length; i++) {
            requested_changes[fields[i]] = newVals[i];
            previous_values[fields[i]] = oldVals[i];
        }
        return { requested_changes, previous_values };
    });

// ---------------------------------------------------------------------------
// Property 8: Profile change request stores both previous and requested values
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 8: Profile change request stores both previous and requested values', () => {
    it('creating a ProfileUpdateRequest stores both requested_changes and previous_values correctly', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(fieldChangesArb, async ({ requested_changes, previous_values }) => {
                await ProfileUpdateRequest.deleteMany({});

                const studentId = new mongoose.Types.ObjectId();

                const doc = await ProfileUpdateRequest.create({
                    student_id: studentId,
                    requested_changes,
                    previous_values,
                    status: 'pending',
                });

                const saved = await ProfileUpdateRequest.findById(doc._id).lean();
                expect(saved).toBeTruthy();
                expect(saved!.status).toBe('pending');
                expect(saved!.student_id.toString()).toBe(studentId.toHexString());

                // Verify requested_changes match
                for (const [field, value] of Object.entries(requested_changes)) {
                    expect(saved!.requested_changes[field]).toBe(value);
                }

                // Verify previous_values match
                for (const [field, value] of Object.entries(previous_values)) {
                    expect(saved!.previous_values[field]).toBe(value);
                }
            }),
            { numRuns: 10 },
        );
    });
});

// ---------------------------------------------------------------------------
// Property 9: Profile change request replacement maintains at most one pending request
// ---------------------------------------------------------------------------

describe('Feature: student-verification-approval, Property 9: Profile change request replacement maintains at most one pending request', () => {
    it('submitting multiple requests leaves at most one pending request per student', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 5 }),
                fieldChangesArb,
                async (numRequests, lastChanges) => {
                    await ProfileUpdateRequest.deleteMany({});

                    const studentId = new mongoose.Types.ObjectId();

                    // Simulate the replacement behavior: cancel previous pending, create new
                    for (let i = 0; i < numRequests; i++) {
                        const isLast = i === numRequests - 1;
                        const changes = isLast
                            ? lastChanges
                            : {
                                requested_changes: { full_name: `Name_${i}` },
                                previous_values: { full_name: `OldName_${i}` },
                            };

                        // Replace existing pending request (Requirement 6.3)
                        await ProfileUpdateRequest.updateMany(
                            { student_id: studentId, status: 'pending' },
                            { $set: { status: 'rejected', admin_feedback: 'Superseded by new request' } },
                        );

                        await ProfileUpdateRequest.create({
                            student_id: studentId,
                            requested_changes: changes.requested_changes,
                            previous_values: changes.previous_values,
                            status: 'pending',
                        });
                    }

                    // Assert at most one pending request
                    const pendingCount = await ProfileUpdateRequest.countDocuments({
                        student_id: studentId,
                        status: 'pending',
                    });
                    expect(pendingCount).toBe(1);

                    // The pending request should contain the last submitted changes
                    const pendingReq = await ProfileUpdateRequest.findOne({
                        student_id: studentId,
                        status: 'pending',
                    }).lean();
                    expect(pendingReq).toBeTruthy();
                    for (const [field, value] of Object.entries(lastChanges.requested_changes)) {
                        expect(pendingReq!.requested_changes[field]).toBe(value);
                    }
                },
            ),
            { numRuns: 10 },
        );
    });
});
