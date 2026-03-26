import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentLiveAlertItem, StudentNotificationItem } from '../../../services/api';

interface Props {
    alerts: { items: StudentLiveAlertItem[]; totalCount: number };
    notifications: { items: StudentNotificationItem[]; totalCount: number };
    maxVisible?: number;
}

const alertTypeIcon = (type: string) => {
    if (type.includes('payment') || type.includes('expire')) return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    if (type.includes('result') || type.includes('success')) return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    return <Info className="w-3.5 h-3.5 text-indigo-500" />;
};

export default function LiveAlertsSection({ alerts, notifications, maxVisible = 5 }: Props) {
    const combined = [
        ...alerts.items.map(a => ({ id: a.id || a.type, text: a.message, type: a.type, time: a.dateIso || '', isAlert: true })),
        ...notifications.items.slice(0, 3).map(n => ({ id: n._id, text: n.title || n.message, type: 'notification', time: n.publishAt || '', isAlert: false })),
    ].slice(0, maxVisible);

    if (combined.length === 0) return null;

    return (
        <DashboardSection delay={0.16}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-rose-500" />
                        Alerts & Notifications
                    </h3>
                    {alerts.totalCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                            {alerts.totalCount > 9 ? '9+' : alerts.totalCount}
                        </span>
                    )}
                </div>
                <div className="space-y-2">
                    {combined.map(item => (
                        <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div className="mt-0.5 shrink-0">{alertTypeIcon(item.type)}</div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-2">{item.text}</p>
                                {item.time && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(item.time).toLocaleDateString()}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <Link to="/notifications" className="mt-2 inline-block text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    View all &rarr;
                </Link>
            </div>
        </DashboardSection>
    );
}
