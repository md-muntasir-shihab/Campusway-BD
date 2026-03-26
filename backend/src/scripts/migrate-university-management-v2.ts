import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import University from '../models/University';
import UniversityCluster from '../models/UniversityCluster';
import UniversityImportJob from '../models/UniversityImportJob';
import HomeConfig from '../models/HomeConfig';

dotenv.config();

type MigrationReport = {
    startedAt: string;
    completedAt?: string;
    mode: 'non_destructive';
    precheck: Record<string, number>;
    updates: Record<string, number>;
    indexes: string[];
    notes: string[];
};

function ensureReportDir(): string {
    const reportDir = path.resolve(process.cwd(), '../qa-artifacts/migrations');
    fs.mkdirSync(reportDir, { recursive: true });
    return reportDir;
}

async function run(): Promise<void> {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) is required');

    const report: MigrationReport = {
        startedAt: new Date().toISOString(),
        mode: 'non_destructive',
        precheck: {},
        updates: {},
        indexes: [],
        notes: [
            'No destructive operations executed.',
            'Hard delete behavior is runtime-controlled and not executed by migration.',
        ],
    };

    await mongoose.connect(uri);
    console.log('[migrate:university-management-v2] connected');

    report.precheck = {
        universitiesMissingArchiveFlag: await University.countDocuments({ isArchived: { $exists: false } }),
        universitiesMissingClusterSyncLocked: await University.countDocuments({ clusterSyncLocked: { $exists: false } }),
        universitiesMissingDescription: await University.countDocuments({ description: { $exists: false } }),
        homeConfigMissingSelectedCategories: await HomeConfig.countDocuments({ selectedUniversityCategories: { $exists: false } }),
    };

    const uniDefaults = await University.updateMany(
        {
            $or: [
                { isArchived: { $exists: false } },
                { archivedAt: { $exists: false } },
                { archivedBy: { $exists: false } },
                { description: { $exists: false } },
                { clusterSyncLocked: { $exists: false } },
                { clusterDateOverrides: { $exists: false } },
            ],
        },
        {
            $set: {
                isArchived: false,
                archivedAt: null,
                archivedBy: null,
                description: '',
                clusterSyncLocked: false,
                clusterDateOverrides: {},
            },
        },
    );

    const homeConfigDefaults = await HomeConfig.updateMany(
        { selectedUniversityCategories: { $exists: false } },
        { $set: { selectedUniversityCategories: [] } },
    );

    report.updates = {
        universitiesModified: Number(uniDefaults.modifiedCount || 0),
        homeConfigsModified: Number(homeConfigDefaults.modifiedCount || 0),
    };

    await University.createIndexes();
    await UniversityCluster.createIndexes();
    await UniversityImportJob.createIndexes();
    await HomeConfig.createIndexes();

    report.indexes = ['University', 'UniversityCluster', 'UniversityImportJob', 'HomeConfig'];
    report.completedAt = new Date().toISOString();

    const reportDir = ensureReportDir();
    const reportPath = path.join(reportDir, 'university-management-v2-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('[migrate:university-management-v2] completed');
    console.log(`[migrate:university-management-v2] report: ${reportPath}`);

    await mongoose.disconnect();
}

run().catch(async (err) => {
    console.error('[migrate:university-management-v2] failed', err);
    await mongoose.disconnect();
    process.exit(1);
});
