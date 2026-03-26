import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Save, ToggleLeft } from 'lucide-react';
import {
    adminGetRuntimeSettings,
    adminUpdateRuntimeSettings,
    AdminFeatureFlags,
} from '../../services/api';
import CyberToggle from '../ui/CyberToggle';
import { queryKeys } from '../../lib/queryKeys';

const FLAG_META: { key: keyof AdminFeatureFlags; label: string; hint: string }[] = [
    { key: 'studentDashboardV2', label: 'Student Dashboard V2', hint: 'Enable the redesigned student dashboard.' },
    { key: 'studentManagementV2', label: 'Student Management V2', hint: 'Enable the improved student management panel.' },
    { key: 'subscriptionEngineV2', label: 'Subscription Engine V2', hint: 'Use the V2 subscription billing engine.' },
    { key: 'examShareLinks', label: 'Exam Share Links', hint: 'Allow generating shareable exam links.' },
    { key: 'proctoringSignals', label: 'Proctoring Signals', hint: 'Enable exam proctoring event signals.' },
    { key: 'aiQuestionSuggestions', label: 'AI Question Suggestions', hint: 'Show AI-powered question suggestions in question bank.' },
    { key: 'pushNotifications', label: 'Push Notifications', hint: 'Enable browser push notification delivery.' },
    { key: 'strictExamTabLock', label: 'Strict Exam Tab Lock', hint: 'Prevent tab switching during exams.' },
    { key: 'webNextEnabled', label: 'Web Next Enabled', hint: 'Enable next-gen web interface features.' },
    { key: 'trainingMode', label: 'Training Mode', hint: 'Show extra UI hints for new admins.' },
    { key: 'requireDeleteKeywordConfirm', label: 'Require Delete Keyword', hint: 'Require typing DELETE to confirm destructive actions.' },
];

export default function RuntimeSettingsPanel() {
    const queryClient = useQueryClient();
    const [flags, setFlags] = useState<AdminFeatureFlags | null>(null);

    const settingsQuery = useQuery({
        queryKey: queryKeys.runtimeSettings ?? ['admin', 'runtime-settings'],
        queryFn: async () => (await adminGetRuntimeSettings()).data,
    });

    useEffect(() => {
        if (!settingsQuery.data) return;
        setFlags(settingsQuery.data.featureFlags || ({} as AdminFeatureFlags));
    }, [settingsQuery.data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!flags) throw new Error('No flags to save');
            return adminUpdateRuntimeSettings({ featureFlags: flags });
        },
        onSuccess: async () => {
            toast.success('Runtime settings saved');
            await queryClient.invalidateQueries({ queryKey: queryKeys.runtimeSettings ?? ['admin', 'runtime-settings'] });
            await settingsQuery.refetch();
        },
        onError: () => {
            toast.error('Failed to save runtime settings');
        },
    });

    if (settingsQuery.isLoading || !flags) {
        return <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-primary animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold cw-text flex items-center gap-2"><ToggleLeft className="w-5 h-5 text-primary" /> Feature Flags</h2>
                    <p className="text-xs cw-muted">Toggle platform features instantly without redeployment.</p>
                </div>
                <button
                    onClick={() => saveMutation.mutateAsync()}
                    disabled={saveMutation.isPending}
                    className="bg-gradient-to-r from-primary to-cyan-600 text-white text-sm px-6 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                    {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {FLAG_META.map(({ key, label, hint }) => (
                    <div key={key} className="card-flat border cw-border p-4 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium cw-text">{label}</p>
                            <p className="text-xs cw-muted mt-0.5">{hint}</p>
                        </div>
                        <CyberToggle
                            checked={Boolean(flags ? (flags as any)[key] : false)}
                            onChange={(value) => setFlags((prev) => prev ? { ...prev, [key]: value } : prev)}
                        />
                    </div>
                ))}
            </div>

            {settingsQuery.data?.updatedAt ? (
                <p className="text-xs cw-muted text-right">
                    Last updated: {new Date(settingsQuery.data.updatedAt).toLocaleString()}
                    {settingsQuery.data.updatedBy ? ` by ${settingsQuery.data.updatedBy}` : ''}
                    {settingsQuery.data.runtimeVersion ? ` (v${settingsQuery.data.runtimeVersion})` : ''}
                </p>
            ) : null}
        </div>
    );
}
