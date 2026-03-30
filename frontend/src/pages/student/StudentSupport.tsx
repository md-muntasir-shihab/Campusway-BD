import { FormEvent, useState } from 'react';
import { SEO } from '../../components/common/SEO';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    MessageCircle, Send, AlertTriangle, Megaphone, ChevronRight,
    Clock, CheckCircle2, AlertCircle, Loader2, LifeBuoy, Shield, Zap,
} from 'lucide-react';
import {
    createStudentSupportTicket,
    getStudentNotices,
    getStudentSupportEligibility,
    getStudentSupportTickets,
    trackAnalyticsEvent,
} from '../../services/api';

function readErrorMessage(error: unknown, fallback: string): string {
    const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return typeof responseMessage === 'string' && responseMessage.trim() ? responseMessage : fallback;
}

const priorityConfig = {
    low: { label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
    medium: { label: 'Medium', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-400' },
    high: { label: 'High', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-400' },
    urgent: { label: 'Urgent', color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', dot: 'bg-rose-500' },
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    open: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-blue-600 dark:text-blue-400' },
    'in_progress': { icon: <Loader2 className="w-3.5 h-3.5" />, color: 'text-amber-600 dark:text-amber-400' },
    resolved: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-600 dark:text-emerald-400' },
    closed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-slate-500' },
};

export default function StudentSupport() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

    const eligibilityQuery = useQuery({
        queryKey: ['student-hub', 'support', 'eligibility'],
        queryFn: async () => (await getStudentSupportEligibility()).data,
    });
    const noticesQuery = useQuery({
        queryKey: ['student-hub', 'support', 'notices'],
        queryFn: async () => (await getStudentNotices()).data,
    });
    const ticketsQuery = useQuery({
        queryKey: ['student-hub', 'support', 'tickets'],
        enabled: eligibilityQuery.data?.allowed === true,
        queryFn: async () => (await getStudentSupportTickets()).data,
    });

    const createTicketMutation = useMutation({
        mutationFn: async () => (await createStudentSupportTicket({ subject, message, priority })).data,
        onSuccess: async (response) => {
            void trackAnalyticsEvent({
                eventName: 'support_ticket_created',
                module: 'support',
                source: 'student',
                meta: { priority, subjectLength: subject.trim().length },
            }).catch(() => undefined);
            setSubject('');
            setMessage('');
            setPriority('medium');
            await queryClient.invalidateQueries({ queryKey: ['student-hub', 'support', 'tickets'] });
            navigate(`/support/${response.item._id}`);
        },
        onError: (error) => {
            toast.error(readErrorMessage(error, 'Failed to create support ticket'));
        },
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (eligibilityQuery.data?.allowed !== true) {
            toast.error('Active subscription required to access support.');
            return;
        }
        if (!subject.trim() || !message.trim()) {
            toast.error('Subject and message are required.');
            return;
        }
        createTicketMutation.mutate();
    };

    const supportEligibility = eligibilityQuery.data;
    const supportBlocked = eligibilityQuery.isSuccess && supportEligibility?.allowed === false;
    const supportBlockedMessage = supportEligibility?.reason === 'expired_subscription'
        ? 'Your subscription has expired. Renew it to continue support conversations.'
        : 'Support is available only to students with an active subscription.';

    const tickets = ticketsQuery.data?.items || [];
    const notices = noticesQuery.data?.items || [];

    return (
        <div className="space-y-6">
            <SEO title="Support" description="Get help and create support tickets on CampusWay. View announcements and track your requests." />

            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-800/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 sm:p-8 shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-60" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 shrink-0">
                        <LifeBuoy className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Support & Help</h1>
                        <p className="mt-1 text-sm text-white/70 max-w-lg">
                            Read important announcements and create support tickets. Our team is here to help you succeed.
                        </p>
                    </div>
                </div>
                {/* Quick stats */}
                <div className="relative z-10 mt-5 grid grid-cols-3 gap-3">
                    {[
                        { label: 'Open Tickets', value: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length, icon: <MessageCircle className="w-4 h-4" /> },
                        { label: 'Resolved', value: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length, icon: <CheckCircle2 className="w-4 h-4" /> },
                        { label: 'Notices', value: notices.length, icon: <Megaphone className="w-4 h-4" /> },
                    ].map(stat => (
                        <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-white/60 mb-0.5">{stat.icon}<span className="text-[10px] uppercase tracking-wider font-medium">{stat.label}</span></div>
                            <p className="text-xl font-bold text-white">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* Notices Section */}
                <section className="rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
                        <Megaphone className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Announcements</h2>
                        <span className="ml-auto text-xs font-semibold text-slate-400">{notices.length}</span>
                    </div>
                    <div className="p-4 max-h-[28rem] overflow-y-auto space-y-3">
                        {noticesQuery.isLoading ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                            ))
                        ) : noticesQuery.isError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                                <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load notices.</p>
                                <button type="button" onClick={() => noticesQuery.refetch()} className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition dark:border-rose-800 dark:text-rose-200">Retry</button>
                            </div>
                        ) : notices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <Megaphone className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No announcements right now</p>
                                <p className="text-xs mt-1">Check back later for important updates</p>
                            </div>
                        ) : (
                            notices.map((item) => (
                                <div key={item._id} className="group rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-200">
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 shrink-0 mt-0.5">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.title}</p>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Create Ticket Section */}
                <section className="rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
                        <Send className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Ticket</h2>
                    </div>
                    <div className="p-5">
                        {eligibilityQuery.isLoading ? (
                            <div className="space-y-3">
                                <div className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                                <div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                                <div className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                            </div>
                        ) : eligibilityQuery.isError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                                <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to verify support access.</p>
                                <p className="mt-1 text-xs">Support eligibility could not be confirmed.</p>
                                <button type="button" onClick={() => eligibilityQuery.refetch()} className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition dark:border-rose-800 dark:text-rose-200">Retry</button>
                            </div>
                        ) : supportBlocked ? (
                            <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-800/40">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                                        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Support Locked</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300">{supportBlockedMessage}</p>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white/70 dark:bg-slate-900/50 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1 mb-3">
                                    <p>Plan: <span className="font-medium">{supportEligibility?.planName || 'No active plan'}</span></p>
                                    <p>Status: <span className="font-medium">{supportEligibility?.status || 'missing'}</span></p>
                                    {supportEligibility?.expiresAtUTC && (
                                        <p>Expired: <span className="font-medium">{new Date(supportEligibility.expiresAtUTC).toLocaleString()}</span></p>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link to="/subscription-plans" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm">
                                        Upgrade or Renew
                                    </Link>
                                    <Link to="/contact" className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                        Contact CampusWay
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <>
                                <form onSubmit={submit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Subject</label>
                                        <input
                                            value={subject}
                                            onChange={(event) => setSubject(event.target.value)}
                                            placeholder="Brief summary of the issue"
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Message</label>
                                        <textarea
                                            value={message}
                                            onChange={(event) => setMessage(event.target.value)}
                                            placeholder="Describe your issue in detail..."
                                            rows={4}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Priority</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setPriority(p)}
                                                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                                                        priority === p
                                                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500 shadow-sm ring-2 ring-indigo-400/20'
                                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {priorityConfig[p].label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={createTicketMutation.isPending}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 transition shadow-md shadow-indigo-500/20"
                                    >
                                        {createTicketMutation.isPending ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                        ) : (
                                            <><Send className="w-4 h-4" /> Submit Ticket</>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </section>
            </div>

            {/* My Tickets Section */}
            {eligibilityQuery.isSuccess && !supportBlocked && (
                <section className="rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
                        <MessageCircle className="w-5 h-5 text-violet-500" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Tickets</h2>
                        <span className="ml-auto rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300">{tickets.length}</span>
                    </div>
                    <div className="p-4">
                        {ticketsQuery.isLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <div key={idx} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                                ))}
                            </div>
                        ) : ticketsQuery.isError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                                <p className="font-semibold">Failed to load support tickets.</p>
                                <button type="button" onClick={() => ticketsQuery.refetch()} className="mt-2 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition dark:border-rose-800 dark:text-rose-200">Retry</button>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No tickets yet</p>
                                <p className="text-xs mt-1">Create your first ticket above if you need help</p>
                            </div>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {tickets.map((item) => {
                                    const status = statusConfig[item.status] || statusConfig.open;
                                    const pri = priorityConfig[(item as any).priority as keyof typeof priorityConfig] || priorityConfig.medium;
                                    return (
                                        <Link
                                            to={`/support/${item._id}`}
                                            key={item._id}
                                            className="group flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 p-3.5 transition-all duration-200 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.subject}</p>
                                                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${status.color}`}>
                                                        {status.icon}
                                                        {item.status}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${pri.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                                                        {pri.label}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition shrink-0" />
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
