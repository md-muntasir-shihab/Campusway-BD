import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import NewsHelpButton from '../../../components/admin/NewsHelpButton';
import {
    ApiNewsV2Settings,
    adminNewsV2GetAiSettings,
    adminNewsV2GetAppearance,
    adminNewsV2GetShareSettings,
    adminNewsV2UpdateAiSettings,
    adminNewsV2UpdateAppearance,
    adminNewsV2UpdateShareSettings,
} from '../../../services/api';

type Mode = 'appearance' | 'ai' | 'share';

interface Props {
    mode: Mode;
}

type FormState = Record<string, unknown>;

function toBoolean(value: unknown): boolean {
    return Boolean(value);
}

function toNumber(value: unknown, fallback = 0): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function toStringValue(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) return fallback;
    return String(value);
}

export default function AdminNewsSettingsSection({ mode }: Props) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState<FormState>({});

    const settingsQuery = useQuery({
        queryKey: ['adminNewsSettings', mode],
        queryFn: async () => {
            if (mode === 'appearance') {
                const response = await adminNewsV2GetAppearance();
                return response.data.appearance as ApiNewsV2Settings['appearance'];
            }
            if (mode === 'ai') {
                const response = await adminNewsV2GetAiSettings();
                return response.data.ai as ApiNewsV2Settings['ai'];
            }
            const response = await adminNewsV2GetShareSettings();
            return response.data.share as ApiNewsV2Settings['share'];
        },
    });

    useEffect(() => {
        if (!settingsQuery.data) return;
        setForm(settingsQuery.data as unknown as FormState);
    }, [settingsQuery.data, mode]);

    const mutation = useMutation({
        mutationFn: async (payload: FormState) => {
            if (mode === 'appearance') {
                return (await adminNewsV2UpdateAppearance(payload as Partial<ApiNewsV2Settings['appearance']>)).data;
            }
            if (mode === 'ai') {
                return (await adminNewsV2UpdateAiSettings(payload as Partial<ApiNewsV2Settings['ai']>)).data;
            }
            return (await adminNewsV2UpdateShareSettings(payload as Partial<ApiNewsV2Settings['share']>)).data;
        },
        onSuccess: () => {
            toast.success('Settings updated');
            queryClient.invalidateQueries({ queryKey: ['adminNewsSettings'] });
            queryClient.invalidateQueries({ queryKey: ['newsSettings'] });
            queryClient.invalidateQueries({ queryKey: ['newsList'] });
            queryClient.invalidateQueries({ queryKey: ['newsDetail'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Settings update failed'),
    });

    const title = useMemo(() => {
        if (mode === 'appearance') return 'News Appearance Settings';
        if (mode === 'ai') return 'AI Draft Settings';
        return 'Share Templates & Tracking';
    }, [mode]);

    function onSubmit(event: FormEvent) {
        event.preventDefault();
        const payload: FormState = { ...form };
        if (mode === 'share') {
            const raw = toStringValue(payload.enabledChannels, '');
            payload.enabledChannels = raw
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }
        mutation.mutate(payload);
    }

    return (
        <form onSubmit={onSubmit} className="card-flat space-y-4 border border-cyan-500/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">All fields are admin-controlled and applied live after save.</p>
                </div>
                <NewsHelpButton
                    title={title}
                    content={mode === 'appearance'
                        ? 'Controls how the public news surface looks and how dense the cards feel.'
                        : mode === 'ai'
                            ? 'Controls the AI provider, prompt, language, and safety defaults used when drafting content.'
                            : 'Controls the share templates and tracking settings used when content is shared out.'
                    }
                    impact={mode === 'appearance'
                        ? 'This changes the visual language used across the public news pages.'
                        : mode === 'ai'
                            ? 'This changes how safely and consistently AI-assisted drafts are generated.'
                            : 'This changes how outbound share links and tracking parameters are composed.'
                    }
                    affected={mode === 'appearance'
                        ? 'Public readers and editors scanning the news feed.'
                        : mode === 'ai'
                            ? 'Editors who apply AI help to draft or rewrite content.'
                            : 'Anyone sharing news links through buttons or templates.'
                    }
                    publishNote={mode === 'appearance'
                        ? 'Published stories will inherit the same banners, density, and visual defaults.'
                        : mode === 'ai'
                            ? 'Published stories can be seeded from the AI draft output if auto-apply is enabled.'
                            : 'Published stories will keep the configured share message structure.'
                    }
                    publishSendNote={mode === 'share'
                        ? 'Publish + send uses these sharing and tracking defaults when the message is distributed.'
                        : 'If publish + send is used later, the current settings still influence the rendered story and delivery payload.'
                    }
                    enabledNote="Keeping the settings grouped makes it easier to confirm which defaults are live."
                    disabledNote="If this panel is separated from the core settings, editors can miss the active default."
                    bestPractice="Use the smallest useful change, then save and verify the public page once."
                    variant="full"
                />
            </div>

            {mode === 'appearance' && (
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Layout Mode</span>
                        <select
                            className="input-field"
                            value={toStringValue(form.layoutMode, 'rss_reader')}
                            onChange={(e) => setForm((prev) => ({ ...prev, layoutMode: e.target.value }))}
                        >
                            <option value="rss_reader">RSS Reader</option>
                            <option value="grid">Grid</option>
                            <option value="list">List</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Animation Level</span>
                        <select
                            className="input-field"
                            value={toStringValue(form.animationLevel, 'minimal')}
                            onChange={(e) => setForm((prev) => ({ ...prev, animationLevel: e.target.value }))}
                        >
                            <option value="off">Off</option>
                            <option value="minimal">Minimal</option>
                            <option value="normal">Normal</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Card Density</span>
                        <select
                            className="input-field"
                            value={toStringValue(form.cardDensity, 'comfortable')}
                            onChange={(e) => setForm((prev) => ({ ...prev, cardDensity: e.target.value }))}
                        >
                            <option value="compact">Compact</option>
                            <option value="comfortable">Comfortable</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Thumbnail Fallback URL</span>
                        <input
                            className="input-field"
                            value={toStringValue(form.thumbnailFallbackUrl, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, thumbnailFallbackUrl: e.target.value }))}
                            placeholder="https://..."
                        />
                    </label>
                    <ToggleField
                        label="Show Source Icons"
                        checked={toBoolean(form.showSourceIcons)}
                        onChange={(value) => setForm((prev) => ({ ...prev, showSourceIcons: value }))}
                    />
                    <ToggleField
                        label="Show Trending Widget"
                        checked={toBoolean(form.showTrendingWidget)}
                        onChange={(value) => setForm((prev) => ({ ...prev, showTrendingWidget: value }))}
                    />
                    <ToggleField
                        label="Show Category Widget"
                        checked={toBoolean(form.showCategoryWidget)}
                        onChange={(value) => setForm((prev) => ({ ...prev, showCategoryWidget: value }))}
                    />
                    <ToggleField
                        label="Show Share Buttons"
                        checked={toBoolean(form.showShareButtons)}
                        onChange={(value) => setForm((prev) => ({ ...prev, showShareButtons: value }))}
                    />
                </div>
            )}

            {mode === 'ai' && (
                <div className="grid gap-4 md:grid-cols-2">
                    <ToggleField
                        label="AI Service Enabled"
                        checked={toBoolean(form.enabled)}
                        onChange={(value) => setForm((prev) => ({ ...prev, enabled: value }))}
                    />
                    <ToggleField
                        label="Strict No Hallucination"
                        checked={toBoolean(form.strictNoHallucination)}
                        onChange={(value) => setForm((prev) => ({ ...prev, strictNoHallucination: value }))}
                    />

                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">API Provider URL</span>
                        <input
                            type="text"
                            className="input-field"
                            value={toStringValue(form.apiProviderUrl, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, apiProviderUrl: e.target.value }))}
                            placeholder="e.g. https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
                        />
                    </label>

                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">API Key</span>
                        <input
                            type="password"
                            className="input-field"
                            value={toStringValue(form.apiKey, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="Enter API Key"
                        />
                    </label>

                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Custom Prompt</span>
                        <textarea
                            className="input-field min-h-[140px]"
                            value={toStringValue(form.customPrompt, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, customPrompt: e.target.value }))}
                            placeholder="Override default AI prompt here... (Leave empty for default)"
                        />
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Language</span>
                        <select
                            className="input-field"
                            value={toStringValue(form.language, 'en')}
                            onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
                        >
                            <option value="bn">Bengali</option>
                            <option value="en">English</option>
                            <option value="mixed">Mixed</option>
                        </select>
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Style Preset</span>
                        <select
                            className="input-field"
                            value={toStringValue(form.stylePreset, 'standard')}
                            onChange={(e) => setForm((prev) => ({ ...prev, stylePreset: e.target.value }))}
                        >
                            <option value="short">Short</option>
                            <option value="standard">Standard</option>
                            <option value="detailed">Detailed</option>
                        </select>
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Duplicate Sensitivity</span>
                        <select
                            className="input-field"
                            value={toStringValue(form.duplicateSensitivity, 'medium')}
                            onChange={(e) => setForm((prev) => ({ ...prev, duplicateSensitivity: e.target.value }))}
                        >
                            <option value="strict">Strict</option>
                            <option value="medium">Medium</option>
                            <option value="loose">Loose</option>
                        </select>
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Max Length</span>
                        <input
                            type="number"
                            min={100}
                            max={5000}
                            className="input-field"
                            value={toNumber(form.maxLength, 1200)}
                            onChange={(e) => setForm((prev) => ({ ...prev, maxLength: Number(e.target.value) }))}
                        />
                    </label>
                </div>
            )}

            {mode === 'share' && (
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Enabled Channels (comma separated)</span>
                        <input
                            className="input-field"
                            value={Array.isArray(form.enabledChannels) ? (form.enabledChannels as string[]).join(', ') : toStringValue(form.enabledChannels, 'facebook,x,linkedin,whatsapp,copy')}
                            onChange={(e) => setForm((prev) => ({ ...prev, enabledChannels: e.target.value }))}
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Default Template</span>
                        <input
                            className="input-field"
                            value={toStringValue((form.templates as Record<string, string> | undefined)?.default, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, templates: { ...(prev.templates as Record<string, string> || {}), default: e.target.value } }))}
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Facebook Template</span>
                        <input
                            className="input-field"
                            value={toStringValue((form.templates as Record<string, string> | undefined)?.facebook, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, templates: { ...(prev.templates as Record<string, string> || {}), facebook: e.target.value } }))}
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">WhatsApp Template</span>
                        <input
                            className="input-field"
                            value={toStringValue((form.templates as Record<string, string> | undefined)?.whatsapp, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, templates: { ...(prev.templates as Record<string, string> || {}), whatsapp: e.target.value } }))}
                        />
                    </label>
                    <ToggleField
                        label="Enable UTM"
                        checked={toBoolean((form.utm as Record<string, unknown> | undefined)?.enabled)}
                        onChange={(value) => setForm((prev) => ({ ...prev, utm: { ...(prev.utm as Record<string, unknown> || {}), enabled: value } }))}
                    />
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">UTM Source</span>
                        <input
                            className="input-field"
                            value={toStringValue((form.utm as Record<string, unknown> | undefined)?.source, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, utm: { ...(prev.utm as Record<string, unknown> || {}), source: e.target.value } }))}
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">UTM Medium</span>
                        <input
                            className="input-field"
                            value={toStringValue((form.utm as Record<string, unknown> | undefined)?.medium, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, utm: { ...(prev.utm as Record<string, unknown> || {}), medium: e.target.value } }))}
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">UTM Campaign</span>
                        <input
                            className="input-field"
                            value={toStringValue((form.utm as Record<string, unknown> | undefined)?.campaign, '')}
                            onChange={(e) => setForm((prev) => ({ ...prev, utm: { ...(prev.utm as Record<string, unknown> || {}), campaign: e.target.value } }))}
                        />
                    </label>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                    type="button"
                    className="btn-outline"
                    onClick={() => settingsQuery.refetch()}
                >
                    Reload
                </button>
            </div>
        </form>
    );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
    return (
        <label className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-slate-100/70 px-3 py-2 dark:bg-slate-950/45">
            <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4"
            />
        </label>
    );
}
