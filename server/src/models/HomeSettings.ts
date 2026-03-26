import mongoose, { Schema } from 'mongoose';

const HomeSettingsSchema = new Schema(
  {
    hero: {
      title: String,
      subtitle: String,
      primaryCtaText: String,
      primaryCtaUrl: String,
      secondaryCtaText: String,
      secondaryCtaUrl: String,
      heroImageUrl: String
    },
    subscriptionBanner: {
      enabled: { type: Boolean, default: true },
      title: String,
      subtitle: String,
      showPlansCount: { type: Number, default: 3 },
      selectedPlanIds: [{ type: String }]
    },
    stats: {
      enabled: { type: Boolean, default: true },
      items: [
        {
          label: String,
          valueType: { type: String, enum: ['static', 'dynamic'], default: 'static' },
          value: String,
          sourceKey: String
        }
      ]
    },
    whatsHappening: {
      enabled: { type: Boolean, default: true },
      closingSoonDays: { type: Number, default: 14 },
      examSoonDays: { type: Number, default: 10 },
      maxItems: { type: Number, default: 4 }
    },
    universityPreview: {
      enabled: { type: Boolean, default: true },
      defaultCategory: { type: String, default: 'All' },
      maxItems: { type: Number, default: 6 },
      highlightedCategories: [{ type: String }]
    },
    examPreview: { enabled: { type: Boolean, default: true }, maxItems: { type: Number, default: 4 } },
    newsPreview: { enabled: { type: Boolean, default: true }, maxItems: { type: Number, default: 6 } },
    resourcesPreview: { enabled: { type: Boolean, default: true }, maxItems: { type: Number, default: 6 } },
    socialStrip: { enabled: { type: Boolean, default: true }, title: String, subtitle: String }
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const HomeSettingsModel = mongoose.model('HomeSettings', HomeSettingsSchema);
