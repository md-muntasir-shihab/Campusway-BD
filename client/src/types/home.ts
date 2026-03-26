export type SocialLink = { id: string; name: string; iconUrl: string; targetUrl: string; placement: string[] };

export type HomeSettings = {
  hero: {
    title: string;
    subtitle: string;
    primaryCtaText: string;
    primaryCtaUrl: string;
    secondaryCtaText: string;
    secondaryCtaUrl: string;
    heroImageUrl: string;
  };
  subscriptionBanner: { enabled: boolean; title: string; subtitle: string; showPlansCount: number; selectedPlanIds: string[] };
  stats: { enabled: boolean; items: { label: string; valueType: 'static' | 'dynamic'; value: string; sourceKey?: string }[] };
  whatsHappening: { enabled: boolean; closingSoonDays: number; examSoonDays: number; maxItems: number };
  universityPreview: { enabled: boolean; defaultCategory: string; maxItems: number; highlightedCategories: string[] };
  examPreview: { enabled: boolean; maxItems: number };
  newsPreview: { enabled: boolean; maxItems: number };
  resourcesPreview: { enabled: boolean; maxItems: number };
  socialStrip: { enabled: boolean; title: string; subtitle: string };
};

export type HomePayload = {
  siteSettings: {
    siteName: string;
    logoUrl: string;
    siteDescription: string;
    themeDefault: 'light' | 'dark' | 'system';
    socialLinks: SocialLink[];
    footer: {
      aboutText: string;
      quickLinks: { label: string; href: string }[];
      contactInfo?: { email?: string; phone?: string; address?: string };
    };
  };
  homeSettings: HomeSettings;
  subscriptionPlansPreview: { id: string; name: string; price: number }[];
  statsDynamic: Record<string, number>;
  whatsHappening: {
    closingSoon: { id: string; name: string; category: string; deadline: string }[];
    examSoon: { id: string; title: string; date: string; live: boolean }[];
  };
  universitiesPreview: { id: string; name: string; category: string; deadline: string }[];
  examsPreview: { id: string; title: string; date: string; live: boolean }[];
  newsPreview: { id: string; title: string; bannerUrl: string }[];
  resourcesPreview: { id: string; title: string; type: string; url: string }[];
};

