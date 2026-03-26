import { BannerModel } from '../models/Banner.js';
import { HomeSettingsModel } from '../models/HomeSettings.js';
import { SiteSettingsModel } from '../models/SiteSettings.js';
import { defaultHomeSettings, defaultSiteSettings } from './defaults.js';
const universities = [
    { id: 'u1', name: 'Delhi Tech University', category: 'Engineering', deadline: '2026-04-11' },
    { id: 'u2', name: 'National Arts College', category: 'Arts', deadline: '2026-04-07' },
    { id: 'u3', name: 'Global Medical Institute', category: 'Medical', deadline: '2026-04-16' }
];
const exams = [
    { id: 'e1', title: 'CAT Mock 2026', date: '2026-04-05', live: true },
    { id: 'e2', title: 'NEET Grand Test', date: '2026-04-09', live: false }
];
const news = [{ id: 'n1', title: 'Admissions open for 2026', bannerUrl: '' }];
const resources = [{ id: 'r1', title: 'Scholarship Guide', type: 'pdf', url: '/resources/scholarship-guide' }];
const plans = [{ id: 'p1', name: 'Starter', price: 199 }, { id: 'p2', name: 'Pro', price: 499 }, { id: 'p3', name: 'Elite', price: 999 }];
export const getHomeAggregate = async () => {
    const siteSettings = (await SiteSettingsModel.findOne().lean()) ?? defaultSiteSettings;
    const homeSettings = (await HomeSettingsModel.findOne().lean()) ?? defaultHomeSettings;
    const banners = await BannerModel.find({ enabled: true }).sort({ priority: -1 }).lean();
    const statsDynamic = {
        totalUniversities: universities.length,
        liveExams: exams.filter((exam) => exam.live).length,
        upcomingDeadlines: universities.filter((u) => new Date(u.deadline) > new Date()).length,
        resources: resources.length
    };
    return {
        siteSettings,
        homeSettings,
        subscriptionPlansPreview: plans,
        statsDynamic,
        whatsHappening: {
            closingSoon: universities,
            examSoon: exams
        },
        universitiesPreview: universities,
        examsPreview: exams,
        newsPreview: news,
        resourcesPreview: resources,
        banners
    };
};
