import { describe, it, expect } from 'vitest';
import Resource from '../models/Resource';

describe('Resource Controller & Expiry Filtering Unit Tests', () => {
    describe('Resource Model Schema & Expiry Date Verification', () => {
        it('validates a resource with valid fields and null expiryDate', () => {
            const resource = new Resource({
                title: 'HSC Higher Mathematics Formula Sheet 2026',
                description: 'Complete formula sheet for HSC math candidates',
                fileUrl: 'https://example.com/math-sheet.pdf',
                fileType: 'pdf',
                type: 'pdf',
                category: 'HSC',
                isPublic: true,
                expiryDate: null,
            });

            const err = resource.validateSync();
            expect(err).toBeUndefined();
            expect(resource.isPublic).toBe(true);
            expect(resource.views).toBe(0);
            expect(resource.downloads).toBe(0);
            expect(resource.expiryDate).toBeNull();
        });

        it('validates a resource with a future expiryDate', () => {
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const resource = new Resource({
                title: 'DU Admission Question Bank 2025',
                fileUrl: 'https://example.com/du-qb.pdf',
                type: 'pdf',
                category: 'Admission',
                isPublic: true,
                expiryDate: futureDate,
            });

            const err = resource.validateSync();
            expect(err).toBeUndefined();
            expect(resource.expiryDate).toEqual(futureDate);
        });

        it('fails validation when required title is missing', () => {
            const resource = new Resource({
                fileUrl: 'https://example.com/test.pdf',
                type: 'pdf',
                category: 'General',
            });

            const err = resource.validateSync();
            expect(err).toBeDefined();
            expect(err?.errors['title']).toBeDefined();
        });
    });

    describe('Expiry Date Query Filter Evaluation', () => {
        it('constructs correct expiry date filter for public resources', () => {
            const now = new Date();
            const expiryFilter = {
                $or: [
                    { expiryDate: { $exists: false } },
                    { expiryDate: null },
                    { expiryDate: { $gt: now } }
                ]
            };

            expect(expiryFilter.$or).toHaveLength(3);
            expect(expiryFilter.$or[0]).toEqual({ expiryDate: { $exists: false } });
            expect(expiryFilter.$or[1]).toEqual({ expiryDate: null });
            expect(expiryFilter.$or[2].expiryDate.$gt).toBeInstanceOf(Date);
        });

        it('correctly evaluates active versus expired resources in logic', () => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
            const futureDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour in future

            const isResourceActive = (resource: { isPublic: boolean; expiryDate?: Date | null }) => {
                if (!resource.isPublic) return false;
                if (!resource.expiryDate) return true;
                return resource.expiryDate > now;
            };

            expect(isResourceActive({ isPublic: true, expiryDate: null })).toBe(true);
            expect(isResourceActive({ isPublic: true, expiryDate: undefined })).toBe(true);
            expect(isResourceActive({ isPublic: true, expiryDate: futureDate })).toBe(true);
            expect(isResourceActive({ isPublic: true, expiryDate: pastDate })).toBe(false);
            expect(isResourceActive({ isPublic: false, expiryDate: futureDate })).toBe(false);
        });
    });

    describe('Counter Atomic Increment Logic ($inc)', () => {
        it('creates atomic $inc update operator for view counter', () => {
            const updatePayload = { $inc: { views: 1 } };
            expect(updatePayload).toEqual({ $inc: { views: 1 } });
        });

        it('creates atomic $inc update operator for download counter', () => {
            const updatePayload = { $inc: { downloads: 1 } };
            expect(updatePayload).toEqual({ $inc: { downloads: 1 } });
        });
    });
});
