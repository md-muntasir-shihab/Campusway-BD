import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import NewsHelpButton from '../../../components/admin/NewsHelpButton';
import {
    ApiNewsV2Settings,
    adminGetNewsSettings,
    adminNewsV2UploadMedia,
    adminUpdateNewsSettings,
} from '../../../services/api';

type SettingsPanel = 'appearance' | 'ai' | 'share';

interface Props {
    initialPanel?: SettingsPanel;
}

type MediaFieldKey =
    | 'headerBannerUrl'
    | 'defaultBannerUrl'
    | 'defaultThumbUrl'
    | 'defaultSourceIconUrl';

interface CoreFormState {
    pageTitle: string;
    pageSubtitle: string;
    headerBannerUrl: string;
    defaultBannerUrl: string;
    defaultThumbUrl: string;
    defaultSourceIconUrl: string;
    fetchFullArticleEnabled: boolean;
    fullArticleFetchMode: 'rss_content' | 'readability_scrape' | 'both';
    workflowAutoDraftFromRSS: boolean;
    workflowDefaultIncomingStatus: 'pending_review' | 'draft';
    workflowAllowScheduling: boolean;
    workflowOpenOriginalWhenExtractionIncomplete: boolean;
    workflowAutoExpireDays: string;
    newsTrashRetentionDays: string;
    aiEnabled: boolean;
    aiLanguage: 'bn' | 'en' | 'mixed';
    aiStylePreset: 'short' | 'standard' | 'detailed';
    aiApiProviderUrl: string;
    aiApiKey: string;
    aiStrictNoHallucination: boolean;
    aiDuplicateSensitivity: 'strict' | 'medium' | 'loose';
    aiMaxLength: number;
    aiPromptTemplate: string;
    shareWhatsapp: string;
    shareFacebook: string;
    shareMessenger: string;
    shareTelegram: string;
    btnWhatsapp: boolean;
    btnFacebook: boolean;
    btnMessenger: boolean;
    btnTelegram: boolean;
    btnCopyLink: boolean;
}

const EMPTY_CORE_FORM: CoreFormState = {
    pageTitle: '',
    pageSubtitle: '',
    headerBannerUrl: '',
    defaultBannerUrl: '',
    defaultThumbUrl: '',
    defaultSourceIconUrl: '',
    fetchFullArticleEnabled: true,
    fullArticleFetchMode: 'both',
    workflowAutoDraftFromRSS: true,
    workflowDefaultIncomingStatus: 'pending_review',
    workflowAllowScheduling: true,
    workflowOpenOriginalWhenExtractionIncomplete: true,
    workflowAutoExpireDays: '',
    newsTrashRetentionDays: '30',
    aiEnabled: false,
    aiLanguage: 'en',
    aiStylePreset: 'standard',
    aiApiProviderUrl: '',
    aiApiKey: '',
    aiStrictNoHallucination: true,
    aiDuplicateSensitivity: 'medium',
    aiMaxLength: 1200,
    aiPromptTemplate: '',
    shareWhatsapp: '{title}\n{summary}\n{public_url}',
    shareFacebook: '{title} | {source_name}\n{public_url}',
    shareMessenger: '{title}\n{summary}\n{public_url}',
    shareTelegram: '{title}\n{summary}\n{public_url}',
    btnWhatsapp: true,
    btnFacebook: true,
    btnMessenger: true,
    btnTelegram: true,
    btnCopyLink: true,
};

