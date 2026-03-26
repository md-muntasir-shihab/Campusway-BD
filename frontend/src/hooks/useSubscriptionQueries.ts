import { useQuery } from '@tanstack/react-query';
import {
  getMySubscription,
  getSubscriptionPlans,
  type MySubscriptionResponse,
  type SubscriptionPlansResponse,
} from '../services/subscriptionApi';
import { mockGetMySubscription, mockGetSubscriptionPlans } from '../mocks/subscriptionPlans';

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK_API || '').toLowerCase() === 'true';

export function useSubscriptionPlansQuery() {
  return useQuery<SubscriptionPlansResponse>({
    queryKey: ['subscriptionPlans'],
    queryFn: async () => (USE_MOCK ? mockGetSubscriptionPlans() : getSubscriptionPlans()),
    staleTime: 60_000,
    refetchInterval: 90_000,
  });
}

export function useMySubscriptionQuery(enabled = true) {
  return useQuery<MySubscriptionResponse>({
    queryKey: ['mySubscription'],
    enabled,
    queryFn: async () => (USE_MOCK ? mockGetMySubscription() : getMySubscription()),
    staleTime: 60_000,
  });
}
