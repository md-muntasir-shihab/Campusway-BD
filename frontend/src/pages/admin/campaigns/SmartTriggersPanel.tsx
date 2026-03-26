import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import AdminGuideButton from '../../../components/admin/AdminGuideButton';
import {
  bulkUpdateTriggers,
  getTriggerSettings,
  listTemplates,
  updateTrigger,
  type NotificationTemplate,
  type TriggerToggle,
} from '../../../api/adminNotificationCampaignApi';

interface Props {
  showToast: (message: string, tone?: 'success' | 'error') => void;
}

type TriggerCatalogItem = {
  key: string;
  label: string;
  group: string;
  description: string;
  automationStatus: 'connected' | 'config_ready';
};

const TRIGGER_CATALOG: TriggerCatalogItem[] = [
  { key: 'account_created', label: 'Account Created', group: 'Account & Auth', description: 'Run welcome communication after a student account is created.', automationStatus: 'config_ready' },
  { key: 'password_reset', label: 'Password Reset', group: 'Account & Auth', description: 'Run after password reset completes.', automationStatus: 'config_ready' },
  { key: 'email_verified', label: 'Email Verified', group: 'Account & Auth', description: 'Run after email verification completes.', automationStatus: 'config_ready' },
  { key: 'news_published', label: 'News Published', group: 'Content', description: 'Run when a news article is published.', automationStatus: 'config_ready' },
  { key: 'notice_published', label: 'Notice Published', group: 'Content', description: 'Run when a notice is published.', automationStatus: 'config_ready' },
  { key: 'rss_item_published', label: 'RSS Item Published', group: 'Content', description: 'Run when an approved RSS item becomes public.', automationStatus: 'config_ready' },
  { key: 'resource_published', label: 'Resource Published', group: 'Content', description: 'Run when a resource is published.', automationStatus: 'config_ready' },
  { key: 'subscription_activated', label: 'Subscription Activated', group: 'Subscription', description: 'Run when a subscription becomes active.', automationStatus: 'config_ready' },
  { key: 'subscription_expiring', label: 'Subscription Expiring Soon', group: 'Subscription', description: 'Run when a subscription enters the reminder window.', automationStatus: 'config_ready' },
  { key: 'subscription_expired', label: 'Subscription Expired', group: 'Subscription', description: 'Connected to expiry automation and fires when subscriptions lapse.', automationStatus: 'connected' },
  { key: 'payment_overdue', label: 'Payment Overdue', group: 'Subscription', description: 'Run when payment becomes overdue.', automationStatus: 'config_ready' },
  { key: 'renewal_completed', label: 'Renewal Completed', group: 'Subscription', description: 'Run after a successful renewal.', automationStatus: 'config_ready' },
  { key: 'plan_changed', label: 'Plan Changed', group: 'Subscription', description: 'Run when an admin changes a plan.', automationStatus: 'config_ready' },
  { key: 'profile_updated', label: 'Profile Updated', group: 'Profile', description: 'Run after a student updates profile data.', automationStatus: 'config_ready' },
  { key: 'profile_update_approved', label: 'Profile Update Approved', group: 'Profile', description: 'Run after a profile request is approved.', automationStatus: 'config_ready' },
  { key: 'profile_incomplete', label: 'Profile Incomplete', group: 'Profile', description: 'Run when the profile stays incomplete.', automationStatus: 'config_ready' },
  { key: 'student_status_changed', label: 'Student Status Changed', group: 'Profile', description: 'Run when student status changes.', automationStatus: 'config_ready' },
  { key: 'exam_published', label: 'Exam Published', group: 'Exam & Result', description: 'Run when an exam becomes available.', automationStatus: 'config_ready' },
  { key: 'exam_assigned', label: 'Exam Assigned', group: 'Exam & Result', description: 'Run when an exam is assigned.', automationStatus: 'config_ready' },
  { key: 'exam_attempted', label: 'Exam Attempted', group: 'Exam & Result', description: 'Run after an exam attempt.', automationStatus: 'config_ready' },
  { key: 'exam_not_attempted', label: 'Exam Not Attempted', group: 'Exam & Result', description: 'Run after a missed exam.', automationStatus: 'config_ready' },
  { key: 'result_published', label: 'Result Published', group: 'Exam & Result', description: 'Run when results are published.', automationStatus: 'config_ready' },
  { key: 'low_exam_score', label: 'Low Exam Score', group: 'Exam & Result', description: 'Run for low-score communication.', automationStatus: 'config_ready' },
  { key: 'support_ticket_created', label: 'Support Ticket Created', group: 'Support & Contact', description: 'Run when a support ticket is created.', automationStatus: 'config_ready' },
  { key: 'support_reply_pending', label: 'Support Reply Pending', group: 'Support & Contact', description: 'Run when support remains unreplied.', automationStatus: 'config_ready' },
  { key: 'contact_form_submitted', label: 'Contact Form Submitted', group: 'Support & Contact', description: 'Run when a public contact form is submitted.', automationStatus: 'config_ready' },
];

