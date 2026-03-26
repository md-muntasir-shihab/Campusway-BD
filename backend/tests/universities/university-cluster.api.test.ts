import express, { type Request, type Response } from 'express';
import request from 'supertest';
import University from '../../src/models/University';
import UniversityCluster from '../../src/models/UniversityCluster';
import { adminSyncUniversityClusterDates } from '../../src/controllers/universityClusterController';

function buildApp() {
    const app = express();
    app.use(express.json());
    app.patch('/api/university-clusters/:id/sync-dates', (req: Request, res: Response) => {
        void adminSyncUniversityClusterDates(req, res);
    });
    return app;
}

describe('university cluster admin sync', () => {
    it('syncs cluster shared dates and admission website to unlocked members only', async () => {
        const cluster = await UniversityCluster.create({
            name: 'Engineering Alliance',
            slug: 'engineering-alliance',
            isActive: true,
            dates: {},
        });

        const syncedUniversity = await University.create({
            name: 'Cluster Sync Target University',
            shortForm: 'CSTU',
            slug: 'cluster-sync-target-university',
            category: 'Science & Technology',
            clusterId: cluster._id,
            clusterGroup: 'Engineering Alliance',
            isActive: true,
            isArchived: false,
        });

        const lockedUniversity = await University.create({
            name: 'Cluster Sync Locked University',
            shortForm: 'CSLU',
            slug: 'cluster-sync-locked-university',
            category: 'Science & Technology',
            clusterId: cluster._id,
            clusterGroup: 'Engineering Alliance',
            clusterSyncLocked: true,
            isActive: true,
            isArchived: false,
        });

        const app = buildApp();
        const response = await request(app)
            .patch(`/api/university-clusters/${cluster._id}/sync-dates`)
            .send({
                dates: {
                    applicationStartDate: '2026-03-01',
                    applicationEndDate: '2026-03-15',
                    scienceExamDate: '2026-03-20',
                    artsExamDate: '2026-03-22',
                    commerceExamDate: '2026-03-24',
                    admissionWebsite: 'https://cluster-admission.example.edu',
                    examCenters: 'Dhaka - BUET Campus',
                },
            })
            .expect(200);

        expect(response.body).toMatchObject({
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
        expect(syncedRow?.artsExamDate).toBe('2026-03-22T00:00:00.000Z');
        expect(syncedRow?.businessExamDate).toBe('2026-03-24T00:00:00.000Z');
        expect(syncedRow?.admissionWebsite).toBe('https://cluster-admission.example.edu');
        expect(syncedRow?.examCenters).toEqual([{ city: 'Dhaka', address: 'BUET Campus' }]);

        expect(lockedRow?.admissionWebsite || '').toBe('');
        expect(lockedRow?.applicationStartDate ?? null).toBeNull();
        expect(['', 'N/A']).toContain(String(lockedRow?.scienceExamDate || ''));
    });
});
