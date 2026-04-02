import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import ProvidersPanel from './ProvidersPanel';
import NotificationOperationsPanel from './NotificationOperationsPanel';
import SmartTriggersPanel from './SmartTriggersPanel';
import { ADMIN_PATHS } from '../../../routes/adminPaths';
import {
  listCampaigns, getCampaign, previewCampaign, sendCampaign, retryCampaign,
  getDeliveryLogs, listTemplates, createTemplate, updateTemplate,
  getNotificationSettings, updateNotificationSettings, getCampaignDashboardSummary,
  type CampaignListItem, type CampaignDetail, type CampaignPreview,
  type DeliveryLog, type NotificationTemplate, type NotificationSettings, type CampaignDashboardSummary,
} from '../../../api/adminNotificationCampaignApi';
import { getStudentGroups } from '../../../api/adminStudentApi';

type Tab = 'dashboard' | 'campaigns' | 'new' | 'audiences' | 'contact' | 'templates' | 'providers' | 'triggers' | 'notifications' | 'logs' | 'settings';

const CAMPAIGN_TAB_TO_PATH: Record<Tab, string> = {
  dashboard: ADMIN_PATHS.campaignsDashboard,
  campaigns: ADMIN_PATHS.campaignsList,
  new: ADMIN_PATHS.campaignsNew,
  audiences: ADMIN_PATHS.campaignsAudiences,
  contact: ADMIN_PATHS.subscriptionContactCenter,
  templates: ADMIN_PATHS.campaignsTemplates,
  providers: ADMIN_PATHS.campaignsProviders,
  triggers: ADMIN_PATHS.campaignsTriggers,
  notifications: ADMIN_PATHS.campaignsNotifications,
  logs: ADMIN_PATHS.campaignsLogs,
  settings: ADMIN_PATHS.campaignsSettings,
};


const CAMPAIGN_VIEW_BUTTONS: Array<{ tab: Tab; label: string }> = [
  { tab: 'dashboard', label: 'Overview' },
  { tab: 'campaigns', label: 'Campaigns' },
  { tab: 'new', label: 'New Campaign' },
  { tab: 'providers', label: 'Providers' },
  { tab: 'triggers', label: 'Smart Triggers' },
  { tab: 'notifications', label: 'Notifications' },
  { tab: 'logs', label: 'Delivery Logs' },
  { tab: 'settings', label: 'Settings' },
];

function getTabFromPath(pathname: string, search?: string, hash?: string): Tab {
  const normalized = String(pathname || '').trim();
  const params = new URLSearchParams(search || '');
  const view = params.get('view');
  if (view && ['dashboard', 'campaigns', 'new', 'audiences', 'contact', 'templates', 'providers', 'triggers', 'notifications', 'logs', 'settings'].includes(view)) {
    return view as Tab;
  }
  const h = String(hash || '').replace('#', '').toLowerCase();
  if (h === 'providers') return 'providers';
  if (h === 'triggers' || h === 'smart_triggers') return 'triggers';
  if (h === 'export' || h === 'export_copy') return 'contact';
  if (normalized === ADMIN_PATHS.campaignsContactCenter || normalized === ADMIN_PATHS.subscriptionContactCenter) return 'contact';
  const match = (Object.entries(CAMPAIGN_TAB_TO_PATH) as Array<[Tab, string]>)
    .find(([, p]) => normalized === p.split('?')[0].split('#')[0] && !p.includes('?') && !p.includes('#'));
  return match?.[0] ?? 'dashboard';
}