const GROUP_ORDER = ['Account & Auth', 'Content', 'Subscription', 'Profile', 'Exam & Result', 'Support & Contact'];
const REMINDER_OPTIONS = [1, 3, 7, 15, 30];

function defaultTriggerDraft(key: string): TriggerToggle {
  return {
    triggerKey: key,
    enabled: false,
    channels: ['sms'],
    guardianIncluded: false,
    templateKey: '',
    delayMinutes: 0,
    batchSize: 0,
    retryEnabled: true,
    quietHoursMode: 'respect',
    audienceMode: 'affected',
  };
}

function normalizeDraft(value: TriggerToggle | undefined, key: string): TriggerToggle {
  return {
    ...defaultTriggerDraft(key),
    ...(value || {}),
    triggerKey: key,
    channels: Array.isArray(value?.channels) && value?.channels.length > 0 ? value.channels : ['sms'],
    templateKey: String(value?.templateKey || ''),
    delayMinutes: Number(value?.delayMinutes || 0),
    batchSize: Number(value?.batchSize || 0),
    retryEnabled: value?.retryEnabled ?? true,
    quietHoursMode: value?.quietHoursMode === 'bypass' ? 'bypass' : 'respect',
    audienceMode: value?.audienceMode === 'subscription_active'
      ? 'subscription_active'
      : value?.audienceMode === 'subscription_renewal_due'
        ? 'subscription_renewal_due'
        : value?.audienceMode === 'custom'
          ? 'custom'
          : 'affected',
  };
}

