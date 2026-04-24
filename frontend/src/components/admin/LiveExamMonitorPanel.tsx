import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, MonitorPlay, CheckCircle2, Ban, ShieldAlert, Lock, MessageSquare } from 'lucide-react';
import {
    adminGetLiveExamSessions,
    adminLiveAttemptAction,
    AdminLiveExamSession,
    getAdminLiveStreamUrl,
} from '../../services/api';
import { showPromptDialog } from '../../lib/appDialog';

const LIVE_EVENTS = [
    'attempt-connected',
    'attempt-updated',
    'exam-metrics-updated',
    'violation',
    'warn-sent',
    'attempt-locked',
    'forced-submit',
    'autosave',
    'ping',
] as const;

export default function LiveExamMonitorPanel() {
    const [sessions, setSessions] = useState<AdminLiveExamSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [streamConnected, setStreamConnected] = useState(false);
    const [reconnectDelayMs, setReconnectDelayMs] = useState(1000);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchSessions = async (hideLoader = false) => {
        try {
            if (!hideLoader) setLoading(true);
            else setRefreshing(true);
            const res = await adminGetLiveExamSessions({ limit: 50 });
            setSessions(res.data.sessions || []);
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to load live sessions');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        let source: EventSource | null = null;
        let backoffMs = 1000;

        const connect = () => {
            if (cancelled) return;
            source = new EventSource(getAdminLiveStreamUrl(), { withCredentials: true });
            source.onopen = () => {
                if (cancelled) return;
                setStreamConnected(true);
                backoffMs = 1000;
                setReconnectDelayMs(backoffMs);
            };

            LIVE_EVENTS.forEach((eventName) => {
                source?.addEventListener(eventName, () => {
                    if (eventName !== 'ping') {
                        void fetchSessions(true);
                    }
                });
            });

            source.onerror = () => {
                setStreamConnected(false);
                source?.close();
                if (cancelled) return;
                setReconnectDelayMs(backoffMs);
                reconnectTimer.current = setTimeout(connect, backoffMs);
                backoffMs = Math.min(backoffMs * 2, 30000);
            };
        };

        connect();

        return () => {
            cancelled = true;
            setStreamConnected(false);
            source?.close();
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
            }
        };
    }, []);

    useEffect(() => {
        void fetchSessions();
        const interval = setInterval(() => void fetchSessions(true), 15000);
        return () => clearInterval(interval);
    }, []);

    const sessionCountLabel = useMemo(() => `${sessions.length} live`, [sessions.length]);

    const runAction = async (
        attemptId: string,
        action: 'warn' | 'force_submit' | 'lock' | 'message',
        message?: string,
    ) => {
        try {
            setActionLoading(`${attemptId}:${action}`);
            await adminLiveAttemptAction(attemptId, { action, message });
            const successMessage = action === 'force_submit'
                ? 'Attempt force-submitted'
                : action === 'lock'
                    ? 'Attempt locked'
                    : action === 'warn'
                        ? 'Warning sent'
                        : 'Message sent';
            toast.success(successMessage);
            void fetchSessions(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleWarn = async (attemptId: string) => {
        const message = await showPromptDialog({
            title: 'Warning message',
            message: 'Send a warning to the student.',
            defaultValue: 'Security warning from proctor.',
            confirmLabel: 'Send warning',
            allowEmpty: true,
        }) || 'Security warning from proctor.';
        await runAction(attemptId, 'warn', message);
    };

    const handleMessage = async (attemptId: string) => {
        const message = await showPromptDialog({
            title: 'Message to student',
            message: 'Send a direct message to the student.',
            defaultValue: 'Please return to fullscreen mode.',
            confirmLabel: 'Send message',
            allowEmpty: true,
        }) || '';
        if (!message.trim()) return;
        await runAction(attemptId, 'message', message.trim());
    };

    if (loading && !sessions.length) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/65 p-6 rounded-2xl border border-indigo-500/10 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <MonitorPlay className="w-6 h-6 text-indigo-400" />
                        Live Exam Monitor
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {sessionCountLabel} attempts · stream {streamConnected ? 'connected' : `reconnecting (${Math.ceil(reconnectDelayMs / 1000)}s)`}
                    </p>
                </div>
                <button
                    onClick={() => void fetchSessions(true)}
                    className="relative z-10 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-medium border border-indigo-500/20"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Now
                </button>
            </div>

            <div className="bg-slate-950/65 rounded-2xl border border-indigo-500/10 overflow-hidden">
                <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 min-h-[400px]">
                    <table className="w-full text-left border-collapse min-w-[640px]">
                        <thead>
                            <tr className="border-b border-indigo-500/10 bg-slate-950/80">
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Exam</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Progress</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Violations</th>
                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-500/10">
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                            </div>
                                            <p>No active exams taking place right now.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sessions.map((session) => (
                                    <tr key={session._id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-white">{session.student?.fullName || 'Unknown Student'}</div>
                                            <div className="text-xs text-slate-400">{session.student?.email || 'N/A'}</div>
                                            {session.deviceIp ? <div className="text-[11px] text-slate-500 mt-1">IP: {session.deviceIp}</div> : null}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-indigo-300 font-medium flex items-center gap-2">
                                                {session.exam?.title || 'Unknown Exam'}
                                                {session.isSuspicious ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                                        Flagged
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="text-xs text-slate-500">{session.exam?.subject || ''}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-300 flex flex-col gap-1">
                                                <span><span className="text-slate-500">Current Q:</span> {session.currentQuestionId || 'N/A'}</span>
                                                <span><span className="text-slate-500">Progress:</span> {session.progressPercent ?? 0}%</span>
                                                <span><span className="text-slate-500">Last Save:</span> {session.lastSavedAt ? new Date(session.lastSavedAt).toLocaleTimeString() : 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="flex flex-col items-center" title="Tab Switches">
                                                    <span className={`text-lg font-bold ${(session.tabSwitchCount || 0) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                        {session.tabSwitchCount || 0}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">Tabs</span>
                                                </div>
                                                <div className="flex flex-col items-center" title="Copy-Paste Violations">
                                                    <span className={`text-lg font-bold ${(session.copyPasteViolations || 0) > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                        {session.copyPasteViolations || 0}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">Copy</span>
                                                </div>
                                                <div className="flex flex-col items-center" title="Fullscreen Exits">
                                                    <span className={`text-lg font-bold ${(session.fullscreenExits || 0) > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                                                        {session.fullscreenExits || 0}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">FS Exit</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="inline-flex flex-wrap justify-end gap-2">
                                                <button
                                                    onClick={() => void handleWarn(session._id)}
                                                    disabled={actionLoading === `${session._id}:warn`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 rounded-lg text-xs font-medium border border-amber-500/20"
                                                >
                                                    <ShieldAlert className="w-3.5 h-3.5" /> Warn
                                                </button>
                                                <button
                                                    onClick={() => void handleMessage(session._id)}
                                                    disabled={actionLoading === `${session._id}:message`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 rounded-lg text-xs font-medium border border-cyan-500/20"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" /> Message
                                                </button>
                                                <button
                                                    onClick={() => void runAction(session._id, 'lock')}
                                                    disabled={actionLoading === `${session._id}:lock`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 disabled:opacity-50 rounded-lg text-xs font-medium border border-orange-500/20"
                                                >
                                                    <Lock className="w-3.5 h-3.5" /> Lock
                                                </button>
                                                <button
                                                    onClick={() => void runAction(session._id, 'force_submit')}
                                                    disabled={actionLoading === `${session._id}:force_submit`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 rounded-lg text-xs font-medium border border-rose-500/20"
                                                >
                                                    <Ban className="w-3.5 h-3.5" /> Force Submit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