function mapSettingsToCoreForm(settings: ApiNewsV2Settings | undefined): CoreFormState {
    if (!settings) return EMPTY_CORE_FORM;

    const autoExpireDays = settings.workflow?.autoExpireDays;

    return {
        pageTitle: settings.pageTitle || '',
        pageSubtitle: settings.pageSubtitle || '',
        headerBannerUrl: settings.headerBannerUrl || '',
        defaultBannerUrl: settings.defaultBannerUrl || '',
        defaultThumbUrl: settings.defaultThumbUrl || '',
        defaultSourceIconUrl: settings.defaultSourceIconUrl || '',
        fetchFullArticleEnabled: settings.fetchFullArticleEnabled !== false,
        fullArticleFetchMode: settings.fullArticleFetchMode || 'both',
        workflowAutoDraftFromRSS: settings.workflow?.autoDraftFromRSS !== false,
        workflowDefaultIncomingStatus: settings.workflow?.defaultIncomingStatus || 'pending_review',
        workflowAllowScheduling: settings.workflow?.allowScheduling !== false,
        workflowOpenOriginalWhenExtractionIncomplete: settings.workflow?.openOriginalWhenExtractionIncomplete !== false,
        workflowAutoExpireDays: autoExpireDays === null || autoExpireDays === undefined ? '' : String(autoExpireDays),
        newsTrashRetentionDays: settings.cleanup?.newsTrashRetentionDays === null || settings.cleanup?.newsTrashRetentionDays === undefined
            ? '30'
            : String(settings.cleanup.newsTrashRetentionDays),
        aiEnabled: settings.aiSettings?.enabled ?? false,
        aiLanguage: String(settings.aiSettings?.language || 'en').toLowerCase() as 'bn' | 'en' | 'mixed',
        aiStylePreset: (settings.aiSettings?.stylePreset === 'very_short' ? 'short' : (settings.aiSettings?.stylePreset || 'standard')) as 'short' | 'standard' | 'detailed',
        aiApiProviderUrl: settings.aiSettings?.apiProviderUrl || '',
        aiApiKey: settings.aiSettings?.apiKey || '',
        aiStrictNoHallucination: settings.aiSettings?.strictNoHallucination ?? settings.aiSettings?.strictMode ?? true,
        aiDuplicateSensitivity: settings.aiSettings?.duplicateSensitivity || 'medium',
        aiMaxLength: Number(settings.aiSettings?.maxLength || 1200),
        aiPromptTemplate: settings.aiSettings?.promptTemplate || settings.aiSettings?.customPrompt || '',
        shareWhatsapp: settings.shareTemplates?.whatsapp || '',
        shareFacebook: settings.shareTemplates?.facebook || '',
        shareMessenger: settings.shareTemplates?.messenger || '',
        shareTelegram: settings.shareTemplates?.telegram || '',
        btnWhatsapp: settings.share?.shareButtons?.whatsapp ?? true,
        btnFacebook: settings.share?.shareButtons?.facebook ?? true,
        btnMessenger: settings.share?.shareButtons?.messenger ?? true,
        btnTelegram: settings.share?.shareButtons?.telegram ?? true,
        btnCopyLink: settings.share?.shareButtons?.copyLink ?? true,
    };
}

