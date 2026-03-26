import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import { getStudentSettings, updateStudentSettings } from '../../../api/adminStudentApi';

type Toast = { show: boolean; message: string; type: 'success' | 'error' };

interface Settings {
  autoExpireEnabled: boolean;
  passwordResetOnExpiry: boolean;
  reminderDays: number[];
  smsEnabled: boolean;
  emailEnabled: boolean;
  onNewsPublished: boolean;
  onExamPublished: boolean;
  onResourcePublished: boolean;
  defaultSmsFromName: string;
  defaultEmailFromName: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_SETTINGS: Settings = {
  autoExpireEnabled: true,
  passwordResetOnExpiry: false,
  reminderDays: [7, 3, 1],
  smsEnabled: true,
  emailEnabled: true,
  onNewsPublished: false,
  onExamPublished: false,
  onResourcePublished: false,
  defaultSmsFromName: 'CampusWay',
  defaultEmailFromName: 'CampusWay',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button type="button" onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-1">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">{title}</h3>
      {children}
    </div>
  );
}

export default function StudentSettingsPage({ noShell }: { noShell?: boolean } = {}) {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>({ show: false, message: '', type: 'success' });
  const [newDay, setNewDay] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-student-settings'],
    queryFn: getStudentSettings,
  });

  useEffect(() => {
    if (data) {
      const d = data as Partial<Settings>;
      setSettings(prev => ({
        ...prev,
        autoExpireEnabled: d.autoExpireEnabled ?? prev.autoExpireEnabled,
        passwordResetOnExpiry: d.passwordResetOnExpiry ?? prev.passwordResetOnExpiry,
        reminderDays: d.reminderDays ?? prev.reminderDays,
        smsEnabled: d.smsEnabled ?? prev.smsEnabled,
        emailEnabled: d.emailEnabled ?? prev.emailEnabled,
        onNewsPublished: d.onNewsPublished ?? prev.onNewsPublished,
        onExamPublished: d.onExamPublished ?? prev.onExamPublished,
        onResourcePublished: d.onResourcePublished ?? prev.onResourcePublished,
        defaultSmsFromName: d.defaultSmsFromName ?? prev.defaultSmsFromName,
        defaultEmailFromName: d.defaultEmailFromName ?? prev.defaultEmailFromName,
        quietHoursStart: d.quietHoursStart ?? prev.quietHoursStart,
        quietHoursEnd: d.quietHoursEnd ?? prev.quietHoursEnd,
      }));
      setDirty(false);
    }
  }, [data]);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
  };

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
    setDirty(true);
  };

  const addReminderDay = () => {
    const n = parseInt(newDay);
    if (!n || n < 1 || settings.reminderDays.includes(n)) { setNewDay(''); return; }
    set('reminderDays', [...settings.reminderDays, n].sort((a, b) => b - a));
    setNewDay('');
  };

  const removeReminderDay = (day: number) => {
    set('reminderDays', settings.reminderDays.filter(d => d !== day));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStudentSettings(settings as unknown as Record<string, unknown>);
      qc.invalidateQueries({ queryKey: ['admin-student-settings'] });
      setDirty(false);
      showToast('Settings saved successfully');
    } catch {
      showToast('Failed to save settings', 'error');
    }
    setSaving(false);
  };

  const inp = 'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const Shell = noShell ? ({ children }: { children: React.ReactNode }) => <div className="space-y-6">{children}</div> : ({ children }: { children: React.ReactNode }) => <AdminGuardShell title="Student Settings" description="Configure automation, notifications and expiry rules">{children}</AdminGuardShell>;

  if (isLoading) return (
    <Shell>
      <div className="p-6 space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
    </Shell>
  );

  return (
    <Shell>
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white shadow-lg text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="p-6 max-w-2xl space-y-5">

        {/* Automation */}
        <Section title="Automation">
          <Toggle
            value={settings.autoExpireEnabled}
            onChange={v => set('autoExpireEnabled', v)}
            label="Auto-expire subscriptions when due date passes"
          />
          <Toggle
            value={settings.passwordResetOnExpiry}
            onChange={v => set('passwordResetOnExpiry', v)}
            label="Require password reset on subscription expiry"
          />
        </Section>

        {/* Reminder Schedule */}
        <Section title="Reminder Schedule">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Send reminders this many days before expiry:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {settings.reminderDays.map(day => (
              <div key={day} className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                <span>{day}d</span>
                <button onClick={() => removeReminderDay(day)} className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 leading-none ml-0.5 text-base">&times;</button>
              </div>
            ))}
            {settings.reminderDays.length === 0 && (
              <span className="text-xs text-gray-400 italic">No reminder days set</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={newDay}
              onChange={e => setNewDay(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addReminderDay()}
              placeholder="Days (e.g. 5)"
              className={inp + ' w-32'}
              min="1"
              max="365"
            />
            <button onClick={addReminderDay} disabled={!newDay} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
              Add
            </button>
          </div>
        </Section>

        {/* Notification Channels */}
        <Section title="Notification Channels">
          <Toggle
            value={settings.smsEnabled}
            onChange={v => set('smsEnabled', v)}
            label="SMS notifications enabled"
          />
          <Toggle
            value={settings.emailEnabled}
            onChange={v => set('emailEnabled', v)}
            label="Email notifications enabled"
          />
        </Section>

        {/* Auto-Alert Triggers */}
        <Section title="Auto-Alert Triggers">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Automatically notify students when:</p>
          <Toggle
            value={settings.onNewsPublished}
            onChange={v => set('onNewsPublished', v)}
            label="A new news article is published"
          />
          <Toggle
            value={settings.onExamPublished}
            onChange={v => set('onExamPublished', v)}
            label="A new exam is published"
          />
          <Toggle
            value={settings.onResourcePublished}
            onChange={v => set('onResourcePublished', v)}
            label="A new resource is published"
          />
        </Section>

        {/* Sender Names */}
        <Section title="Sender Names">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Default SMS From Name</label>
              <input
                type="text"
                value={settings.defaultSmsFromName}
                onChange={e => set('defaultSmsFromName', e.target.value)}
                className={inp + ' w-full'}
                placeholder="e.g. CampusWay"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Default Email From Name</label>
              <input
                type="text"
                value={settings.defaultEmailFromName}
                onChange={e => set('defaultEmailFromName', e.target.value)}
                className={inp + ' w-full'}
                placeholder="e.g. CampusWay"
              />
            </div>
          </div>
        </Section>

        {/* Quiet Hours */}
        <Section title="Quiet Hours">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Notifications will not be sent during quiet hours.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Quiet Hours Start</label>
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={e => set('quietHoursStart', e.target.value)}
                className={inp + ' w-full'}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Quiet Hours End</label>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={e => set('quietHoursEnd', e.target.value)}
                className={inp + ' w-full'}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Currently: {settings.quietHoursStart} &rarr; {settings.quietHoursEnd} (local server time)
          </p>
        </Section>

        {/* Save Button */}
        <div className="flex items-center gap-4 pt-2 pb-6">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {dirty && !saving && (
            <span className="text-xs text-amber-600 dark:text-amber-400">You have unsaved changes</span>
          )}
          {!dirty && !saving && (
            <span className="text-xs text-gray-400 dark:text-gray-500">All changes saved</span>
          )}
        </div>
      </div>
    </Shell>
  );
}
