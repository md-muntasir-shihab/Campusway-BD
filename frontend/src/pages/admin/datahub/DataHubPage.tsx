import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import { ADMIN_PATHS } from '../../../routes/adminPaths';
import {
  exportDataHub, getExportHistory,
  type ExportHistoryItem,
} from '../../../api/adminNotificationCampaignApi';
import { downloadFile } from '../../../utils/download';

type ExportCategory = 'phone_list' | 'email_list' | 'guardians' | 'audience_segment' | 'failed_deliveries' | 'manual_send_list';

const CATEGORIES: { key: ExportCategory; label: string; desc: string; icon: string }[] = [
  { key: 'phone_list', label: 'Phone List', desc: 'Export student phone numbers with filters', icon: '📱' },
  { key: 'email_list', label: 'Email List', desc: 'Export student email addresses', icon: '📧' },
  { key: 'guardians', label: 'Guardian Contacts', desc: 'Export guardian emails & phones', icon: '👨‍👩‍👧' },
  { key: 'audience_segment', label: 'Audience Segment', desc: 'Export by group, subscription, or role', icon: '👥' },
  { key: 'failed_deliveries', label: 'Failed Deliveries', desc: 'Get list of failed sends for retry', icon: '⚠️' },
  { key: 'manual_send_list', label: 'Manual Send List', desc: 'Pre-formatted list for manual sending', icon: '📋' },
];

export default function DataHubPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab: 'export' | 'history' = /\/data-hub\/history\/?$/.test(location.pathname) ? 'history' : 'export';

  return (
    <AdminGuardShell title="Data Hub" description="Export student data by category, view history of all imports and exports.">
      <div className="mb-6 flex gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        <button onClick={() => navigate(ADMIN_PATHS.dataHub)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'export' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
          Export Center
        </button>
        <button onClick={() => navigate(ADMIN_PATHS.dataHubHistory)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
          History
        </button>
      </div>
      {tab === 'export' ? <ExportCenter /> : <HistoryPanel />}
    </AdminGuardShell>
  );
}

