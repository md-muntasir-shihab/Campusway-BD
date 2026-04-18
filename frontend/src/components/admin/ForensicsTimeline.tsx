import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Clock as ClockIcon,
    Eye as EyeIcon,
    Copy as CopyIcon,
    Maximize as MaximizeIcon,
    AlertTriangle as AlertTriangleIcon,
    RotateCcw as ArrowPathIcon,
    Monitor as MonitorIcon,
    MousePointer as CursorIcon,
    Wifi as WifiIcon,
    Bug as BugIcon,
    Shield as ShieldIcon,
    MessageSquare as MessageIcon,
    Save as SaveIcon,
    Send as SendIcon,
    Search as SearchIcon,
} from 'lucide-react';
import {
    adminGetForensicsTimeline,
    type ForensicsTimelineEvent,
} from '../../services/api';

/* ── Event type display config ── */

const EVENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    tab_switch: { label: 'Tab Switch', icon: EyeIcon, color: 'text-amber-500 bg-amber-500/10 border-amber-200 dark:border-amber-800' },
    fullscreen_exit: { label: 'Fullscreen Exit', icon: MaximizeIcon, color: 'text-orange-500 bg-orange-500/10 border-orange-200 dark:border-orange-800' },
    copy_attempt: { label: 'Copy Attempt', icon: CopyIcon, color: 'text-red-500 bg-red-500/10 border-red-200 dark:border-red-800' },
    blur: { label: 'Window Blur', icon: MonitorIcon, color: 'text-purple-500 bg-purple-500/10 border-purple-200 dark:border-purple-800' },
    context_menu_blocked: { label: 'Context Menu Blocked', icon: CursorIcon, color: 'text-pink-500 bg-pink-500/10 border-pink-200 dark:border-pink-800' },
    resume: { label: 'Session Resume', icon: WifiIcon, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-200 dark:border-emerald-800' },
    client_error: { label: 'Client Error', icon: BugIcon, color: 'text-red-600 bg-red-600/10 border-red-300 dark:border-red-700' },
    anti_cheat_decision: { label: 'Anti-Cheat Decision', icon: ShieldIcon, color: 'text-blue-500 bg-blue-500/10 border-blue-200 dark:border-blue-800' },
    warn_sent: { label: 'Warning Sent', icon: AlertTriangleIcon, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-200 dark:border-yellow-800' },
    admin_action: { label: 'Admin Action', icon: ShieldIcon, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-200 dark:border-indigo-800' },
    save: { label: 'Answer Saved', icon: SaveIcon, color: 'text-gray-400 bg-gray-400/10 border-gray-200 dark:border-gray-700' },
    submit: { label: 'Submitted', icon: SendIcon, color: 'text-emerald-600 bg-emerald-600/10 border-emerald-200 dark:border-emerald-800' },
    message_sent: { label: 'Message Sent', icon: MessageIcon, color: 'text-sky-500 bg-sky-500/10 border-sky-200 dark:border-sky-800' },
    error: { label: 'Error', icon: BugIcon, color: 'text-red-500 bg-red-500/10 border-red-200 dark:border-red-800' },
};

const DEFAULT_EVENT_CONFIG = { label: 'Event', icon: ClockIcon, color: 'text-gray-400 bg-gray-400/10 border-gray-200 dark:border-gray-700' };

/* ── Props ── */

interface ForensicsTimelineProps {
    examId: string;
    sessionId: string;
}

/* ── Component ── */

export default function ForensicsTimeline({ examId, sessionId }: ForensicsTimelineProps) {
    const [filterType, setFilterType] = useState('');
    const [searchText, setSearchText] = useState('');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['forensicsTimeline', examId, sessionId],
        queryFn: () => adminGetForensicsTimeline(examId, sessionId).then((r) => r.data?.data ?? []),
        staleTime: 30_000,
        enabled: !!examId && !!sessionId,
    });

    const events: ForensicsTimelineEvent[] = data ?? [];

    const filtered = events.filter((e) => {
        if (filterType && e.eventType !== filterType) return false;
        if (searchText) {
            const text = searchText.toLowerCase();
            const metaStr = JSON.stringify(e.metadata || {}).toLowerCase();
            if (!e.eventType.toLowerCase().includes(text) && !metaStr.includes(text) && !(e.ip || '').includes(text)) {
                return false;
            }
        }
        return true;
    });

    const uniqueTypes = [...new Set(events.map((e) => e.eventType))].sort();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <ArrowPathIcon className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <ClockIcon className="w-5 h-5" /> Event Timeline
                    <span className="ml-1 text-xs font-normal text-gray-400">({filtered.length} events)</span>
                </h3>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/6 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                    <ArrowPathIcon className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select
                    title="Filter by event type"
                    aria-label="Filter by event type"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1.5 bg-slate-950/70 border-white/10 text-slate-200"
                >
                    <option value="">All Event Types</option>
                    {uniqueTypes.map((t) => (
                        <option key={t} value={t}>{(EVENT_CONFIG[t] || DEFAULT_EVENT_CONFIG).label}</option>
                    ))}
                </select>
                <div className="relative">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search metadata..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="text-xs border rounded-lg pl-7 pr-2 py-1.5 bg-slate-950/70 border-white/10 text-slate-200 w-48"
                    />
                </div>
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No events found</div>
            ) : (
                <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                    {filtered.map((event, idx) => {
                        const config = EVENT_CONFIG[event.eventType] || DEFAULT_EVENT_CONFIG;
                        const Icon = config.icon;
                        return (
                            <motion.div
                                key={event._id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                                className={`relative rounded-xl border p-3 ${config.color}`}
                            >
                                {/* Timeline dot */}
                                <div className="absolute -left-[1.85rem] top-3.5 w-3 h-3 rounded-full bg-current border-2 border-white dark:border-gray-900" />

                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm font-medium truncate">{config.label}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                        {new Date(event.createdAt).toLocaleString()}
                                    </span>
                                </div>

                                {/* Metadata */}
                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                    <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono bg-black/10 dark:bg-black/20 rounded-lg p-2 overflow-x-auto max-h-24 overflow-y-auto">
                                        {JSON.stringify(event.metadata, null, 2)}
                                    </div>
                                )}

                                {/* IP */}
                                {event.ip && (
                                    <p className="mt-1 text-[10px] text-gray-400">IP: {event.ip}</p>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
