import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import University from '../models/University';
import HomeSettings from '../models/HomeSettings';
import {
    DEFAULT_UNIVERSITY_CATEGORY,
    normalizeUniversityCategory,
} from '../utils/universityCategories';

dotenv.config();

type MigrationReport = {
    startedAt: string;
    completedAt?: string;
    mode: 'non_destructive';
    checked: Record<string, number>;
    updated: Record<string, number>;
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
        checked: {},
        updated: {},
        notes: [
            'No destructive delete performed.',
            'Legacy fields remain readable; canonical aliases are backfilled.',
        ],
    };

    await mongoose.connect(uri);
    console.log('[migrate:university-canonical-v1] connected');

    report.checked = {
        totalUniversities: await University.countDocuments({}),
        missingCanonicalCategory: await University.countDocuments({ $or: [{ category: { $exists: false } }, { category: '' }] }),
        missingWebsiteUrl: await University.countDocuments({ $or: [{ websiteUrl: { $exists: false } }, { websiteUrl: '' }] }),
        missingAdmissionUrl: await University.countDocuments({ $or: [{ admissionUrl: { $exists: false } }, { admissionUrl: '' }] }),
    };

    const rows = await University.find({}).lean();
    let touched = 0;
    for (const row of rows) {
        const category = normalizeUniversityCategory(row.category || DEFAULT_UNIVERSITY_CATEGORY);
        const websiteUrl = String(row.websiteUrl || row.website || '').trim();
        const admissionUrl = String(row.admissionUrl || row.admissionWebsite || '').trim();
        const establishedYear = Number(row.establishedYear ?? row.established ?? 0) || undefined;
        const seatsScienceEng = String(row.seatsScienceEng || row.scienceSeats || '').trim() || 'N/A';
        const seatsArtsHum = String(row.seatsArtsHum || row.artsSeats || '').trim() || 'N/A';
        const seatsBusiness = String(row.seatsBusiness || row.businessSeats || '').trim() || 'N/A';
        const examDateScience = String(row.examDateScience || row.scienceExamDate || '').trim();
        const examDateArts = String(row.examDateArts || row.artsExamDate || '').trim();
        const examDateBusiness = String(row.examDateBusiness || row.businessExamDate || '').trim();

        const updatePayload = {
            category,
            websiteUrl,
            website: websiteUrl,
            admissionUrl,
            admissionWebsite: admissionUrl,
            establishedYear,
            established: establishedYear,
            seatsScienceEng,
            scienceSeats: seatsScienceEng,
            seatsArtsHum,
            artsSeats: seatsArtsHum,
            seatsBusiness,
            businessSeats: seatsBusiness,
            examDateScience,
            scienceExamDate: examDateScience,
            examDateArts,
            artsExamDate: examDateArts,
            examDateBusiness,
            businessExamDate: examDateBusiness,
        };

        await University.updateOne({ _id: row._id }, { $set: updatePayload });
        touched += 1;
    }

    const home = await HomeSettings.findOne();
    let homeUpdated = 0;
    if (home) {
        const current = home.universityDashboard || {};
        const nextDefault = normalizeUniversityCategory(current.defaultCategory || DEFAULT_UNIVERSITY_CATEGORY);
        const nextShowAll = Boolean(current.showAllCategories);
        home.set({
            universityDashboard: {
                ...current,
                defaultCategory: nextDefault,
                showAllCategories: nextShowAll,
            },
        });
        await home.save();
        homeUpdated = 1;
    }

    report.updated = {
        universitiesTouched: touched,
        homeSettingsTouched: homeUpdated,
    };
    report.completedAt = new Date().toISOString();

    const reportDir = ensureReportDir();
    const reportPath = path.join(reportDir, 'university-canonical-v1-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[migrate:university-canonical-v1] report: ${reportPath}`);

    await mongoose.disconnect();
}

run().catch(async (err) => {
    console.error('[migrate:university-canonical-v1] failed', err);
    await mongoose.disconnect();
    process.exit(1);
});
