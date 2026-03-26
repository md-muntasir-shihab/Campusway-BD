import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    adminAssignSubscriptionPlan,
    adminCreateSubscriptionPlan,
    adminDeleteSubscriptionPlan,
    adminDuplicateSubscriptionPlan,
    adminGetSubscriptionPlanById,
    adminGetSubscriptionPlans,
    adminGetSubscriptionSettings,
    adminReorderSubscriptionPlans,
    adminSuspendSubscriptionPlan,
    adminToggleSubscriptionPlan,
    adminToggleSubscriptionPlanFeatured,
    adminUpdateSubscriptionPlan,
    adminUpdateSubscriptionSettings,
    getHomeSubscriptionPlans,
    getMySubscriptionStatus,
    getPublicSubscriptionPlanById,
    getPublicSubscriptionPlans,
    requestSubscriptionPayment,
    type AdminSubscriptionPlan,
    type HomeSubscriptionPlansResponse,
    type SubscriptionAssignmentPayload,
    type SubscriptionPlanPublic,
    type SubscriptionPlansPublicSettings,
    type UserSubscriptionStatus,
} from '../services/api';

export const subscriptionQueryKeys = {
    publicPlans: ['subscription-plans-public'] as const,
    publicPlanRecord: ['subscription-plan-public'] as const,
    publicPlanById: (id: string) => ['subscription-plan-public', id] as const,
    homePlans: ['subscription-plans-home'] as const,
    mySubscription: ['my-subscription-status'] as const,
    adminPlans: ['subscription-plans-admin'] as const,
    adminPlanRecord: ['subscription-plan-admin'] as const,
    adminPlanById: (id: string) => ['subscription-plan-admin', id] as const,
    adminSettings: ['subscription-settings-admin'] as const,
};

function normalizeStringList(value: unknown, limit = 50): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, limit);
}

function normalizeSettings(
    settings?: SubscriptionPlansPublicSettings,
): SubscriptionPlansPublicSettings {
    if (!settings) return {};
    return {
        ...settings,
        comparisonRows: Array.isArray(settings.comparisonRows) ? settings.comparisonRows : [],
        pageFaqItems: Array.isArray(settings.pageFaqItems) ? settings.pageFaqItems : [],
        sectionToggles: {
            detailsDrawer: settings.sectionToggles?.detailsDrawer ?? true,
            comparisonTable: settings.sectionToggles?.comparisonTable ?? true,
            faqBlock: settings.sectionToggles?.faqBlock ?? true,
            homePreview: settings.sectionToggles?.homePreview ?? true,
        },
        defaultCtaMode: settings.defaultCtaMode || 'contact',
    };
}

