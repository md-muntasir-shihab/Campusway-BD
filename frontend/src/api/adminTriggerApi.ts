/* ─── Notification Trigger Management API Layer ──────────── */
import api from '../services/api';

// ─── Types ───────────────────────────────────────────────

export interface TriggerConfig {
  triggerKey: string;
  enabled: boolean;
  channels: ('sms' | 'email')[];
  guardianIncluded: boolean;
  templateKey?: string;
  delayMinutes?: number;
  batchSize?: number;
  retryEnabled?: boolean;
  quietHoursMode?: 'respect' | 'bypass';
  audienceMode?: 'affected' | 'subscription_active' | 'subscription_renewal_due' | 'custom';
}

export interface TriggersResponse {
  triggers: TriggerConfig[];
  resultPublishAutoSend: boolean;
  resultPublishChannels: ('sms' | 'email')[];
  resultPublishGuardianIncluded: boolean;
  subscriptionReminderDays: number[];
  autoSyncCostToFinance: boolean;
}

export interface BulkUpdatePayload {
  triggers?: TriggerConfig[];
  resultPublishAutoSend?: boolean;
  resultPublishChannels?: ('sms' | 'email')[];
  resultPublishGuardianIncluded?: boolean;
  subscriptionReminderDays?: number[];
}

// ─── API Functions ──────────────────────────────────────

const BASE = '/admin/notifications/triggers';

export const getTriggers = () =>
  api.get<TriggersResponse>(BASE).then(r => r.data);

export const upsertTrigger = (triggerKey: string, data: Omit<TriggerConfig, 'triggerKey'>) =>
  api.put<{ trigger: TriggerConfig }>(`${BASE}/${encodeURIComponent(triggerKey)}`, data).then(r => r.data);

export const bulkUpdateTriggers = (data: BulkUpdatePayload) =>
  api.put<Omit<TriggersResponse, 'autoSyncCostToFinance'>>(BASE, data).then(r => r.data);
