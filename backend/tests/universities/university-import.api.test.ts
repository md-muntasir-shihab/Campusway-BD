import express, { type Request, type Response } from 'express';
import multer from 'multer';
import request from 'supertest';
import University from '../../src/models/University';
import UniversityCategory from '../../src/models/UniversityCategory';
import UniversityCluster from '../../src/models/UniversityCluster';
import { adminBulkUpdateUniversities } from '../../src/controllers/universityController';
import {
    adminCommitUniversityImport,
    adminInitUniversityImport,
    adminValidateUniversityImport,
} from '../../src/controllers/universityImportController';

function buildApp() {
    const app = express();
    const upload = multer({ storage: multer.memoryStorage() });
    app.use(express.json());
    app.post('/api/universities/import/init', upload.single('file'), (req: Request, res: Response) => {
        void adminInitUniversityImport(req, res);
    });
    app.post('/api/universities/import/:jobId/validate', (req: Request, res: Response) => {
        void adminValidateUniversityImport(req, res);
    });
    app.post('/api/universities/import/:jobId/commit', (req: Request, res: Response) => {
        void adminCommitUniversityImport(req, res);
    });
    app.post('/api/universities/bulk-update', (req: Request, res: Response) => {
        void adminBulkUpdateUniversities(req, res);
    });
    return app;
}