function normalizePlan<T extends SubscriptionPlanPublic | AdminSubscriptionPlan>(plan: T): T {
    const priceBDT = Math.max(0, Number(plan.priceBDT ?? plan.price ?? 0) || 0);
    const durationDays = Math.max(1, Number(plan.durationDays ?? plan.durationValue ?? 30) || 30);
    const durationValue = Math.max(1, Number(plan.durationValue ?? durationDays) || durationDays);
    const durationUnit = plan.durationUnit === 'months' ? 'months' : 'days';
    const displayOrder = Number(plan.displayOrder ?? plan.sortOrder ?? plan.priority ?? 100) || 100;
    const visibleFeatures = normalizeStringList(
        plan.visibleFeatures?.length
            ? plan.visibleFeatures
            : (plan.features?.length ? plan.features : plan.includedModules),
        8
    );
    const fullFeatures = Array.from(new Set(
        normalizeStringList(plan.fullFeatures)
            .concat(visibleFeatures)
            .concat(normalizeStringList(plan.features))
            .concat(normalizeStringList(plan.includedModules))
    ));

    return {
        ...plan,
        id: plan.id || plan._id,
        slug: plan.slug || plan.code,
        shortTitle: plan.shortTitle || plan.name,
        shortLabel: plan.shortLabel || plan.shortTitle || plan.name,
        tagline: plan.tagline || '',
        planType: plan.planType || (priceBDT <= 0 ? 'free' : 'paid'),
        priceBDT,
        price: Math.max(0, Number(plan.price ?? priceBDT) || priceBDT),
        oldPrice: plan.oldPrice ?? null,
        currency: plan.currency || 'BDT',
        billingCycle: plan.billingCycle || 'monthly',
        durationDays,
        durationMonths: plan.durationMonths ?? null,
        durationValue,
        durationUnit,
        durationLabel: plan.durationLabel || (durationUnit === 'months' ? `${durationValue} month${durationValue === 1 ? '' : 's'}` : `${durationDays} day${durationDays === 1 ? '' : 's'}`),
        validityLabel: plan.validityLabel || plan.durationLabel || (durationUnit === 'months' ? `${durationValue} month${durationValue === 1 ? '' : 's'}` : `${durationDays} day${durationDays === 1 ? '' : 's'}`),
        isFree: plan.isFree ?? priceBDT <= 0,
        isPaid: plan.isPaid ?? priceBDT > 0,
        shortDescription: plan.shortDescription || '',
        fullDescription: plan.fullDescription || plan.description || plan.shortDescription || '',
        description: plan.description || plan.fullDescription || plan.shortDescription || '',
        themeKey: plan.themeKey || 'basic',
        badgeText: plan.badgeText || '',
        highlightText: plan.highlightText || '',
        features: visibleFeatures,
        visibleFeatures,
        fullFeatures,
        excludedFeatures: normalizeStringList(plan.excludedFeatures),
        tags: normalizeStringList(plan.tags),
        includedModules: normalizeStringList(plan.includedModules),
        recommendedFor: plan.recommendedFor || '',
        comparisonNote: plan.comparisonNote || '',
        supportLevel: plan.supportLevel || 'basic',
        accessScope: plan.accessScope || '',
        renewalNotes: plan.renewalNotes || '',
        policyNote: plan.policyNote || '',
        faqItems: Array.isArray(plan.faqItems) ? plan.faqItems : [],
        allowsExams: plan.allowsExams ?? true,
        allowsPremiumResources: plan.allowsPremiumResources ?? false,
        allowsSMSUpdates: plan.allowsSMSUpdates ?? false,
        allowsEmailUpdates: plan.allowsEmailUpdates ?? true,
        allowsGuardianAlerts: plan.allowsGuardianAlerts ?? false,
        allowsSpecialGroups: plan.allowsSpecialGroups ?? false,
        dashboardPrivileges: normalizeStringList(plan.dashboardPrivileges, 20),
        maxAttempts: plan.maxAttempts ?? null,
        enabled: plan.enabled ?? plan.isActive ?? true,
        isActive: plan.isActive ?? plan.enabled ?? true,
        isArchived: plan.isArchived ?? false,
        isFeatured: plan.isFeatured ?? false,
        showOnHome: plan.showOnHome ?? false,
        showOnPricingPage: plan.showOnPricingPage ?? true,
        displayOrder,
        priority: Number(plan.priority ?? displayOrder) || displayOrder,
        sortOrder: Number(plan.sortOrder ?? displayOrder) || displayOrder,
        ctaLabel: plan.ctaLabel || plan.contactCtaLabel || (priceBDT <= 0 ? 'Get Started' : 'Subscribe Now'),
        ctaUrl: plan.ctaUrl || plan.contactCtaUrl || '/contact',
        ctaMode: plan.ctaMode || 'contact',
        contactCtaLabel: plan.contactCtaLabel || plan.ctaLabel || 'Contact to Subscribe',
        contactCtaUrl: plan.contactCtaUrl || plan.ctaUrl || '/contact',
    } as T;
}

function getPlanCacheIdentifiers(
    plan?: Partial<SubscriptionPlanPublic | AdminSubscriptionPlan> | null,
): string[] {
    if (!plan) return [];
    return Array.from(new Set(
        [plan._id, plan.id, plan.slug, plan.code]
            .map((value) => String(value || '').trim())
            .filter(Boolean)
    ));
}