export default function CampaignConsolePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = getTabFromPath(location.pathname, location.search, location.hash);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const qc = useQueryClient();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
  };

  const navigateToTab = (nextTab: Tab) => {
    if (nextTab !== 'campaigns') setSelectedCampaignId(null);
    const rawPath = CAMPAIGN_TAB_TO_PATH[nextTab];
    const [pathnameAndQuery, hash] = rawPath.split('#');
    const [pathname, search] = pathnameAndQuery.split('?');
    navigate({ pathname, search: search ? `?${search}` : '', hash: hash ? '#' + hash : '' });
  };

    return (
        <AdminGuardShell
      title="Communication Hub"
      description="Unified messaging center — campaigns, smart triggers, providers, audience export, and delivery logs."
      requiredModule="notifications"
    >
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
      <CampaignViewNav activeTab={tab} onNavigate={navigateToTab} />
      {tab === 'dashboard' && <DashboardPanel onNavigate={navigateToTab} />}
      {tab === 'campaigns' && <CampaignsListPanel onView={id => { setSelectedCampaignId(id); }} onRetry={id => retryCampaign(id).then(() => { showToast('Retry initiated'); qc.invalidateQueries({ queryKey: ['campaigns'] }); }).catch(() => showToast('Retry failed', 'error'))} />}
      {tab === 'new' && <NewCampaignPanel showToast={showToast} onSent={() => { navigateToTab('campaigns'); qc.invalidateQueries({ queryKey: ['campaigns'] }); }} />}
      {tab === 'audiences' && <Navigate to={`${ADMIN_PATHS.subscriptionContactCenter}?tab=members`} replace />}
      {tab === 'contact' && <Navigate to={`${ADMIN_PATHS.subscriptionContactCenter}?tab=${(location.hash === '#export' || location.hash === '#export_copy') ? 'export' : 'overview'}`} replace />}
      {tab === 'templates' && <TemplatesPanel showToast={showToast} />}
      {tab === 'providers' && <ProvidersPanel showToast={showToast} />}
      {tab === 'triggers' && <SmartTriggersPanel showToast={showToast} />}
      {tab === 'notifications' && <NotificationOperationsPanel onNavigate={navigateToTab} showToast={showToast} />}
      {tab === 'logs' && <LogsPanel />}
      {tab === 'settings' && <SettingsPanel showToast={showToast} />}
      {selectedCampaignId && <CampaignDetailModal id={selectedCampaignId} onClose={() => setSelectedCampaignId(null)} />}
    </AdminGuardShell>
  );
}

