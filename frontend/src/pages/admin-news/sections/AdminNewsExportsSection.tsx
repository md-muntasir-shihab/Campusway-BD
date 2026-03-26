import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import NewsHelpButton from '../../../components/admin/NewsHelpButton';
import {
    adminNewsV2ExportLogs,
    adminNewsV2ExportNews,
    adminNewsV2ExportSources,
    adminNewsV2GetSources,
} from '../../../services/api';
import { downloadFile } from '../../../utils/download';

type ExportFormat = 'csv' | 'xlsx';

export default function AdminNewsExportsSection() {
    const [format, setFormat] = useState<ExportFormat>('xlsx');
    const [status, setStatus] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [sourceId, setSourceId] = useState('');

    const sourcesQuery = useQuery({
        queryKey: ['adminRssSources', 'exports'],
        queryFn: async () => (await adminNewsV2GetSources()).data,
    });

    const exportMutation = useMutation({
        mutationFn: async (type: 'news' | 'sources' | 'logs') => {
            if (type === 'news') {
                return adminNewsV2ExportNews({
                    format,
                    status: status || undefined,
                    dateRange: dateRange || undefined,
                    sourceId: sourceId || undefined,
                });
            }
            if (type === 'sources') return adminNewsV2ExportSources(format);
            return adminNewsV2ExportLogs(format);
        },
        onSuccess: (response, type) => {
            downloadFile(response, { filename: `news-${type}.${format}` });
            toast.success(`${type} export downloaded`);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Export failed'),
    });

    return (
        <div className="card-flat space-y-4 border border-cyan-500/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Exports</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Download news items, source registry, and audit logs.</p>
                </div>
                <NewsHelpButton
                    title="Exports"
                    content="Exports let admins download structured news data, sources, and logs."
                    impact="This makes review, archival, and reporting easier without manually copying content."
                    affected="Admins with export permission."
                    publishNote="Exported news data reflects the current published and draft states at the moment of download."
                    publishSendNote="If publish + send is part of the workflow, export records should later match the sent delivery history."
                    enabledNote="Keeping exports in one place reduces duplicate download paths."
                    disabledNote="Without a clear export panel, admins may copy data from the wrong source."
                    bestPractice="Use filters before export so files stay focused and easier to audit."
                    variant="full"
                />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Format</span>
                    <select className="input-field" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
                        <option value="xlsx">XLSX</option>
                        <option value="csv">CSV</option>
                    </select>
                </label>
                <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status Filter</span>
                    <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="duplicate_review">Duplicate Review</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </label>
                <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Date Range</span>
                    <input
                        className="input-field"
                        placeholder="YYYY-MM-DD,YYYY-MM-DD"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    />
                </label>
                <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Source Filter</span>
                    <select className="input-field" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                        <option value="">All Sources</option>
                        {(sourcesQuery.data?.items || []).map((source) => (
                            <option key={source._id} value={source._id}>{source.name}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                    className="btn-primary"
                    onClick={() => exportMutation.mutate('news')}
                    disabled={exportMutation.isPending}
                >
                    Export News
                </button>
                <button
                    className="btn-outline"
                    onClick={() => exportMutation.mutate('sources')}
                    disabled={exportMutation.isPending}
                >
                    Export Sources
                </button>
                <button
                    className="btn-outline"
                    onClick={() => exportMutation.mutate('logs')}
                    disabled={exportMutation.isPending}
                >
                    Export Audit Logs
                </button>
            </div>
        </div>
    );
}