export default function AdminNewsSettingsHub({ initialPanel = 'appearance' }: Props) {
    const queryClient = useQueryClient();
    const [panel, setPanel] = useState<SettingsPanel>(initialPanel);
    const [coreForm, setCoreForm] = useState<CoreFormState>(EMPTY_CORE_FORM);
    const [uploadingField, setUploadingField] = useState<MediaFieldKey | null>(null);

    const settingsQuery = useQuery({
        queryKey: ['adminNewsSettings'],
        queryFn: async () => (await adminGetNewsSettings()).data,
    });

    useEffect(() => {
        setPanel(initialPanel);
    }, [initialPanel]);

    useEffect(() => {
        setCoreForm(mapSettingsToCoreForm(settingsQuery.data?.settings));
    }, [settingsQuery.data?.settings]);

    const saveCoreMutation = useMutation({
        mutationFn: async () => {
            const current = settingsQuery.data?.settings;
            const autoExpireValue = coreForm.workflowAutoExpireDays.trim();
            const autoExpireDays = autoExpireValue === '' ? null : Number(autoExpireValue);
            const newsTrashValue = coreForm.newsTrashRetentionDays.trim();
            const newsTrashRetentionDays = newsTrashValue === '' ? 30 : Number(newsTrashValue);
            const normalizedEnabledChannels = Array.from(
                new Set(
                    (Array.isArray(current?.share?.enabledChannels) ? current.share.enabledChannels : ['whatsapp', 'facebook', 'messenger', 'telegram', 'copy_link'])
                        .map((channel) => String(channel || '').trim())
                        .filter((channel) => channel && channel !== 'copy_text')
                )
            ) as NonNullable<ApiNewsV2Settings['share']>['enabledChannels'];

            const payload: Partial<ApiNewsV2Settings> = {
                pageTitle: coreForm.pageTitle,
                pageSubtitle: coreForm.pageSubtitle,
                headerBannerUrl: coreForm.headerBannerUrl,
                defaultBannerUrl: coreForm.defaultBannerUrl,
                defaultThumbUrl: coreForm.defaultThumbUrl,
                defaultSourceIconUrl: coreForm.defaultSourceIconUrl,
                fetchFullArticleEnabled: coreForm.fetchFullArticleEnabled,
                fullArticleFetchMode: coreForm.fullArticleFetchMode,
                workflow: {
                    requireApprovalBeforePublish: current?.workflow?.requireApprovalBeforePublish ?? true,
                    allowAutoPublishFromAi: current?.workflow?.allowAutoPublishFromAi ?? false,
                    autoDraftFromRSS: coreForm.workflowAutoDraftFromRSS,
                    defaultIncomingStatus: 'pending_review',
                    allowScheduling: coreForm.workflowAllowScheduling,
                    allowSchedulePublish: coreForm.workflowAllowScheduling,
                    openOriginalWhenExtractionIncomplete: coreForm.workflowOpenOriginalWhenExtractionIncomplete,
                    autoExpireDays: autoExpireDays === null || Number.isNaN(autoExpireDays) ? null : autoExpireDays,
                },
                aiSettings: {
                    enabled: coreForm.aiEnabled,
                    language: coreForm.aiLanguage,
                    stylePreset: coreForm.aiStylePreset,
                    apiProviderUrl: coreForm.aiApiProviderUrl,
                    apiKey: coreForm.aiApiKey,
                    strictNoHallucination: coreForm.aiStrictNoHallucination,
                    strictMode: coreForm.aiStrictNoHallucination,
                    duplicateSensitivity: coreForm.aiDuplicateSensitivity,
                    maxLength: Number.isFinite(coreForm.aiMaxLength) ? coreForm.aiMaxLength : 1200,
                    customPrompt: coreForm.aiPromptTemplate.trim(),
                },
                cleanup: {
                    ...(current?.cleanup || {}),
                    newsTrashRetentionDays: Number.isFinite(newsTrashRetentionDays) ? Math.max(1, newsTrashRetentionDays) : 30,
                },
                shareTemplates: {
                    whatsapp: coreForm.shareWhatsapp,
                    facebook: coreForm.shareFacebook,
                    messenger: coreForm.shareMessenger,
                    telegram: coreForm.shareTelegram,
                },
                share: {
                    ...(current?.share || {
                        enabledChannels: ['whatsapp', 'facebook', 'messenger', 'telegram', 'copy_link'],
                        templates: {},
                        utm: {
                            enabled: true,
                            source: 'campusway',
                            medium: 'social',
                            campaign: 'news_share',
                        },
                    }),
                    enabledChannels: normalizedEnabledChannels,
                    shareButtons: {
                        whatsapp: coreForm.btnWhatsapp,
                        facebook: coreForm.btnFacebook,
                        messenger: coreForm.btnMessenger,
                        telegram: coreForm.btnTelegram,
                        copyLink: coreForm.btnCopyLink,
                        copyText: false,
                    },
                },
            };

            return (await adminUpdateNewsSettings(payload)).data;
        },
        onSuccess: () => {
            toast.success('Settings updated');
            queryClient.invalidateQueries({ queryKey: ['adminNewsSettings'] });
            queryClient.invalidateQueries({ queryKey: ['adminNewsList'] });
            queryClient.invalidateQueries({ queryKey: ['newsSettings'] });
            queryClient.invalidateQueries({ queryKey: ['newsList'] });
            queryClient.invalidateQueries({ queryKey: ['newsDetail'] });
            queryClient.invalidateQueries({ queryKey: ['home'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Save failed'),
    });

    function onSaveCore(event: FormEvent) {
        event.preventDefault();
        saveCoreMutation.mutate();
    }

    async function onUploadMedia(field: MediaFieldKey, file?: File | null) {
        if (!file) return;
        setUploadingField(field);
        try {
            const result = await adminNewsV2UploadMedia(file, { altText: field, isDefaultBanner: field === 'defaultBannerUrl' });
            const mediaUrl = result.data?.item?.url || '';
            if (!mediaUrl) throw new Error('Media upload returned empty URL');
            setCoreForm((prev) => ({ ...prev, [field]: mediaUrl }));
            toast.success('Image uploaded');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Upload failed');
        } finally {
            setUploadingField(null);
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
                <SummaryCard
                    title="Appearance"
                    text="Page title, banners, and visual defaults."
                    active={panel === 'appearance'}
                    onClick={() => setPanel('appearance')}
                />
                <SummaryCard
                    title="Workflow"
                    text="Fetch, draft, publish, and review defaults."
                    active={panel === 'ai'}
                    onClick={() => setPanel('ai')}
                />
                <SummaryCard
                    title="Communication"
                    text="Share templates and outbound button defaults."
                    active={panel === 'share'}
                    onClick={() => setPanel('share')}
                />
            </div>

            <form onSubmit={onSaveCore} className="card-flat space-y-4 border border-cyan-500/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold">News Settings</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Manage branding, workflow, AI preset, and share templates from one place.
                        </p>
                        <div className="mt-2 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                            Editing {panel === 'appearance' ? 'appearance' : panel === 'ai' ? 'workflow + ai' : 'share + outbound buttons'}
                        </div>
                    </div>
                    <NewsHelpButton
                        title="News Settings Center"
                        content="This is the single place where the active News experience is configured."
                        impact="It keeps the public feed, the review flow, and outbound sharing in sync."
                        affected="Editors, admins, and any public news page that reads the current settings."
                        publishNote="Published content uses the stored branding and share defaults."
                        publishSendNote="If publish + send is used later, the communication settings on this screen influence the message formatting."
                        enabledNote="A single settings source prevents confusing split behavior."
                        disabledNote="If these controls are spread across multiple forms, the workflow becomes harder to manage."
                        bestPractice="Edit the grouped controls below before changing individual content records."
                        variant="full"
                    />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Page Title</span>
                        <input className="input-field" value={coreForm.pageTitle} onChange={(e) => setCoreForm((prev) => ({ ...prev, pageTitle: e.target.value }))} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Page Subtitle</span>
                        <input className="input-field" value={coreForm.pageSubtitle} onChange={(e) => setCoreForm((prev) => ({ ...prev, pageSubtitle: e.target.value }))} />
                    </label>
                    <MediaField
                        label="Header Banner URL"
                        value={coreForm.headerBannerUrl}
                        onChange={(value) => setCoreForm((prev) => ({ ...prev, headerBannerUrl: value }))}
                        uploading={uploadingField === 'headerBannerUrl'}
                        onUpload={(file) => onUploadMedia('headerBannerUrl', file)}
                    />
                    <MediaField
                        label="Default Banner URL"
                        value={coreForm.defaultBannerUrl}
                        onChange={(value) => setCoreForm((prev) => ({ ...prev, defaultBannerUrl: value }))}
                        uploading={uploadingField === 'defaultBannerUrl'}
                        onUpload={(file) => onUploadMedia('defaultBannerUrl', file)}
                    />
                    <MediaField
                        label="Default Thumb URL"
                        value={coreForm.defaultThumbUrl}
                        onChange={(value) => setCoreForm((prev) => ({ ...prev, defaultThumbUrl: value }))}
                        uploading={uploadingField === 'defaultThumbUrl'}
                        onUpload={(file) => onUploadMedia('defaultThumbUrl', file)}
                    />
                    <MediaField
                        label="Default Source Icon URL"
                        value={coreForm.defaultSourceIconUrl}
                        onChange={(value) => setCoreForm((prev) => ({ ...prev, defaultSourceIconUrl: value }))}
                        uploading={uploadingField === 'defaultSourceIconUrl'}
                        onUpload={(file) => onUploadMedia('defaultSourceIconUrl', file)}
                    />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <ToggleField label="Fetch Full Article Content" checked={coreForm.fetchFullArticleEnabled} onChange={(next) => setCoreForm((prev) => ({ ...prev, fetchFullArticleEnabled: next }))} />
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Full-Article Fetch Mode</span>
                        <select className="input-field" value={coreForm.fullArticleFetchMode} onChange={(e) => setCoreForm((prev) => ({ ...prev, fullArticleFetchMode: e.target.value as 'rss_content' | 'readability_scrape' | 'both' }))}>
                            <option value="rss_content">RSS Content</option>
                            <option value="readability_scrape">Readability Scrape</option>
                            <option value="both">Both (RSS then scrape)</option>
                        </select>
                    </label>
                    <ToggleField label="Auto-draft from RSS" checked={coreForm.workflowAutoDraftFromRSS} onChange={(next) => setCoreForm((prev) => ({ ...prev, workflowAutoDraftFromRSS: next }))} />
                    <ToggleField label="Allow Scheduling" checked={coreForm.workflowAllowScheduling} onChange={(next) => setCoreForm((prev) => ({ ...prev, workflowAllowScheduling: next }))} />
                    <ToggleField
                        label="Read opens original source when full article missing"
                        checked={coreForm.workflowOpenOriginalWhenExtractionIncomplete}
                        onChange={(next) => setCoreForm((prev) => ({ ...prev, workflowOpenOriginalWhenExtractionIncomplete: next }))}
                    />
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Default Incoming Status</span>
                        <select className="input-field" value={coreForm.workflowDefaultIncomingStatus} onChange={(e) => setCoreForm((prev) => ({ ...prev, workflowDefaultIncomingStatus: e.target.value as 'pending_review' | 'draft' }))}>
                            <option value="pending_review">Pending Review</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Auto Expire Days (optional)</span>
                        <input className="input-field" type="number" min={0} placeholder="Leave empty to disable" value={coreForm.workflowAutoExpireDays} onChange={(e) => setCoreForm((prev) => ({ ...prev, workflowAutoExpireDays: e.target.value }))} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Trash Retention Days</span>
                        <input className="input-field" type="number" min={1} placeholder="30" value={coreForm.newsTrashRetentionDays} onChange={(e) => setCoreForm((prev) => ({ ...prev, newsTrashRetentionDays: e.target.value }))} />
                    </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <ToggleField label="AI Draft Enabled" checked={coreForm.aiEnabled} onChange={(next) => setCoreForm((prev) => ({ ...prev, aiEnabled: next }))} />
                    <ToggleField label="Strict No Hallucination" checked={coreForm.aiStrictNoHallucination} onChange={(next) => setCoreForm((prev) => ({ ...prev, aiStrictNoHallucination: next }))} />
                    <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 md:col-span-2">
                        Duplicate articles are always routed to the Duplicate Queue for admin decision. Auto-removal is disabled.
                    </div>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">AI Language</span>
                        <select className="input-field" value={coreForm.aiLanguage} onChange={(e) => setCoreForm((prev) => ({ ...prev, aiLanguage: e.target.value as 'bn' | 'en' | 'mixed' }))}>
                            <option value="en">EN</option>
                            <option value="bn">BN</option>
                            <option value="mixed">Mixed</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Style Preset</span>
                        <select className="input-field" value={coreForm.aiStylePreset} onChange={(e) => setCoreForm((prev) => ({ ...prev, aiStylePreset: e.target.value as 'short' | 'standard' | 'detailed' }))}>
                            <option value="short">Short</option>
                            <option value="standard">Standard</option>
                            <option value="detailed">Detailed</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Duplicate Sensitivity</span>
                        <select className="input-field" value={coreForm.aiDuplicateSensitivity} onChange={(e) => setCoreForm((prev) => ({ ...prev, aiDuplicateSensitivity: e.target.value as 'strict' | 'medium' | 'loose' }))}>
                            <option value="strict">Strict</option>
                            <option value="medium">Medium</option>
                            <option value="loose">Loose</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">AI Max Length</span>
                        <input className="input-field" type="number" min={100} max={5000} value={coreForm.aiMaxLength} onChange={(e) => setCoreForm((prev) => ({ ...prev, aiMaxLength: Number(e.target.value) }))} />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">AI Custom Prompt Template</span>
                        <textarea
                            className="input-field min-h-[120px]"
                            placeholder="Use placeholders: {source_text}, {source_url}, {language}, {style}"
                            value={coreForm.aiPromptTemplate}
                            onChange={(e) => setCoreForm((prev) => ({ ...prev, aiPromptTemplate: e.target.value }))}
                        />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">API Provider URL</span>
                        <input className="input-field" type="text" placeholder="https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent" value={coreForm.aiApiProviderUrl} onChange={(e) => setCoreForm((prev) => ({ ...prev, aiApiProviderUrl: e.target.value }))} />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">API Key</span>
                        <input className="input-field" type="password" placeholder="Enter API Key" value={coreForm.aiApiKey} onChange={(e) => setCoreForm((prev) => ({ ...prev, aiApiKey: e.target.value }))} />
                    </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">WhatsApp Template</span>
                        <input className="input-field" value={coreForm.shareWhatsapp} onChange={(e) => setCoreForm((prev) => ({ ...prev, shareWhatsapp: e.target.value }))} />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Facebook Template</span>
                        <input className="input-field" value={coreForm.shareFacebook} onChange={(e) => setCoreForm((prev) => ({ ...prev, shareFacebook: e.target.value }))} />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Messenger Template</span>
                        <input className="input-field" value={coreForm.shareMessenger} onChange={(e) => setCoreForm((prev) => ({ ...prev, shareMessenger: e.target.value }))} />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Telegram Template</span>
                        <input className="input-field" value={coreForm.shareTelegram} onChange={(e) => setCoreForm((prev) => ({ ...prev, shareTelegram: e.target.value }))} />
                    </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <ToggleField label="WhatsApp Button" checked={coreForm.btnWhatsapp} onChange={(next) => setCoreForm((prev) => ({ ...prev, btnWhatsapp: next }))} />
                    <ToggleField label="Facebook Button" checked={coreForm.btnFacebook} onChange={(next) => setCoreForm((prev) => ({ ...prev, btnFacebook: next }))} />
                    <ToggleField label="Messenger Button" checked={coreForm.btnMessenger} onChange={(next) => setCoreForm((prev) => ({ ...prev, btnMessenger: next }))} />
                    <ToggleField label="Telegram Button" checked={coreForm.btnTelegram} onChange={(next) => setCoreForm((prev) => ({ ...prev, btnTelegram: next }))} />
                    <ToggleField label="Copy Link Button" checked={coreForm.btnCopyLink} onChange={(next) => setCoreForm((prev) => ({ ...prev, btnCopyLink: next }))} />
                </div>

                <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary" disabled={saveCoreMutation.isPending}>
                        {saveCoreMutation.isPending ? 'Saving...' : 'Save Core Settings'}
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

        </div>
    );
}

function SummaryCard({
    title,
    text,
    active,
    onClick,
}: {
    title: string;
    text: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border p-4 text-left transition ${active
                ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_12px_32px_rgba(6,182,212,0.12)]'
                : 'border-slate-200/80 bg-slate-100/70 hover:border-cyan-400/40 dark:border-slate-800/70 dark:bg-slate-950/50'
            }`}
        >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
        </button>
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

function MediaField({
    label,
    value,
    onChange,
    onUpload,
    uploading,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onUpload: (file?: File | null) => void;
    uploading: boolean;
}) {
    return (
        <div className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
            <input
                className="input-field"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Paste image URL or upload a file"
            />
            <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-cyan-500/60 dark:border-slate-700 dark:text-slate-200">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            onUpload(file);
                            event.currentTarget.value = '';
                        }}
                    />
                    {uploading ? 'Uploading...' : 'Upload File'}
                </label>
                {value ? (
                    <img src={value} alt={label} className="h-9 w-14 rounded-md border border-slate-300/60 object-cover dark:border-slate-700/60" />
                ) : null}
            </div>
        </div>
    );
}
