import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Filter, Search, User } from 'lucide-react';
import api from '../../../services/api';

type TimelineEntry = {
  _id: string; studentId: string; type: string;
  content: string; sourceType: string;
  createdByAdminId?: { full_name?: string };
  createdAt: string;
  student?: { full_name?: string; email?: string };
};

const TYPES = [
  'note', 'call', 'message', 'sms', 'email', 'meeting',
  'account_event', 'subscription_event', 'security_event',
  'support_ticket', 'exam_event', 'follow_up',
];

const TYPE_COLORS: Record<string, string> = {
  note: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  call: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  message: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sms: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  email: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  account_event: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  subscription_event: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  security_event: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  support_ticket: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  exam_event: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  follow_up: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  meeting: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function StudentCrmTimelinePage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['crm-timeline-global', typeFilter, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (sourceFilter) params.set('sourceType', sourceFilter);
      params.set('limit', '100');
      const res = await api.get(`/admin/students-v2/crm-timeline?${params}`);
      return res.data;
    },
  });

  const entries: TimelineEntry[] = data?.entries ?? data?.data ?? [];

  const filtered = useMemo(() => {
    if (!searchQ) return entries;
    const q = searchQ.toLowerCase();
    return entries.filter(e =>
      e.content?.toLowerCase().includes(q) ||
      e.student?.full_name?.toLowerCase().includes(q) ||
      e.student?.email?.toLowerCase().includes(q)
    );
  }, [entries, searchQ]);

  const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">CRM Timeline</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{filtered.length} entries</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input className={`${inputCls} pl-8`} placeholder="Search content or student..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select className={inputCls} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <select className={inputCls} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
            <option value="">All Sources</option>
            <option value="manual">Manual</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Loading timeline...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <div key={entry._id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <User size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-800 dark:text-white">
                        {entry.student?.full_name || 'Unknown Student'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[entry.type] || 'bg-slate-100 text-slate-600'}`}>
                        {entry.type.replace('_', ' ')}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${entry.sourceType === 'system' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'}`}>
                        {entry.sourceType}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{entry.content}</p>
                    {entry.createdByAdminId?.full_name && (
                      <p className="mt-1 text-xs text-slate-400">by {entry.createdByAdminId.full_name}</p>
                    )}
                  </div>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400">No timeline entries found</div>
          )}
        </div>
      )}
    </div>
  );
}
