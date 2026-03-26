import { z } from 'zod';

const linkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  iconType: z.enum(['upload', 'url']),
  iconUrl: z.string().url(),
  targetUrl: z.string().url(),
  placement: z.array(z.string())
});

export const siteSettingsSchema = z.object({
  siteName: z.string().min(2),
  logoUrl: z.string().url().or(z.literal('')),
  siteDescription: z.string(),
  themeDefault: z.enum(['light', 'dark', 'system']),
  socialLinks: z.array(linkSchema),
  footer: z.object({
    aboutText: z.string(),
    quickLinks: z.array(z.object({ label: z.string(), href: z.string() })),
    contactInfo: z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional()
    })
  })
});

export const homeSettingsSchema = z.object({
  hero: z.object({
    title: z.string(),
    subtitle: z.string(),
    primaryCtaText: z.string(),
    primaryCtaUrl: z.string(),
    secondaryCtaText: z.string(),
    secondaryCtaUrl: z.string(),
    heroImageUrl: z.string()
  }),
  subscriptionBanner: z.object({
    enabled: z.boolean(),
    title: z.string(),
    subtitle: z.string(),
    showPlansCount: z.number().min(1).max(3),
    selectedPlanIds: z.array(z.string()).default([])
  }),
  stats: z.object({
    enabled: z.boolean(),
    items: z.array(
      z.object({
        label: z.string(),
        valueType: z.enum(['static', 'dynamic']),
        value: z.string(),
        sourceKey: z.string().optional()
      })
    )
  }),
  whatsHappening: z.object({
    enabled: z.boolean(),
    closingSoonDays: z.number().min(1),
    examSoonDays: z.number().min(1),
    maxItems: z.number().min(1).max(10)
  }),
  universityPreview: z.object({
    enabled: z.boolean(),
    defaultCategory: z.string(),
    maxItems: z.number().min(1).max(12),
    highlightedCategories: z.array(z.string())
  }),
  examPreview: z.object({ enabled: z.boolean(), maxItems: z.number().min(1).max(10) }),
  newsPreview: z.object({ enabled: z.boolean(), maxItems: z.number().min(1).max(10) }),
  resourcesPreview: z.object({ enabled: z.boolean(), maxItems: z.number().min(1).max(10) }),
  socialStrip: z.object({ enabled: z.boolean(), title: z.string(), subtitle: z.string() })
});

export const socialLinksSchema = z.object({ socialLinks: z.array(linkSchema) });