/* ─── Dashboard Panel ─────────────────────────────── */
function DashboardPanel({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['campaign-dashboard-summary'], queryFn: getCampaignDashboardSummary });
  const summary = data as CampaignDashboardSummary | undefined;
  const campaignsQuery = useQuery({ queryKey: ['campaigns', { page: 1, limit: 5 }], queryFn: () => listCampaigns({ page: 1, limit: 5 }) });
  const campaigns = (campaignsQuery.data?.items ?? []) as CampaignListItem[];
  const statCards = [
    { label: 'Total Campaigns', value: summary?.totals.totalCampaigns ?? 0, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Scheduled Queue', value: summary?.totals.scheduledCount ?? 0, color: 'from-sky-500 to-cyan-600' },
    { label: 'Failed Today', value: summary?.totals.failedToday ?? 0, color: 'from-rose-500 to-red-600' },
    { label: 'Active Triggers', value: summary?.totals.activeTriggers ?? 0, color: 'from-amber-500 to-orange-600' },
    { label: 'Active Subscribers', value: summary?.audience.activeCount ?? 0, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Renewal Due', value: summary?.audience.renewalDueCount ?? 0, color: 'from-fuchsia-500 to-pink-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {statCards.map(s => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Queue and delivery health</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current orchestration state across campaigns, schedules, triggers, and provider delivery.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Processing</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary?.totals.processingCount ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">Queued: {summary?.totals.queuedCount ?? 0} | Completed: {summary?.totals.completedCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Providers</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary?.totals.activeProviders ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">Failed providers: {summary?.totals.failedProviders ?? 0}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Upcoming scheduled jobs</h4>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(summary?.upcomingJobs ?? []).length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">{isLoading ? 'Loading...' : 'No scheduled jobs queued right now.'}</div>
              ) : (
                (summary?.upcomingJobs ?? []).map((job, index) => (
                  <div key={`${job._id || index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-100">{String(job.campaignName || 'Untitled schedule')}</div>
                      <div className="text-xs text-slate-500">{String(job.channel || 'sms')} | {Number(job.totalTargets || 0)} targets</div>
                    </div>
                    <div className="text-xs text-slate-500">{job.scheduledAtUTC ? new Date(String(job.scheduledAtUTC)).toLocaleString() : '-'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Provider health</h3>
            <div className="mt-4 space-y-3">
              {(summary?.providerHealth ?? []).slice(0, 4).map((provider) => (
                <div key={provider.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{provider.name}</div>
                      <div className="text-xs text-slate-500">{provider.type} | {provider.provider}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${provider.failureRate >= 50 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                      {provider.failureRate}% fail
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent failures</h3>
            <div className="mt-4 space-y-3">
              {(summary?.recentFailures ?? []).slice(0, 4).map((failure, index) => (
                <div key={`${failure._id || index}`} className="rounded-2xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <div className="font-medium text-slate-800 dark:text-slate-100">{String(failure.providerUsed || 'Unknown provider')}</div>
                  <div className="mt-1 text-slate-500">{String(failure.originModule || 'campaign')} | {failure.createdAt ? new Date(String(failure.createdAt)).toLocaleString() : '-'}</div>
                </div>
              ))}
              {(summary?.recentFailures ?? []).length === 0 && <div className="text-sm text-slate-500">No recent failures in the last 7 days.</div>}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onNavigate('new')} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            + New Campaign
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onNavigate('campaigns')} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            View All
          </button>
        </div>
        <button onClick={() => onNavigate('contact')} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          Subscription Contact Center
        </button>
        <button onClick={() => onNavigate('triggers')} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          Manage Triggers
        </button>
      </div>
      {campaigns.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Campaigns</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {campaigns.slice(0, 5).map(c => (
              <div key={c._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.campaignName || 'Untitled'}</p>
                  <p className="text-xs text-slate-500">{c.channelType} · {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : c.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Campaigns List Panel ────────────────────────── */
function CampaignsListPanel({ onView, onRetry }: { onView: (id: string) => void; onRetry: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['campaigns', { page }], queryFn: () => listCampaigns({ page, limit: 20 }) });
  const campaigns = (data?.items ?? []) as CampaignListItem[];
  const total = data?.total ?? campaigns.length;
  const pages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Channel</th>
              <th className="px-5 py-3">Audience</th>
              <th className="px-5 py-3">Sent</th>
              <th className="px-5 py-3">Failed</th>
              <th className="px-5 py-3">Cost</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-400">No campaigns yet</td></tr>
            ) : campaigns.map(c => (
              <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{c.campaignName || 'Untitled'}</td>
                <td className="px-5 py-3">{c.channelType}</td>
                <td className="px-5 py-3">{c.audienceType}</td>
                <td className="px-5 py-3">{c.sentCount ?? 0}</td>
                <td className="px-5 py-3 text-red-600">{c.failedCount ?? 0}</td>
                <td className="px-5 py-3">৳{(c.actualCost ?? c.estimatedCost ?? 0).toFixed(2)}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : c.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onView(c._id)} className="rounded-lg px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20">View</button>
                    </div>
                    {(c.failedCount ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => onRetry(c._id)} className="rounded-lg px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20">Retry</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">Next</button>
        </div>
      )}
    </div>
  );
}

/* ─── New Campaign Panel (Wizard) ─────────────────── */
function NewCampaignPanel({ showToast, onSent }: { showToast: (m: string, t?: 'success' | 'error') => void; onSent: () => void }) {
  const location = useLocation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState({
    campaignName: '', channelType: 'sms' as 'sms' | 'email' | 'both',
    audienceType: 'all' as 'all' | 'group' | 'filter' | 'manual',
    audienceRef: '', guardianTargeted: false,
    templateId: '', customBody: '', subject: '',
    audienceFilters: {} as Record<string, unknown>,
    includeUserIdsText: '',
    excludeUserIdsText: '',
    scheduleMode: 'now' as 'now' | 'scheduled',
    scheduledAtUTC: '',
  });
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const state = (location.state ?? {}) as {
      prefillAudienceFilters?: Record<string, unknown>;
      prefillCampaignName?: string;
      prefillSelectedUserIds?: string[];
    };
    if (!state.prefillAudienceFilters && !state.prefillCampaignName && !state.prefillSelectedUserIds?.length) return;
    setForm((current) => ({
      ...current,
      campaignName: state.prefillCampaignName || current.campaignName,
      audienceType: state.prefillAudienceFilters ? 'filter' : current.audienceType,
      audienceFilters: state.prefillAudienceFilters
        ? {
          ...state.prefillAudienceFilters,
          ...(state.prefillSelectedUserIds?.length
            ? { selectedUserIds: state.prefillSelectedUserIds }
            : {}),
        }
        : current.audienceFilters,
      audienceRef: state.prefillAudienceFilters ? '' : current.audienceRef,
      includeUserIdsText: current.includeUserIdsText,
    }));
  }, [location.state]);

  const { data: groupsData } = useQuery({ queryKey: ['student-groups'], queryFn: () => getStudentGroups() });
  const groups = (
    Array.isArray(groupsData?.data)
      ? groupsData.data
      : Array.isArray(groupsData?.groups)
        ? groupsData.groups
        : []
  ) as { _id: string; name: string }[];

  const { data: templatesData } = useQuery({ queryKey: ['campaign-templates'], queryFn: () => listTemplates({ limit: 100 }) });
  const templates = (templatesData?.items ?? []) as NotificationTemplate[];

  const filteredTemplates = useMemo(() => templates.filter(t => form.channelType === 'both' || t.channel === form.channelType), [templates, form.channelType]);
  const includeUserIds = useMemo(() => form.includeUserIdsText.split(/[\s,]+/).filter(Boolean), [form.includeUserIdsText]);
  const excludeUserIds = useMemo(() => form.excludeUserIdsText.split(/[\s,]+/).filter(Boolean), [form.excludeUserIdsText]);
  const lockedSelectedUserIds = useMemo(() => {
    const raw = form.audienceFilters?.selectedUserIds;
    return Array.isArray(raw) ? raw.map(value => String(value)).filter(Boolean) : [];
  }, [form.audienceFilters]);

  const handlePreview = async () => {
    try {
      const res = await previewCampaign({
        channelType: form.channelType,
        audienceType: form.audienceType,
        audienceRef: form.audienceRef || undefined,
        audienceFilters: form.audienceType === 'filter' ? form.audienceFilters : undefined,
        includeUserIds,
        excludeUserIds,
        guardianTargeted: form.guardianTargeted,
        templateKey: form.templateId || undefined,
        customBody: form.customBody || undefined,
        subject: form.subject || undefined,
      });
      setPreview(res);
      setStep(4);
    } catch {
      showToast('Preview failed', 'error');
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await sendCampaign({
        campaignName: form.campaignName,
        channelType: form.channelType,
        audienceType: form.audienceType,
        audienceRef: form.audienceRef || undefined,
        audienceFilters: form.audienceType === 'filter' ? form.audienceFilters : undefined,
        includeUserIds,
        excludeUserIds,
        guardianTargeted: form.guardianTargeted,
        templateKey: form.templateId || undefined,
        customBody: form.customBody || undefined,
        subject: form.subject || undefined,
        scheduledAtUTC: form.scheduleMode === 'scheduled' && form.scheduledAtUTC ? form.scheduledAtUTC : undefined,
      });
      showToast('Campaign sent successfully!');
      onSent();
    } catch {
      showToast('Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
              {s}
            </div>
            <span className={`text-sm ${step >= s ? 'font-medium text-slate-800 dark:text-white' : 'text-slate-400'}`}>
              {s === 1 ? 'Audience' : s === 2 ? 'Content' : s === 3 ? 'Delivery' : 'Review & Send'}
            </span>
            {s < 4 && <div className="h-px w-8 bg-slate-300 dark:bg-slate-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Audience */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Select Audience</h3>
          <div>
            <label className={labelClass}>Campaign Name</label>
            <input value={form.campaignName} onChange={e => setForm(p => ({ ...p, campaignName: e.target.value }))} className={fieldClass} placeholder="e.g. Exam Reminder Batch A" />
          </div>
          <div>
            <label className={labelClass}>Channel</label>
            <select value={form.channelType} onChange={e => setForm(p => ({ ...p, channelType: e.target.value as typeof form.channelType }))} className={fieldClass}>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Audience Type</label>
            <select value={form.audienceType} onChange={e => setForm(p => ({ ...p, audienceType: e.target.value as typeof form.audienceType }))} className={fieldClass}>
              <option value="all">All Students</option>
              <option value="group">Student Group</option>
              <option value="filter">Custom Filter</option>
              <option value="manual">Manual List</option>
            </select>
          </div>
          {form.audienceType === 'group' && (
            <div>
              <label className={labelClass}>Select Group</label>
              <select value={form.audienceRef} onChange={e => setForm(p => ({ ...p, audienceRef: e.target.value }))} className={fieldClass}>
                <option value="">Choose a group...</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
          )}
          {form.audienceType === 'filter' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-200">
              This campaign was prefilled from Subscription Contact Center. It will use the same live audience filters during preview and send.
              {lockedSelectedUserIds.length > 0 ? ` Selected rows stay locked to ${lockedSelectedUserIds.length} member${lockedSelectedUserIds.length === 1 ? '' : 's'} unless you change the filter.` : ''}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Manual include user IDs</label>
              <textarea value={form.includeUserIdsText} onChange={e => setForm(p => ({ ...p, includeUserIdsText: e.target.value }))} className={fieldClass + ' min-h-[100px]'} placeholder="Optional override. Comma or newline separated user IDs." />
            </div>
            <div>
              <label className={labelClass}>Manual exclude user IDs</label>
              <textarea value={form.excludeUserIdsText} onChange={e => setForm(p => ({ ...p, excludeUserIdsText: e.target.value }))} className={fieldClass + ' min-h-[100px]'} placeholder="Optional removal list. Comma or newline separated user IDs." />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={form.guardianTargeted} onChange={e => setForm(p => ({ ...p, guardianTargeted: e.target.checked }))} className="rounded border-slate-300" />
            Also send to guardians
          </label>
          <button onClick={() => setStep(2)} disabled={!form.campaignName} className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            Next: Content →
          </button>
        </div>
      )}

      {/* Step 2: Content */}
      {step === 2 && (
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Message Content</h3>
          <div>
            <label className={labelClass}>Use Template</label>
            <select value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))} className={fieldClass}>
              <option value="">Write custom message instead...</option>
              {filteredTemplates.map(t => <option key={t._id} value={t.templateKey}>{t.name} ({t.channel})</option>)}
            </select>
          </div>
          {!form.templateId && (
            <>
              {(form.channelType === 'email' || form.channelType === 'both') && (
                <div>
                  <label className={labelClass}>Email Subject</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className={fieldClass} placeholder="Subject line..." />
                </div>
              )}
              <div>
                <label className={labelClass}>Message Body</label>
                <textarea value={form.customBody} onChange={e => setForm(p => ({ ...p, customBody: e.target.value }))} className={fieldClass + ' min-h-[120px]'} placeholder="Use {student_name}, {phone}, etc. for variables..." />
              </div>
            </>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
              ← Back
            </button>
            <button onClick={() => setStep(3)} disabled={!form.templateId && !form.customBody} className="flex-1 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              Preview & Estimate →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Delivery */}
      {step === 3 && (
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Delivery Options</h3>
          <div>
            <label className={labelClass}>Send timing</label>
            <select value={form.scheduleMode} onChange={e => setForm(p => ({ ...p, scheduleMode: e.target.value as 'now' | 'scheduled' }))} className={fieldClass}>
              <option value="now">Send now</option>
              <option value="scheduled">Schedule for later</option>
            </select>
          </div>
          {form.scheduleMode === 'scheduled' && (
            <div>
              <label className={labelClass}>Scheduled date and time</label>
              <input type="datetime-local" value={form.scheduledAtUTC} onChange={e => setForm(p => ({ ...p, scheduledAtUTC: e.target.value }))} className={fieldClass} />
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Retry, quiet hours, and queue defaults still come from Communication Hub settings and Smart Triggers. This step controls when this campaign enters the queue.
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
              ← Back
            </button>
            <button onClick={handlePreview} className="flex-1 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              Preview & Estimate
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Send */}
      {step === 4 && (
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Review & Send</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500">Recipients</p>
              <p className="text-xl font-bold text-indigo-600">{preview?.recipientCount ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500">Est. Cost</p>
              <p className="text-xl font-bold text-amber-600">৳{(preview?.estimatedCost ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500">Channel</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{form.channelType.toUpperCase()}</p>
            </div>
          </div>
          {preview?.sampleRendered && (
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">Sample Message</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {preview.sampleRendered?.subject && <p className="mb-1 font-medium">{preview.sampleRendered.subject}</p>}
                {preview.sampleRendered?.body}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Summary</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <li>Campaign: <strong>{form.campaignName}</strong></li>
              <li>Audience: <strong>{form.audienceType}</strong></li>
              <li>Selected rows locked from Contact Center: <strong>{lockedSelectedUserIds.length}</strong></li>
              <li>Guardian targeted: <strong>{form.guardianTargeted ? 'Yes' : 'No'}</strong></li>
              <li>Content: <strong>{form.templateId ? 'Template' : 'Custom'}</strong></li>
              <li>Manual include IDs: <strong>{includeUserIds.length}</strong></li>
              <li>Manual exclude IDs: <strong>{excludeUserIds.length}</strong></li>
              <li>Schedule: <strong>{form.scheduleMode === 'scheduled' && form.scheduledAtUTC ? new Date(form.scheduledAtUTC).toLocaleString() : 'Send now'}</strong></li>
            </ul>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
              ← Back
            </button>
            <button onClick={handleSend} disabled={sending} className="flex-1 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              {sending ? 'Sending...' : 'Launch Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Templates Panel ─────────────────────────────── */
function TemplatesPanel({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['campaign-templates'], queryFn: () => listTemplates({ limit: 100 }) });
  const templates = (data?.items ?? []) as NotificationTemplate[];
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ templateKey: '', name: '', channel: 'sms', subject: '', body: '', category: 'campaign' });

  const saveMut = useMutation({
    mutationFn: (v: { id?: string; data: Record<string, unknown> }) => v.id ? updateTemplate(v.id, v.data) : createTemplate(v.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-templates'] }); showToast('Template saved'); setEditing(null); setCreating(false); },
    onError: () => showToast('Save failed', 'error'),
  });

  const startCreate = () => { setForm({ templateKey: '', name: '', channel: 'sms', subject: '', body: '', category: 'campaign' }); setCreating(true); setEditing(null); };
  const startEdit = (t: NotificationTemplate) => { setForm({ templateKey: t.templateKey, name: t.name, channel: t.channel, subject: t.subject ?? '', body: t.body, category: t.category ?? 'campaign' }); setEditing(t); setCreating(false); };

  const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Templates</h3>
        <button onClick={startCreate} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">+ New</button>
      </div>
      {(creating || editing) && (
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={fieldClass} placeholder="Template Name" />
            <input value={form.templateKey} onChange={e => setForm(p => ({ ...p, templateKey: e.target.value }))} className={fieldClass} placeholder="Template Key (e.g. EXAM_REMINDER)" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))} className={fieldClass}>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={fieldClass}>
              {['account', 'password', 'subscription', 'payment', 'exam', 'result', 'news', 'resource', 'support', 'campaign', 'guardian', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {form.channel === 'email' && <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className={fieldClass} placeholder="Email Subject" />}
          <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} className={fieldClass + ' min-h-[100px]'} placeholder="Message body with {placeholders}..." />
          <div className="flex gap-2">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">Cancel</button>
            <button onClick={() => saveMut.mutate({ id: editing?._id, data: form })} disabled={!form.name || !form.body} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500 dark:border-slate-700">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Key</th>
              <th className="px-5 py-3">Channel</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : templates.map(t => (
              <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{t.name}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{t.templateKey}</td>
                <td className="px-5 py-3">{t.channel}</td>
                <td className="px-5 py-3">{t.category ?? '—'}</td>
                <td className="px-5 py-3">
                  <button onClick={() => startEdit(t)} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Delivery Logs Panel ─────────────────────────── */
function CampaignViewNav({ activeTab, onNavigate }: { activeTab: Tab; onNavigate: (tab: Tab) => void }) {
  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex min-w-max items-center gap-2">
        {CAMPAIGN_VIEW_BUTTONS.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onNavigate(item.tab)}
              aria-pressed={isActive}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LogsPanel() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['delivery-logs', { page, status: statusFilter }], queryFn: () => getDeliveryLogs({ page, limit: 30, status: statusFilter || undefined }) });
  const logs = (data?.items ?? []) as DeliveryLog[];
  const total = data?.total ?? logs.length;
  const pages = Math.ceil(total / 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500 dark:border-slate-700">
              <th className="px-5 py-3">Recipient</th>
              <th className="px-5 py-3">Channel</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Provider / Template</th>
              <th className="px-5 py-3">Origin</th>
              <th className="px-5 py-3">Cost</th>
              <th className="px-5 py-3">Retries</th>
              <th className="px-5 py-3">Guardian</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-400">No logs found</td></tr>
            ) : logs.map(l => (
              <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-5 py-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{l.recipientDisplay || l.userId}</p>
                    <p className="font-mono text-[11px] text-slate-500">{l.userId}</p>
                  </div>
                </td>
                <td className="px-5 py-3">{l.channel}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.status === 'sent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : l.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700'}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <p>{l.providerUsed || 'unresolved provider'}</p>
                    <p className="font-mono">{l.templateKey || (l.messageMode === 'custom' ? 'CUSTOM' : '—')}</p>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <p>{l.originModule || 'campaign'}</p>
                    <p className="font-mono">{l.originEntityId || '—'}</p>
                    <p>{l.guardianTargeted ? 'guardian' : (l.recipientMode || 'student')}</p>
                  </div>
                </td>
                <td className="px-5 py-3">৳{l.costAmount.toFixed(2)}</td>
                <td className="px-5 py-3">{l.retryCount}</td>
                <td className="px-5 py-3">{l.guardianTargeted ? '✓' : '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400">Next</button>
        </div>
      )}
    </div>
  );
}

/* ─── Settings Panel ──────────────────────────────── */
function SettingsPanel({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notification-settings'], queryFn: getNotificationSettings });
  const settings = (data ?? {}) as Partial<NotificationSettings>;
  const [form, setForm] = useState<Partial<NotificationSettings>>({});
  const merged = { ...settings, ...form };

  const saveMut = useMutation({
    mutationFn: (d: Partial<NotificationSettings>) => updateNotificationSettings(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notification-settings'] }); showToast('Settings saved'); },
    onError: () => showToast('Save failed', 'error'),
  });

  const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
  const labelClass = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1';

  if (isLoading) return <div className="py-10 text-center text-slate-400">Loading settings...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Send Limits</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Daily SMS Limit</label>
            <input type="number" value={merged.dailySmsLimit ?? 500} onChange={e => setForm(p => ({ ...p, dailySmsLimit: Number(e.target.value) }))} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Daily Email Limit</label>
            <input type="number" value={merged.dailyEmailLimit ?? 2000} onChange={e => setForm(p => ({ ...p, dailyEmailLimit: Number(e.target.value) }))} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Monthly SMS Budget (BDT)</label>
            <input type="number" value={merged.monthlySmsBudgetBDT ?? 10000} onChange={e => setForm(p => ({ ...p, monthlySmsBudgetBDT: Number(e.target.value) }))} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Monthly Email Budget (BDT)</label>
            <input type="number" value={merged.monthlyEmailBudgetBDT ?? 5000} onChange={e => setForm(p => ({ ...p, monthlyEmailBudgetBDT: Number(e.target.value) }))} className={fieldClass} />
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Quiet Hours</h3>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={merged.quietHours?.enabled ?? false} onChange={e => setForm(p => ({ ...p, quietHours: { ...merged.quietHours!, enabled: e.target.checked } }))} className="rounded border-slate-300" />
          Enable quiet hours
        </label>
        {merged.quietHours?.enabled && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Start Hour (UTC)</label>
              <input type="number" min={0} max={23} value={merged.quietHours?.startHour ?? 22} onChange={e => setForm(p => ({ ...p, quietHours: { ...merged.quietHours!, startHour: Number(e.target.value) } }))} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>End Hour (UTC)</label>
              <input type="number" min={0} max={23} value={merged.quietHours?.endHour ?? 7} onChange={e => setForm(p => ({ ...p, quietHours: { ...merged.quietHours!, endHour: Number(e.target.value) } }))} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Timezone</label>
              <input value={merged.quietHours?.timezone ?? 'Asia/Dhaka'} onChange={e => setForm(p => ({ ...p, quietHours: { ...merged.quietHours!, timezone: e.target.value } }))} className={fieldClass} />
            </div>
          </div>
        )}
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Retry & Duplicate Prevention</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Max Retry Count</label>
            <input type="number" value={merged.maxRetryCount ?? 2} onChange={e => setForm(p => ({ ...p, maxRetryCount: Number(e.target.value) }))} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Duplicate Window (mins)</label>
            <input type="number" value={merged.duplicatePreventionWindowMinutes ?? 60} onChange={e => setForm(p => ({ ...p, duplicatePreventionWindowMinutes: Number(e.target.value) }))} className={fieldClass} />
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Automation</h3>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={merged.resultPublishAutoSend ?? true} onChange={e => setForm(p => ({ ...p, resultPublishAutoSend: e.target.checked }))} className="rounded border-slate-300" />
          Auto-send result notifications on publish
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={merged.autoSyncCostToFinance ?? true} onChange={e => setForm(p => ({ ...p, autoSyncCostToFinance: e.target.checked }))} className="rounded border-slate-300" />
          Auto-sync costs to Finance Center
        </label>
      </div>
      <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
        {saveMut.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

/* ─── Campaign Detail Modal ───────────────────────── */
function CampaignDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['campaign', id], queryFn: () => getCampaign(id) });
  const campaign = (data ?? null) as CampaignDetail | null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className="py-10 text-center text-slate-400">Loading...</div>
        ) : campaign ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{campaign.campaignName || 'Campaign Detail'}</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-slate-500">Channel:</span> <strong>{campaign.channelType}</strong></div>
              <div><span className="text-slate-500">Status:</span> <strong>{campaign.status}</strong></div>
              <div><span className="text-slate-500">Audience:</span> <strong>{campaign.audienceType}</strong></div>
              <div><span className="text-slate-500">Recipients:</span> <strong>{campaign.recipientCount ?? 0}</strong></div>
              <div><span className="text-slate-500">Sent:</span> <strong>{campaign.sentCount ?? 0}</strong></div>
              <div><span className="text-slate-500">Failed:</span> <strong className="text-red-600">{campaign.failedCount ?? 0}</strong></div>
              <div><span className="text-slate-500">Est. Cost:</span> <strong>৳{(campaign.estimatedCost ?? 0).toFixed(2)}</strong></div>
              <div><span className="text-slate-500">Actual Cost:</span> <strong>৳{(campaign.actualCost ?? 0).toFixed(2)}</strong></div>
              <div><span className="text-slate-500">Guardian:</span> <strong>{campaign.guardianTargeted ? 'Yes' : 'No'}</strong></div>
              <div><span className="text-slate-500">Quiet Hours:</span> <strong>{campaign.quietHoursApplied ? 'Yes' : 'No'}</strong></div>
            </div>
            <div className="text-xs text-slate-500">
              Created: {new Date(campaign.createdAt).toLocaleString()}
              {campaign.completedAt && <> · Completed: {new Date(campaign.completedAt).toLocaleString()}</>}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400">Campaign not found</div>
        )}
      </div>
    </div>
  );
}
