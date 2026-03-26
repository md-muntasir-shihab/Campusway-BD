import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStudentGroupDetail, getStudentGroupMetrics, getStudentGroupMembers,
  updateStudentGroup, addGroupMembers, removeGroupMembers, exportGroupMembers,
  downloadMemberImportTemplate, importGroupMembersPreview, importGroupMembersCommit,
} from '../../../api/adminStudentApi';
import { listAdminExams } from '../../../api/adminExamApi';
import { listCampaigns, exportDataHub } from '../../../api/adminNotificationCampaignApi';
import { adminUi } from '../../../lib/appRoutes';
import { ADMIN_PATHS } from '../../../routes/adminPaths';
import { downloadFile } from '../../../utils/download';
import {
  ArrowLeft, Users, Search, Plus, Download, X, Pencil, Star,
  CheckCircle, XCircle, UserMinus, BookOpen, Megaphone, FileSpreadsheet,
  ExternalLink, Phone, Mail, UserCheck, Upload, FileDown, AlertCircle, Loader2,
} from 'lucide-react';
import ModernToggle from '../../../components/ui/ModernToggle';

type Tab = 'overview' | 'members' | 'exams' | 'campaigns' | 'exports' | 'settings';
type Toast = { show: boolean; message: string; type: 'success' | 'error' };

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400';
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

