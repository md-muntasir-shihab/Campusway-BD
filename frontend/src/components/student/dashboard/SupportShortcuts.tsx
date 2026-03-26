import { Link } from 'react-router-dom';
import { HelpCircle, MessageSquare, PlusCircle } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { DashboardSupportSummary } from '../../../services/api';

interface Props {
    support: DashboardSupportSummary;
}

export default function SupportShortcuts({ support }: Props) {
    return (
        <DashboardSection delay={0.3}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-teal-500" />
                        Support
                    </h3>
                    {support.openTickets > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{support.openTickets} open</span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                    <Link to="/support" className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/15 transition">
                        <PlusCircle className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">New Ticket</span>
                    </Link>
                    <Link to="/support" className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">My Tickets</span>
                    </Link>
                </div>

                {support.recentTickets.length > 0 && (
                    <div className="space-y-1.5">
                        {support.recentTickets.slice(0, 3).map(t => (
                            <Link to={`/support/${t._id}`} key={t._id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{t.subject}</p>
                                    <p className="text-[10px] text-slate-400">#{t.ticketNo}</p>
                                </div>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                                    t.status === 'open' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                                    t.status === 'resolved' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {t.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </DashboardSection>
    );
}
