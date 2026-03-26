import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import HomeSettings from '../models/HomeSettings';
import University from '../models/University';
import UniversityCluster from '../models/UniversityCluster';

async function run(): Promise<void> {
    try {
        await connectDB();

        const [totalUniversities, activeUniversities, featuredUniversities, missingShortForm, missingDeadline, missingExamDates, missingExamCenters] = await Promise.all([
            University.countDocuments({}),
            University.countDocuments({ isActive: true, isArchived: { $ne: true } }),
            University.countDocuments({ isActive: true, isArchived: { $ne: true }, featured: true }),
            University.countDocuments({ isActive: true, isArchived: { $ne: true }, $or: [{ shortForm: { $exists: false } }, { shortForm: '' }] }),
            University.countDocuments({ isActive: true, isArchived: { $ne: true }, $or: [{ applicationEndDate: null }, { applicationEndDate: { $exists: false } }] }),
            University.countDocuments({
                isActive: true,
                isArchived: { $ne: true },
                $and: [
                    { $or: [{ scienceExamDate: '' }, { scienceExamDate: { $exists: false } }] },
                    { $or: [{ artsExamDate: '' }, { artsExamDate: { $exists: false } }] },
                    { $or: [{ businessExamDate: '' }, { businessExamDate: { $exists: false } }] },
                ],
            }),
            University.countDocuments({ isActive: true, isArchived: { $ne: true }, $or: [{ examCenters: { $exists: false } }, { examCenters: { $size: 0 } }] }),
        ]);

        const [homeVisibleClusters, emptyClusters, duplicateSlugs, missingCategoryRefs, missingClusterRefs, sampleUniversities, homeSettings] = await Promise.all([
            UniversityCluster.countDocuments({ isActive: true, homeVisible: true }),
            UniversityCluster.countDocuments({ isActive: true, memberUniversityIds: { $size: 0 } }),
            University.aggregate([
                { $group: { _id: '$slug', count: { $sum: 1 } } },
                { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
            ]),
            University.countDocuments({ isActive: true, isArchived: { $ne: true }, categoryId: null }),
            University.countDocuments({ isActive: true, isArchived: { $ne: true }, clusterGroup: { $ne: '' }, clusterId: null }),
            University.find({ isActive: true, isArchived: { $ne: true } })
                .sort({ featured: -1, featuredOrder: 1, name: 1 })
                .limit(12)
                .select('name slug category clusterGroup applicationEndDate scienceExamDate examCenters featured logoUrl shortForm')
                .lean(),
            HomeSettings.findOne({}).lean(),
        ]);

        const output = {
            ok: true,
            databaseName: mongoose.connection.db?.databaseName || '',
            universities: {
                total: totalUniversities,
                active: activeUniversities,
                featured: featuredUniversities,
                missingShortForm,
                missingDeadline,
                missingExamDates,
                missingExamCenters,
                missingCategoryRefs,
                missingClusterRefs,
            },
            clusters: {
                homeVisible: homeVisibleClusters,
                empty: emptyClusters,
            },
            duplicateSlugs,
            homeSettings: homeSettings ? {
                defaultCategory: homeSettings.universityPreview?.defaultActiveCategory || homeSettings.universityDashboard?.defaultCategory || '',
                showAllCategories: Boolean(homeSettings.universityDashboard?.showAllCategories),
                enableClusterFilter: Boolean(homeSettings.universityPreview?.enableClusterFilter),
                featuredMode: String(homeSettings.universityPreview?.featuredMode || ''),
                highlightedCategories: Array.isArray(homeSettings.highlightedCategories)
                    ? homeSettings.highlightedCategories.map((item: any) => String(item.category || ''))
                    : [],
            } : null,
            sampleUniversities,
        };

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[e2e_open_universities_db_evidence] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

void run();