export default function StudentGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [toast, setToast] = useState<Toast>({ show: false, message: '', type: 'success' });
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [addIds, setAddIds] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
  };

  const { data: group, isLoading } = useQuery({
    queryKey: ['admin-student-group-detail', id],
    queryFn: () => getStudentGroupDetail(id!),
    enabled: !!id,
  });

  const { data: metrics } = useQuery({
    queryKey: ['admin-student-group-metrics', id],
    queryFn: () => getStudentGroupMetrics(id!),
    enabled: !!id,
  });

  const { data: membersData } = useQuery({
    queryKey: ['admin-student-group-members', id, memberPage, memberSearch],
    queryFn: () => getStudentGroupMembers(id!, { page: memberPage, limit: 20, q: memberSearch }),
    enabled: !!id && tab === 'members',
  });

  const { data: allExams } = useQuery({
    queryKey: ['admin-exams-all'],
    queryFn: () => listAdminExams(),
    enabled: !!id && tab === 'exams',
  });

  const { data: campaignsData } = useQuery({
    queryKey: ['admin-campaigns-group', id],
    queryFn: () => listCampaigns({ audienceGroupId: id }),
    enabled: !!id && tab === 'campaigns',
  });

  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, unknown> | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const g = (group as Record<string, unknown>) ?? {};
  const color = (g.color as string) || '#6366f1';
  const members = ((membersData as Record<string, unknown>)?.data ??
    (membersData as Record<string, unknown>)?.members ??
    (membersData as Record<string, unknown>)?.items ??
    []) as Record<string, unknown>[];
  const totalMembers = ((membersData as Record<string, unknown>)?.total ?? members.length) as number;
  const totalPages = Math.max(1, Math.ceil(totalMembers / 20));
  const metricsObj = (metrics ?? {}) as Record<string, unknown>;

  // Filter exams targeting this group
  const groupExams = (Array.isArray(allExams) ? allExams : []).filter((e: Record<string, unknown>) => {
    const tgIds = (e.targetGroupIds ?? []) as string[];
    return tgIds.some((gid: string) => String(gid) === id);
  }) as Record<string, unknown>[];

  // Campaigns list
  const campaigns = ((campaignsData as Record<string, unknown>)?.campaigns ??
    (campaignsData as Record<string, unknown>)?.items ??
    (Array.isArray(campaignsData) ? campaignsData : [])) as Record<string, unknown>[];

  const handleDataHubExport = async (category: string, format: string) => {
    setExportLoading(category);
    try {
      const result = await exportDataHub({ category, format, filters: { groupId: id } });
      const axiosLike = result as { data?: unknown; headers?: Record<string, unknown> | { get?: (name: string) => unknown } };
      if (axiosLike?.data instanceof Blob) {
        const filename = `${String(category).replace(/[^a-z0-9_]+/gi, '_').toLowerCase()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
        downloadFile(axiosLike as { data: Blob; headers?: Record<string, unknown> }, { filename });
        showToast(`${category.replace(/_/g, ' ')} exported`);
        return;
      }

      const payload = result as { text?: string; data?: unknown[] };
      if (payload.text) {
        navigator.clipboard.writeText(payload.text);
        showToast(`${category.replace(/_/g, ' ')} copied to clipboard`);
      } else if (payload.data) {
        showToast(`${category.replace(/_/g, ' ')} exported`);
      } else {
        showToast('Export completed');
      }
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExportLoading(null);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateStudentGroup(id!, editForm);
      qc.invalidateQueries({ queryKey: ['admin-student-group-detail', id] });
      setEditing(false);
      showToast('Group updated');
    } catch { showToast('Failed to update', 'error'); }
  };

  const handleAddMembers = async () => {
    if (!addIds.trim()) return;
    const ids = addIds.split(/[\s,]+/).filter(Boolean);
    try {
      const result = await addGroupMembers(id!, ids) as { added?: number; skipped?: number };
      qc.invalidateQueries({ queryKey: ['admin-student-group-members', id] });
      qc.invalidateQueries({ queryKey: ['admin-student-group-metrics', id] });
      setAddIds('');
      const added = Number(result?.added ?? 0);
      const skipped = Number(result?.skipped ?? 0);
      if (added <= 0) {
        showToast('No matching student IDs were added', 'error');
        return;
      }
      showToast(skipped > 0 ? `${added} member(s) added, ${skipped} skipped` : `${added} member(s) added`);
    } catch { showToast('Failed to add members', 'error'); }
  };

  const handleRemoveMember = async (studentId: string) => {
    try {
      await removeGroupMembers(id!, [studentId]);
      qc.invalidateQueries({ queryKey: ['admin-student-group-members', id] });
      qc.invalidateQueries({ queryKey: ['admin-student-group-metrics', id] });
      showToast('Member removed');
    } catch { showToast('Failed to remove', 'error'); }
  };

  const handleExport = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const blob = await exportGroupMembers(id!, format);
      downloadFile(blob as Blob, { filename: `group-${g.shortCode || g.name || id}-members.${format}` });
    } catch { showToast('Export failed', 'error'); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadMemberImportTemplate();
      downloadFile(blob, { filename: 'group_members_import_template.xlsx' });
    } catch { showToast('Template download failed', 'error'); }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const preview = await importGroupMembersPreview(id, fd);
      setImportPreview(preview);
      setImportModalOpen(true);
    } catch { showToast('Failed to parse file', 'error'); }
    finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportCommit = async () => {
    if (!importPreview || !id) return;
    const matched = (importPreview.matched ?? []) as { studentId: string; status: string }[];
    const newIds = matched.filter(m => m.status === 'new').map(m => m.studentId);
    if (newIds.length === 0) { showToast('No new members to import'); return; }
    setImportLoading(true);
    try {
      const result = await importGroupMembersCommit(id, newIds);
      qc.invalidateQueries({ queryKey: ['admin-student-group-members', id] });
      qc.invalidateQueries({ queryKey: ['admin-student-group-metrics', id] });
      showToast(`Imported ${result.added} new member(s)`);
      setImportModalOpen(false);
      setImportPreview(null);
    } catch { showToast('Import failed', 'error'); }
    finally { setImportLoading(false); }
  };

  const startEdit = () => {
    setEditForm({
      name: g.name ?? '',
      description: g.description ?? '',
      shortCode: g.shortCode ?? '',
      color: g.color ?? '#6366f1',
      cardStyleVariant: g.cardStyleVariant ?? 'solid',
      sortOrder: g.sortOrder ?? 0,
      isFeatured: g.isFeatured ?? false,
      batch: g.batch ?? '',
      department: g.department ?? '',
      defaultExamVisibility: g.defaultExamVisibility ?? 'all_students',
    });
    setEditing(true);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'members', label: 'Members' },
    { key: 'exams', label: 'Exams' },
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'exports', label: 'Exports' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(adminUi('student-management/groups'))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Back to groups">
          <ArrowLeft size={18} />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}20` }}>
          <Users size={22} style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{g.name as string}</h2>
            {g.isFeatured ? <Star size={14} className="text-amber-500 fill-amber-500" /> : null}
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize" style={{ backgroundColor: `${color}15`, color }}>
              {g.type as string}
            </span>
          </div>
          {g.shortCode ? <span className="text-xs font-mono text-slate-400">{g.shortCode as string}</span> : null}
        </div>
        <button onClick={startEdit} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          <Pencil size={14} /> Edit
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Members', value: metricsObj.totalMembers ?? g.memberCount ?? g.studentCount ?? 0 },
              { label: 'Active Members', value: metricsObj.activeMembers ?? '—' },
              { label: 'Avg. Exam Score', value: metricsObj.avgExamScore != null ? `${metricsObj.avgExamScore}%` : '—' },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs text-slate-500">{m.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{String(m.value)}</p>
              </div>
            ))}
          </div>

          {/* Group Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Group Information</h3>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              {[
                ['Description', g.description || '—'],
                ['Department', g.department || '—'],
                ['Batch', g.batch || '—'],
                ['Exam Visibility', (g.defaultExamVisibility as string)?.replace(/_/g, ' ') || '—'],
                ['Card Style', g.cardStyleVariant || '—'],
                ['Sort Order', g.sortOrder ?? 0],
                ['Created', g.createdAt ? new Date(g.createdAt as string).toLocaleDateString() : '—'],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs text-slate-500">{label as string}</dt>
                  <dd className="capitalize text-slate-900 dark:text-white">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-4">
          {/* Add members + search */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                className={`${inputCls} pl-8`}
                placeholder="Search members..."
                aria-label="Search members"
                title="Search members"
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setMemberPage(1); }}
              />
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFileChange} />
            <button onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-900/20 disabled:opacity-50"
            >
              {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import
            </button>
            <button onClick={() => handleExport('csv')} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => handleExport('xlsx')} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
              <Download size={14} /> XLSX
            </button>
          </div>

          {/* Quick add by IDs */}
          <div className="flex gap-2">
            <input aria-label="Add members by ID" title="Add members by ID" value={addIds} onChange={e => setAddIds(e.target.value)} className={inputCls} placeholder="Add members by ID (comma-separated)" />
            <button onClick={handleAddMembers} disabled={!addIds.trim()} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {['Name', 'Phone', 'Status', 'Joined', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {members.map(m => (
                  <tr key={(m.studentId || m._id) as string} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{(m.fullName || m.name || m.studentName) as string}</td>
                    <td className="px-4 py-3 text-slate-500">{(m.phone || m.studentPhone || '—') as string}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        (m.membershipStatus || m.status) === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {((m.membershipStatus || m.status || 'active') as string)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {m.joinedAtUTC ? new Date(m.joinedAtUTC as string).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleRemoveMember((m.studentId || m._id) as string)} className="text-xs text-red-500 hover:text-red-700" title="Remove member">
                        <UserMinus size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {members.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">No members in this group.</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setMemberPage(p => Math.max(1, p - 1))} disabled={memberPage === 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 dark:border-slate-600">
                Previous
              </button>
              <span className="text-xs text-slate-500">Page {memberPage} of {totalPages}</span>
              <button onClick={() => setMemberPage(p => Math.min(totalPages, p + 1))} disabled={memberPage === totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 dark:border-slate-600">
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Exams Tab ─── */}
      {tab === 'exams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen size={16} /> Exams targeting this group
            </h3>
            <button
              onClick={() => navigate(ADMIN_PATHS.exams)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={14} /> Create Exam
            </button>
          </div>

          {groupExams.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <BookOpen size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">No exams targeting this group yet.</p>
              <p className="mt-1 text-xs text-slate-400">Create an exam and set visibility to this group.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    {['Title', 'Visibility', 'Status', 'Start Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {groupExams.map(exam => (
                    <tr key={exam._id as string} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{exam.title as string}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {((exam.visibilityMode as string) || 'all_students').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          exam.isPublished || exam.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {exam.isPublished || exam.isActive ? 'Active' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {exam.startDate ? new Date(exam.startDate as string).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(ADMIN_PATHS.exams)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <ExternalLink size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Campaigns Tab ─── */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone size={16} /> Campaigns for this group
            </h3>
            <button
              onClick={() => navigate(`${ADMIN_PATHS.campaignsNew}?audienceType=group&audienceGroupId=${id}&audienceGroupName=${encodeURIComponent(g.name as string || '')}`) }
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Megaphone size={14} /> Send Campaign
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <Megaphone size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">No campaigns sent to this group yet.</p>
              <p className="mt-1 text-xs text-slate-400">Use "Send Campaign" to reach all members.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    {['Campaign', 'Channel', 'Status', 'Recipients', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {campaigns.map(c => (
                    <tr key={c._id as string} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{c.campaignName as string}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 uppercase">{(c.channelType || c.channels) as string}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          c.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : c.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {c.status as string}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{(c.recipientCount ?? c.sentCount ?? 0) as number}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {c.createdAt ? new Date(c.createdAt as string).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Exports Tab ─── */}
      {tab === 'exports' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet size={16} /> Group Data Exports
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: 'phone_list', label: 'Phone Numbers', icon: Phone, desc: 'Export all member phone numbers' },
              { key: 'email_list', label: 'Email Addresses', icon: Mail, desc: 'Export all member emails' },
              { key: 'guardians', label: 'Guardian Contacts', icon: UserCheck, desc: 'Guardian name, phone & email' },
              { key: 'audience_segment', label: 'Full Member List', icon: Users, desc: 'Name, phone, email, department, batch' },
            ].map(item => (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon size={16} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{item.desc}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDataHubExport(item.key, 'csv')}
                    disabled={exportLoading === item.key}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
                  >
                    {exportLoading === item.key ? 'Exporting…' : 'CSV'}
                  </button>
                  <button
                    onClick={() => handleDataHubExport(item.key, 'xlsx')}
                    disabled={exportLoading === item.key}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
                  >
                    XLSX
                  </button>
                  <button
                    onClick={() => handleDataHubExport(item.key, 'txt')}
                    disabled={exportLoading === item.key}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick CSV member export */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Quick Member Export</p>
                <p className="text-xs text-slate-400">Download members as a simple CSV file</p>
              </div>
              <button onClick={() => handleExport('csv')} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          {!editing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Group Settings</h3>
                <button onClick={startEdit} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                {[
                  ['Name', g.name],
                  ['Short Code', g.shortCode || '—'],
                  ['Color', g.color || '#6366f1'],
                  ['Card Style', g.cardStyleVariant || 'solid'],
                  ['Sort Order', g.sortOrder ?? 0],
                  ['Featured', g.isFeatured ? 'Yes' : 'No'],
                  ['Department', g.department || '—'],
                  ['Batch', g.batch || '—'],
                  ['Exam Visibility', (g.defaultExamVisibility as string)?.replace(/_/g, ' ') || 'all students'],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-xs text-slate-500">{label as string}</dt>
                    <dd className="capitalize text-slate-900 dark:text-white flex items-center gap-2">
                      {label === 'Color' && <div className="h-4 w-4 rounded" style={{ backgroundColor: value as string }} />}
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Edit Group Settings</h3>
                <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Name</label>
                  <input aria-label="Group name" title="Group name" className={inputCls} value={(editForm.name ?? '') as string} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Short Code</label>
                  <input aria-label="Short code" title="Short code" className={inputCls} value={(editForm.shortCode ?? '') as string} onChange={e => setEditForm(f => ({ ...f, shortCode: e.target.value }))} maxLength={10} />
                </div>
                <div>
                  <label className={labelCls}>Color</label>
                  <div className="flex items-center gap-2">
                    <input aria-label="Pick color" title="Pick color" type="color" value={(editForm.color ?? '#6366f1') as string} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} className="h-8 w-8 cursor-pointer rounded border-0" />
                    <input aria-label="Color hex" title="Color hex" className={inputCls} value={(editForm.color ?? '') as string} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} maxLength={7} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Card Style</label>
                  <select aria-label="Card style" title="Card style" className={inputCls} value={(editForm.cardStyleVariant ?? 'solid') as string} onChange={e => setEditForm(f => ({ ...f, cardStyleVariant: e.target.value }))}>
                    {['solid', 'gradient', 'outline', 'minimal'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Sort Order</label>
                  <input aria-label="Sort order" title="Sort order" className={inputCls} type="number" min={0} value={(editForm.sortOrder ?? 0) as number} onChange={e => setEditForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <select aria-label="Department" title="Department" className={inputCls} value={(editForm.department ?? '') as string} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}>
                    <option value="">None</option>
                    {['science', 'arts', 'commerce'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Batch</label>
                  <input aria-label="Batch" title="Batch" className={inputCls} value={(editForm.batch ?? '') as string} onChange={e => setEditForm(f => ({ ...f, batch: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Exam Visibility</label>
                  <select aria-label="Exam visibility" title="Exam visibility" className={inputCls} value={(editForm.defaultExamVisibility ?? 'all_students') as string} onChange={e => setEditForm(f => ({ ...f, defaultExamVisibility: e.target.value }))}>
                    {['all_students', 'group_only', 'hidden'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea aria-label="Description" title="Description" className={`${inputCls} resize-none`} rows={2} value={(editForm.description ?? '') as string} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <ModernToggle
                    label={<span className="flex items-center gap-2"><Star size={14} className="text-amber-500" /> Featured group</span>}
                    checked={(editForm.isFeatured ?? false) as boolean}
                    onChange={v => setEditForm(f => ({ ...f, isFeatured: v }))}
                    size="sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300">Cancel</button>
                <button onClick={handleSaveSettings} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Preview Modal */}
      {importModalOpen && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setImportModalOpen(false); setImportPreview(null); }}>
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={18} /> Import Preview
              </h3>
              <button onClick={() => { setImportModalOpen(false); setImportPreview(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Summary */}
            {(() => {
              const summary = (importPreview.summary ?? {}) as Record<string, number>;
              return (
                <div className="grid gap-3 sm:grid-cols-4 mb-4">
                  {[
                    { label: 'Total Rows', value: summary.total ?? 0, cls: '' },
                    { label: 'New Members', value: summary.newMembers ?? 0, cls: 'text-green-600' },
                    { label: 'Already Members', value: summary.alreadyMembers ?? 0, cls: 'text-amber-600' },
                    { label: 'Not Found', value: summary.notFound ?? 0, cls: 'text-red-600' },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-xs text-slate-500">{s.label}</p>
                      <p className={`text-xl font-bold ${s.cls || 'text-slate-900 dark:text-white'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Matched students preview */}
            {((importPreview.matched ?? []) as Record<string, unknown>[]).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-1">
                  <CheckCircle size={14} className="text-green-500" /> Matched Students
                </h4>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                      <tr>
                        {['Row', 'Name', 'Email', 'Status'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {((importPreview.matched ?? []) as Record<string, unknown>[]).slice(0, 50).map((m, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-slate-400">{m.row as number}</td>
                          <td className="px-3 py-1.5 text-slate-900 dark:text-white">{m.fullName as string}</td>
                          <td className="px-3 py-1.5 text-slate-500">{(m.email || m.phone || '—') as string}</td>
                          <td className="px-3 py-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              m.status === 'new'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {m.status === 'new' ? 'New' : 'Already member'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Unmatched rows */}
            {((importPreview.unmatched ?? []) as Record<string, unknown>[]).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-1">
                  <AlertCircle size={14} className="text-red-500" /> Unmatched Rows
                </h4>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-900/10 text-xs space-y-1">
                  {((importPreview.unmatched ?? []) as Record<string, unknown>[]).slice(0, 20).map((u, i) => (
                    <p key={i} className="text-red-700 dark:text-red-400">
                      Row {u.row as number}: {(u.email || u.phone || 'unknown') as string} — {u.reason as string}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700">
                <FileDown size={14} /> Download Template
              </button>
              <div className="flex gap-3">
                <button onClick={() => { setImportModalOpen(false); setImportPreview(null); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300">
                  Cancel
                </button>
                <button
                  onClick={handleImportCommit}
                  disabled={importLoading || ((importPreview.summary as Record<string, number>)?.newMembers ?? 0) === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Import {(importPreview.summary as Record<string, number>)?.newMembers ?? 0} New Member(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
