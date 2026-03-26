import { Users, CreditCard, FileCheck, AlertTriangle, Clock } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { DashboardQuickStatus } from '../../../services/api';

interface Props {
    status: DashboardQuickStatus;
}

const cards = [
    { key: 'profileScore', label: 'Profile', icon: Users, fmt: (v: number) => `${v}%`, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' },
    { key: 'subscriptionStatus', label: 'My Subscription', icon: CreditCard, fmt: (v: string) => v === 'active' ? 'Active' : 'Expired', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10', warn: (v: string) => v !== 'active' },
    { key: 'paymentStatus', label: 'Payment', icon: CreditCard, fmt: (v: string) => v === 'paid' ? 'Paid' : 'Pending', color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10', warn: (v: string) => v !== 'paid' },
    { key: 'upcomingExamsCount', label: 'Upcoming', icon: Clock, fmt: (v: number) => String(v), color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' },
    { key: 'completedExamsCount', label: 'Completed', icon: FileCheck, fmt: (v: number) => String(v), color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10' },
    { key: 'unreadAlertsCount', label: 'Alerts', icon: AlertTriangle, fmt: (v: number) => String(v), color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10', warn: (v: number) => v > 0 },
] as const;

export default function QuickStatusCards({ status }: Props) {
    return (
        <DashboardSection delay={0.05}>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {cards.map(c => {
                    const raw = status[c.key as keyof DashboardQuickStatus];
                    const isWarn = 'warn' in c && c.warn?.(raw as never);
                    return (
                        <div
                            key={c.key}
                            className={`rounded-xl border p-3 text-center transition ${
                                isWarn
                                    ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                            }`}
                        >
                            <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${c.color}`}>
                                <c.icon className="w-4 h-4" />
                            </div>
                            <p className="text-base font-bold text-slate-900 dark:text-white">{c.fmt(raw as never)}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</p>
                        </div>
                    );
                })}
            </div>
        </DashboardSection>
    );
}
