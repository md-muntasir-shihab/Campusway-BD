import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import {
  getTriggers,
  upsertTrigger,
  bulkUpdateTriggers,
  type TriggerConfig,
  type TriggersResponse,
} from '../../../api/adminTriggerApi';
import {
  Bell, Save, Loader2, CheckCircle2,
  Mail, Smartphone, Users, Shield,
  Zap, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Constants ────────────────────────────────────── */

const KNOWN_TRIGGERS: { key: string; label: string; labelBn: string; description: string }[] = [
  { key: 'account_created',       label: 'Account Created',        labelBn: 'অ্যাকাউন্ট তৈরি',          description: 'New student onboarding — sends login credentials' },
  { key: 'credentials_sent',      label: 'Credentials Resend',     labelBn: 'ক্রেডেনশিয়াল পুনঃপাঠান',   description: 'Resend username & password to student' },
  { key: 'password_reset',        label: 'Password Reset',         labelBn: 'পাসওয়ার্ড রিসেট',          description: 'Auto-notify after password change' },
  { key: 'result_published',      label: 'Result Published',       labelBn: 'ফলাফল প্রকাশ',             description: 'Exam result notification' },
  { key: 'subscription_expired',  label: 'Subscription Expired',   labelBn: 'সাবস্ক্রিপশন মেয়াদ শেষ',   description: 'Sent when subscription lapses' },
  { key: 'payment_verified',      label: 'Payment Verified',       labelBn: 'পেমেন্ট যাচাই',            description: 'Payment confirmation to student' },
  { key: 'exam_attempted',        label: 'Exam Attempted',         labelBn: 'পরীক্ষা দেওয়া হয়েছে',     description: 'Notify on exam submission' },
  { key: 'guardian_updated',      label: 'Guardian Updated',       labelBn: 'অভিভাবক আপডেট',           description: 'Guardian info change notification' },
];
const inp = (extra = '') =>
  `w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 ${extra}`;

/* ─── Main Page ───────────────────────────────────── */

export default function NotificationTriggersPage() {
  return (
    <AdminGuardShell
      requiredModule="notifications"
      title="Auto-Notification Triggers"
      description="অটো-নোটিফিকেশন ট্রিগার ম্যানেজ করুন — ইভেন্ট অনুযায়ী SMS/Email স্বয়ংক্রিয়ভাবে পাঠানো হবে"
    >
      <TriggersConsole />
    </AdminGuardShell>
  );
}

/* ─── Console ─────────────────────────────────────── */

function TriggersConsole() {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<TriggersResponse>({
    queryKey: ['admin', 'notification-triggers'],
    queryFn: getTriggers,
  });

  const [localTriggers, setLocalTriggers] = useState<TriggerConfig[]>([]);
  const [resultAutoSend, setResultAutoSend] = useState(false);
  const [resultChannels, setResultChannels] = useState<('sms' | 'email')[]>([]);
  const [resultGuardian, setResultGuardian] = useState(false);
  const [reminderDays, setReminderDays] = useState('7, 3, 1');
  const [dirty, setDirty] = useState(false);

  // Hydrate local state from API data
  const hydrated = useState(false);
  if (data && !hydrated[0]) {
    hydrated[1](true);
    // Merge known triggers with any from the server
    const serverMap = new Map(data.triggers.map(t => [t.triggerKey, t]));
    const merged = KNOWN_TRIGGERS.map(kt => {
      const existing = serverMap.get(kt.key);
      return existing ?? { triggerKey: kt.key, enabled: false, channels: ['sms'] as ('sms' | 'email')[], guardianIncluded: false };
    });
    // Include any server triggers that are not in KNOWN_TRIGGERS
    data.triggers.forEach(t => {
      if (!KNOWN_TRIGGERS.find(k => k.key === t.triggerKey)) merged.push(t);
    });
    setLocalTriggers(merged);
    setResultAutoSend(data.resultPublishAutoSend);
    setResultChannels(data.resultPublishChannels);
    setResultGuardian(data.resultPublishGuardianIncluded);
    setReminderDays((data.subscriptionReminderDays ?? [7, 3, 1]).join(', '));
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const days = reminderDays
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(d => d > 0 && d <= 90);
      return bulkUpdateTriggers({
        triggers: localTriggers,
        resultPublishAutoSend: resultAutoSend,
        resultPublishChannels: resultChannels,
        resultPublishGuardianIncluded: resultGuardian,
        subscriptionReminderDays: days,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notification-triggers'] });
      setDirty(false);
      toast.success('Triggers saved');
    },
    onError: () => toast.error('Failed to save triggers'),
  });

  const toggleSingle = useMutation({
    mutationFn: (args: { key: string; enabled: boolean }) =>
      upsertTrigger(args.key, {
        enabled: args.enabled,
        channels: localTriggers.find(t => t.triggerKey === args.key)?.channels ?? ['sms'],
        guardianIncluded: localTriggers.find(t => t.triggerKey === args.key)?.guardianIncluded ?? false,
      }),
    onSuccess: (_d, args) => {
      setLocalTriggers(prev => prev.map(t => t.triggerKey === args.key ? { ...t, enabled: args.enabled } : t));
      qc.invalidateQueries({ queryKey: ['admin', 'notification-triggers'] });
      toast.success(args.enabled ? 'Trigger enabled' : 'Trigger disabled');
    },
    onError: () => toast.error('Failed to update trigger'),
  });

  /* helpers */
  const updateTrigger = (key: string, patch: Partial<TriggerConfig>) => {
    setLocalTriggers(prev => prev.map(t => t.triggerKey === key ? { ...t, ...patch } : t));
    setDirty(true);
  };

  const toggleChannel = (key: string, ch: 'sms' | 'email') => {
    setLocalTriggers(prev =>
      prev.map(t => {
        if (t.triggerKey !== key) return t;
        const has = t.channels.includes(ch);
        const next = has ? t.channels.filter(c => c !== ch) : [...t.channels, ch];
        return { ...t, channels: next.length > 0 ? next : [ch] };
      }),
    );
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        <AlertTriangle className="inline h-4 w-4 mr-1" />
        ট্রিগার কনফিগ লোড করা যায়নি।
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header bar ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Zap className="h-4 w-4 text-amber-500" />
          <span>{localTriggers.filter(t => t.enabled).length}/{localTriggers.length} active</span>
        </div>
        <button
          onClick={() => saveMut.mutate()}
          disabled={!dirty || saveMut.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          সব সেভ করুন
        </button>
      </div>

      {/* ── Trigger cards ──────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {localTriggers.map(trigger => {
          const meta = KNOWN_TRIGGERS.find(k => k.key === trigger.triggerKey);
          return (
            <TriggerCard
              key={trigger.triggerKey}
              trigger={trigger}
              label={meta?.label ?? trigger.triggerKey}
              labelBn={meta?.labelBn}
              description={meta?.description}
              onToggleEnabled={() => toggleSingle.mutate({ key: trigger.triggerKey, enabled: !trigger.enabled })}
              onToggleChannel={(ch) => toggleChannel(trigger.triggerKey, ch)}
              onToggleGuardian={() => updateTrigger(trigger.triggerKey, { guardianIncluded: !trigger.guardianIncluded })}
              toggling={toggleSingle.isPending}
            />
          );
        })}
      </div>

      {/* ── Global settings ────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-500" />
          Global Trigger Settings
        </h3>

        {/* Result publish */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={resultAutoSend}
              onChange={() => { setResultAutoSend(v => !v); setDirty(true); }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Result Publish Auto-Send
          </label>
          {resultAutoSend && (
            <>
              <ChannelPill active={resultChannels.includes('sms')} ch="sms" onClick={() => { setResultChannels(v => v.includes('sms') ? v.filter(c => c !== 'sms') : [...v, 'sms']); setDirty(true); }} />
              <ChannelPill active={resultChannels.includes('email')} ch="email" onClick={() => { setResultChannels(v => v.includes('email') ? v.filter(c => c !== 'email') : [...v, 'email']); setDirty(true); }} />
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resultGuardian}
                  onChange={() => { setResultGuardian(v => !v); setDirty(true); }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                />
                <Users className="h-3.5 w-3.5" /> অভিভাবক
              </label>
            </>
          )}
        </div>

        {/* Subscription reminder days */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Subscription Reminder Days (comma-separated)
          </label>
          <input
            type="text"
            value={reminderDays}
            onChange={e => { setReminderDays(e.target.value); setDirty(true); }}
            className={inp('max-w-xs')}
            placeholder="7, 3, 1"
          />
          <p className="text-[11px] text-slate-400">মেয়াদ শেষ হওয়ার কত দিন আগে রিমাইন্ডার পাঠানো হবে</p>
        </div>

        {/* Finance sync note */}
        {data?.autoSyncCostToFinance && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Finance sync enabled — all auto-notification costs are tracked automatically
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Trigger Card ────────────────────────────────── */

function TriggerCard({
  trigger,
  label,
  labelBn,
  description,
  onToggleEnabled,
  onToggleChannel,
  onToggleGuardian,
  toggling,
}: {
  trigger: TriggerConfig;
  label: string;
  labelBn?: string;
  description?: string;
  onToggleEnabled: () => void;
  onToggleChannel: (ch: 'sms' | 'email') => void;
  onToggleGuardian: () => void;
  toggling: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${trigger.enabled ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-900/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 opacity-70'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bell className={`h-4 w-4 flex-shrink-0 ${trigger.enabled ? 'text-indigo-500' : 'text-slate-400'}`} />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{label}</span>
          </div>
          {labelBn && <p className="text-[11px] text-slate-400 mt-0.5 pl-6">{labelBn}</p>}
          {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-6">{description}</p>}
        </div>
        {/* Toggle switch */}
        <button
          onClick={onToggleEnabled}
          disabled={toggling}
          aria-label={trigger.enabled ? 'Disable trigger' : 'Enable trigger'}
          className={`relative flex-shrink-0 h-6 w-11 rounded-full transition-colors ${trigger.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'} disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${trigger.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Controls (only when enabled) */}
      {trigger.enabled && (
        <div className="flex flex-wrap items-center gap-3 pl-6">
          <ChannelPill active={trigger.channels.includes('sms')} ch="sms" onClick={() => onToggleChannel('sms')} />
          <ChannelPill active={trigger.channels.includes('email')} ch="email" onClick={() => onToggleChannel('email')} />
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={trigger.guardianIncluded}
              onChange={onToggleGuardian}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Users className="h-3.5 w-3.5" />
            অভিভাবক
          </label>
        </div>
      )}
    </div>
  );
}

/* ─── Channel Pill ────────────────────────────────── */

function ChannelPill({ active, ch, onClick }: { active: boolean; ch: 'sms' | 'email'; onClick: () => void }) {
  const Icon = ch === 'sms' ? Smartphone : Mail;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${active ? (ch === 'sms' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400') : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {ch.toUpperCase()}
    </button>
  );
}
