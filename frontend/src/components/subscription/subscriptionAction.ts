import type { SubscriptionPlanPublic } from '../../services/api';
import { isExternalUrl, normalizeInternalOrExternalUrl } from '../../utils/url';

function getPlanSlug(plan: SubscriptionPlanPublic): string {
    return plan.slug || plan.code || plan._id || '';
}

export function resolveSubscriptionPlanTarget(plan: SubscriptionPlanPublic): string {
    if (plan.ctaMode === 'request_payment') {
        return `/subscription-plans/checkout/${getPlanSlug(plan)}`;
    }

    return normalizeInternalOrExternalUrl(plan.ctaUrl || plan.contactCtaUrl || '/contact') || '/contact';
}

export function resolveSubscriptionPlanContactTarget(plan: SubscriptionPlanPublic): string {
    return normalizeInternalOrExternalUrl(plan.contactCtaUrl || plan.ctaUrl || '/contact') || '/contact';
}

export function resolveSubscriptionPlanPrimaryLabel(plan: SubscriptionPlanPublic): string {
    if (plan.ctaMode === 'request_payment') {
        return plan.ctaLabel || 'Request Payment';
    }

    if (plan.ctaMode === 'external') {
        return plan.ctaLabel || 'Open Link';
    }

    if (plan.ctaMode === 'internal') {
        return plan.ctaLabel || 'Continue';
    }

    return plan.contactCtaLabel || plan.ctaLabel || 'Contact to Subscribe';
}

export function shouldOpenSubscriptionPlanTargetInNewTab(plan: SubscriptionPlanPublic): boolean {
    if (plan.ctaMode === 'request_payment') return false;
    return isExternalUrl(resolveSubscriptionPlanTarget(plan));
}
