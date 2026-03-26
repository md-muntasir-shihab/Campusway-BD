import type {
  MySubscriptionResponse,
  SubscriptionPlanItem,
  SubscriptionPlansResponse,
} from '../services/subscriptionApi';

const plans: SubscriptionPlanItem[] = [
  {
    id: 'free-starter',
    name: 'Starter',
    type: 'free',
    priceBDT: 0,
    durationDays: 30,
    bannerImageUrl: null,
    shortDescription: 'Basic starter access for exploration.',
    features: [
      'Public university and exam visibility',
      'Limited weekly practice sessions',
      'Community updates and notices',
      'Basic progress snapshot',
    ],
    enabled: true,
    displayOrder: 1,
    isFeatured: false,
    contactCtaLabel: 'Contact to Subscribe',
    contactCtaUrl: 'https://wa.me/8801700000000',
  },
  {
    id: 'premium-90',
    name: 'Premium 90',
    type: 'paid',
    priceBDT: 1499,
    durationDays: 90,
    bannerImageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Best value for full exam readiness.',
    features: [
      'Unlimited live exam attempts',
      'Priority result processing',
      'Advanced analytics dashboard',
      'Rank prediction and weak-topic AI hints',
      'Certificate verification support',
      'Priority support response',
    ],
    enabled: true,
    displayOrder: 2,
    isFeatured: true,
    contactCtaLabel: 'Contact to Subscribe',
    contactCtaUrl: 'https://wa.me/8801700000000',
  },
  {
    id: 'pro-180',
    name: 'Pro 180',
    type: 'paid',
    priceBDT: 2599,
    durationDays: 180,
    bannerImageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Long-term plan for serious applicants.',
    features: [
      'Everything in Premium',
      'Mentor review session queue',
      'Priority subscription support hotline',
      'Extended archive access',
      'Early beta feature rollout',
    ],
    enabled: true,
    displayOrder: 3,
    isFeatured: false,
    contactCtaLabel: 'Contact to Subscribe',
    contactCtaUrl: 'https://wa.me/8801700000000',
  },
  {
    id: 'legacy-closed',
    name: 'Legacy 60',
    type: 'paid',
    priceBDT: 999,
    durationDays: 60,
    bannerImageUrl: null,
    shortDescription: 'Retired offer, shown only when unavailable toggle is on.',
    features: ['Legacy package'],
    enabled: false,
    displayOrder: 99,
    isFeatured: false,
    contactCtaLabel: 'Contact to Subscribe',
    contactCtaUrl: 'https://wa.me/8801700000000',
  },
];

export function mockGetSubscriptionPlans(): SubscriptionPlansResponse {
  return {
    items: plans,
    settings: {
      pageTitle: 'Subscription Plans',
      pageSubtitle: 'Choose the plan that fits your preparation journey.',
      headerBannerUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80',
      defaultPlanBannerUrl: null,
      currencyLabel: 'BDT',
      showFeaturedFirst: true,
    },
  };
}

export function mockGetMySubscription(): MySubscriptionResponse {
  return {
    status: 'active',
    planName: 'Premium 90',
    expiresAtUTC: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    daysLeft: 25,
  };
}
