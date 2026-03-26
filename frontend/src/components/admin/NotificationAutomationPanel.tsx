import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Loader2, RefreshCw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    NotificationAutomationSettings,
    adminGetNotificationAutomationSettings,
    adminUpdateNotificationAutomationSettings,
} from '../../services/api';
import { invalidateQueryGroup, invalidationGroups, queryKeys } from '../../lib/queryKeys';

const DEFAULT_SETTINGS: NotificationAutomationSettings = {
    examStartsSoon: { enabled: true, hoursBefore: [24, 3] },
    applicationClosingSoon: { enabled: true, hoursBefore: [72, 24] },
    paymentPendingReminder: { enabled: true, hoursBefore: [24] },
    resultPublished: { enabled: true, hoursBefore: [0] },
    profileScoreGate: { enabled: true, hoursBefore: [48, 12], minScore: 70 },
    templates: {
        languageMode: 'mixed',
        examStartsSoon: 'Exam starts soon. Stay prepared.',
        applicationClosingSoon: 'Application window is closing soon.',
        paymentPendingReminder: 'Your payment is pending. Submit proof to unlock access.',
        resultPublished: 'Your result is now published.',
        profileScoreGate: 'Complete your profile to reach the minimum score before exam.',
    },
};

function parseHours(input: string, fallback: number[]): number[] {
    const values = input
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item >= 0)
        .map((item) => Math.round(item));
    return values.length > 0 ? values : fallback;
}

function hoursText(values: number[]): string {
    return values.join(', ');
}

