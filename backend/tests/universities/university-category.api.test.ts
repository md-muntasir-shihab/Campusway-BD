import express, { type Request, type Response } from 'express';
import request from 'supertest';
import University from '../../src/models/University';
import UniversityCategory from '../../src/models/UniversityCategory';
import { adminSyncUniversityCategoryConfig } from '../../src/controllers/universityCategoryController';

function buildApp() {
    const app = express();
    app.use(express.json());
    app.post('/api/university-categories/:id/sync-config', (req: Request, res: Response) => {
        void adminSyncUniversityCategoryConfig(req, res);
    });
    return app;
}

describe('university category admin sync', () => {
    it('syncs shared config to unlocked non-cluster members only', async () => {
        const category = await UniversityCategory.create({
            name: 'Science & Technology',
            slug: 'science-technology',
            isActive: true,
            sharedConfig: {
                applicationStartDate: new Date('2026-03-01T00:00:00.000Z'),
                applicationEndDate: new Date('2026-03-15T00:00:00.000Z'),
                scienceExamDate: '2026-03-20',
                artsExamDate: '2026-03-22',
                businessExamDate: '2026-03-24',
                examCenters: [{ city: 'Dhaka', address: 'BUET Campus' }],
            },
        });

        const syncedUniversity = await University.create({
            name: 'Sync Target University',
            shortForm: 'STU',
            slug: 'sync-target-university',
            category: 'Science & Technology',
            categoryId: category._id,
            isActive: true,
            isArchived: false,
        });

        const lockedUniversity = await University.create({
            name: 'Locked Sync University',
            shortForm: 'LSU',
            slug: 'locked-sync-university',
            category: 'Science & Technology',
            categoryId: category._id,
            categorySyncLocked: true,
            isActive: true,
            isArchived: false,
        });

        await University.create({
            name: 'Cluster Member University',
            shortForm: 'CMU',
            slug: 'cluster-member-university',
            category: 'Science & Technology',
            categoryId: category._id,
            clusterGroup: 'Engineering Alliance',
            clusterId: category._id,
            isActive: true,
            isArchived: false,
        });

        const app = buildApp();
        const response = await request(app)
            .post(`/api/university-categories/${category._id}/sync-config`)
            .send({})
            .expect(200);

        expect(response.body.syncResult).toMatchObject({
            synced: 1,
            skipped: 1,
        });

        const [syncedRow, lockedRow] = await Promise.all([
            University.findById(syncedUniversity._id).lean(),
            University.findById(lockedUniversity._id).lean(),
        ]);

        expect(syncedRow?.applicationStartDate?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
        expect(syncedRow?.applicationEndDate?.toISOString()).toBe('2026-03-15T00:00:00.000Z');
        expect(syncedRow?.scienceExamDate).toBe('2026-03-20T00:00:00.000Z');
        expect(syncedRow?.examCenters).toEqual([{ city: 'Dhaka', address: 'BUET Campus' }]);

        expect(lockedRow?.applicationStartDate ?? null).toBeNull();
        expect(['', 'N/A']).toContain(String(lockedRow?.scienceExamDate || ''));
    });
});
