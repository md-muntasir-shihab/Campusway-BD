import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGetNewsAuditLogs } from '../../../services/api';
import NewsHelpButton from '../../../components/admin/NewsHelpButton';

export default function AdminNewsAuditSection() {
    const [action, setAction] = useState('');
    const [entityType, setEntityType] = useState('');
    const [page, setPage] = useState(1);

    const logsQuery = useQuery({
        queryKey: ['newsv2.audit', action, entityType, page],
        queryFn: async () =>
            (
                await adminGetNewsAuditLogs({
                    action,
                    entityType,
                    page,
                    limit: 50,
                })
            ).data,
    });

    return (
        <div className="space-y-4">
            <div className="card-flat border border-cyan-500/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold">Audit Logs</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Immutable timeline of News V2 admin actions.</p>
                    </div>
                    <NewsHelpButton
                        title="Audit Logs"
                        content="Audit logs show who changed what, when, and from where."
                        impact="It makes content and source changes traceable for review and support."
                        affected="Admins, editors, and compliance reviewers."
                        publishNote="Published items should line up with an audit entry for the publish action."
                        publishSendNote="Publish + send should also leave a trace in delivery logs and related audit records."
                        enabledNote="The timeline is easier to scan when filters stay narrow."
                        disabledNote="Without audit visibility, it is harder to diagnose who changed a story or source."
                        bestPractice="Filter by action before drilling into individual entries."
                        variant="full"
                    />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <input
                        className="input-field"
                        placeholder="Filter by action"
                        value={action}
                        onChange={(e) => {
                            setAction(e.target.value);
                            setPage(1);
                        }}
                    />
                    <input
                        className="input-field"
                        placeholder="Filter by entity type"
                        value={entityType}
                        onChange={(e) => {
                            setEntityType(e.target.value);
                            setPage(1);
                        }}
                    />
                    <button className="btn-outline" onClick={() => logsQuery.refetch()}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="card-flat border border-cyan-500/20 p-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-cyan-500/20 text-left text-xs uppercase tracking-wider text-slate-400">
                                <th className="py-2 pr-3">Time</th>
                                <th className="py-2 pr-3">Actor</th>
                                <th className="py-2 pr-3">Action</th>
                                <th className="py-2 pr-3">Entity</th>
                                <th className="py-2 pr-3">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(logsQuery.data?.items || []).map((item) => (
                                <tr key={item._id} className="border-b border-slate-200 dark:border-slate-800/60">
                                    <td className="py-2 pr-3">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                                    <td className="py-2 pr-3">
                                        {typeof item.actorId === 'object'
                                            ? item.actorId?.fullName || item.actorId?.username || item.actorId?.email
                                            : item.actorId || 'system'}
                                    </td>
                                    <td className="py-2 pr-3">{item.action}</td>
                                    <td className="py-2 pr-3">{item.entityType}</td>
                                    <td className="py-2 pr-3">{item.ip || '-'}</td>
                                </tr>
                            ))}
                            {!logsQuery.data?.items?.length && (
                                <tr>
                                    <td className="py-6 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                                        No audit events found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                        Previous
                    </button>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        Page {logsQuery.data?.page || page} / {logsQuery.data?.pages || 1}
                    </span>
                    <button className="btn-outline" disabled={page >= (logsQuery.data?.pages || 1)} onClick={() => setPage((prev) => prev + 1)}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
