import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStudentMeNotifications, markStudentMeNotificationsRead } from '../../services/api';

type NotificationFilter = 'all' | 'exam' | 'payment' | 'system';

export default function StudentNotifications() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<NotificationFilter>('all');

    const notificationsQuery = useQuery({
        queryKey: ['student-hub', 'notifications', filter],
        queryFn: async () => (await getStudentMeNotifications(filter)).data,
    });

    const markAllMutation = useMutation({
        mutationFn: async () => (await markStudentMeNotificationsRead()).data,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['student-hub', 'notifications'] });
        },
    });
    const markOneMutation = useMutation({
        mutationFn: async (id: string) => (await markStudentMeNotificationsRead([id])).data,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['student-hub', 'notifications'] });
        },
    });

    const unreadCount = useMemo(
        () => Number(notificationsQuery.data?.unreadCount || 0),
        [notificationsQuery.data?.unreadCount]
    );

    const openItem = async (id: string, linkUrl?: string) => {
        await markOneMutation.mutateAsync(id);
        if (linkUrl) navigate(linkUrl);
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold inline-flex items-center gap-2">
                            <BellRing className="w-6 h-6" />
                            Notifications
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Unread: {unreadCount}
                        </p>
                    </div>
                    <button
                        onClick={() => markAllMutation.mutate()}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                        disabled={markAllMutation.isPending}
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all as read
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {(['all', 'exam', 'payment', 'system'] as NotificationFilter[]).map((item) => (
                        <button
                            key={item}
                            onClick={() => setFilter(item)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${filter === item
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                        >
                            {item[0].toUpperCase() + item.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                {notificationsQuery.isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : notificationsQuery.isError ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">Failed to load notifications.</p>
                ) : (
                    <div className="space-y-3">
                        {(notificationsQuery.data?.items || []).length === 0 ? (
                            <p className="text-sm text-slate-500">No notifications found.</p>
                        ) : (
                            (notificationsQuery.data?.items || []).map((item) => (
                                <button
                                    key={item._id}
                                    onClick={() => void openItem(item._id, item.linkUrl)}
                                    className={`w-full rounded-xl border p-4 text-left ${item.isRead
                                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900'
                                    : 'border-indigo-300/50 dark:border-indigo-500/40 bg-indigo-50/60 dark:bg-indigo-500/10'
                                    }`}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">{item.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.body}</p>
                                        </div>
                                        <span className="text-[11px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                                            {item.type}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        {new Date(item.publishAt).toLocaleString()}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
