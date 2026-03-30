import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  getProviders, createProvider, updateProvider, deleteProvider, testProvider,
  getNotificationLogs, sendNotification,
  getStudentGroups,
} from '../../../api/adminStudentApi';
import { promptForSensitiveActionProof } from '../../../utils/sensitiveAction';

type Toast = { show: boolean; message: string; type: 'success' | 'error' };
type CenterTab = 'send' | 'templates' | 'providers' | 'logs';
type WizardStep = 1 | 2 | 3;

interface ProviderForm {
  name: string; type: 'sms' | 'email'; provider: string;
  credentials: Record<string, string>; fromName: string;
  rateLimitPerMin: string; rateLimitPerDay: string;
}

const PROVIDER_OPTIONS: Record<string, string[]> = {
  sms: ['local_bd_rest', 'twilio', 'custom'],
  email: ['sendgrid', 'smtp', 'custom'],
};

const PROVIDER_CRED_FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
  local_bd_rest: [
    { key: 'apiUrl', label: 'API URL' },
    { key: 'apiKey', label: 'API Key' },
    { key: 'senderId', label: 'Sender ID' },
  ],
  twilio: [
    { key: 'accountSid', label: 'Account SID' },
    { key: 'authToken', label: 'Auth Token', type: 'password' },
    { key: 'fromNumber', label: 'From Number' },
  ],
  smtp: [
    { key: 'host', label: 'Host' },
    { key: 'port', label: 'Port' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'fromEmail', label: 'From Email' },
  ],
  sendgrid: [
    { key: 'apiKey', label: 'API Key', type: 'password' },
    { key: 'fromEmail', label: 'From Email' },
  ],
  custom: [
    { key: 'apiUrl', label: 'API URL' },
    { key: 'apiKey', label: 'API Key', type: 'password' },
  ],
};

const EMPTY_PROVIDER: ProviderForm = { name: '', type: 'sms', provider: 'local_bd_rest', credentials: {}, fromName: '', rateLimitPerMin: '60', rateLimitPerDay: '1000' };
const EMPTY_TEMPLATE = { key: '', channel: 'sms', subject: '', body: '', enabled: true };

const STATUS_BADGE: Record<string, string> = {
  sent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  queued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};


function inp(extra = '') {
  return `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra}`;
}

