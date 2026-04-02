import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    adminListBackups,
    adminDownloadBackup,
    adminRestoreBackup,
    adminRunBackup,
    getAdminBackupDownloadUrl,
} from '../../services/api';
import { Database, Download, RefreshCw } from 'lucide-react';
import { showPromptDialog } from '../../lib/appDialog';
import { downloadFile } from '../../utils/download';
import { promptForSensitiveActionProof } from '../../utils/sensitiveAction';

export default function BackupsPanel() {
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [downloadingId, setDownloadingId] = useState('');
    const [items, setItems] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminListBackups({ page: 1, limit: 20 });
            setItems(res.data.items || []);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load backups');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const runBackup = async (type: 'full' | 'incremental') => {
        setRunning(true);
        try {
            await adminRunBackup({ type, storage: 'local' });
            toast.success(`${type} backup completed`);
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Backup run failed');
        } finally {
            setRunning(false);
        }
    };

    const restore = async (id: string) => {
        const confirmation = await showPromptDialog({
            title: 'Restore backup',
            message: 'Type the restore phrase to continue.',
            expectedValue: `RESTORE ${id}`,
            confirmLabel: 'Continue',
            tone: 'danger',
        });
        if (!confirmation) return;
        const proof = await promptForSensitiveActionProof({
            actionLabel: 'restore backup',
            defaultReason: `Restore backup ${id}`,
            requireOtpHint: true,
        });
        if (!proof) return;
        try {
            await adminRestoreBackup(id, confirmation.trim(), proof);
            toast.success('Restore completed');
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Restore failed');
        }
    };

    const formatTimestamp = (value?: string) => {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return Date.now().toString();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    };

    const buildDownloadName = (item: any) => {
        const type = String(item?.type || 'full').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const stamp = formatTimestamp(item?.createdAt);
        return `campusway-backup-${type}-${stamp}.json`;
    };

    const handleDownload = async (item: any) => {
        if (!item?._id) return;
        setDownloadingId(String(item._id));
        try {
            const response = await adminDownloadBackup(String(item._id));
            downloadFile(response, { filename: buildDownloadName(item) });
            toast.success('Backup downloaded');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Download failed');
        } finally {
            setDownloadingId('');
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-bold text-white">Backups & Restore</h2>
                        <p className="text-sm text-slate-400">Run full/incremental backups and restore with typed confirmation.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-xl border border-indigo-500/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        <button disabled={running} onClick={() => void runBackup('full')} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            Run Full Backup
                        </button>
                        <button disabled={running} onClick={() => void runBackup('incremental')} className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            Run Incremental
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/50 p-4">
                <h3 className="mb-3 text-white font-semibold">Backup Jobs</h3>
                <div className="space-y-2">
                    {items.length === 0 ? <p className="text-sm text-slate-500">No backup jobs found.</p> : items.map((item) => (
                        <div key={item._id} className="rounded-xl border border-indigo-500/10 bg-slate-950/60 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-white font-semibold inline-flex items-center gap-1">
                                        <Database className="h-4 w-4 text-indigo-300" /> {item.type.toUpperCase()} / {item.storage.toUpperCase()}
                                    </p>
                                    <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                                </div>
                                <span className={`rounded px-2 py-1 text-xs ${item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : item.status === 'failed' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {item.localPath && (
                                    <button
                                        type="button"
                                        onClick={() => void handleDownload(item)}
                                        disabled={downloadingId === String(item._id)}
                                        title={getAdminBackupDownloadUrl(item._id)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/20 px-2 py-1 text-xs text-indigo-200 disabled:opacity-60"
                                    >
                                        <Download className="h-3.5 w-3.5" /> {downloadingId === String(item._id) ? 'Downloading...' : 'Download'}
                                    </button>
                                )}
                                {item.status === 'completed' && (
                                    <button onClick={() => void restore(item._id)} className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-200">
                                        Restore
                                    </button>
                                )}
                            </div>
                            {item.error && <p className="mt-2 text-xs text-rose-300">{item.error}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
