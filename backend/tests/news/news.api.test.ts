jest.mock('rss-parser', () => {
    return {
        __esModule: true,
        default: class RssParser {
            async parseURL() {
                return [];
            }
        },
    };
});

jest.mock('jsdom', () => {
    return {
        __esModule: true,
        JSDOM: class JSDOM {
            window = { document: {} };
            constructor() {
                this.window = { document: {} };
            }
        },
    };
});

jest.mock('@mozilla/readability', () => {
    return {
        __esModule: true,
        Readability: class Readability {
            constructor(_doc: unknown) {}
            parse() {
                return { textContent: '', content: '' };
            }
        },
    };
});

import {
    adminNewsV2Dashboard,
    adminNewsV2GetAllSettings,
    adminNewsV2GetSources,
    getPublicNewsV2BySlug,
    getPublicNewsV2List,
    getPublicNewsV2Settings,
} from '../../src/controllers/newsV2Controller';
import News from '../../src/models/News';
import NewsSource from '../../src/models/NewsSource';
import NewsSystemSettings from '../../src/models/NewsSystemSettings';

type MockRes = {
    statusCode: number;
    payload: unknown;
    status: (code: number) => MockRes;
    json: (body: unknown) => MockRes;
};

function createReq(params: Record<string, string> = {}, query: Record<string, unknown> = {}) {
    return {
        params,
        query,
        protocol: 'http',
        headers: { 'user-agent': 'jest-news-test' },
        get: (name: string) => (name.toLowerCase() === 'host' ? 'localhost:5175' : ''),
    } as any;
}

function createRes(): MockRes {
    const res: Partial<MockRes> = {
        statusCode: 200,
        payload: undefined,
    };
    res.status = function status(code: number) {
        this.statusCode = code;
        return this as MockRes;
    };
    res.json = function json(body: unknown) {
        this.payload = body;
        return this as MockRes;
    };
    return res as MockRes;
}

