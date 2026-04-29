import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Loader2 } from 'lucide-react';
import api from '../../services/api';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface Notification {
    _id: string;
    title: string;
    message?: string;
    category?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    isRead: boolean;
    link?: string;
    createdAt: string;
}

interface NotificationsResponse {
    items: Notification[];
    unreadCount: number;
}

/* ─── API helpers ───────────────────────────────────────────────────────────── */

const QUERY_KEY = ['notification-bell', 'recent'];

async function fetchNotifications(): Promise<NotificationsResponse> {
    const res = await api.get<NotificationsResponse>('/students/me/notifications', {
        params: { type: 'all' },
    });
    return {
        items: Array.isArray(res.data?.items) ? res.data.items : [],
        unreadCount: Number(res.data?.unreadCount ?? 0),
    };
}

async function markAsRead(ids: string[]): Promise<void> {
    await api.post('/students/me/notifications/mark-read', { ids });
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function priorityDot(priority?: string): string {
    switch (priority) {
        case 'urgent':
            return 'bg-rose-500';
        case 'high':
            return 'bg-amber-500';
        default:
            return 'bg-sky-500';
    }
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

/**
 * Notification bell icon with unread count badge and dropdown.
 *
 * - Fetches notifications via GET /students/me/notifications
 * - Shows recent notifications sorted by timestamp (newest first)
 * - Marks individual notifications as read on click
 * - Closes dropdown on outside click or Escape key
 *
 * @requirements 24.4
 */
export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchNotifications,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const markReadMutation = useMutation({
        mutationFn: markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            // Also invalidate the student-hub notifications query used by Navbar
            queryClient.invalidateQueries({ queryKey: ['student-hub', 'notifications'] });
        },
    });

    const unreadCount = data?.unreadCount ?? 0;
    const notifications = data?.items ?? [];
    // Show most recent 10, sorted by createdAt descending
    const recentNotifications = [...notifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

    const toggle = useCallback(() => setOpen((prev) => !prev), []);

    const handleMarkRead = useCallback(
        (id: string) => {
            markReadMutation.mutate([id]);
        },
        [markReadMutation],
    );

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            {/* Bell button */}
            <button
                type="button"
                onClick={toggle}
                className={[
                    'relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                    open
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'border-card-border/70 dark:border-dark-border/70 text-text-muted dark:text-dark-text/70 hover:bg-primary/5 hover:text-primary',
                ].join(' ')}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={open}
                aria-haspopup="true"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-4 text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-80 max-h-[28rem] overflow-y-auto rounded-2xl border border-card-border/70 dark:border-dark-border/70 bg-surface dark:bg-dark-surface shadow-xl z-50"
                >
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-card-border/50 dark:border-dark-border/50 bg-surface dark:bg-dark-surface px-4 py-3">
                        <h3 className="text-sm font-semibold text-text dark:text-dark-text">
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <span className="text-xs text-text-muted dark:text-dark-text/60">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-text-muted dark:text-dark-text/60" />
                        </div>
                    ) : recentNotifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-text-muted dark:text-dark-text/60">
                            No notifications yet
                        </div>
                    ) : (
                        <ul className="divide-y divide-card-border/40 dark:divide-dark-border/40">
                            {recentNotifications.map((n) => (
                                <li key={n._id} role="menuitem">
                                    <div
                                        className={[
                                            'flex items-start gap-3 px-4 py-3 transition-colors',
                                            n.isRead
                                                ? 'bg-transparent'
                                                : 'bg-primary/[0.03] dark:bg-primary/[0.06]',
                                            'hover:bg-primary/5 dark:hover:bg-primary/10',
                                        ].join(' ')}
                                    >
                                        {/* Priority dot */}
                                        <span
                                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : priorityDot(n.priority)
                                                }`}
                                        />

                                        <div className="min-w-0 flex-1">
                                            {n.link ? (
                                                <Link
                                                    to={n.link}
                                                    onClick={() => {
                                                        if (!n.isRead) handleMarkRead(n._id);
                                                        setOpen(false);
                                                    }}
                                                    className="block"
                                                >
                                                    <p className="truncate text-sm font-medium text-text dark:text-dark-text">
                                                        {n.title}
                                                    </p>
                                                    {n.message && (
                                                        <p className="mt-0.5 line-clamp-2 text-xs text-text-muted dark:text-dark-text/60">
                                                            {n.message}
                                                        </p>
                                                    )}
                                                </Link>
                                            ) : (
                                                <>
                                                    <p className="truncate text-sm font-medium text-text dark:text-dark-text">
                                                        {n.title}
                                                    </p>
                                                    {n.message && (
                                                        <p className="mt-0.5 line-clamp-2 text-xs text-text-muted dark:text-dark-text/60">
                                                            {n.message}
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            <p className="mt-1 text-[11px] text-text-muted/70 dark:text-dark-text/40">
                                                {timeAgo(n.createdAt)}
                                            </p>
                                        </div>

                                        {/* Mark as read button */}
                                        {!n.isRead && (
                                            <button
                                                type="button"
                                                onClick={() => handleMarkRead(n._id)}
                                                className="mt-0.5 shrink-0 rounded-full p-1 text-text-muted/60 hover:bg-primary/10 hover:text-primary transition-colors"
                                                aria-label="Mark as read"
                                                title="Mark as read"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* View all link */}
                    <div className="sticky bottom-0 border-t border-card-border/50 dark:border-dark-border/50 bg-surface dark:bg-dark-surface px-4 py-2.5">
                        <Link
                            to="/notifications"
                            onClick={() => setOpen(false)}
                            className="block text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
