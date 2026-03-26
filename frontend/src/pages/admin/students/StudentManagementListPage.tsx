import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Users, UserCheck, UserX, CreditCard,
  ChevronLeft, ChevronRight,
  RefreshCcw, AlertTriangle,
  Eye,
} from 'lucide-react';
import { getStudentsList, getStudentMetrics, getStudentGroups, suspendStudent, activateStudent } from '../../../api/adminStudentApi';
import { adminUi } from '../../../lib/appRoutes';

type Student = {
  _id: string; full_name: string; email: string; phone_number?: string;
  status: string; role: string; createdAt: string; lastLogin?: string;
  subscription?: { status?: string; planId?: { name?: string }; expiresAtUTC?: string };
  profile_completion_percentage?: number;
  profile?: { profile_completion_percentage?: number; phone_number?: string };
  groups?: { _id: string; name: string; color?: string }[];
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  blocked: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function StudentManagementListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [expiringDays, setExpiringDays] = useState('');
  const limit = 25;

  const { data: metrics } = useQuery({
    queryKey: ['student-metrics'],
    queryFn: getStudentMetrics,
    staleTime: 30_000,
  });

  const { data: groupsData } = useQuery({
    queryKey: ['student-groups-filter'],
    queryFn: () => getStudentGroups(),
    staleTime: 60_000,
  });
  const allGroups: { _id: string; name: string }[] = groupsData?.data ?? groupsData ?? [];

  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['students-list', page, search, statusFilter, subFilter, departmentFilter, groupFilter, sortBy, sortOrder, expiringDays],
    queryFn: () => getStudentsList({
      page, limit, q: search || undefined,
      status: statusFilter || undefined,
      subscriptionStatus: subFilter || undefined,
      expiringDays: expiringDays ? Number(expiringDays) : undefined,
      department: departmentFilter || undefined,
      group: groupFilter || undefined,
      sortBy, sortOrder: sortOrder as 'asc' | 'desc',
    }),
  });

  const students: Student[] = listData?.data ?? listData?.students ?? [];
  const total = listData?.total ?? 0;
  const totalPages = listData?.pages ?? (Math.ceil(total / limit) || 1);

  const suspendMut = useMutation({ mutationFn: suspendStudent, onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['student-metrics'] }); } });
  const activateMut = useMutation({ mutationFn: activateStudent, onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['student-metrics'] }); } });

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(prev => prev.length === students.length ? [] : students.map(s => s._id));
  const applyQuickFilter = (mode: 'all' | 'suspended' | 'expired' | 'expiring' | 'needs_review') => {
    setPage(1);
    if (mode === 'all') {
      setStatusFilter('');
      setSubFilter('');
      setExpiringDays('');
      return;
    }
    if (mode === 'suspended') {
      setStatusFilter('suspended');
      setSubFilter('');
      setExpiringDays('');
      return;
    }
    if (mode === 'expired') {
      setStatusFilter('');
      setSubFilter('expired');
      setExpiringDays('');
      return;
    }
    if (mode === 'expiring') {
      setStatusFilter('');
      setSubFilter('active');
      setExpiringDays('7');
      return;
    }
    setStatusFilter('blocked');
    setSubFilter('');
    setExpiringDays('');
  };

  const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none';
  const m = metrics;

  return (
    <div className="space-y-5">
      {/* Metrics Cards */}
      {m && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Users} label="Total Students" value={m.totalStudents} />
          <MetricCard icon={UserCheck} label="Active" value={m.activeStudents} accent="green" />
          <MetricCard icon={CreditCard} label="Active Subs" value={m.activeSubs} accent="indigo" />
          <MetricCard icon={AlertTriangle} label="Expiring Soon" value={m.expiringSoon} accent="orange" />
        </div>
      )}

      {/* Search & Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Students' },
            { key: 'suspended', label: 'Suspended' },
            { key: 'expired', label: 'Expired Subs' },
            { key: 'expiring', label: 'Expiring 7d' },
            { key: 'needs_review', label: 'Needs Review' },
          ].map((item) => {
            const active =
              (item.key === 'all' && !statusFilter && !subFilter && !expiringDays) ||
              (item.key === 'suspended' && statusFilter === 'suspended') ||
              (item.key === 'expired' && subFilter === 'expired') ||
              (item.key === 'expiring' && subFilter === 'active' && expiringDays === '7') ||
              (item.key === 'needs_review' && statusFilter === 'blocked');
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => applyQuickFilter(item.key as 'all' | 'suspended' | 'expired' | 'expiring' | 'needs_review')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input aria-label="Search students" title="Search students" className={`${inputCls} w-full pl-8`} placeholder="Search by name, email, phone..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select aria-label="Filter by status" title="Filter by status" className={inputCls} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="blocked">Blocked</option>
            <option value="pending">Pending</option>
          </select>
          <select aria-label="Filter by subscription" title="Filter by subscription" className={inputCls} value={subFilter} onChange={e => { setSubFilter(e.target.value); setPage(1); }}>
            <option value="">All Subs</option>
            <option value="active">Active Sub</option>
            <option value="expired">Expired Sub</option>
            <option value="none">No Sub</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${showFilters ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-700 dark:bg-indigo-900/20' : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400'}`} title={showFilters ? 'Hide more filters' : 'Show more filters'}>
            <Filter size={14} /> More
          </button>
          <button onClick={() => refetch()} className="rounded-lg border border-slate-300 p-2 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800" title="Refresh list">
            <RefreshCcw size={14} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <select aria-label="Filter by department" title="Filter by department" className={inputCls} value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setPage(1); }}>
              <option value="">All Departments</option>
              {['science', 'arts', 'commerce'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
            <select aria-label="Filter by group" title="Filter by group" className={inputCls} value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1); }}>
              <option value="">All Groups</option>
              {allGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
            <select aria-label="Filter by expiring timeline" title="Filter by expiring timeline" className={inputCls} value={expiringDays} onChange={e => { setExpiringDays(e.target.value); setPage(1); }}>
              <option value="">Any expiry</option>
              <option value="7">Expiring in 7 days</option>
              <option value="30">Expiring in 30 days</option>
            </select>
            <select aria-label="Sort by" title="Sort by" className={inputCls} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="createdAt">Sort: Join Date</option>
              <option value="name">Sort: Name</option>
              <option value="lastLogin">Sort: Last Login</option>
              <option value="status">Sort: Status</option>
            </select>
            <select aria-label="Sort order" title="Sort order" className={inputCls} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        )}
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">Loading students...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
                    <th className="px-4 py-3 w-8">
                      <input aria-label="Select all students" title="Select all students" type="checkbox" checked={selected.length === students.length && students.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                    </th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Groups</th>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map(s => (
                    <tr key={s._id} className="text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => navigate(adminUi(`student-management/students/${s._id}`))}>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input aria-label="Select student" title="Select student" type="checkbox" checked={selected.includes(s._id)} onChange={() => toggleSelect(s._id)} className="rounded border-slate-300" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                            {s.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">{s.full_name}</p>
                            <p className="text-xs text-slate-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status] || ''}`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.groups?.slice(0, 2).map(g => (
                            <span key={g._id} className="rounded-full px-2 py-0.5 text-[10px] font-medium" ref={(el) => { if (el) { el.style.backgroundColor = `${g.color || '#6366f1'}20`; el.style.color = g.color || '#6366f1'; } }}>{g.name}</span>
                          ))}
                          {(s.groups?.length ?? 0) > 2 && <span className="text-[10px] text-slate-400">+{(s.groups?.length ?? 0) - 2}</span>}
                          {!s.groups?.length && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.subscription?.status === 'active' ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {s.subscription.planId?.name || 'Active'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No active sub</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => { const pct = s.profile?.profile_completion_percentage ?? s.profile_completion_percentage ?? 0; return (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              ref={(el) => { if (el) el.style.width = `${Math.min(pct, 100)}%`; }} />
                          </div>
                          <span className="text-xs text-slate-400">{pct}%</span>
                        </div>
                        ); })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(adminUi(`student-management/students/${s._id}`))}
                            title="Open profile"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
                          >
                            <Eye size={13} />
                            View
                          </button>
                          {s.status === 'active' ? (
                            <button
                              onClick={() => suspendMut.mutate(s._id)}
                              title="Suspend"
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            >
                              <UserX size={13} />
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => activateMut.mutate(s._id)}
                              title="Activate"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                            >
                              <UserCheck size={13} />
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={8} className="py-12 text-center text-slate-400">No students found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" title="Previous page">
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 text-xs text-slate-600 dark:text-slate-400">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" title="Next page">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent = 'slate' }: { icon: typeof Users; label: string; value: number; accent?: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600', indigo: 'text-indigo-600', orange: 'text-orange-600',
    red: 'text-red-600', slate: 'text-slate-900 dark:text-white',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon size={14} /> {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${colorMap[accent] || colorMap.slate}`}>{value?.toLocaleString() ?? 0}</p>
    </div>
  );
}