describe('news api smoke coverage', () => {
    beforeEach(async () => {
        await Promise.all([
            News.deleteMany({}),
            NewsSource.deleteMany({}),
            NewsSystemSettings.deleteMany({}),
        ]);
    });

    it('keeps canonical admin dashboard and public news reflection wired together', async () => {
        await NewsSystemSettings.create({
            key: 'default',
            config: {
                pageTitle: 'CampusWay News',
                pageSubtitle: 'Latest verified updates',
                defaultBannerUrl: '',
                defaultThumbUrl: '',
                defaultSourceIconUrl: '',
                fetchFullArticleEnabled: true,
                fullArticleFetchMode: 'both',
                rss: {
                    enabled: true,
                    defaultFetchIntervalMin: 30,
                    maxItemsPerFetch: 20,
                    duplicateThreshold: 0.86,
                    autoCreateAs: 'pending_review',
                },
                ai: {
                    enabled: false,
                    fallbackMode: 'manual_only',
                    defaultProvider: 'openai',
                    providers: [],
                    language: 'en',
                    style: 'journalistic',
                    noHallucinationMode: true,
                    requireSourceLink: true,
                    maxTokens: 1200,
                    temperature: 0.2,
                },
                aiSettings: {
                    enabled: false,
                    language: 'en',
                    stylePreset: 'standard',
                    duplicateSensitivity: 'medium',
                    strictNoHallucination: true,
                    strictMode: true,
                    maxLength: 1200,
                    promptTemplate: '',
                    customPrompt: '',
                    apiProviderUrl: '',
                    apiKey: '',
                    providerType: 'openai',
                    providerModel: 'gpt-4.1-mini',
                    apiKeyRef: 'OPENAI_API_KEY',
                    autoRemoveDuplicates: false,
                },
                appearance: {
                    layoutMode: 'rss_reader',
                    density: 'comfortable',
                    cardDensity: 'comfortable',
                    paginationMode: 'pages',
                    showWidgets: {
                        trending: true,
                        latest: true,
                        sourceSidebar: true,
                        tagChips: true,
                        previewPanel: true,
                        breakingTicker: false,
                    },
                    showSourceIcons: true,
                    showTrendingWidget: true,
                    showCategoryWidget: true,
                    showShareButtons: true,
                    animationLevel: 'normal',
                    thumbnailFallbackUrl: '',
                },
                share: {
                    enabledChannels: ['copy_link'],
                    shareButtons: {
                        whatsapp: false,
                        facebook: false,
                        messenger: false,
                        telegram: false,
                        copyLink: true,
                        copyText: false,
                    },
                    templates: {
                        default: '{title}',
                        whatsapp: '{title}',
                        facebook: '{title}',
                        messenger: '{title}',
                        telegram: '{title}',
                    },
                    utm: {
                        enabled: false,
                        source: 'campusway',
                        medium: 'social',
                        campaign: 'news_share',
                    },
                },
                workflow: {
                    requireApprovalBeforePublish: true,
                    allowSchedulePublish: true,
                    allowAutoPublishFromAi: false,
                    autoDraftFromRSS: true,
                    defaultIncomingStatus: 'pending_review',
                    allowScheduling: true,
                    openOriginalWhenExtractionIncomplete: true,
                    autoExpireDays: null,
                },
            },
        });

        const source = await NewsSource.create({
            name: 'CampusWay RSS',
            feedUrl: 'https://example.com/feed.xml',
            siteUrl: 'https://example.com',
            enabled: true,
            isActive: true,
            priority: 1,
            order: 1,
            fetchIntervalMinutes: 30,
            fetchIntervalMin: 30,
            tagsDefault: ['campusway'],
            categoryDefault: 'Admission',
            maxItemsPerFetch: 20,
        });

        await News.create({
            title: 'CampusWay Test News',
            slug: 'campusway-test-news',
            shortSummary: 'A canonical published news item for API verification.',
            shortDescription: 'A canonical published news item for API verification.',
            fullContent: '<p>Canonical published content.</p>',
            content: '<p>Canonical published content.</p>',
            category: 'Admission',
            tags: ['campusway', 'verification'],
            status: 'published',
            isPublished: true,
            publishDate: new Date(),
            sourceType: 'manual',
            sourceId: source._id,
            sourceName: source.name,
            sourceUrl: source.feedUrl,
            originalArticleUrl: 'https://example.com/news/campusway-test-news',
            originalLink: 'https://example.com/news/campusway-test-news',
            coverImageUrl: '',
            coverImageSource: 'default',
            views: 5,
        });

        const dashboardRes = createRes();
        await adminNewsV2Dashboard(createReq(), dashboardRes as any);
        expect(dashboardRes.statusCode).toBe(200);
        expect(Number((dashboardRes.payload as any)?.cards?.published || 0)).toBeGreaterThanOrEqual(1);
        expect(Number((dashboardRes.payload as any)?.cards?.activeSources || 0)).toBeGreaterThanOrEqual(1);

        const listRes = createRes();
        await getPublicNewsV2List(createReq({}, { limit: 10 }), listRes as any);
        expect(listRes.statusCode).toBe(200);
        expect(Array.isArray((listRes.payload as any)?.items)).toBe(true);
        expect(((listRes.payload as any)?.items || []).some((item: Record<string, unknown>) => String(item?.slug || '') === 'campusway-test-news')).toBe(true);

        const detailRes = createRes();
        await getPublicNewsV2BySlug(createReq({ slug: 'campusway-test-news' }), detailRes as any);
        expect(detailRes.statusCode).toBe(200);
        expect(String((detailRes.payload as any)?.item?.title || '')).toBe('CampusWay Test News');
        expect(Array.isArray((detailRes.payload as any)?.related)).toBe(true);
    });

    it('surfaces source health, public ai enrichment, and redacts stored ai secrets', async () => {
        await NewsSystemSettings.create({
            key: 'default',
            config: {
                ai: {
                    enabled: true,
                    fallbackMode: 'manual_only',
                    defaultProvider: 'openai-main',
                    providers: [{ id: 'openai-main', type: 'openai', enabled: true, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', apiKeyRef: 'OPENAI_API_KEY' }],
                    language: 'en',
                    style: 'journalistic',
                    noHallucinationMode: true,
                    requireSourceLink: true,
                    maxTokens: 1200,
                    temperature: 0.2,
                },
                aiSettings: {
                    enabled: true,
                    language: 'en',
                    stylePreset: 'standard',
                    duplicateSensitivity: 'medium',
                    strictNoHallucination: true,
                    strictMode: true,
                    maxLength: 1200,
                    promptTemplate: '',
                    customPrompt: '',
                    apiProviderUrl: 'https://api.openai.com/v1',
                    apiKey: 'super-secret-value',
                    providerType: 'openai',
                    providerModel: 'gpt-4.1-mini',
                    apiKeyRef: 'OPENAI_API_KEY',
                    autoRemoveDuplicates: false,
                },
                communication: {
                    allowPublishSend: true,
                    allowNoticeConversion: true,
                    defaultChannels: ['email'],
                    defaultAudienceType: 'all',
                    defaultRecipientMode: 'student',
                    defaultNoticeTarget: 'all',
                    exposeStudentFriendlyExplanation: true,
                    exposeKeyPoints: true,
                },
            },
        });

        const source = await NewsSource.create({
            name: 'Failing RSS',
            feedUrl: 'https://example.com/failing.xml',
            siteUrl: 'https://example.com',
            enabled: true,
            isActive: true,
            priority: 1,
            order: 1,
            fetchIntervalMinutes: 30,
            fetchIntervalMin: 30,
            tagsDefault: ['rss'],
            categoryDefault: 'Updates',
            maxItemsPerFetch: 10,
            lastFetchStatus: 'failed',
            consecutiveFailureCount: 3,
            lastError: 'TLS certificate failure',
        });

        await News.create({
            title: 'AI Enriched News',
            slug: 'ai-enriched-news',
            shortSummary: 'AI enriched summary',
            shortDescription: 'AI enriched summary',
            fullContent: '<p>Published content body.</p>',
            content: '<p>Published content body.</p>',
            category: 'Updates',
            tags: ['rss', 'ai'],
            status: 'published',
            isPublished: true,
            publishDate: new Date(),
            sourceType: 'rss',
            sourceId: source._id,
            sourceName: source.name,
            sourceUrl: source.feedUrl,
            originalArticleUrl: 'https://example.com/news/ai-enriched-news',
            originalLink: 'https://example.com/news/ai-enriched-news',
            aiEnrichment: {
                shortSummary: 'AI enriched summary',
                detailedExplanation: 'Detailed explanation.',
                studentFriendlyExplanation: 'Simple explanation for students.',
                keyPoints: ['Point A', 'Point B'],
                suggestedCategory: 'Updates',
                suggestedTags: ['rss', 'ai'],
            },
            coverImageSource: 'default',
        });

        const dashboardRes = createRes();
        await adminNewsV2Dashboard(createReq(), dashboardRes as any);
        expect(dashboardRes.statusCode).toBe(200);
        expect(Number((dashboardRes.payload as any)?.cards?.unhealthySources || 0)).toBeGreaterThanOrEqual(1);

        const sourcesRes = createRes();
        await adminNewsV2GetSources(createReq(), sourcesRes as any);
        expect(sourcesRes.statusCode).toBe(200);
        expect(((sourcesRes.payload as any)?.items || [])[0]?.healthState).toBeTruthy();

        const publicSettingsRes = createRes();
        await getPublicNewsV2Settings(createReq(), publicSettingsRes as any);
        expect(publicSettingsRes.statusCode).toBe(200);
        expect(Boolean((publicSettingsRes.payload as any)?.communication?.exposeStudentFriendlyExplanation)).toBe(true);

        const detailRes = createRes();
        await getPublicNewsV2BySlug(createReq({ slug: 'ai-enriched-news' }), detailRes as any);
        expect(detailRes.statusCode).toBe(200);
        expect(String((detailRes.payload as any)?.item?.aiEnrichment?.studentFriendlyExplanation || '')).toContain('students');
        expect(Array.isArray((detailRes.payload as any)?.item?.aiEnrichment?.keyPoints)).toBe(true);

        const settingsRes = createRes();
        await adminNewsV2GetAllSettings(createReq(), settingsRes as any);
        expect(settingsRes.statusCode).toBe(200);
        expect(String((settingsRes.payload as any)?.settings?.aiSettings?.apiKey || '')).toBe('');
        expect(Boolean((settingsRes.payload as any)?.settings?.aiSettings?.apiKeyConfigured)).toBe(true);
    });
});
