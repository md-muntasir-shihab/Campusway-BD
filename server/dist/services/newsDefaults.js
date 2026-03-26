export const DEFAULT_NEWS_SETTINGS = {
    key: 'default',
    newsPageTitle: 'CampusWay News',
    newsPageSubtitle: 'Premium RSS reader for verified education updates',
    defaultBannerUrl: '',
    defaultThumbUrl: '',
    defaultSourceIconUrl: '',
    fetchFullArticleEnabled: true,
    fullArticleFetchMode: 'both',
    appearance: {
        layoutMode: 'rss_reader',
        density: 'comfortable',
        showWidgets: {
            trending: true,
            latest: true,
            sourceSidebar: true,
            tagChips: true,
            previewPanel: true,
            breakingTicker: false
        },
        animationLevel: 'normal',
        paginationMode: 'pages'
    },
    shareTemplates: {
        whatsapp: '{title}\n{url}',
        facebook: '{title} {url}',
        messenger: '{title} {url}',
        telegram: '{title}\n{url}'
    },
    aiSettings: {
        enabled: false,
        language: 'en',
        stylePreset: 'standard',
        strictNoHallucination: true,
        maxLength: 1200,
        duplicateSensitivity: 'medium'
    },
    workflow: {
        defaultIncomingStatus: 'pending_review',
        allowScheduling: true,
        autoExpireDays: null
    }
};