function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function NotificationCenterPage({ noShell }: { noShell?: boolean } = {}) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<CenterTab>('send');
  const [toast, setToast] = useState<Toast>({ show: false, message: '', type: 'success' });

  // Send wizard
  const [step, setStep] = useState<WizardStep>(1);
  const [targetType, setTargetType] = useState<'single' | 'ids' | 'group' | 'filter'>('single');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [targetIds, setTargetIds] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [filterQ, setFilterQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [channel, setChannel] = useState<'sms' | 'email' | 'both'>('sms');
  const [templateId, setTemplateId] = useState('');
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduleDate, setScheduleDate] = useState('');
  const [sendResult, setSendResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Templates
  const [tplModal, setTplModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [tplForm, setTplForm] = useState({ ...EMPTY_TEMPLATE });

  // Providers
  const [pvModal, setPvModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [pvForm, setPvForm] = useState<ProviderForm>({ ...EMPTY_PROVIDER });
  const [pvTestId, setPvTestId] = useState('');
  const [pvTestStudentId, setPvTestStudentId] = useState('');

  // Logs
  const [logStatusFilter, setLogStatusFilter] = useState('');
  const [logPage, setLogPage] = useState(1);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
  };

  const { data: templatesData } = useQuery({ queryKey: ['admin-templates'], queryFn: getTemplates });
  const { data: providersData } = useQuery({ queryKey: ['admin-providers'], queryFn: getProviders });
  const { data: logsData } = useQuery({
    queryKey: ['admin-noti-logs', logStatusFilter, logPage],
    queryFn: () => getNotificationLogs({ status: logStatusFilter || undefined, page: logPage }),
    enabled: activeTab === 'logs',
  });
  const { data: groupsData } = useQuery({
    queryKey: ['admin-student-groups'],
    queryFn: () => getStudentGroups(),
    enabled: targetType === 'group',
  });

  const templates: Record<string, unknown>[] = (templatesData as { templates?: Record<string, unknown>[] })?.templates ?? (Array.isArray(templatesData) ? templatesData : []);
  const providers: Record<string, unknown>[] = (providersData as { providers?: Record<string, unknown>[] })?.providers ?? (Array.isArray(providersData) ? providersData : []);
  const logs: Record<string, unknown>[] = (logsData as { logs?: Record<string, unknown>[] })?.logs ?? [];
  const groups: Record<string, unknown>[] = (groupsData as { groups?: Record<string, unknown>[] })?.groups ?? (Array.isArray(groupsData) ? groupsData : []);
  const selectedTemplate = templates.find(t => t._id === templateId);

  const handleSend = async () => {
    const payload: Record<string, unknown> = { channel, templateId, scheduleNow, scheduleDate: scheduleNow ? undefined : scheduleDate };
    if (targetType === 'single') payload.studentIds = [targetStudentId];
    else if (targetType === 'ids') payload.studentIds = targetIds.split(/[\s,]+/).filter(Boolean);
    else if (targetType === 'group') payload.groupId = targetGroupId;
    else payload.filter = { q: filterQ, status: filterStatus };
    try {
      const res = await sendNotification(payload);
      setSendResult({ success: true, message: `Notification queued. Job ID: ${(res as Record<string, unknown>)?.jobId || 'OK'}` });
      showToast('Notification sent');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed';
      setSendResult({ success: false, message: msg });
      showToast('Send failed', 'error');
    }
  };

  // Template CRUD
  const handleTplSave = async () => {
    try {
      if (tplModal.editId) await updateTemplate(tplModal.editId, tplForm as Record<string, unknown>);
      else await createTemplate(tplForm as Record<string, unknown>);
      qc.invalidateQueries({ queryKey: ['admin-templates'] });
      setTplModal({ open: false });
      showToast(tplModal.editId ? 'Template updated' : 'Template created');
    } catch { showToast('Failed to save template', 'error'); }
  };
  const handleTplDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try { await deleteTemplate(id); qc.invalidateQueries({ queryKey: ['admin-templates'] }); showToast('Template deleted'); }
    catch { showToast('Failed', 'error'); }
  };

  // Provider CRUD
  const handlePvSave = async () => {
    const payload = {
      name: pvForm.name, type: pvForm.type, provider: pvForm.provider,
      credentials: pvForm.credentials, fromName: pvForm.fromName,
      rateLimit: { perMin: parseInt(pvForm.rateLimitPerMin), perDay: parseInt(pvForm.rateLimitPerDay) },
    };
    try {
      const proof = await promptForSensitiveActionProof({
        actionLabel: pvModal.editId ? 'update notification provider' : 'create notification provider',
        defaultReason: pvModal.editId ? `Update provider ${pvModal.editId}` : 'Create notification provider',
        requireOtpHint: true,
      });
      if (!proof) return;
      if (pvModal.editId) await updateProvider(pvModal.editId, payload as Record<string, unknown>, proof);
      else await createProvider(payload as Record<string, unknown>, proof);
      qc.invalidateQueries({ queryKey: ['admin-providers'] });
      setPvModal({ open: false });
      showToast(pvModal.editId ? 'Provider updated' : 'Provider created');
    } catch { showToast('Failed to save provider', 'error'); }
  };
  const handlePvDelete = async (id: string) => {
    if (!confirm('Delete this provider?')) return;
    try {
      const proof = await promptForSensitiveActionProof({
        actionLabel: 'delete notification provider',
        defaultReason: `Delete provider ${id}`,
        requireOtpHint: true,
      });
      if (!proof) return;
      await deleteProvider(id, proof);
      qc.invalidateQueries({ queryKey: ['admin-providers'] });
      showToast('Provider deleted');
    }
    catch { showToast('Failed', 'error'); }
  };
  const handlePvTest = async () => {
    try { await testProvider(pvTestId, pvTestStudentId); showToast('Test sent'); }
    catch { showToast('Test failed', 'error'); }
    setPvTestStudentId(''); setPvTestId('');
  };

  const openEditTpl = (t: Record<string, unknown>) => {
    setTplForm({ key: t.key as string, channel: t.channel as string, subject: (t.subject as string) ?? '', body: t.body as string, enabled: (t.enabled as boolean) ?? true });
    setTplModal({ open: true, editId: t._id as string });
  };

  const openEditPv = (p: Record<string, unknown>) => {
    setPvForm({
      name: p.name as string, type: p.type as 'sms' | 'email',
      provider: p.provider as string, credentials: (p.credentials as Record<string, string>) ?? {},
      fromName: (p.fromName as string) ?? '',
      rateLimitPerMin: String((p.rateLimit as Record<string, number>)?.perMin ?? 60),
      rateLimitPerDay: String((p.rateLimit as Record<string, number>)?.perDay ?? 1000),
    });
    setPvModal({ open: true, editId: p._id as string });
  };

  const credFields = PROVIDER_CRED_FIELDS[pvForm.provider] || [];

  const TABS: { key: CenterTab; label: string }[] = [
    { key: 'send', label: 'Send' },
    { key: 'templates', label: 'Templates' },
    { key: 'providers', label: 'Providers' },
    { key: 'logs', label: 'Logs' },
  ];

  const Wrapper = noShell ? ({ children }: { children: React.ReactNode }) => <div className="space-y-6">{children}</div> : ({ children }: { children: React.ReactNode }) => <AdminGuardShell title="Notification Center" description="Send, schedule, and track notifications" requiredModule="notifications">{children}</AdminGuardShell>;

  return (
    <Wrapper>
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white shadow-lg text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.message}</div>
      )}

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex gap-1">
          {TABS.map(t => (
            <div key={t.key} className="flex items-center gap-1">
              <button onClick={() => setActiveTab(t.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                {t.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">

        {/* === SEND TAB === */}
        {activeTab === 'send' && (
          <div className="max-w-2xl space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>{s}</div>
                  {s < 3 && <div className={`h-0.5 w-12 ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                </div>
              ))}
              <span className="ml-2 text-sm text-gray-500">{['Target', 'Message', 'Schedule'][step - 1]}</span>
            </div>

            {/* Step 1: Target */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Select Target</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['single', 'ids', 'group', 'filter'] as const).map(t => (
                    <label key={t} className={`flex flex-col items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-colors ${targetType === t ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                      <input type="radio" name="targetType" value={t} checked={targetType === t} onChange={() => setTargetType(t)} className="sr-only" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{t === 'ids' ? 'ID List' : t === 'group' ? 'Group' : t === 'filter' ? 'Filter' : 'Single'}</span>
                    </label>
                  ))}
                </div>
                {targetType === 'single' && <div><label className="block text-xs text-gray-500 mb-1">Student ID</label><input value={targetStudentId} onChange={e => setTargetStudentId(e.target.value)} className={inp()} placeholder="Student ID or user ID" /></div>}
                {targetType === 'ids' && <div><label className="block text-xs text-gray-500 mb-1">IDs (comma or newline separated)</label><textarea value={targetIds} onChange={e => setTargetIds(e.target.value)} className={inp() + ' h-24 resize-none'} placeholder="id1, id2, id3..." /></div>}
                {targetType === 'group' && (
                  <div><label className="block text-xs text-gray-500 mb-1">Select Group</label>
                    <select value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)} className={inp()}>
                      <option value="">Select a group...</option>
                      {groups.map(g => <option key={g._id as string} value={g._id as string}>{g.name as string} ({(g.memberCount as number) ?? 0} members)</option>)}
                    </select>
                  </div>
                )}
                {targetType === 'filter' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Search query</label><input value={filterQ} onChange={e => setFilterQ(e.target.value)} className={inp()} placeholder="name, phone..." /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Status</label>
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inp()}>
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => setStep(2)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Next &rarr;</button>
                </div>
              </div>
            )}

            {/* Step 2: Template + Channel */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Message</h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Channel</label>
                  <div className="flex gap-3">
                    {(['sms', 'email', 'both'] as const).map(c => (
                      <label key={c} className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${channel === c ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <input type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} className="accent-blue-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Template</label>
                  <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={inp()}>
                    <option value="">Select template...</option>
                    {templates.map(t => <option key={t._id as string} value={t._id as string}>{t.key as string} — {t.channel as string}</option>)}
                  </select>
                </div>
                {selectedTemplate && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Preview</p>
                    {(selectedTemplate.subject as string | undefined) && <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{selectedTemplate.subject as string}</p>}
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{selectedTemplate.body as string}</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">&larr; Back</button>
                  <button onClick={() => setStep(3)} disabled={!templateId} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">Next &rarr;</button>
                </div>
              </div>
            )}

            {/* Step 3: Schedule + Send */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Schedule &amp; Send</h3>
                <div className="flex flex-col gap-3">
                  <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer ${scheduleNow ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <input type="radio" checked={scheduleNow} onChange={() => setScheduleNow(true)} className="accent-blue-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Send Immediately</span>
                  </label>
                  <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer ${!scheduleNow ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <input type="radio" checked={!scheduleNow} onChange={() => setScheduleNow(false)} className="accent-blue-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Schedule for later</span>
                  </label>
                </div>
                {!scheduleNow && (
                  <div><label className="block text-xs text-gray-500 mb-1">Schedule Date &amp; Time</label>
                    <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className={inp()} />
                  </div>
                )}
                {sendResult && (
                  <div className={`p-3 rounded-lg text-sm ${sendResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700'}`}>
                    {sendResult.message}
                  </div>
                )}
                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">&larr; Back</button>
                  <button onClick={handleSend} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Send Notification</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === TEMPLATES TAB === */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setTplForm({ ...EMPTY_TEMPLATE }); setTplModal({ open: true }); }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New Template</button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>{['Key', 'Channel', 'Subject', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {templates.map((t: Record<string, unknown>) => (
                    <tr key={t._id as string} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{t.key as string}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full capitalize ${t.channel === 'sms' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{t.channel as string}</span></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px] truncate">{(t.subject as string) || <span className="italic text-gray-400">—</span>}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${t.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{t.enabled ? 'Active' : 'Disabled'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEditTpl(t)} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200">Edit</button>
                          <button onClick={() => handleTplDelete(t._id as string)} className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {templates.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No templates yet.</div>}
            </div>
          </div>
        )}

        {/* === PROVIDERS TAB === */}
        {activeTab === 'providers' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setPvForm({ ...EMPTY_PROVIDER }); setPvModal({ open: true }); }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add Provider</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((p: Record<string, unknown>) => (
                <div key={p._id as string} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{p.name as string}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${p.type === 'sms' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{p.type as string}</span>
                        <span className="text-xs text-gray-500">{p.provider as string}</span>
                      </div>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 ${p.isActive ? 'bg-green-500' : 'bg-red-400'}`} title={p.isActive ? 'Active' : 'Inactive'} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setPvTestId(p._id as string); setPvTestStudentId(''); }} className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-50">Test Send</button>
                    <button onClick={() => openEditPv(p)} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200">Edit</button>
                    <button onClick={() => handlePvDelete(p._id as string)} className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200">Delete</button>
                  </div>
                  {pvTestId === p._id && (
                    <div className="flex gap-2">
                      <input value={pvTestStudentId} onChange={e => setPvTestStudentId(e.target.value)} className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="Student ID for test" />
                      <button onClick={handlePvTest} disabled={!pvTestStudentId} className="px-2 py-1.5 text-xs bg-green-600 text-white rounded-lg disabled:opacity-40">Send</button>
                      <button onClick={() => setPvTestId('')} className="px-2 py-1.5 text-xs text-gray-500">&times;</button>
                    </div>
                  )}
                </div>
              ))}
              {providers.length === 0 && <div className="col-span-3 p-8 text-center text-sm text-gray-400">No providers configured.</div>}
            </div>
          </div>
        )}

        {/* === LOGS TAB === */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <select value={logStatusFilter} onChange={e => { setLogStatusFilter(e.target.value); setLogPage(1); }}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>{['Date', 'Student ID', 'Channel', 'Provider', 'Status', 'Message ID'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {logs.map((log: Record<string, unknown>, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-xs text-gray-500">{log.createdAt ? new Date(log.createdAt as string).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400">{log.studentId as string}</td>
                      <td className="px-4 py-3 text-xs capitalize text-gray-700 dark:text-gray-300">{log.channel as string}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{log.provider as string}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGE[(log.status as string)] ?? STATUS_BADGE.pending}`}>{log.status as string}</span></td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400 max-w-[120px] truncate">{(log.messageId as string) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No logs found.</div>}
            </div>
            <div className="flex justify-end gap-2">
              <button disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 text-gray-700 dark:text-gray-300">Prev</button>
              <button onClick={() => setLogPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      <Modal open={tplModal.open} onClose={() => setTplModal({ open: false })} title={tplModal.editId ? 'Edit Template' : 'New Template'}>
        <div className="space-y-3">
          <div><label className="block text-xs text-gray-500 mb-1">Key (unique identifier) *</label><input value={tplForm.key} onChange={e => setTplForm(f => ({ ...f, key: e.target.value }))} className={inp()} placeholder="e.g. sub_expiry_reminder" /></div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Channel</label>
            <select value={tplForm.channel} onChange={e => setTplForm(f => ({ ...f, channel: e.target.value }))} className={inp()}>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="both">Both</option>
            </select>
          </div>
          {(tplForm.channel === 'email' || tplForm.channel === 'both') && (
            <div><label className="block text-xs text-gray-500 mb-1">Subject</label><input value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} className={inp()} placeholder="Email subject" /></div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Body *</label>
            <textarea value={tplForm.body} onChange={e => setTplForm(f => ({ ...f, body: e.target.value }))} className={inp() + ' h-28 resize-none'} placeholder="Message body. Use {{name}}, {{expiresAt}}, {{planName}}" />
            <p className="text-xs text-gray-400 mt-1">Available: &#123;&#123;name&#125;&#125; &#123;&#123;phone&#125;&#125; &#123;&#123;planName&#125;&#125; &#123;&#123;expiresAt&#125;&#125; &#123;&#123;daysLeft&#125;&#125;</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
            <Toggle value={tplForm.enabled} onChange={v => setTplForm(f => ({ ...f, enabled: v }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setTplModal({ open: false })} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={handleTplSave} disabled={!tplForm.key || !tplForm.body} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40">Save</button>
          </div>
        </div>
      </Modal>

      {/* Provider Modal */}
      <Modal open={pvModal.open} onClose={() => setPvModal({ open: false })} title={pvModal.editId ? 'Edit Provider' : 'Add Provider'} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Provider Name *</label>
              <input value={pvForm.name} onChange={e => setPvForm(f => ({ ...f, name: e.target.value }))} className={inp()} placeholder="e.g. Main SMS Gateway" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={pvForm.type} onChange={e => { const t = e.target.value as 'sms' | 'email'; setPvForm(f => ({ ...f, type: t, provider: PROVIDER_OPTIONS[t][0], credentials: {} })); }} className={inp()}>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Provider</label>
              <select value={pvForm.provider} onChange={e => setPvForm(f => ({ ...f, provider: e.target.value, credentials: {} }))} className={inp()}>
                {(PROVIDER_OPTIONS[pvForm.type] || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From Name</label>
              <input value={pvForm.fromName} onChange={e => setPvForm(f => ({ ...f, fromName: e.target.value }))} className={inp()} placeholder="e.g. CampusWay" />
            </div>
          </div>
          {credFields.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Credentials</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {credFields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                    <input type={f.type || 'text'} value={pvForm.credentials[f.key] ?? ''} onChange={e => setPvForm(p => ({ ...p, credentials: { ...p.credentials, [f.key]: e.target.value } }))} className={inp()} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Rate Limit / min</label><input type="number" value={pvForm.rateLimitPerMin} onChange={e => setPvForm(f => ({ ...f, rateLimitPerMin: e.target.value }))} className={inp()} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Rate Limit / day</label><input type="number" value={pvForm.rateLimitPerDay} onChange={e => setPvForm(f => ({ ...f, rateLimitPerDay: e.target.value }))} className={inp()} /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setPvModal({ open: false })} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={handlePvSave} disabled={!pvForm.name} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-40">Save Provider</button>
          </div>
        </div>
      </Modal>
    </Wrapper>
  );
}
