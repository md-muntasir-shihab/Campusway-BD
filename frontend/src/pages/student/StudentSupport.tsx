import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h1 className="text-2xl font-bold">Support & Help</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Read announcements and create support tickets when your plan includes support access.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="text-lg font-bold">Notices</h2>
                    <div className="mt-3 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
                        {noticesQuery.isLoading ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                            ))
                        ) : noticesQuery.isError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                                <p className="font-semibold">Failed to load notices.</p>
                                <button
                                    type="button"
                                    onClick={() => noticesQuery.refetch()}
                                    className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-200"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (noticesQuery.data?.items || []).length === 0 ? (
                            <p className="text-sm text-slate-500">No notices available.</p>
                        ) : (
                            (noticesQuery.data?.items || []).map((item) => (
                                <div key={item._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="text-lg font-bold">Create ticket</h2>

                    {eligibilityQuery.isLoading ? (
                        <div className="space-y-3">
                            <div className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                            <div className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                            <div className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                        </div>
                    ) : eligibilityQuery.isError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                            <p className="font-semibold">Failed to verify support access.</p>
                            <p className="mt-1">
                                Support eligibility could not be confirmed, so ticket actions are blocked for now.
                            </p>
                            <button
                                type="button"
                                onClick={() => eligibilityQuery.refetch()}
                                className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-200"
                            >
                                Retry
                            </button>
                        </div>
                    ) : supportBlocked ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                Support is locked for this account
                            </p>
                            <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{supportBlockedMessage}</p>
                            <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs text-amber-900 dark:bg-slate-900/70 dark:text-amber-100">
                                <p>Plan: {supportEligibility?.planName || 'No active plan'}</p>
                                <p>Status: {supportEligibility?.status || 'missing'}</p>
                                {supportEligibility?.expiresAtUTC ? (
                                    <p>Expired at: {new Date(supportEligibility.expiresAtUTC).toLocaleString()}</p>
                                ) : null}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link
                                    to="/subscription-plans"
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                >
                                    Upgrade or Renew
                                </Link>
                                <Link
                                    to="/contact"
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
                                >
                                    Contact CampusWay
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={submit} className="space-y-3">
                                <input
                                    value={subject}
                                    onChange={(event) => setSubject(event.target.value)}
                                    placeholder="Subject"
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                                />
                                <textarea
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder="Write your issue"
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                                />
                                <select
                                    value={priority}
                                    onChange={(event) => setPriority(event.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={createTicketMutation.isPending}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {createTicketMutation.isPending ? 'Submitting...' : 'Submit ticket'}
                                </button>
                            </form>

                            <div>
                                <h3 className="text-sm font-semibold">My tickets</h3>
                                <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                                    {ticketsQuery.isLoading ? (
                                        Array.from({ length: 3 }).map((_, idx) => (
                                            <div key={idx} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                                        ))
                                    ) : ticketsQuery.isError ? (
                                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                                            <p className="font-semibold">Failed to load support tickets.</p>
                                            <button
                                                type="button"
                                                onClick={() => ticketsQuery.refetch()}
                                                className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-200"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : (ticketsQuery.data?.items || []).length === 0 ? (
                                        <p className="text-xs text-slate-500">No support tickets yet.</p>
                                    ) : (
                                        (ticketsQuery.data?.items || []).map((item) => (
                                            <Link
                                                to={`/support/${item._id}`}
                                                key={item._id}
                                                className="block rounded-lg border border-slate-200 p-2.5 transition hover:border-indigo-400 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
                                            >
                                                <p className="text-sm font-semibold">{item.subject}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {item.status} - {new Date(item.createdAt).toLocaleDateString()}
                                                </p>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
