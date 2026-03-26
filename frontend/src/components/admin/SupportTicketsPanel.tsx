import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    adminCreateNotice,
    adminGetNotices,
    adminGetStudentGroups,
    adminGetStudents,
    adminGetSupportTickets,
    adminReplySupportTicket,
    adminToggleNotice,
    adminUpdateSupportTicketStatus,
    type AdminNoticeItem,
    type AdminStudentGroup,
    type AdminStudentItem,
    type AdminSupportTicketItem,
} from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';
import { useAdminRuntimeFlags } from '../../hooks/useAdminRuntimeFlags';
import InfoHint from '../ui/InfoHint';
import AdminGuideButton, { type AdminGuideButtonProps } from './AdminGuideButton';
import {
    RefreshCw, MessageSquare, Bell, Send, User,
    Clock, CheckCircle,
    ArrowLeft, ExternalLink, Calendar
} from 'lucide-react';

// Using native date formatting instead of date-fns to avoid dependency issues
const formatDate = (
    date?: Date | string | null,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' },
) => {
    if (!date) return 'N/A';
    try {
        return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
    } catch (e) {
        return 'N/A';
    }
};

const formatFullDate = (date?: Date | string | null) => {
    return formatDate(date, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatTime = (date?: Date | string | null) => {
    return formatDate(date, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

const getStudentDisplayName = (student: AdminSupportTicketItem['studentId']) => {
    if (!student || typeof student === 'string') return 'Unknown student';
    return student.full_name || student.username || student.email || 'Unknown student';
};

type NoticeRecipientOption = {
    id: string;
    title: string;
    subtitle: string;
};

type InlineGuide = Omit<AdminGuideButtonProps, 'variant' | 'tone'>;

const SUPPORT_GUIDES: Record<'ticketsTab' | 'noticesTab' | 'status' | 'reply', InlineGuide> = {
    ticketsTab: {
        title: 'Tickets',
        content: 'Review and reply to subscriber support conversations from the threaded support inbox.',
        affected: 'Subscribed students, support staff, and unread support state.',
    },
    noticesTab: {
        title: 'Notices',
        content: 'Create and manage notice broadcasts sent to groups or students.',
        affected: 'Targeted student recipients and admin communication flows.',
    },
    status: {
        title: 'Ticket Status',
        content: 'Update the operational state of the selected support ticket.',
        enabledNote: 'The selected status becomes the live ticket state immediately.',
        disabledNote: 'This control is not a toggle; choose the correct workflow state instead of leaving the wrong status active.',
        affected: 'Support workflow, unread review, and admin tracking.',
    },
    reply: {
        title: 'Send Reply',
        content: 'Send the current admin response into the support thread.',
        affected: 'The student support thread and unread counts.',
    },
};

export default function SupportTicketsPanel() {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const runtimeFlags = useAdminRuntimeFlags();
    const [tab, setTab] = useState<'tickets' | 'notices'>('tickets');
    const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicketItem | null>(null);
    const [replyDraft, setReplyDraft] = useState('');

    const [noticeForm, setNoticeForm] = useState({
        title: '',
        message: '',
        target: 'all' as 'all' | 'groups' | 'students',
        targetIds: [] as string[],
        startAt: '',
        endAt: '',
    });
    const [recipientSearch, setRecipientSearch] = useState('');

    const ticketsQuery = useQuery<AdminSupportTicketItem[]>({
        queryKey: queryKeys.supportTickets,
        queryFn: async () => (await adminGetSupportTickets({ page: 1, limit: 50 })).data.items || [],
    });
    const noticesQuery = useQuery<AdminNoticeItem[]>({
        queryKey: queryKeys.supportNotices,
        queryFn: async () => (await adminGetNotices({ page: 1, limit: 20 })).data.items || [],
    });
    const studentsQuery = useQuery<AdminStudentItem[]>({
        queryKey: ['admin', 'notice-target-students'],
        queryFn: async () => (await adminGetStudents({ page: 1, limit: 300 })).data.items || [],
        enabled: tab === 'notices',
        staleTime: 60_000,
    });
    const groupsQuery = useQuery<AdminStudentGroup[]>({
        queryKey: ['admin', 'notice-target-groups'],
        queryFn: async () => (await adminGetStudentGroups()).data.items || [],
        enabled: tab === 'notices',
        staleTime: 60_000,
    });

    const tickets = ticketsQuery.data || [];
    const notices = noticesQuery.data || [];
    const students = studentsQuery.data || [];
    const groups = groupsQuery.data || [];
    const loading = tab === 'tickets'
        ? ticketsQuery.isFetching
        : (noticesQuery.isFetching || studentsQuery.isFetching || groupsQuery.isFetching);
    const hasError = tab === 'tickets'
        ? ticketsQuery.isError
        : (noticesQuery.isError || studentsQuery.isError || groupsQuery.isError);

    const recipientOptions = useMemo<NoticeRecipientOption[]>(() => {
        if (noticeForm.target === 'students') {
            return students.map((student) => ({
                id: student._id,
                title: student.fullName || student.username || student.email,
                subtitle: [student.username, student.email].filter(Boolean).join(' · '),
            }));
        }
        if (noticeForm.target === 'groups') {
            return groups.map((group) => ({
                id: group._id,
                title: group.name,
                subtitle: group.batchTag || group.description || group.slug,
            }));
        }
        return [];
    }, [groups, noticeForm.target, students]);

    const filteredRecipientOptions = useMemo(() => {
        const needle = recipientSearch.trim().toLowerCase();
        if (!needle) return recipientOptions;
        return recipientOptions.filter((item) =>
            `${item.title} ${item.subtitle}`.toLowerCase().includes(needle)
        );
    }, [recipientOptions, recipientSearch]);

    useEffect(() => {
        if (!selectedTicket) return;
        const updated = tickets.find((ticket) => ticket._id === selectedTicket._id);
        if (updated) setSelectedTicket(updated);
    }, [tickets, selectedTicket]);

    useEffect(() => {
        const ticketId = searchParams.get('ticketId');
        if (!ticketId || tickets.length === 0) return;
        const target = tickets.find((ticket) => ticket._id === ticketId);
        if (target) setSelectedTicket(target);
    }, [searchParams, tickets]);

    const reloadSupportData = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets }),
            queryClient.invalidateQueries({ queryKey: queryKeys.supportNotices }),
        ]);
    };

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: AdminSupportTicketItem['status'] }) =>
            adminUpdateSupportTicketStatus(id, { status }),
        onSuccess: async () => {
            toast.success('Status updated');
            await reloadSupportData();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Status update failed');
        },
    });

    const replyMutation = useMutation({
        mutationFn: async ({ id, message }: { id: string; message: string }) =>
            adminReplySupportTicket(id, message),
        onSuccess: async () => {
            setReplyDraft('');
            toast.success('Reply sent');
            await reloadSupportData();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Reply failed');
        },
    });

    const createNoticeMutation = useMutation({
        mutationFn: async () =>
            adminCreateNotice({
                title: noticeForm.title,
                message: noticeForm.message,
                target: noticeForm.target,
                targetIds: noticeForm.target === 'all' ? [] : noticeForm.targetIds,
                startAt: noticeForm.startAt || undefined,
                endAt: noticeForm.endAt || undefined,
            }),
        onSuccess: async () => {
            setNoticeForm({ title: '', message: '', target: 'all', targetIds: [], startAt: '', endAt: '' });
            setRecipientSearch('');
            toast.success('Notice published');
            await reloadSupportData();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Notice create failed');
        },
    });

    const toggleNoticeMutation = useMutation({
        mutationFn: async (id: string) => adminToggleNotice(id),
        onSuccess: async () => {
            await reloadSupportData();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Toggle failed');
        },
    });

    const updateStatus = async (id: string, status: AdminSupportTicketItem['status']) => {
        await updateStatusMutation.mutateAsync({ id, status });
    };

    const handleReply = async (id: string) => {
        const message = replyDraft.trim();
        if (!message) return toast.error('Reply message is required');
        await replyMutation.mutateAsync({ id, message });
    };

    const handleCreateNotice = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!noticeForm.title || !noticeForm.message) return toast.error('Title and message are required');
        if (noticeForm.target !== 'all' && noticeForm.targetIds.length === 0) {
            return toast.error('Please select at least one recipient');
        }
        await createNoticeMutation.mutateAsync();
    };

    const toggleRecipient = (id: string) => {
        setNoticeForm((prev) => {
            const exists = prev.targetIds.includes(id);
            const targetIds = exists
                ? prev.targetIds.filter((item) => item !== id)
                : [...prev.targetIds, id];
            return { ...prev, targetIds };
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'open': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
            case 'in_progress': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'resolved': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            case 'closed': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
            default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
        }
    };

    const renderTicketList = () => (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {tickets.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-slate-600 opacity-20" />
                    <p className="mt-4 text-slate-400">No support tickets found.</p>
                </div>
            ) : (
                tickets.map((ticket) => (
                    <div
                        key={ticket._id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-indigo-500/10 bg-slate-900/40 p-5 transition-all hover:border-indigo-500/30 hover:bg-slate-900/60"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{ticket.ticketNo}</span>
                                    <div className="relative">
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getStatusStyle(ticket.status)}`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        {ticket.status === 'open' && (
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <h4 className="line-clamp-1 font-bold text-white group-hover:text-indigo-300 transition-colors">{ticket.subject}</h4>
                                <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                                    <User className="h-3 w-3" />
                                    {getStudentDisplayName(ticket.studentId)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500">{formatTime(ticket.createdAt)}</p>
                            </div>
                        </div>
                        <p className="mt-3 line-clamp-2 break-all text-xs text-slate-300 transition-colors group-hover:text-slate-200">{ticket.message}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-indigo-500/5 pt-3">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Updated {formatDate(ticket.updatedAt)}
                            </span>
                            <span className="text-xs font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                View Chat <ExternalLink className="h-3 w-3" />
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderTicketDetail = () => {
        if (!selectedTicket) return null;

        return (
            <div className="flex flex-col h-[700px] rounded-2xl border border-indigo-500/15 bg-slate-900/60 overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-indigo-500/15 bg-slate-950/40 p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedTicket(null)}
                            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-300" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white">{selectedTicket.subject}</h3>
                                <span className="text-xs text-indigo-400 opacity-60">#{selectedTicket.ticketNo}</span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Student: <span className="text-slate-200">{getStudentDisplayName(selectedTicket.studentId)}</span>
                            </p>
                            {selectedTicket.studentId && typeof selectedTicket.studentId !== 'string' && (
                                <Link
                                    to={`/__cw_admin__/student-management/students/${selectedTicket.studentId._id}`}
                                    className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
                                >
                                    Open student profile
                                    <ExternalLink className="h-3 w-3" />
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <select
                                value={selectedTicket.status}
                                onChange={(e) => updateStatus(selectedTicket._id, e.target.value as AdminSupportTicketItem['status'])}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none transition-colors ${getStatusStyle(selectedTicket.status)}`}
                            >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                            </select>
                            <AdminGuideButton {...SUPPORT_GUIDES.status} tone="indigo" />
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide">
                    {/* Original Message */}
                    <div className="flex gap-4">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <User className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div className="flex-1 max-w-[85%]">
                            <div className="rounded-2xl rounded-tl-none bg-slate-950/60 border border-indigo-500/10 p-4 shadow-lg">
                                <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{selectedTicket.message}</p>
                            </div>
                            <span className="mt-1.5 block text-[10px] text-slate-500">{formatFullDate(selectedTicket.createdAt)}</span>
                        </div>
                    </div>

                    {/* Timeline/Conversations */}
                    {selectedTicket.timeline?.map((item, idx) => {
                        const isStudent = !item.actorRole || item.actorRole === 'student';
                        return (
                            <div key={idx} className={`flex gap-4 ${isStudent ? '' : 'flex-row-reverse'}`}>
                                <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center border ${isStudent ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                                    {isStudent ? <User className="h-5 w-5 text-indigo-400" /> : <Shield className="h-5 w-5 text-cyan-400" />}
                                </div>
                                <div className={`flex flex-col ${isStudent ? 'max-w-[85%]' : 'max-w-[85%] items-end'}`}>
                                    <div className={`rounded-2xl p-4 shadow-lg border ${isStudent
                                        ? 'rounded-tl-none bg-slate-950/60 border-indigo-500/10'
                                        : 'rounded-tr-none bg-gradient-to-br from-indigo-600/90 to-cyan-600/90 border-transparent text-white'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap break-words">{item.message}</p>
                                    </div>
                                    <span className="mt-1.5 block text-[10px] text-slate-500">
                                        {!isStudent && <span className="text-cyan-400/60 font-medium mr-2">Replied by Support</span>}
                                        {formatTime(item.createdAt)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Reply Bar */}
                <div className="p-4 sm:p-5 border-t border-indigo-500/15 bg-slate-950/40">
                    <div className="relative flex items-end gap-3 max-w-4xl mx-auto">
                        <textarea
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            placeholder="Type your response..."
                            className="flex-1 min-h-[50px] max-h-[150px] w-full rounded-2xl border border-indigo-500/20 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 transition-all scrollbar-hide resize-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleReply(selectedTicket._id);
                                }
                            }}
                        />
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => void handleReply(selectedTicket._id)}
                                disabled={!replyDraft.trim() || loading}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/20 hover:opacity-90 disabled:opacity-50 transition-all flex-shrink-0"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                            <AdminGuideButton {...SUPPORT_GUIDES.reply} tone="indigo" />
                        </div>
                    </div>
                    <p className="mt-2 text-[10px] text-center text-slate-500">Press Enter to send, Shift + Enter for new line.</p>
                </div>
            </div>
        );
    };

    const renderNotices = () => (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* Create Form */}
            <div className="xl:col-span-5">
                <form onSubmit={handleCreateNotice} className="rounded-2xl border border-indigo-500/10 bg-slate-900/40 p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-indigo-500/10">
                            <Bell className="h-4 w-4 text-indigo-400" />
                        </div>
                        <h3 className="text-white font-bold">New Announcement</h3>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                            <input
                                value={noticeForm.title}
                                onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                                placeholder="E.g. Class Rescheduled"
                                className="w-full mt-1 rounded-xl border border-indigo-500/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Message</label>
                            <textarea
                                value={noticeForm.message}
                                onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                                placeholder="Enter details here..."
                                className="h-28 w-full mt-1 rounded-xl border border-indigo-500/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Audience</label>
                                <select
                                    value={noticeForm.target}
                                    onChange={(e) => {
                                        const nextTarget = e.target.value as typeof noticeForm.target;
                                        setNoticeForm({ ...noticeForm, target: nextTarget, targetIds: [] });
                                        setRecipientSearch('');
                                    }}
                                    className="w-full mt-1 rounded-xl border border-indigo-500/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none"
                                >
                                    <option value="all">All Users</option>
                                    <option value="groups">Groups Only</option>
                                    <option value="students">Single Students</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start At</label>
                                <input
                                    type="datetime-local"
                                    value={noticeForm.startAt}
                                    onChange={(e) => setNoticeForm({ ...noticeForm, startAt: e.target.value })}
                                    className="w-full mt-1 rounded-xl border border-indigo-500/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End At</label>
                                <input
                                    type="datetime-local"
                                    value={noticeForm.endAt}
                                    onChange={(e) => setNoticeForm({ ...noticeForm, endAt: e.target.value })}
                                    className="w-full mt-1 rounded-xl border border-indigo-500/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none"
                                />
                            </div>
                        </div>

                        {noticeForm.target !== 'all' ? (
                            <div className="rounded-xl border border-indigo-500/10 bg-slate-950/30 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Select Recipients
                                    </label>
                                    <span className="text-[10px] text-indigo-300">
                                        Selected: {noticeForm.targetIds.length}
                                    </span>
                                </div>
                                <input
                                    value={recipientSearch}
                                    onChange={(e) => setRecipientSearch(e.target.value)}
                                    placeholder={noticeForm.target === 'students' ? 'Search students...' : 'Search groups...'}
                                    className="mt-2 w-full rounded-xl border border-indigo-500/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/40"
                                />

                                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
                                    {(studentsQuery.isFetching || groupsQuery.isFetching) ? (
                                        <p className="text-xs text-slate-400 px-1 py-2">Loading recipients...</p>
                                    ) : filteredRecipientOptions.length === 0 ? (
                                        <p className="text-xs text-slate-500 px-1 py-2">No recipients found.</p>
                                    ) : filteredRecipientOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => toggleRecipient(option.id)}
                                            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${noticeForm.targetIds.includes(option.id)
                                                ? 'border-indigo-400/50 bg-indigo-500/20'
                                                : 'border-indigo-500/10 bg-slate-900/40 hover:border-indigo-500/30'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-white">{option.title}</p>
                                            <p className="text-xs text-slate-400 line-clamp-1">{option.subtitle}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <button
                        type="submit"
                        disabled={createNoticeMutation.isPending}
                        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:opacity-90 disabled:opacity-50"
                    >
                        {createNoticeMutation.isPending ? 'Publishing...' : 'Publish Notice'}
                    </button>
                </form>
            </div>

            {/* List */}
            <div className="xl:col-span-7 space-y-3">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        Live Notices
                        <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-400">{notices.length}</span>
                    </h3>
                </div>

                <div className="max-h-[500px] overflow-y-auto pr-1 space-y-3 scrollbar-hide">
                    {notices.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl border border-dashed border-indigo-500/10">
                            <p className="text-slate-500 text-sm">No active notices.</p>
                        </div>
                    ) : notices.map((notice) => (
                        <div key={notice._id} className="rounded-2xl border border-indigo-500/10 bg-slate-900/40 p-4 transition-all hover:bg-slate-900/60">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-white text-sm">{notice.title}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${notice.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {notice.isActive ? 'Live' : 'Hidden'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{notice.message}</p>
                                    <div className="mt-3 flex items-center gap-4">
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(notice.createdAt)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider font-semibold">
                                            Target: {notice.target}
                                            {Array.isArray(notice.targetIds) && notice.targetIds.length > 0 ? ` (${notice.targetIds.length})` : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => void toggleNoticeMutation.mutateAsync(notice._id)}
                                        className={`rounded-xl p-2 transition-colors ${notice.isActive ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}
                                        title={notice.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Top Stats/Header */}
            <div className="rounded-3xl border border-indigo-500/15 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/80 p-6 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <LifeBuoy className="h-7 w-7 text-indigo-400" />
                            Support & Notifications
                            {runtimeFlags.trainingMode ? (
                                <InfoHint
                                    title="Support Workflow"
                                    description="Open tickets should be replied, then moved to In Progress or Resolved. Notices are broadcast messages."
                                />
                            ) : null}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400 max-w-xl">
                            Provide student support via live tickets and broadcast critical announcements to your campus community.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                        <button
                            onClick={() => void reloadSupportData()}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-2xl border border-indigo-500/20 bg-slate-950/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:bg-indigo-500/10 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="mt-8 flex flex-wrap gap-2 rounded-2xl bg-slate-950/40 p-1.5 w-full sm:w-fit border border-indigo-500/10">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => { setTab('tickets'); setSelectedTicket(null); }}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${tab === 'tickets' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            <MessageSquare className="h-4 w-4" />
                            Tickets
                            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${tab === 'tickets' ? 'bg-white/20' : 'bg-slate-800 text-slate-400'}`}>
                                {tickets.length}
                            </span>
                        </button>
                        <AdminGuideButton {...SUPPORT_GUIDES.ticketsTab} tone="indigo" />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => { setTab('notices'); setSelectedTicket(null); }}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${tab === 'notices' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            <Bell className="h-4 w-4" />
                            Notices
                            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${tab === 'notices' ? 'bg-white/20' : 'bg-slate-800 text-slate-400'}`}>
                                {notices.length}
                            </span>
                        </button>
                        <AdminGuideButton {...SUPPORT_GUIDES.noticesTab} tone="indigo" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="min-h-[400px]">
                {hasError ? (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
                        {tab === 'tickets'
                            ? 'Failed to load support tickets. Notices remain available from the other tab.'
                            : 'Failed to load notice tools. Ticket inbox remains available from the other tab.'}
                        <button type="button" onClick={() => void reloadSupportData()} className="btn-outline ml-3 text-sm">Retry</button>
                    </div>
                ) : loading && !selectedTicket ? (
                    <div className="rounded-2xl border border-indigo-500/15 bg-slate-900/40 p-5 text-sm text-slate-300">
                        <span className="inline-flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Loading support items...
                        </span>
                    </div>
                ) : selectedTicket ? renderTicketDetail() : (
                    tab === 'tickets' ? renderTicketList() : renderNotices()
                )}
            </div>
        </div>
    );
}

const Shield = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
);

const LifeBuoy = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 4.24 4.24" /><path d="m14.83 9.17 4.24-4.24" /><path d="m14.83 14.83 4.24 4.24" /><path d="m9.17 14.83-4.24 4.24" /><circle cx="12" cy="12" r="4" /></svg>
);