function primePlanRecordCaches(
    queryClient: ReturnType<typeof useQueryClient>,
    plan?: SubscriptionPlanPublic | AdminSubscriptionPlan | null,
) {
    if (!plan) return;
    const normalizedPlan = normalizePlan(plan);
    for (const key of getPlanCacheIdentifiers(normalizedPlan)) {
        queryClient.setQueryData(subscriptionQueryKeys.adminPlanById(key), normalizedPlan);
        queryClient.setQueryData(subscriptionQueryKeys.publicPlanById(key), normalizedPlan);
    }
}

async function invalidateSubscriptionQueries(
    queryClient: ReturnType<typeof useQueryClient>,
    plan?: Partial<SubscriptionPlanPublic | AdminSubscriptionPlan> | null,
) {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.publicPlans }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.publicPlanRecord }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.homePlans }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.mySubscription }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.adminPlans }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.adminPlanRecord }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.adminSettings }),
        ...getPlanCacheIdentifiers(plan).map((key) =>
            queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.adminPlanById(key) })
        ),
        ...getPlanCacheIdentifiers(plan).map((key) =>
            queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.publicPlanById(key) })
        ),
    ]);
}

export function useSubscriptionPlansQuery() {
    return useQuery({
        queryKey: subscriptionQueryKeys.publicPlans,
        queryFn: async (): Promise<{
            items: SubscriptionPlanPublic[];
            settings?: SubscriptionPlansPublicSettings;
            lastUpdatedAt?: string | null;
        }> => {
            const response = await getPublicSubscriptionPlans();
            return {
                items: (response.data.items || [])
                    .map((plan) => normalizePlan(plan))
                    .sort((a, b) => Number(a.displayOrder || 100) - Number(b.displayOrder || 100)),
                settings: normalizeSettings(response.data.settings),
                lastUpdatedAt: response.data.lastUpdatedAt || null,
            };
        },
    });
}

export function useSubscriptionPlans() {
    const query = useSubscriptionPlansQuery();
    return {
        ...query,
        data: query.data?.items || [],
        settings: query.data?.settings,
        lastUpdatedAt: query.data?.lastUpdatedAt,
    };
}

export function useSubscriptionPlanById(planId: string) {
    return useQuery({
        queryKey: subscriptionQueryKeys.publicPlanById(planId),
        enabled: Boolean(planId),
        queryFn: async (): Promise<SubscriptionPlanPublic | null> => {
            if (!planId) return null;
            const response = await getPublicSubscriptionPlanById(planId);
            return normalizePlan(response.data.item);
        },
    });
}

export function useHomeSubscriptionPlans() {
    return useQuery({
        queryKey: subscriptionQueryKeys.homePlans,
        queryFn: async (): Promise<HomeSubscriptionPlansResponse> => {
            const response = await getHomeSubscriptionPlans();
            return {
                ...response.data,
                items: (response.data.items || [])
                    .map((plan) => normalizePlan(plan))
                    .sort((a, b) => Number(a.displayOrder || 100) - Number(b.displayOrder || 100)),
                settings: normalizeSettings(response.data.settings),
            };
        },
    });
}

export function useMySubscription(enabled = true) {
    return useQuery({
        queryKey: subscriptionQueryKeys.mySubscription,
        enabled,
        queryFn: async (): Promise<UserSubscriptionStatus> => {
            const response = await getMySubscriptionStatus();
            return {
                ...response.data,
                plan: response.data.plan ? normalizePlan(response.data.plan) : response.data.plan,
            };
        },
    });
}

export function useAdminSubscriptionPlans() {
    return useQuery({
        queryKey: subscriptionQueryKeys.adminPlans,
        queryFn: async (): Promise<AdminSubscriptionPlan[]> => {
            const response = await adminGetSubscriptionPlans();
            return (response.data.items || [])
                .map((plan) => normalizePlan(plan))
                .sort((a, b) => Number(a.displayOrder || 100) - Number(b.displayOrder || 100));
        },
    });
}

