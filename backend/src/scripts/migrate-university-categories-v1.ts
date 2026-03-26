import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import slugify from 'slugify';
import University from '../models/University';
import UniversityCategory from '../models/UniversityCategory';

dotenv.config();

type MigrationReport = {
    startedAt: string;
    completedAt?: string;
    createdCategories: number;
    linkedUniversities: number;
    notes: string[];
};

function ensureReportDir(): string {
    const dir = path.resolve(process.cwd(), '../qa-artifacts/migrations');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function normalizeSlug(name: string): string {
    const slug = slugify(name || '', { lower: true, strict: true });
    return slug || `category-${Date.now()}`;
}

async function run(): Promise<void> {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) is required');

    const report: MigrationReport = {
        startedAt: new Date().toISOString(),
        createdCategories: 0,
        linkedUniversities: 0,
        notes: ['Non-destructive migration. Legacy `category` string remains in place.'],
    };

    await mongoose.connect(uri);
    console.log('[migrate:university-categories-v1] connected');

    const distinctCategories = await University.distinct('category', { category: { $exists: true, $ne: '' } });
    for (const rawName of distinctCategories) {
        const name = String(rawName || '').trim();
        if (!name) continue;

        const existing = await UniversityCategory.findOne({ name }).select('_id').lean();
        if (existing) continue;

        let slug = normalizeSlug(name);
        const slugExists = await UniversityCategory.findOne({ slug }).select('_id').lean();
        if (slugExists) slug = `${slug}-${Date.now()}`;

        await UniversityCategory.create({
            name,
            slug,
            labelEn: name,
            labelBn: name,
            isActive: true,
            homeHighlight: false,
            homeOrder: 0,
        });
        report.createdCategories += 1;
    }

    const categories = await UniversityCategory.find().select('_id name').lean();
    for (const category of categories) {
        const result = await University.updateMany(
            { category: category.name, $or: [{ categoryId: null }, { categoryId: { $exists: false } }] },
            { $set: { categoryId: category._id } },
        );
        report.linkedUniversities += Number(result.modifiedCount || 0);
    }

    await UniversityCategory.createIndexes();
    await University.createIndexes();

    report.completedAt = new Date().toISOString();
    const reportPath = path.join(ensureReportDir(), 'university-categories-v1-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[migrate:university-categories-v1] done. report: ${reportPath}`);

    await mongoose.disconnect();
}

run().catch(async (err) => {
    console.error('[migrate:university-categories-v1] failed', err);
    await mongoose.disconnect();
    process.exit(1);
});

