import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CalendarClock, Link2, Mail, RefreshCw, Send, Smartphone, Users } from 'lucide-react';

import AdminGuideButton from '../../../components/admin/AdminGuideButton';
import { queryKeys } from '../../../lib/queryKeys';
import {
    adminCreateNotice,
    adminGetNotices,
    adminGetStudentGroups,
    adminGetStudents,
    adminToggleNotice,
    type AdminNoticeItem,
    type AdminStudentGroup,
    type AdminStudentItem,
} from '../../../services/api';
import {
    getCampaignDashboardSummary,
    getDeliveryLogs,
    listCampaigns,
    sendCampaign,
    type CampaignListItem,
    type DeliveryLog,
} from '../../../api/adminNotificationCampaignApi';

type CampaignTab =
    | 'dashboard'
    | 'campaigns'
    | 'new'
    | 'audiences'
    | 'contact'
    | 'templates'
    | 'providers'
    | 'triggers'
    | 'notifications'
    | 'logs'
    | 'settings';

interface Props {
    onNavigate: (tab: CampaignTab) => void;
    showToast: (message: string, tone?: 'success' | 'error') => void;
}

type NoticeStatusFilter = 'all' | 'active' | 'inactive';
type DispatchAudienceType = 'all' | 'group' | 'manual' | 'filter';

interface DispatchFormState {
    campaignName: string;
    subject: string;
    body: string;
    channels: Array<'sms' | 'email'>;
    audienceType: DispatchAudienceType;
    audienceGroupId: string;
    manualStudentIdsText: string;
    filterGroupIdsText: string;
    recipientMode: 'student' | 'guardian' | 'both';
    guardianTargeted: boolean;
    scheduleAt: string;
    linkedNoticeId: string;
    linkedNoticeTitle: string;
}

interface NoticeFormState {
    title: string;
    message: string;
    target: 'all' | 'groups' | 'students';
    targetIds: string[];
    startAt: string;
    endAt: string;
    priority: 'normal' | 'priority' | 'breaking';
    isActive: boolean;
}

function createDispatchForm(): DispatchFormState {
    return {
        campaignName: '',
        subject: '',
        body: '',
        channels: ['email'],
        audienceType: 'all',
        audienceGroupId: '',
        manualStudentIdsText: '',
        filterGroupIdsText: '',
        recipientMode: 'student',
        guardianTargeted: false,
        scheduleAt: '',
        linkedNoticeId: '',
        linkedNoticeTitle: '',
    };
}

function createNoticeForm(): NoticeFormState {
    return {
        title: '',
        message: '',
        target: 'all',
        targetIds: [],
        startAt: '',
        endAt: '',
        priority: 'normal',
        isActive: true,
    };
}

