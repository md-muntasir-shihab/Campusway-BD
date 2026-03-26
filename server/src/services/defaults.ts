export const defaultSiteSettings = {
  siteName: 'CampusWay',
  logoUrl: '',
  siteDescription: 'Your smart campus and admissions companion.',
  themeDefault: 'system' as const,
  socialLinks: [],
  footer: {
    aboutText: 'CampusWay helps students discover universities, exams, and resources in one place.',
    quickLinks: [
      { label: 'Universities', href: '/universities' },
      { label: 'Exams', href: '/exams' },
      { label: 'Resources', href: '/resources' }
    ],
    contactInfo: {
      email: 'support@campusway.com',
      phone: '+91 00000 00000',
      address: 'India'
    }
  }
};

export const defaultHomeSettings = {
  hero: {
    title: 'Discover your next campus move.',
    subtitle: 'Track admissions, upcoming exams, and essential resources with confidence.',
    primaryCtaText: 'Explore Universities',
    primaryCtaUrl: '/universities',
    secondaryCtaText: 'View Exams',
    secondaryCtaUrl: '/exams',
    heroImageUrl: 'https://placehold.co/800x520'
  },
  subscriptionBanner: {
    enabled: true,
    title: 'Upgrade for better outcomes',
    subtitle: 'Unlock full exam access, premium analytics, and curated guidance.',
    showPlansCount: 3,
    selectedPlanIds: []
  },
  stats: {
    enabled: true,
    items: [
      { label: 'Universities', valueType: 'dynamic', value: '0', sourceKey: 'totalUniversities' },
      { label: 'Live Exams', valueType: 'dynamic', value: '0', sourceKey: 'liveExams' },
      { label: 'Deadlines', valueType: 'dynamic', value: '0', sourceKey: 'upcomingDeadlines' },
      { label: 'Resources', valueType: 'dynamic', value: '0', sourceKey: 'resources' }
    ]
  },
  whatsHappening: { enabled: true, closingSoonDays: 14, examSoonDays: 10, maxItems: 4 },
  universityPreview: {
    enabled: true,
    defaultCategory: 'All',
    maxItems: 6,
    highlightedCategories: ['Engineering', 'Medical', 'Management']
  },
  examPreview: { enabled: true, maxItems: 4 },
  newsPreview: { enabled: true, maxItems: 6 },
  resourcesPreview: { enabled: true, maxItems: 6 },
  socialStrip: { enabled: true, title: 'Join our community', subtitle: 'Get updates from CampusWay social channels.' }
};