export default function NotificationAutomationPanel() {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<NotificationAutomationSettings>(DEFAULT_SETTINGS);
    const [hours, setHours] = useState({
        examStartsSoon: hoursText(DEFAULT_SETTINGS.examStartsSoon.hoursBefore),
        applicationClosingSoon: hoursText(DEFAULT_SETTINGS.applicationClosingSoon.hoursBefore),
        paymentPendingReminder: hoursText(DEFAULT_SETTINGS.paymentPendingReminder.hoursBefore),
        resultPublished: hoursText(DEFAULT_SETTINGS.resultPublished.hoursBefore),
        profileScoreGate: hoursText(DEFAULT_SETTINGS.profileScoreGate.hoursBefore),
    });

    const settingsQuery = useQuery({
        queryKey: queryKeys.notificationAutomationSettings,
        queryFn: async () => (await adminGetNotificationAutomationSettings()).data.settings,
    });

    useEffect(() => {
        if (!settingsQuery.data) return;
        const next = { ...DEFAULT_SETTINGS, ...settingsQuery.data };
        setSettings(next);
        setHours({
            examStartsSoon: hoursText(next.examStartsSoon.hoursBefore),
            applicationClosingSoon: hoursText(next.applicationClosingSoon.hoursBefore),
            paymentPendingReminder: hoursText(next.paymentPendingReminder.hoursBefore),
            resultPublished: hoursText(next.resultPublished.hoursBefore),
            profileScoreGate: hoursText(next.profileScoreGate.hoursBefore),
        });
    }, [settingsQuery.data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload: NotificationAutomationSettings = {
                ...settings,
                examStartsSoon: {
                    ...settings.examStartsSoon,
                    hoursBefore: parseHours(hours.examStartsSoon, settings.examStartsSoon.hoursBefore),
                },
                applicationClosingSoon: {
                    ...settings.applicationClosingSoon,
                    hoursBefore: parseHours(hours.applicationClosingSoon, settings.applicationClosingSoon.hoursBefore),
                },
                paymentPendingReminder: {
                    ...settings.paymentPendingReminder,
                    hoursBefore: parseHours(hours.paymentPendingReminder, settings.paymentPendingReminder.hoursBefore),
                },
                resultPublished: {
                    ...settings.resultPublished,
                    hoursBefore: parseHours(hours.resultPublished, settings.resultPublished.hoursBefore),
                },
                profileScoreGate: {
                    ...settings.profileScoreGate,
                    hoursBefore: parseHours(hours.profileScoreGate, settings.profileScoreGate.hoursBefore),
                },
            };
            return adminUpdateNotificationAutomationSettings(payload);
        },
        onSuccess: async (response) => {
            toast.success('Notification automation updated');
            setSettings({ ...DEFAULT_SETTINGS, ...(response.data.settings || {}) });
            await queryClient.invalidateQueries({ queryKey: queryKeys.notificationAutomationSettings });
            await invalidateQueryGroup(queryClient, invalidationGroups.notificationsAutomationSave);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to save notification automation settings');
        },
    });

    if (settingsQuery.isLoading) {
        return (
            <div className="card-flat p-6">
                <div className="flex items-center gap-2 text-sm cw-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading notification automation settings...
                </div>
            </div>
        );
    }

    if (settingsQuery.isError) {
        return (
            <div className="card-flat p-6">
                <p className="text-sm text-rose-400">Unable to load notification automation settings.</p>
                <button
                    type="button"
                    onClick={() => settingsQuery.refetch()}
                    className="btn-outline mt-3 inline-flex items-center gap-2 text-sm"
                >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <section className="card-flat p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold cw-text">
                            <BellRing className="h-5 w-5 text-primary" />
                            Notification Automation
                        </h2>
                        <p className="mt-1 text-sm cw-muted">Configure reminder triggers, timing, and template language.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void saveMutation.mutateAsync()}
                        disabled={saveMutation.isPending}
                        className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </button>
                </div>
            </section>

            <section className="card-flat p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="rounded-xl border cw-border cw-surface p-3 text-sm cw-text">
                        <span className="font-medium">Exam Starts Soon</span>
                        <input
                            type="checkbox"
                            className="ml-3 align-middle"
                            checked={settings.examStartsSoon.enabled}
                            onChange={(event) => setSettings((prev) => ({ ...prev, examStartsSoon: { ...prev.examStartsSoon, enabled: event.target.checked } }))}
                        />
                        <input
                            value={hours.examStartsSoon}
                            onChange={(event) => setHours((prev) => ({ ...prev, examStartsSoon: event.target.value }))}
                            className="input-field mt-2"
                            placeholder="24, 3"
                        />
                    </label>
                    <label className="rounded-xl border cw-border cw-surface p-3 text-sm cw-text">
                        <span className="font-medium">Application Closing Soon</span>
                        <input
                            type="checkbox"
                            className="ml-3 align-middle"
                            checked={settings.applicationClosingSoon.enabled}
                            onChange={(event) => setSettings((prev) => ({ ...prev, applicationClosingSoon: { ...prev.applicationClosingSoon, enabled: event.target.checked } }))}
                        />
                        <input
                            value={hours.applicationClosingSoon}
                            onChange={(event) => setHours((prev) => ({ ...prev, applicationClosingSoon: event.target.value }))}
                            className="input-field mt-2"
                            placeholder="72, 24"
                        />
                    </label>
                    <label className="rounded-xl border cw-border cw-surface p-3 text-sm cw-text">
                        <span className="font-medium">Payment Pending Reminder</span>
                        <input
                            type="checkbox"
                            className="ml-3 align-middle"
                            checked={settings.paymentPendingReminder.enabled}
                            onChange={(event) => setSettings((prev) => ({ ...prev, paymentPendingReminder: { ...prev.paymentPendingReminder, enabled: event.target.checked } }))}
                        />
                        <input
                            value={hours.paymentPendingReminder}
                            onChange={(event) => setHours((prev) => ({ ...prev, paymentPendingReminder: event.target.value }))}
                            className="input-field mt-2"
                            placeholder="24"
                        />
                    </label>
                    <label className="rounded-xl border cw-border cw-surface p-3 text-sm cw-text">
                        <span className="font-medium">Result Published</span>
                        <input
                            type="checkbox"
                            className="ml-3 align-middle"
                            checked={settings.resultPublished.enabled}
                            onChange={(event) => setSettings((prev) => ({ ...prev, resultPublished: { ...prev.resultPublished, enabled: event.target.checked } }))}
                        />
                        <input
                            value={hours.resultPublished}
                            onChange={(event) => setHours((prev) => ({ ...prev, resultPublished: event.target.value }))}
                            className="input-field mt-2"
                            placeholder="0"
                        />
                    </label>
                </div>
                <div className="mt-3 rounded-xl border cw-border cw-surface p-3">
                    <label className="text-sm cw-text">
                        <span className="font-medium">Profile Score Gate Reminder</span>
                        <input
                            type="checkbox"
                            className="ml-3 align-middle"
                            checked={settings.profileScoreGate.enabled}
                            onChange={(event) => setSettings((prev) => ({ ...prev, profileScoreGate: { ...prev.profileScoreGate, enabled: event.target.checked } }))}
                        />
                    </label>
                    <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                            value={hours.profileScoreGate}
                            onChange={(event) => setHours((prev) => ({ ...prev, profileScoreGate: event.target.value }))}
                            className="input-field"
                            placeholder="48, 12"
                        />
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={settings.profileScoreGate.minScore}
                            onChange={(event) => setSettings((prev) => ({
                                ...prev,
                                profileScoreGate: { ...prev.profileScoreGate, minScore: Math.min(100, Math.max(1, Number(event.target.value) || 70)) },
                            }))}
                            className="input-field"
                            placeholder="Min score"
                        />
                    </div>
                </div>
            </section>

            <section className="card-flat p-4 sm:p-5">
                <h3 className="text-base font-semibold cw-text">Template Language</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select
                        className="input-field"
                        value={settings.templates.languageMode}
                        onChange={(event) => setSettings((prev) => ({
                            ...prev,
                            templates: {
                                ...prev.templates,
                                languageMode: event.target.value as 'bn' | 'en' | 'mixed',
                            },
                        }))}
                    >
                        <option value="mixed">Mixed</option>
                        <option value="bn">Bangla</option>
                        <option value="en">English</option>
                    </select>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <textarea
                        className="input-field min-h-[84px]"
                        value={settings.templates.examStartsSoon}
                        onChange={(event) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, examStartsSoon: event.target.value } }))}
                        placeholder="Exam starts soon template"
                    />
                    <textarea
                        className="input-field min-h-[84px]"
                        value={settings.templates.applicationClosingSoon}
                        onChange={(event) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, applicationClosingSoon: event.target.value } }))}
                        placeholder="Application closing template"
                    />
                    <textarea
                        className="input-field min-h-[84px]"
                        value={settings.templates.paymentPendingReminder}
                        onChange={(event) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, paymentPendingReminder: event.target.value } }))}
                        placeholder="Payment reminder template"
                    />
                    <textarea
                        className="input-field min-h-[84px]"
                        value={settings.templates.resultPublished}
                        onChange={(event) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, resultPublished: event.target.value } }))}
                        placeholder="Result published template"
                    />
                </div>
            </section>
        </div>
    );
}
