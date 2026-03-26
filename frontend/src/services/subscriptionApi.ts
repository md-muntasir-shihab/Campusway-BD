import api from './api';

export type SubscriptionPlanType = 'free' | 'paid';

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  type: SubscriptionPlanType;
  priceBDT: number;
  durationDays: number;
  bannerImageUrl?: string | null;
  shortDescription?: string | null;
  features: string[];
  enabled: boolean;
  displayOrder: number;
  isFeatured: boolean;
  contactCtaLabel: string;
  contactCtaUrl: string;
}

export interface SubscriptionPlansSettings {
  pageTitle?: string;
  pageSubtitle?: string;
  headerBannerUrl?: string | null;
  defaultPlanBannerUrl?: string | null;
  currencyLabel?: string;
  showFeaturedFirst?: boolean;
}

export interface SubscriptionPlansResponse {
  items: SubscriptionPlanItem[];
  settings?: SubscriptionPlansSettings;
}

export type MySubscriptionStatus = 'active' | 'expired' | 'pending' | 'none';

export interface MySubscriptionResponse {
  status: MySubscriptionStatus;
  planName?: string;
  expiresAtUTC?: string | null;
  daysLeft?: number | null;
}

function normalizePlan(raw: Record<string, unknown>): SubscriptionPlanItem {
  const id = String(raw.id || raw._id || '');
  const price = Number(raw.priceBDT ?? raw.price ?? 0);
  const duration = Number(raw.durationDays ?? raw.durationValue ?? 30);
  const enabled = raw.enabled !== undefined ? Boolean(raw.enabled) : Boolean(raw.isActive ?? true);

  return {
    id,
    name: String(raw.name || 'Subscription Plan'),
    type: String(raw.type || (price <= 0 ? 'free' : 'paid')) === 'free' ? 'free' : 'paid',
    priceBDT: Number.isFinite(price) ? Math.max(0, price) : 0,
    durationDays: Number.isFinite(duration) ? Math.max(1, Math.floor(duration)) : 30,
    bannerImageUrl: raw.bannerImageUrl ? String(raw.bannerImageUrl) : null,
    shortDescription: raw.shortDescription ? String(raw.shortDescription) : null,
    features: Array.isArray(raw.features) ? raw.features.map((v) => String(v)).filter(Boolean) : [],
    enabled,
    displayOrder: Number(raw.displayOrder ?? raw.sortOrder ?? raw.priority ?? 0) || 0,
    isFeatured: Boolean(raw.isFeatured),
    contactCtaLabel: String(raw.contactCtaLabel || 'Contact to Subscribe'),
    contactCtaUrl: String(raw.contactCtaUrl || '/contact'),
  };
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlansResponse> {
  const res = await api.get<{
    items: Record<string, unknown>[];
    settings?: SubscriptionPlansSettings;
  }>('/subscription-plans');

  return {
    items: (res.data.items || []).map(normalizePlan),
    settings: res.data.settings,
  };
}

export async function getMySubscription(): Promise<MySubscriptionResponse> {
  const res = await api.get<MySubscriptionResponse>('/subscriptions/me');
  return res.data;
}
