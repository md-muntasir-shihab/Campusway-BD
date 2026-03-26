import { FormEvent, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LifeBuoy, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudentSupportTicket, replyStudentSupportTicket } from '../../services/api';

const statusTone: Record<string, string> = {
    open: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
    resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    closed: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

export default function StudentSupportThread() {
    const { ticketId } = useParams<{ ticketId: string }>();
    const queryClient = useQueryClient();
    const [replyDraft, setReplyDraft] = useState('');

    const ticketQuery = useQuery({
        queryKey: ['student-hub', 'support', 'ticket', ticketId],
        queryFn: async () => {
            if (!ticketId) throw new Error('Missing ticket id');
            return (await getStudentSupportTicket(ticketId)).data.item;
        },
        enabled: Boolean(ticketId),
    });

    const replyMutation = useMutation({
        mutationFn: async () => {
            if (!ticketId) throw new Error('Missing ticket id');
            return (await replyStudentSupportTicket(ticketId, replyDraft.trim())).data;
        },
        onSuccess: async () => {
            setReplyDraft('');
            toast.success('Reply sent');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['student-hub', 'support', 'tickets'] }),
                queryClient.invalidateQueries({ queryKey: ['student-hub', 'support', 'ticket', ticketId] }),
                queryClient.invalidateQueries({ queryKey: ['student-hub', 'notifications'] }),
            ]);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Reply failed');
        },
    });

    if (!ticketId) return <Navigate to="/support" replace />;

    const item = ticketQuery.data;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!replyDraft.trim()) {
            toast.error('Reply message is required');
            return;
        }
        replyMutation.mutate();
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <Link to="/support" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-300">
                            <ArrowLeft className="h-4 w-4" />
                            Back to support
                        </Link>
                        <h1 className="mt-3 text-2xl font-bold">Support Thread</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Follow the full conversation with the admin team.
                        </p>
                    </div>
                    {item && (
                        <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.ticketNo}</p>
                            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone[item.status] || statusTone.open}`}>
                                {item.status.replace('_', ' ')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {ticketQuery.isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                </div>
            ) : ticketQuery.isError || !item ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    Unable to load this support ticket.
                </div>
            ) : (
                <>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                                <LifeBuoy className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-bold">{item.subject}</h2>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Created {new Date(item.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {(item.timeline || []).map((entry, index) => {
                            const isStudent = entry.actorRole === 'student';
                            return (
                                <div
                                    key={`${entry.createdAt}-${index}`}
                                    className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-3xl rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                            isStudent
                                                ? 'rounded-br-sm bg-indigo-600 text-white'
                                                : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                                        }`}
                                    >
                                        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                                            <span>{isStudent ? 'You' : 'Admin'}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap">{entry.message}</p>
                                        <div className={`mt-2 text-[11px] ${isStudent ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {new Date(entry.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                        <label className="mb-2 block text-sm font-semibold">Reply to this ticket</label>
                        <textarea
                            value={replyDraft}
                            onChange={(event) => setReplyDraft(event.target.value)}
                            rows={4}
                            disabled={item.status === 'closed' || replyMutation.isPending}
                            placeholder={item.status === 'closed' ? 'This ticket is closed.' : 'Write your reply'}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {item.status === 'closed'
                                    ? 'Closed tickets cannot receive new replies.'
                                    : 'Your reply will stay in the same thread for admin review.'}
                            </p>
                            <button
                                type="submit"
                                disabled={item.status === 'closed' || replyMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                <Send className="h-4 w-4" />
                                {replyMutation.isPending ? 'Sending...' : 'Send reply'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}