export default function SmartTriggersPanel({ showToast }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['trigger-settings'], queryFn: getTriggerSettings });
  const templatesQuery = useQuery({ queryKey: ['campaign-templates'], queryFn: () => listTemplates({ limit: 200 }) });
  const [drafts, setDrafts] = useState<Record<string, TriggerToggle>>({});
  const [settingsDraft, setSettingsDraft] = useState({
    resultPublishAutoSend: false,
    resultPublishChannels: ['sms'] as ('sms' | 'email')[],
    resultPublishGuardianIncluded: false,
    subscriptionReminderDays: [7, 3, 1] as number[],
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const templates = useMemo(() => (templatesQuery.data?.items || []) as NotificationTemplate[], [templatesQuery.data]);
  const groups = useMemo(() => GROUP_ORDER.map((group) => ({ group, items: TRIGGER_CATALOG.filter((item) => item.group === group) })), []);

  useEffect(() => {
    if (!data) return;
    const nextDrafts: Record<string, TriggerToggle> = {};
    for (const item of TRIGGER_CATALOG) {
      const current = data.triggers?.find((trigger) => trigger.triggerKey === item.key);
      nextDrafts[item.key] = normalizeDraft(current, item.key);
    }
    setDrafts(nextDrafts);
    setSettingsDraft({
      resultPublishAutoSend: Boolean(data.resultPublishAutoSend),
      resultPublishChannels: Array.isArray(data.resultPublishChannels) && data.resultPublishChannels.length > 0 ? data.resultPublishChannels : ['sms'],
      resultPublishGuardianIncluded: Boolean(data.resultPublishGuardianIncluded),
      subscriptionReminderDays: Array.isArray(data.subscriptionReminderDays) && data.subscriptionReminderDays.length > 0 ? data.subscriptionReminderDays : [7, 3, 1],
    });
  }, [data]);

  const saveTriggerMutation = useMutation({
    mutationFn: async (triggerKey: string) => updateTrigger(triggerKey, drafts[triggerKey] as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trigger-settings'] });
      showToast('Trigger saved');
      setSavingKey(null);
    },
    onError: () => {
      showToast('Trigger save failed', 'error');
      setSavingKey(null);
    },
  });

  const saveSharedSettingsMutation = useMutation({
    mutationFn: async () => bulkUpdateTriggers({
      resultPublishAutoSend: settingsDraft.resultPublishAutoSend,
      resultPublishChannels: settingsDraft.resultPublishChannels,
      resultPublishGuardianIncluded: settingsDraft.resultPublishGuardianIncluded,
      subscriptionReminderDays: settingsDraft.subscriptionReminderDays,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trigger-settings'] });
      showToast('Trigger settings saved');
    },
    onError: () => showToast('Trigger settings save failed', 'error'),
  });

  const updateDraft = (triggerKey: string, patch: Partial<TriggerToggle>) => {
    setDrafts((current) => ({
      ...current,
      [triggerKey]: normalizeDraft({ ...(current[triggerKey] || defaultTriggerDraft(triggerKey)), ...patch }, triggerKey),
    }));
  };

  const toggleReminderDay = (day: number) => {
    setSettingsDraft((current) => ({
      ...current,
      subscriptionReminderDays: current.subscriptionReminderDays.includes(day)
        ? current.subscriptionReminderDays.filter((value) => value !== day)
        : [...current.subscriptionReminderDays, day].sort((left, right) => left - right),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Communication Hub</div>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Smart Auto-Triggers</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Configure trigger channels, audience mode, delay, quiet-hours handling, and template overrides from one place.
              Runtime automation only fires where the current codebase already emits the matching trigger event.
            </p>
          </div>
          <AdminGuideButton
            variant="full"
            tone="indigo"
            title="How this works"
            content="Trigger settings are stored centrally and reused by cron jobs and manual trigger routes. Subscription-based audience rules reuse the Contact Center audience resolver instead of a separate trigger-only list."
            actions={[
              { label: 'Template override', description: 'Leave blank to use the trigger key as the default template lookup.' },
              { label: 'Audience rule', description: 'Affected uses the event scope. Subscription modes switch to the live active or renewal-due audience buckets.' },
              { label: 'Delay & quiet hours', description: 'Delay creates a queued trigger job. Quiet-hours bypass skips quiet-hours deferral for that trigger.' },
            ]}
            affected="Notification jobs, delivery logs, subscription reminders, and trigger-driven communication flows."
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Shared trigger settings</h4>
              <p className="text-sm text-slate-500">Result publishing and renewal reminder windows feed the shared communication settings.</p>
            </div>
            <AdminGuideButton title="Shared settings" content="These controls affect trigger families that rely on Notification Settings rather than a single per-trigger row." tone="indigo" />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <div className="font-medium">Auto-send on result publish</div>
              <div className="mt-1 text-xs text-slate-500">Create notification jobs when results are published.</div>
              <input type="checkbox" checked={settingsDraft.resultPublishAutoSend} onChange={(event) => setSettingsDraft((current) => ({ ...current, resultPublishAutoSend: event.target.checked }))} className="mt-4" />
            </label>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <div className="font-medium">Result publish channels</div>
              <div className="mt-1 text-xs text-slate-500">Channels used when result auto-send is enabled.</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {(['sms', 'email'] as const).map((channel) => (
                  <label key={channel} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={settingsDraft.resultPublishChannels.includes(channel)}
                      onChange={(event) => setSettingsDraft((current) => ({
                        ...current,
                        resultPublishChannels: event.target.checked
                          ? [...new Set([...current.resultPublishChannels, channel])]
                          : current.resultPublishChannels.filter((value) => value !== channel),
                      }))}
                    />
                    {channel.toUpperCase()}
                  </label>
                ))}
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <input type="checkbox" checked={settingsDraft.resultPublishGuardianIncluded} onChange={(event) => setSettingsDraft((current) => ({ ...current, resultPublishGuardianIncluded: event.target.checked }))} />
                  Guardian
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 md:col-span-2">
              <div className="font-medium">Subscription reminder days</div>
              <div className="mt-1 text-xs text-slate-500">These thresholds power renewal-due communication and Contact Center reminder views.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map((day) => (
                  <button key={day} onClick={() => toggleReminderDay(day)} className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${settingsDraft.subscriptionReminderDays.includes(day) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300'}`}>
                    {day} day{day === 1 ? '' : 's'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={() => saveSharedSettingsMutation.mutate()} disabled={saveSharedSettingsMutation.isPending} className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {saveSharedSettingsMutation.isPending ? 'Saving...' : 'Save shared settings'}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Audit status</h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Connected now</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-800 dark:text-emerald-100">{TRIGGER_CATALOG.filter((item) => item.automationStatus === 'connected').length}</div>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Config-ready</div>
              <div className="mt-2 text-3xl font-semibold text-amber-800 dark:text-amber-100">{TRIGGER_CATALOG.filter((item) => item.automationStatus === 'config_ready').length}</div>
            </div>
          </div>
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Connected means the current codebase already emits or schedules the trigger family. Config-ready means the admin can prepare message/channel policy now, while the event emitter still needs a runtime hookup.
          </div>
        </section>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400 dark:border-slate-800">Loading trigger configuration...</div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ group, items }) => (
            <section key={group} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{group}</div>
                  <h4 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{group} triggers</h4>
                </div>
                <AdminGuideButton title={`${group} triggers`} content="Each trigger row stores channel, audience, template, and queue policy in the shared settings document." tone="indigo" />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {items.map((item) => {
                  const draft = normalizeDraft(drafts[item.key], item.key);
                  const matchingTemplates = templates.filter((template) => draft.channels.length === 2 || draft.channels.includes(template.channel as 'sms' | 'email'));

                  return (
                    <article key={item.key} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-base font-semibold text-slate-950 dark:text-white">{item.label}</h5>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.automationStatus === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'}`}>
                              {item.automationStatus === 'connected' ? 'Connected' : 'Config ready'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700">
                          <input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft(item.key, { enabled: event.target.checked })} />
                          Enabled
                        </label>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</div>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {(['sms', 'email'] as const).map((channel) => (
                              <label key={channel} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                                <input
                                  type="checkbox"
                                  checked={draft.channels.includes(channel)}
                                  onChange={(event) => {
                                    const nextChannels = event.target.checked ? [...new Set([...draft.channels, channel])] : draft.channels.filter((value) => value !== channel);
                                    updateDraft(item.key, { channels: nextChannels.length > 0 ? nextChannels : ['sms'] });
                                  }}
                                />
                                {channel.toUpperCase()}
                              </label>
                            ))}
                            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                              <input type="checkbox" checked={draft.guardianIncluded} onChange={(event) => updateDraft(item.key, { guardianIncluded: event.target.checked })} />
                              Guardian
                            </label>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audience rule</div>
                          <select value={draft.audienceMode || 'affected'} onChange={(event) => updateDraft(item.key, { audienceMode: event.target.value as TriggerToggle['audienceMode'] })} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                            <option value="affected">Affected users</option>
                            <option value="subscription_active">Active subscribers</option>
                            <option value="subscription_renewal_due">Renewal due subscribers</option>
                            <option value="custom">Custom audience rule</option>
                          </select>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Template override</div>
                          <select value={draft.templateKey || ''} onChange={(event) => updateDraft(item.key, { templateKey: event.target.value })} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                            <option value="">Use trigger key default</option>
                            {matchingTemplates.map((template) => (
                              <option key={template._id} value={template.templateKey}>{template.templateKey} · {template.name} ({template.channel})</option>
                            ))}
                          </select>
                        </div>

                        <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delay minutes</div>
                          <input type="number" min={0} value={draft.delayMinutes || 0} onChange={(event) => updateDraft(item.key, { delayMinutes: Math.max(0, Number(event.target.value) || 0) })} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
                        </label>

                        <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quiet-hours mode</div>
                          <select value={draft.quietHoursMode || 'respect'} onChange={(event) => updateDraft(item.key, { quietHoursMode: event.target.value as TriggerToggle['quietHoursMode'] })} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                            <option value="respect">Respect quiet hours</option>
                            <option value="bypass">Bypass quiet hours</option>
                          </select>
                        </label>

                        <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stored batch size</div>
                          <input type="number" min={0} value={draft.batchSize || 0} onChange={(event) => updateDraft(item.key, { batchSize: Math.max(0, Number(event.target.value) || 0) })} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
                        </label>

                        <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stored retry policy</div>
                          <label className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                            <input type="checkbox" checked={draft.retryEnabled ?? true} onChange={(event) => updateDraft(item.key, { retryEnabled: event.target.checked })} />
                            Retry failures for this trigger
                          </label>
                        </label>
                      </div>

                      <div className="mt-5 flex items-center justify-end gap-3">
                        <button onClick={() => setDrafts((current) => ({ ...current, [item.key]: normalizeDraft(data?.triggers?.find((trigger) => trigger.triggerKey === item.key), item.key) }))} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium dark:border-slate-700">
                          Reset
                        </button>
                        <button
                          onClick={() => {
                            setSavingKey(item.key);
                            saveTriggerMutation.mutate(item.key);
                          }}
                          disabled={saveTriggerMutation.isPending && savingKey === item.key}
                          className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {saveTriggerMutation.isPending && savingKey === item.key ? 'Saving...' : 'Save trigger'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