/* ─── Export Center ───────────────────────────────── */
function ExportCenter() {
  const [selected, setSelected] = useState<ExportCategory | null>(null);
  const [toast, setToast] = useState('');
  const [exportResult, setExportResult] = useState<{ data: Record<string, unknown>[]; count: number } | null>(null);
  const [filters, setFilters] = useState({ format: 'xlsx', groupId: '', subscriptionStatus: '', campaignId: '' });

  const exportMut = useMutation({
    mutationFn: (params: { category: string; format: string; filters?: Record<string, string> }) => exportDataHub(params),
    onSuccess: (res: unknown) => {
      const axiosLike = res as { data?: unknown; headers?: Record<string, unknown> | { get?: (name: string) => unknown } };
      if (axiosLike?.data instanceof Blob) {
        const fallbackName = `${selected || 'data-hub'}_export.${filters.format === 'csv' ? 'csv' : 'xlsx'}`;
        downloadFile(axiosLike as { data: Blob; headers?: Record<string, unknown> }, { filename: fallbackName });
        setExportResult(null);
        setToast('Export downloaded');
        setTimeout(() => setToast(''), 3000);
        return;
      }

      const r = res as { data?: Record<string, unknown>[]; count?: number; text?: string };
      if (typeof r.text === 'string' && r.text.trim()) {
        navigator.clipboard.writeText(r.text).catch(() => void 0);
        setExportResult(null);
        setToast('Copied export text to clipboard');
        setTimeout(() => setToast(''), 3000);
        return;
      }

      setExportResult({ data: Array.isArray(r.data) ? r.data : [], count: r.count ?? 0 });
      setToast('Export ready!');
      setTimeout(() => setToast(''), 3000);
    },
    onError: () => { setToast('Export failed'); setTimeout(() => setToast(''), 3000); },
  });

  const handleExport = () => {
    if (!selected) return;
    const activeFilters: Record<string, string> = {};
    if (filters.groupId) activeFilters.groupId = filters.groupId;
    if (filters.subscriptionStatus) activeFilters.subscriptionStatus = filters.subscriptionStatus;
    if (filters.campaignId) activeFilters.campaignId = filters.campaignId;
    exportMut.mutate({ category: selected, format: filters.format, filters: Object.keys(activeFilters).length ? activeFilters : undefined });
  };

  const copyToClipboard = () => {
    if (!exportResult?.data) return;
    const text = exportResult.data.map(row => Object.values(row).join('\t')).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setToast('Copied to clipboard!');
      setTimeout(() => setToast(''), 2000);
    });
  };

  const downloadCSV = () => {
    if (!exportResult?.data?.length || !exportResult.data[0]) return;
    const headers = Object.keys(exportResult.data[0]);
    const csv = [headers.join(','), ...exportResult.data.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected}_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => { setSelected(cat.key); setExportResult(null); }}
            className={`rounded-2xl border-2 p-5 text-left transition-all ${selected === cat.key ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/20' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'}`}
          >
            <span className="text-2xl">{cat.icon}</span>
            <h4 className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">{cat.label}</h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cat.desc}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            Export: {CATEGORIES.find(c => c.key === selected)?.label}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Format</label>
              <select value={filters.format} onChange={e => setFilters(p => ({ ...p, format: e.target.value }))} className={fieldClass}>
                <option value="xlsx">XLSX</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
            {(selected === 'audience_segment') && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Subscription Status</label>
                <select value={filters.subscriptionStatus} onChange={e => setFilters(p => ({ ...p, subscriptionStatus: e.target.value }))} className={fieldClass}>
                  <option value="">Any</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            )}
            {(selected === 'failed_deliveries') && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Campaign ID</label>
                <input value={filters.campaignId} onChange={e => setFilters(p => ({ ...p, campaignId: e.target.value }))} className={fieldClass} placeholder="Optional campaign ID" />
              </div>
            )}
          </div>
          <button onClick={handleExport} disabled={exportMut.isPending} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {exportMut.isPending ? 'Exporting...' : 'Export Now'}
          </button>
        </div>
      )}

      {exportResult && (
        <div className="rounded-2xl bg-white shadow-sm dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{exportResult.count} records exported</h4>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                📋 Copy All
              </button>
              <button onClick={downloadCSV} className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400">
                ⬇ Download CSV
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-auto">
            {exportResult.data.length > 0 && exportResult.data[0] && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500 dark:border-slate-700">
                    {Object.keys(exportResult.data[0]).map(k => <th key={k} className="px-4 py-2">{k}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {exportResult.data.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {Object.values(row).map((v, j) => <td key={j} className="px-4 py-2 text-slate-700 dark:text-slate-300">{String(v ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {exportResult.data.length > 100 && (
              <div className="px-4 py-3 text-center text-xs text-slate-400">Showing first 100 of {exportResult.count} records. Download CSV for full data.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── History Panel ───────────────────────────────── */
function HistoryPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['export-history', { page }], queryFn: () => getExportHistory({ page, limit: 25 }) });
  const items = (data?.data?.items ?? data?.items ?? []) as ExportHistoryItem[];
  const total = data?.data?.total ?? 0;
  const pages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500 dark:border-slate-700">
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Format</th>
              <th className="px-5 py-3">Rows</th>
              <th className="px-5 py-3">Performed By</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No export history</td></tr>
            ) : items.map(h => (
              <tr key={h._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${h.direction === 'export' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                    {h.direction}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{h.category}</td>
                <td className="px-5 py-3 text-xs">{h.format}</td>
                <td className="px-5 py-3">{h.totalRows}</td>
                <td className="px-5 py-3 text-xs font-mono text-slate-500">{h.performedByName ?? '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{new Date(h.createdAt).toLocaleString()}</td>
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