describe('university import flow', () => {
    it('auto-creates category/cluster and persists exam centers on commit', async () => {
        const app = buildApp();
        const csv = [
            'category,clusterGroup,name,shortForm,shortDescription,description,applicationStartDate,applicationEndDate,examDateScience,examCenters,websiteUrl,admissionUrl,isActive,featured,slug',
            'Engineering Cluster,GST Mega Cluster,Auto Import University,AIU,Fast summary,This description should appear on the public details page.,2026-05-01,2026-05-20,2026-06-01,"Dhaka - BUET Campus | Chattogram - CUET Campus",https://example.edu,https://admission.example.edu,true,true,auto-import-university',
        ].join('\n');

        const initRes = await request(app)
            .post('/api/universities/import/init')
            .attach('file', Buffer.from(csv), 'universities.csv')
            .expect(201);

        const jobId = String(initRes.body.importJobId || '');
        expect(jobId).toBeTruthy();
        expect(initRes.body.suggestedMapping).toMatchObject({
            category: 'category',
            clusterGroup: 'clusterGroup',
            name: 'name',
            shortForm: 'shortForm',
            shortDescription: 'shortDescription',
            description: 'description',
            applicationStartDate: 'applicationStartDate',
            applicationEndDate: 'applicationEndDate',
            examDateScience: 'examDateScience',
            examCenters: 'examCenters',
            websiteUrl: 'websiteUrl',
            admissionUrl: 'admissionUrl',
        });

        const validateRes = await request(app)
            .post(`/api/universities/import/${jobId}/validate`)
            .send({ mapping: initRes.body.suggestedMapping || {}, defaults: {} })
            .expect(200);

        expect(validateRes.body.validationSummary).toMatchObject({
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
        });

        const commitRes = await request(app)
            .post(`/api/universities/import/${jobId}/commit`)
            .send({ mode: 'update-existing' })
            .expect(200);

        expect(commitRes.body.commitSummary).toMatchObject({
            inserted: 1,
            updated: 0,
            failed: 0,
        });
        expect(commitRes.body.createdCategories).toBe(1);
        expect(commitRes.body.createdClusters).toBe(1);

        const [category, cluster, university] = await Promise.all([
            UniversityCategory.findOne({ name: 'Engineering Cluster' }).lean(),
            UniversityCluster.findOne({ name: 'GST Mega Cluster' }).lean(),
            University.findOne({ slug: 'auto-import-university' }).lean(),
        ]);

        expect(category).toBeTruthy();
        expect(cluster).toBeTruthy();
        expect(university).toBeTruthy();
        expect(university?.clusterGroup).toBe('GST Mega Cluster');
        expect(university?.shortDescription).toBe('Fast summary');
        expect(university?.description).toBe('This description should appear on the public details page.');
        expect(university?.examCenters).toEqual([
            { city: 'Dhaka', address: 'BUET Campus' },
            { city: 'Chattogram', address: 'CUET Campus' },
        ]);
        expect(cluster?.memberUniversityIds.map((item) => String(item))).toContain(String(university?._id));
    });

    it('imports only explicitly mapped fields and ignores unmapped columns', async () => {
        const app = buildApp();
        const csv = [
            'name,category,websiteUrl,admissionUrl,remarks,description',
            'Strict Mapping University,Science & Technology,https://strict.example.edu,https://strict.example.edu/admission,Should stay out,Should stay out too',
        ].join('\n');

        const initRes = await request(app)
            .post('/api/universities/import/init')
            .attach('file', Buffer.from(csv), 'strict.csv')
            .expect(201);

        const jobId = String(initRes.body.importJobId || '');
        expect(jobId).toBeTruthy();

        const validateRes = await request(app)
            .post(`/api/universities/import/${jobId}/validate`)
            .send({
                mapping: {
                    name: 'name',
                    category: 'category',
                    websiteUrl: 'websiteUrl',
                    admissionUrl: 'admissionUrl',
                },
                defaults: {},
            })
            .expect(200);

        expect(validateRes.body.validationSummary).toMatchObject({
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
        });

        await request(app)
            .post(`/api/universities/import/${jobId}/commit`)
            .send({ mode: 'update-existing' })
            .expect(200);

        const university = await University.findOne({ name: 'Strict Mapping University' }).lean();
        expect(university).toBeTruthy();
        expect(university?.remarks || '').toBe('');
        expect(university?.description || '').toBe('');
    });

    it('does not collapse distinct universities just because they share the same admission portal', async () => {
        const app = buildApp();
        const csv = [
            'name,shortForm,category,admissionUrl,websiteUrl',
            'First Shared Portal University,FSPU,Science & Technology,https://gstadmission.ac.bd,https://first.example.edu',
            'Second Shared Portal University,SSPU,Science & Technology,https://gstadmission.ac.bd,https://second.example.edu',
        ].join('\n');

        const initRes = await request(app)
            .post('/api/universities/import/init')
            .attach('file', Buffer.from(csv), 'shared-portal.csv')
            .expect(201);

        const jobId = String(initRes.body.importJobId || '');

        await request(app)
            .post(`/api/universities/import/${jobId}/validate`)
            .send({
                mapping: {
                    name: 'name',
                    shortForm: 'shortForm',
                    category: 'category',
                    admissionUrl: 'admissionUrl',
                    websiteUrl: 'websiteUrl',
                },
                defaults: {},
            })
            .expect(200);

        const commitRes = await request(app)
            .post(`/api/universities/import/${jobId}/commit`)
            .send({ mode: 'update-existing' })
            .expect(200);

        expect(commitRes.body.commitSummary).toMatchObject({
            inserted: 2,
            updated: 0,
            failed: 0,
        });

        const rows = await University.find({
            name: { $in: ['First Shared Portal University', 'Second Shared Portal University'] },
        }).lean();

        expect(rows).toHaveLength(2);
    });

    it('accepts N/A-style placeholders for optional email and url fields', async () => {
        const app = buildApp();
        const csv = [
            'name,shortForm,category,email,websiteUrl,admissionUrl',
            'Placeholder Friendly University,PFU,Science & Technology,N/A,N/A,N/A',
        ].join('\n');

        const initRes = await request(app)
            .post('/api/universities/import/init')
            .attach('file', Buffer.from(csv), 'na-friendly.csv')
            .expect(201);

        const jobId = String(initRes.body.importJobId || '');

        const validateRes = await request(app)
            .post(`/api/universities/import/${jobId}/validate`)
            .send({
                mapping: {
                    name: 'name',
                    shortForm: 'shortForm',
                    category: 'category',
                    email: 'email',
                    websiteUrl: 'websiteUrl',
                    admissionUrl: 'admissionUrl',
                },
                defaults: {},
            })
            .expect(200);

        expect(validateRes.body.validationSummary).toMatchObject({
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
        });

        await request(app)
            .post(`/api/universities/import/${jobId}/commit`)
            .send({ mode: 'update-existing' })
            .expect(200);

        const university = await University.findOne({ name: 'Placeholder Friendly University' }).lean();
        expect(university).toBeTruthy();
        expect(university?.email || '').toBe('');
        expect(university?.websiteUrl || '').toBe('');
        expect(university?.admissionUrl || '').toBe('');
    });

    it('bulk updates short and full descriptions for selected universities', async () => {
        const app = buildApp();
        const [first, second] = await University.create([
            {
                name: 'Bulk Description University One',
                shortForm: 'BDU1',
                category: 'Science & Technology',
                slug: 'bulk-description-university-one',
                isActive: true,
            },
            {
                name: 'Bulk Description University Two',
                shortForm: 'BDU2',
                category: 'Science & Technology',
                slug: 'bulk-description-university-two',
                isActive: true,
            },
        ]);

        const response = await request(app)
            .post('/api/universities/bulk-update')
            .send({
                ids: [String(first._id), String(second._id)],
                updates: {
                    shortDescription: 'Shared summary for bulk-updated universities.',
                    description: 'Shared public description that should be visible on every selected university details page.',
                },
            })
            .expect(200);

        expect(response.body.affected).toBe(2);

        const rows = await University.find({
            _id: { $in: [first._id, second._id] },
        }).lean();

        expect(rows).toHaveLength(2);
        rows.forEach((row) => {
            expect(row.shortDescription).toBe('Shared summary for bulk-updated universities.');
            expect(row.description).toBe('Shared public description that should be visible on every selected university details page.');
        });
    });
});
