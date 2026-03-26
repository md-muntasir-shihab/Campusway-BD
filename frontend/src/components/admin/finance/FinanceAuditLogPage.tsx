import { useState } from 'react';
import { useFcAuditLogs, useFcAuditLogDetail } from '../../../hooks/useFinanceCenterQueries';
import { FcAuditLog } from '../../../types/finance';
import { ScrollText, X } from 'lucide-react';

const fmt = (d: string) => new Date(d).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });

export default function FinanceAuditLogPage() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useFcAuditLogs({ page, limit: 25 });
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const logs: FcAuditLog[] = data?.items ?? [];
    const total: number = data?.total ?? 0;
    const totalPages = Math.ceil(total / 25) || 1;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Audit Log</h2>

            {isLoading ? (
                <p className="text-sm text-slate-400">Loading...</p>
            ) : logs.length === 0 ? (
                <p className="text-sm text-slate-500">No audit entries yet.</p>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                            <table className="min-w-[600px] w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-3 py-2 font-medium text-slate-500">Timestamp</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Action</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Target</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Target ID</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Actor</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">{fmt(log.timestamp)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${actionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{log.target_type}</td>
                                        <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{log.target_id?.slice(-6)}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{typeof log.actor_id === 'object' && log.actor_id ? (log.actor_id as any).full_name || (log.actor_id as any).username : (log.actor_id as string)?.slice(-6) ?? '—'}</td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => setSelectedId(log._id)} className="text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400">{total} entries</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-600 dark:text-slate-300">Prev</button>
                            <span className="px-2 py-0.5 text-xs text-slate-500">{page}/{totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-600 dark:text-slate-300">Next</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail modal */}
            {selectedId && <AuditDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
        </div>
    );
}

function AuditDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
    const { data: detail, isLoading } = useFcAuditLogDetail(id);
    const log = (detail as { data?: FcAuditLog })?.data ?? detail as FcAuditLog | undefined;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"><X size={18} /></button>
                <div className="mb-4 flex items-center gap-2">
                    <ScrollText size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Audit Detail</h3>
                </div>

                {isLoading ? (
                    <p className="text-sm text-slate-400">Loading...</p>
                ) : !log ? (
                    <p className="text-sm text-slate-500">Not found.</p>
                ) : (
                    <div className="space-y-3 text-xs">
                        <Row label="Action" value={log.action} />
                        <Row label="Target" value={`${log.target_type} / ${log.target_id ?? '—'}`} />
                        <Row label="Actor" value={typeof log.actor_id === 'object' && log.actor_id ? (log.actor_id as any).full_name || (log.actor_id as any).username : String(log.actor_id ?? '—')} />
                        <Row label="Time" value={fmt(log.timestamp)} />
                        {log.description && <Row label="Description" value={log.description} />}

                        {/* Before / After diff */}
                        {(log.beforeSnapshot || log.afterSnapshot) && (
                            <div className="mt-3">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Changes</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="mb-1 text-[10px] font-medium text-red-500">Before</p>
                                        <pre className="max-h-48 overflow-auto rounded-lg bg-red-50 p-2 text-[10px] text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                            {JSON.stringify(log.beforeSnapshot, null, 2) || '—'}
                                        </pre>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-[10px] font-medium text-green-500">After</p>
                                        <pre className="max-h-48 overflow-auto rounded-lg bg-green-50 p-2 text-[10px] text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                            {JSON.stringify(log.afterSnapshot, null, 2) || '—'}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        {log.details && (
                            <div>
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Details</p>
                                <pre className="max-h-32 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex gap-2">
            <span className="w-20 shrink-0 text-slate-500">{label}:</span>
            <span className="text-slate-700 dark:text-slate-300">{value ?? '—'}</span>
        </div>
    );
}

function actionColor(action: string) {
    const map: Record<string, string> = {
        create: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
        update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
        delete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        restore: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
        approve: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
        reject: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
    };
    return map[action] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}
