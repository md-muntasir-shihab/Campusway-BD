const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../frontend/src/api/adminNotificationCampaignApi.ts');

const append = `
export interface NotificationProvider {
  _id: string;
  type: 'sms' | 'email';
  provider: string;
  displayName: string;
  isEnabled: boolean;
  senderConfig: { fromName?: string; fromEmail?: string; smsSenderId?: string };
  rateLimit: { perMinute: number; perDay: number };
  createdAt: string;
  updatedAt: string;
}

export interface TriggerToggle {
  triggerKey: string;
  enabled: boolean;
  channels: ('sms' | 'email')[];
  guardianIncluded: boolean;
}

export interface TriggerSettings {
  triggers: TriggerToggle[];
  resultPublishAutoSend: boolean;
  resultPublishChannels: ('sms' | 'email')[];
  resultPublishGuardianIncluded: boolean;
  subscriptionReminderDays: number[];
}

// ── Provider API ──────────────────────────────────────────────────────────────
export const listProviders = () =>
  api.get('/admin/notifications/providers').then((r) => (r.data.providers ?? []) as NotificationProvider[]);

export const createProvider = (data: Record<string, unknown>) =>
  api.post('/admin/notifications/providers', data).then((r) => r.data as NotificationProvider);

export const updateProvider = (id: string, data: Record<string, unknown>) =>
  api.put(\`/admin/notifications/providers/\${id}\`, data).then((r) => r.data as NotificationProvider);

export const toggleProvider = (id: string) =>
  api.patch(\`/admin/notifications/providers/\${id}/toggle\`).then((r) => r.data as { _id: string; isEnabled: boolean });

export const deleteProvider = (id: string) =>
  api.delete(\`/admin/notifications/providers/\${id}\`).then((r) => r.data);

// ── Trigger API ───────────────────────────────────────────────────────────────
export const getTriggerSettings = () =>
  api.get('/admin/notifications/triggers').then((r) => r.data as TriggerSettings);

export const updateTrigger = (triggerKey: string, data: Record<string, unknown>) =>
  api.put(\`/admin/notifications/triggers/\${triggerKey}\`, data).then((r) => r.data);

export const bulkUpdateTriggers = (data: Record<string, unknown>) =>
  api.put('/admin/notifications/triggers', data).then((r) => r.data);
`;

let content = fs.readFileSync(targetFile, 'utf8');
// Remove trailing whitespace/newline to append cleanly
content = content.trimEnd();
content += '\n' + append + '\n';
fs.writeFileSync(targetFile, content, 'utf8');
console.log('✅ Provider/Trigger API functions appended successfully');