export function useAdminSubscriptionPlan(planId: string) {
    return useQuery({
        queryKey: subscriptionQueryKeys.adminPlanById(planId),
        enabled: Boolean(planId),
        queryFn: async (): Promise<AdminSubscriptionPlan | null> => {
            if (!planId) return null;
            const response = await adminGetSubscriptionPlanById(planId);
            return normalizePlan(response.data.item);
        },
    });
}

export function useSubscriptionSettings() {
    return useQuery({
        queryKey: subscriptionQueryKeys.adminSettings,
        queryFn: async (): Promise<SubscriptionPlansPublicSettings> => {
            const response = await adminGetSubscriptionSettings();
            return normalizeSettings(response.data.settings);
        },
    });
}

export function useCreateSubscriptionPlanMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<AdminSubscriptionPlan>) => adminCreateSubscriptionPlan(payload),
        onSuccess: async (response) => {
            primePlanRecordCaches(queryClient, response.data?.item || null);
            await invalidateSubscriptionQueries(queryClient, response.data?.item || null);
        },
    });
}

export function useUpdateSubscriptionPlanMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminSubscriptionPlan> }) =>
            adminUpdateSubscriptionPlan(id, payload),
        onSuccess: async (response) => {
            primePlanRecordCaches(queryClient, response.data?.item || null);
            await invalidateSubscriptionQueries(queryClient, response.data?.item || null);
        },
    });
}

export function useDeleteSubscriptionPlanMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminDeleteSubscriptionPlan(id),
        onSuccess: async (response) => {
            await invalidateSubscriptionQueries(queryClient, response.data?.item || null);
        },
    });
}

export function useToggleSubscriptionPlanMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminToggleSubscriptionPlan(id),
        onSuccess: async (response) => {
            primePlanRecordCaches(queryClient, response.data?.item || null);
            await invalidateSubscriptionQueries(queryClient, response.data?.item || null);
        },
    });
}

export function useToggleSubscriptionPlanFeaturedMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminToggleSubscriptionPlanFeatured(id),
        onSuccess: async (response) => {
            primePlanRecordCaches(queryClient, response.data?.item || null);
            await invalidateSubscriptionQueries(queryClient, response.data?.item || null);
        },
    });
}

export function useDuplicateSubscriptionPlanMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminDuplicateSubscriptionPlan(id),
        onSuccess: async (response) => {
            primePlanRecordCaches(queryClient, response.data?.item || null);
            await invalidateSubscriptionQueries(queryClient, response.data?.item || null);
        },
    });
}

export function useReorderSubscriptionPlansMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (order: string[]) => adminReorderSubscriptionPlans(order),
        onSuccess: async () => {
            await invalidateSubscriptionQueries(queryClient);
        },
    });
}

export function useUpdateSubscriptionSettingsMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: SubscriptionPlansPublicSettings) => adminUpdateSubscriptionSettings(payload),
        onSuccess: async () => {
            await invalidateSubscriptionQueries(queryClient);
        },
    });
}

export function useAssignSubscriptionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: SubscriptionAssignmentPayload) => adminAssignSubscriptionPlan(payload),
        onSuccess: async () => {
            await invalidateSubscriptionQueries(queryClient);
        },
    });
}

export function useSuspendSubscriptionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: { userId: string; notes?: string }) => adminSuspendSubscriptionPlan(payload),
        onSuccess: async () => {
            await invalidateSubscriptionQueries(queryClient);
        },
    });
}

export function useRequestSubscriptionPaymentMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ planId, method }: {
            planId: string;
            method?: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cash' | 'manual' | 'bank' | 'card' | 'sslcommerz';
        }) => requestSubscriptionPayment(planId, { method }),
        onSuccess: async () => {
            await invalidateSubscriptionQueries(queryClient);
        },
    });
}