function parseCommaList(value: string): string[] {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatDateLabel(value?: string | null): string {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleString();
}

function statusBadge(status: string): string {
    if (status === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300';
    if (status === 'failed') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300';
    if (status === 'partial') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
    return 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300';
}

function summarizeNoticeTarget(notice: AdminNoticeItem): string {
    const count = Array.isArray(notice.targetIds) ? notice.targetIds.length : 0;
    if (notice.target === 'all') return 'All eligible students';
    if (notice.target === 'groups') return `${count} group${count === 1 ? '' : 's'}`;
    return `${count} student${count === 1 ? '' : 's'}`;
}

export default function NotificationOperationsPanel({ onNavigate, showToast }: Props) {
    const queryClient = useQueryClient();
    const dispatchComposerRef = useRef<HTMLDivElement | null>(null);
    const [dispatchForm, setDispatchForm] = useState<DispatchFormState>(() => createDispatchForm());
    const [noticeForm, setNoticeForm] = useState<NoticeFormState>(() => createNoticeForm());
    const [noticeStatus, setNoticeStatus] = useState<NoticeStatusFilter>('active');
    const [noticeSearch, setNoticeSearch] = useState('');
    const [recipientSearch, setRecipientSearch] = useState('');

    const summaryQuery = useQuery({
        queryKey: ['campaign-dashboard-summary'],
        queryFn: getCampaignDashboardSummary,
    });
    const noticesQuery = useQuery({
        queryKey: ['campaign-notices', noticeStatus],
        queryFn: async () => {
            const response = await adminGetNotices({
                page: 1,
                limit: 24,
                status: noticeStatus === 'all' ? undefined : noticeStatus,
            });
            return response.data.items || [];
        },
    });
    const groupsQuery = useQuery({
        queryKey: ['campaign-notification-groups'],
        queryFn: async () => (await adminGetStudentGroups()).data.items || [],
        staleTime: 60_000,
    });
    const studentsQuery = useQuery({
        queryKey: ['campaign-notification-students'],
        queryFn: async () => (await adminGetStudents({ page: 1, limit: 200 })).data.items || [],
        enabled: noticeForm.target === 'students',
        staleTime: 60_000,
    });
    const noticeJobsQuery = useQuery({
        queryKey: ['campaigns', { page: 1, limit: 8, originModule: 'notice' }],
        queryFn: () => listCampaigns({ page: 1, limit: 8, originModule: 'notice' }),
    });
    const logsQuery = useQuery({
        queryKey: ['delivery-logs', { page: 1, limit: 6 }],
        queryFn: () => getDeliveryLogs({ page: 1, limit: 6 }),
    });

    const groups = (groupsQuery.data || []) as AdminStudentGroup[];
    const students = (studentsQuery.data || []) as AdminStudentItem[];
    const notices = (noticesQuery.data || []) as AdminNoticeItem[];
    const noticeJobs = (noticeJobsQuery.data?.items || []) as CampaignListItem[];
    const logs = (logsQuery.data?.items || []) as DeliveryLog[];

    const recipientOptions = useMemo(() => {
        if (noticeForm.target === 'groups') {
            return groups.map((group) => ({
                id: group._id,
                title: group.name,
                subtitle: [group.batchTag, group.description].filter(Boolean).join(' • ') || group.slug,
            }));
        }
        if (noticeForm.target === 'students') {
            return students.map((student) => ({
                id: student._id,
                title: student.fullName || student.username || student.email,
                subtitle: [student.username, student.email].filter(Boolean).join(' • '),
            }));
        }
        return [] as Array<{ id: string; title: string; subtitle: string }>;
    }, [groups, noticeForm.target, students]);

    const filteredRecipients = useMemo(() => {
        const needle = recipientSearch.trim().toLowerCase();
        if (!needle) return recipientOptions;
        return recipientOptions.filter((option) => `${option.title} ${option.subtitle}`.toLowerCase().includes(needle));
    }, [recipientOptions, recipientSearch]);

    const filteredNotices = useMemo(() => {
        const needle = noticeSearch.trim().toLowerCase();
        if (!needle) return notices;
        return notices.filter((notice) =>
            `${notice.title} ${notice.message} ${notice.target}`.toLowerCase().includes(needle),
        );
    }, [noticeSearch, notices]);

    const prefillNoticeForDispatch = (notice: AdminNoticeItem) => {
        let audienceType: DispatchAudienceType = 'all';
        let audienceGroupId = '';
        let manualStudentIdsText = '';
        let filterGroupIdsText = '';

        if (notice.target === 'students') {
            audienceType = 'manual';
            manualStudentIdsText = (notice.targetIds || []).join(', ');
        } else if (notice.target === 'groups') {
            if ((notice.targetIds || []).length === 1) {
                audienceType = 'group';
                audienceGroupId = String(notice.targetIds?.[0] || '');
            } else {
                audienceType = 'filter';
                filterGroupIdsText = (notice.targetIds || []).join(', ');
            }
        }

        setDispatchForm({
            campaignName: notice.title || '',
            subject: notice.title || '',
            body: notice.message || '',
            channels: notice.deliveryMeta?.lastChannel === 'sms'
                ? ['sms']
                : notice.deliveryMeta?.lastChannel === 'both'
                    ? ['sms', 'email']
                    : ['email'],
            audienceType,
            audienceGroupId,
            manualStudentIdsText,
            filterGroupIdsText,
            recipientMode: 'student',
            guardianTargeted: false,
            scheduleAt: '',
            linkedNoticeId: notice._id,
            linkedNoticeTitle: notice.title,
        });
        dispatchComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const sendMutation = useMutation({
        mutationFn: async () => {
            const channels = dispatchForm.channels;
            if (channels.length === 0) {
                throw new Error('Select at least one delivery channel.');
            }
            if (!dispatchForm.body.trim()) {
                throw new Error('Notification body is required.');
            }
            if (dispatchForm.audienceType === 'group' && !dispatchForm.audienceGroupId) {
                throw new Error('Select a saved group.');
            }
            if (dispatchForm.audienceType === 'manual' && parseCommaList(dispatchForm.manualStudentIdsText).length === 0) {
                throw new Error('Enter at least one student ID.');
            }
            if (dispatchForm.audienceType === 'filter' && parseCommaList(dispatchForm.filterGroupIdsText).length === 0) {
                throw new Error('Enter at least one group ID for group-filter delivery.');
            }

            return sendCampaign({
                campaignName: dispatchForm.campaignName.trim() || dispatchForm.subject.trim() || 'Notification dispatch',
                channels,
                customSubject: dispatchForm.subject.trim() || undefined,
                customBody: dispatchForm.body.trim(),
                audienceType: dispatchForm.audienceType,
                audienceGroupId: dispatchForm.audienceType === 'group' ? dispatchForm.audienceGroupId : undefined,
                manualStudentIds: dispatchForm.audienceType === 'manual'
                    ? parseCommaList(dispatchForm.manualStudentIdsText)
                    : undefined,
                audienceFilters: dispatchForm.audienceType === 'filter'
                    ? { groupIds: parseCommaList(dispatchForm.filterGroupIdsText) }
                    : undefined,
                guardianTargeted: dispatchForm.guardianTargeted,
                recipientMode: dispatchForm.recipientMode,
                scheduledAtUTC: dispatchForm.scheduleAt
                    ? new Date(dispatchForm.scheduleAt).toISOString()
                    : undefined,
                ...(dispatchForm.linkedNoticeId
                    ? {
                        originModule: 'notice',
                        originEntityId: dispatchForm.linkedNoticeId,
                        originAction: 'notice_dispatch',
                    }
                    : {}),
            });
        },
        onSuccess: async () => {
            showToast(
                dispatchForm.linkedNoticeId
                    ? 'Notice-linked notification queued'
                    : 'Notification queued',
            );
            setDispatchForm((current) => ({
                ...createDispatchForm(),
                channels: current.channels,
            }));
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
                queryClient.invalidateQueries({ queryKey: ['delivery-logs'] }),
                queryClient.invalidateQueries({ queryKey: ['campaign-dashboard-summary'] }),
                queryClient.invalidateQueries({ queryKey: ['campaign-notices'] }),
            ]);
        },
        onError: (error: any) => {
            showToast(error?.message || error?.response?.data?.message || 'Notification send failed', 'error');
        },
    });

    const createNoticeMutation = useMutation({
        mutationFn: async () => {
            if (!noticeForm.title.trim() || !noticeForm.message.trim()) {
                throw new Error('Notice title and message are required.');
            }
            if (noticeForm.target !== 'all' && noticeForm.targetIds.length === 0) {
                throw new Error('Select at least one target for this notice.');
            }

            const response = await adminCreateNotice({
                title: noticeForm.title.trim(),
                message: noticeForm.message.trim(),
                target: noticeForm.target,
                targetIds: noticeForm.target === 'all' ? [] : noticeForm.targetIds,
                startAt: noticeForm.startAt ? new Date(noticeForm.startAt).toISOString() : undefined,
                endAt: noticeForm.endAt ? new Date(noticeForm.endAt).toISOString() : undefined,
                priority: noticeForm.priority,
                isActive: noticeForm.isActive,
            });
            return response.data.item;
        },
        onSuccess: async (notice) => {
            setNoticeForm(createNoticeForm());
            setRecipientSearch('');
            showToast('Notice created');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['campaign-notices'] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.supportNotices }),
            ]);
            prefillNoticeForDispatch(notice as AdminNoticeItem);
        },
        onError: (error: any) => {
            showToast(error?.message || error?.response?.data?.message || 'Notice creation failed', 'error');
        },
    });

    const toggleNoticeMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await adminToggleNotice(id);
            return response.data.item as AdminNoticeItem;
        },
        onSuccess: async (notice) => {
            showToast(notice.isActive ? 'Notice activated' : 'Notice hidden');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['campaign-notices'] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.supportNotices }),
            ]);
        },
        onError: (error: any) => {
            showToast(error?.response?.data?.message || 'Notice status update failed', 'error');
        },
    });

    const toggleDispatchChannel = (channel: 'sms' | 'email') => {
        setDispatchForm((current) => {
            const exists = current.channels.includes(channel);
            return {
                ...current,
                channels: exists
                    ? current.channels.filter((entry) => entry !== channel)
                    : [...current.channels, channel],
            };
        });
    };

    const toggleNoticeTargetId = (id: string) => {
        setNoticeForm((current) => ({
            ...current,
            targetIds: current.targetIds.includes(id)
                ? current.targetIds.filter((entry) => entry !== id)
                : [...current.targetIds, id],
        }));
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
                {[
                    {
                        label: 'Active subscribers ready',
                        value: summaryQuery.data?.audience.activeCount ?? 0,
                        hint: 'Default subscription audience for subscriber campaigns',
                    },
                    {
                        label: 'Renewal reminders ready',
                        value: summaryQuery.data?.audience.renewalDueCount ?? 0,
                        hint: 'Audience available for renewal reminders',
                    },
                    {
                        label: 'Failed sends today',
                        value: summaryQuery.data?.totals.failedToday ?? 0,
                        hint: 'Recent delivery problems that need review',
                    },
                ].map((card) => (
                    <div key={card.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{card.value}</p>
                        <p className="mt-2 text-xs text-slate-500">{card.hint}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Notification operations studio</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Create in-app notices, queue SMS or email sends, and keep notice management inside Campaigns instead
                            of bouncing between unrelated screens.
                        </p>
                    </div>
                    <AdminGuideButton
                        title="Notifications"
                        content="Create notices for the student notice feed, then reuse those notices in a targeted SMS/email dispatch without leaving Campaigns Hub."
                        actions={[
                            { label: 'Dispatch', description: 'Queue SMS or email sends with the current channels, audience, and schedule.' },
                            { label: 'Notices', description: 'Manage the in-app notice feed, activation state, and broadcast scope.' },
                            { label: 'Audit linkage', description: 'Notice-linked sends show up in campaign jobs and delivery history.' },
                        ]}
                        affected="Student notice feed, communication queue, and delivery review."
                        tone="indigo"
                    />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigate('new')}
                        className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-cyan-200"
                    >
                        Open full campaign builder
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('contact')}
                        className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-cyan-200"
                    >
                        Open live audience
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('logs')}
                        className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-cyan-200"
                    >
                        Review delivery logs
                    </button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section ref={dispatchComposerRef} className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dispatch</div>
                            <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Quick notification send</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Use this composer for targeted SMS/email delivery when you do not need the full campaign wizard.
                            </p>
                        </div>
                        {dispatchForm.linkedNoticeId ? (
                            <div className="rounded-2xl border border-violet-300/70 bg-violet-500/10 px-3 py-2 text-xs text-violet-700 dark:border-violet-700/70 dark:text-violet-200">
                                Linked notice: {dispatchForm.linkedNoticeTitle}
                                <button
                                    type="button"
                                    className="ml-2 font-semibold underline underline-offset-2"
                                    onClick={() => setDispatchForm(createDispatchForm())}
                                >
                                    Clear
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Campaign / notification name</label>
                            <input
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={dispatchForm.campaignName}
                                onChange={(event) => setDispatchForm((current) => ({ ...current, campaignName: event.target.value }))}
                                placeholder="Admission reminder, plan renewal alert, notice follow-up"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Channels</label>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    { key: 'email', label: 'Email', icon: Mail },
                                    { key: 'sms', label: 'SMS', icon: Smartphone },
                                ] as const).map((channel) => {
                                    const active = dispatchForm.channels.includes(channel.key);
                                    const Icon = channel.icon;
                                    return (
                                        <button
                                            key={channel.key}
                                            type="button"
                                            onClick={() => toggleDispatchChannel(channel.key)}
                                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                active
                                                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-100'
                                                    : 'border-slate-300 text-slate-600 hover:border-cyan-500/50 dark:border-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {channel.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Audience scope</label>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    { key: 'all', label: 'All students' },
                                    { key: 'group', label: 'Saved group' },
                                    { key: 'manual', label: 'Manual IDs' },
                                    { key: 'filter', label: 'Group filter' },
                                ] as const).map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setDispatchForm((current) => ({ ...current, audienceType: option.key }))}
                                        className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                                            dispatchForm.audienceType === option.key
                                                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-100'
                                                : 'border-slate-300 text-slate-600 hover:border-emerald-500/50 dark:border-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {dispatchForm.audienceType === 'group' ? (
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Saved group</label>
                                <select
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    value={dispatchForm.audienceGroupId}
                                    onChange={(event) => setDispatchForm((current) => ({ ...current, audienceGroupId: event.target.value }))}
                                >
                                    <option value="">Select a student group</option>
                                    {groups.map((group) => (
                                        <option key={group._id} value={group._id}>
                                            {group.name} ({group.studentCount})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}
                        {dispatchForm.audienceType === 'manual' ? (
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Student IDs</label>
                                <textarea
                                    className="min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    value={dispatchForm.manualStudentIdsText}
                                    onChange={(event) => setDispatchForm((current) => ({ ...current, manualStudentIdsText: event.target.value }))}
                                    placeholder="Comma-separated student IDs"
                                />
                            </div>
                        ) : null}
                        {dispatchForm.audienceType === 'filter' ? (
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Group IDs for filter mode</label>
                                <textarea
                                    className="min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    value={dispatchForm.filterGroupIdsText}
                                    onChange={(event) => setDispatchForm((current) => ({ ...current, filterGroupIdsText: event.target.value }))}
                                    placeholder="Comma-separated group IDs"
                                />
                                <p className="text-xs text-slate-500">
                                    This keeps quick dispatch simple. Use the full builder for multi-rule filters.
                                </p>
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Recipient mode</label>
                            <select
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={dispatchForm.recipientMode}
                                onChange={(event) => setDispatchForm((current) => ({ ...current, recipientMode: event.target.value as DispatchFormState['recipientMode'] }))}
                            >
                                <option value="student">Student only</option>
                                <option value="guardian">Guardian only</option>
                                <option value="both">Student + guardian</option>
                            </select>
                        </div>
                        <label className="flex items-center justify-between rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                            <span>Guardian targeted flag</span>
                            <input
                                type="checkbox"
                                checked={dispatchForm.guardianTargeted}
                                onChange={(event) => setDispatchForm((current) => ({ ...current, guardianTargeted: event.target.checked }))}
                            />
                        </label>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Subject / label</label>
                            <input
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={dispatchForm.subject}
                                onChange={(event) => setDispatchForm((current) => ({ ...current, subject: event.target.value }))}
                                placeholder="Displayed in email subject or internal label"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Schedule</label>
                            <div className="relative">
                                <CalendarClock className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    value={dispatchForm.scheduleAt}
                                    onChange={(event) => setDispatchForm((current) => ({ ...current, scheduleAt: event.target.value }))}
                                />
                            </div>
                            <p className="text-xs text-slate-500">Leave empty to queue immediately.</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Message body</label>
                            <textarea
                                className="min-h-[150px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={dispatchForm.body}
                                onChange={(event) => setDispatchForm((current) => ({ ...current, body: event.target.value }))}
                                placeholder="Write the SMS/email message that should be sent to the selected audience."
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                        <p className="text-xs text-slate-500">
                            Quick dispatch is intended for notification operations. Use the full campaign builder for complex multi-step flows.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-cyan-200"
                                onClick={() => setDispatchForm(createDispatchForm())}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                                onClick={() => sendMutation.mutate()}
                                disabled={sendMutation.isPending}
                            >
                                <Send className="h-4 w-4" />
                                {sendMutation.isPending ? 'Queueing...' : 'Send notification'}
                            </button>
                        </div>
                    </div>
                </section>

                <section className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notice feed</div>
                            <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Create and manage notices</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Notices stay available in the student notice feed, and can be reused in dispatch when you need SMS/email delivery.
                            </p>
                        </div>
                        <BellRing className="h-5 w-5 text-violet-500" />
                    </div>

                    <div className="mt-5 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Notice title</label>
                            <input
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={noticeForm.title}
                                onChange={(event) => setNoticeForm((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Admission deadline update, payment reminder, campus alert"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Notice message</label>
                            <textarea
                                className="min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={noticeForm.message}
                                onChange={(event) => setNoticeForm((current) => ({ ...current, message: event.target.value }))}
                                placeholder="This message appears in the student notice feed."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Target</label>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    { key: 'all', label: 'All students' },
                                    { key: 'groups', label: 'Groups' },
                                    { key: 'students', label: 'Students' },
                                ] as const).map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setNoticeForm((current) => ({ ...current, target: option.key, targetIds: [] }))}
                                        className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                                            noticeForm.target === option.key
                                                ? 'border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-100'
                                                : 'border-slate-300 text-slate-600 hover:border-violet-500/50 dark:border-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {noticeForm.target !== 'all' ? (
                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                <input
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                    value={recipientSearch}
                                    onChange={(event) => setRecipientSearch(event.target.value)}
                                    placeholder={noticeForm.target === 'groups' ? 'Search groups' : 'Search students'}
                                />
                                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                    {filteredRecipients.length === 0 ? (
                                        <p className="rounded-2xl border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                            No matching recipients found.
                                        </p>
                                    ) : filteredRecipients.map((option) => {
                                        const selected = noticeForm.targetIds.includes(option.id);
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => toggleNoticeTargetId(option.id)}
                                                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                                                    selected
                                                        ? 'border-violet-500/50 bg-violet-500/10'
                                                        : 'border-slate-300 bg-white hover:border-violet-500/40 dark:border-slate-700 dark:bg-slate-950'
                                                }`}
                                            >
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{option.title}</p>
                                                <p className="mt-1 text-xs text-slate-500">{option.subtitle}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-slate-500">Selected: {noticeForm.targetIds.length}</p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">
                                This notice will be visible to every eligible student while active.
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Priority</label>
                                <select
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    value={noticeForm.priority}
                                    onChange={(event) => setNoticeForm((current) => ({ ...current, priority: event.target.value as NoticeFormState['priority'] }))}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="priority">Priority</option>
                                    <option value="breaking">Breaking</option>
                                </select>
                            </div>
                            <label className="flex items-center justify-between rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                                <span>Publish as active</span>
                                <input
                                    type="checkbox"
                                    checked={noticeForm.isActive}
                                    onChange={(event) => setNoticeForm((current) => ({ ...current, isActive: event.target.checked }))}
                                />
                            </label>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Start at</label>
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    value={noticeForm.startAt}
                                    onChange={(event) => setNoticeForm((current) => ({ ...current, startAt: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">End at</label>
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    value={noticeForm.endAt}
                                    onChange={(event) => setNoticeForm((current) => ({ ...current, endAt: event.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                        <p className="text-xs text-slate-500">
                            After publish, use “Send via dispatch” from the live notice list when SMS/email delivery is needed.
                        </p>
                        <button
                            type="button"
                            className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                            onClick={() => createNoticeMutation.mutate()}
                            disabled={createNoticeMutation.isPending}
                        >
                            {createNoticeMutation.isPending ? 'Creating...' : 'Create notice'}
                        </button>
                    </div>
                </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live notices</div>
                            <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Notice management queue</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Activate, hide, and reuse notices from one list instead of splitting management between different admin sections.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={noticeStatus}
                                onChange={(event) => setNoticeStatus(event.target.value as NoticeStatusFilter)}
                            >
                                <option value="active">Active notices</option>
                                <option value="inactive">Hidden notices</option>
                                <option value="all">All notices</option>
                            </select>
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-violet-500/50 hover:text-violet-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-violet-200"
                                onClick={() => void noticesQuery.refetch()}
                            >
                                <RefreshCw className={`h-4 w-4 ${noticesQuery.isFetching ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <input
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            value={noticeSearch}
                            onChange={(event) => setNoticeSearch(event.target.value)}
                            placeholder="Search notice title or message"
                        />
                    </div>
                    <div className="mt-5 space-y-3">
                        {filteredNotices.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                No notices found for this filter.
                            </div>
                        ) : filteredNotices.map((notice) => (
                            <article key={notice._id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-sm font-semibold text-slate-950 dark:text-white">{notice.title}</h4>
                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${notice.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                {notice.isActive ? 'Live' : 'Hidden'}
                                            </span>
                                            {notice.priority && notice.priority !== 'normal' ? (
                                                <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-200">
                                                    {notice.priority}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{notice.message}</p>
                                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                            <span className="rounded-full border border-slate-300/70 px-2.5 py-1 dark:border-slate-700/70">
                                                {summarizeNoticeTarget(notice)}
                                            </span>
                                            <span className="rounded-full border border-slate-300/70 px-2.5 py-1 dark:border-slate-700/70">
                                                Starts: {formatDateLabel(notice.startAt || notice.createdAt || '')}
                                            </span>
                                            {notice.deliveryMeta?.lastSentAt ? (
                                                <span className="rounded-full border border-slate-300/70 px-2.5 py-1 dark:border-slate-700/70">
                                                    Last sent: {formatDateLabel(notice.deliveryMeta.lastSentAt)}{notice.deliveryMeta.lastChannel ? ` • ${notice.deliveryMeta.lastChannel}` : ''}
                                                </span>
                                            ) : null}
                                            {notice.sourceNewsId ? (
                                                <span className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-2.5 py-1 text-cyan-700 dark:text-cyan-200">
                                                    Linked news notice
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-cyan-200"
                                            onClick={() => prefillNoticeForDispatch(notice)}
                                        >
                                            <Link2 className="h-3.5 w-3.5" />
                                            Send via dispatch
                                        </button>
                                        <button
                                            type="button"
                                            className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium transition ${
                                                notice.isActive
                                                    ? 'border border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-200'
                                                    : 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                                            }`}
                                            onClick={() => toggleNoticeMutation.mutate(notice._id)}
                                            disabled={toggleNoticeMutation.isPending}
                                        >
                                            {notice.isActive ? 'Hide' : 'Activate'}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <div className="space-y-6">
                    <section className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notice sends</div>
                                <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Notice-linked jobs</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Jobs created from the notice manager stay grouped here for faster review.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-cyan-200"
                                onClick={() => onNavigate('logs')}
                            >
                                Open logs
                            </button>
                        </div>
                        <div className="mt-4 space-y-3">
                            {noticeJobs.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    No notice-linked jobs yet.
                                </div>
                            ) : noticeJobs.map((job) => (
                                <article key={job._id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{job.campaignName || 'Untitled notice dispatch'}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {job.channelType} • {job.audienceType} • {new Date(job.createdAt).toLocaleString()}
                                            </p>
                                            <p className="mt-2 text-xs text-slate-500">
                                                Sent: {job.sentCount ?? 0} • Failed: {job.failedCount ?? 0}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(job.status)}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent outcomes</div>
                                <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Delivery review</h3>
                            </div>
                            <Users className="h-5 w-5 text-cyan-500" />
                        </div>
                        <div className="mt-4 space-y-3">
                            {logs.length === 0 ? (
                                <p className="text-sm text-slate-500">No delivery logs available yet.</p>
                            ) : logs.map((log) => (
                                <div key={log._id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {log.recipientDisplay || log.userId}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {log.channel} • {log.providerUsed || 'provider unresolved'}
                                            </div>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                            log.status === 'sent'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                : log.status === 'failed'
                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                                        }`}>
                                            {log.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
