import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    adminUploadNewsMedia,
    adminCreateSocialLink,
    adminDeleteSocialLink,
    adminGetSocialLinks,
    adminUpdateSocialLink,
    type PublicSocialLinkItem,
} from '../../services/api';
import { invalidateQueryGroup, invalidationGroups, queryKeys } from '../../lib/queryKeys';
import { useAdminRuntimeFlags } from '../../hooks/useAdminRuntimeFlags';
import { showConfirmDialog, showPromptDialog } from '../../lib/appDialog';
import InfoHint from '../ui/InfoHint';
import { buildMediaUrl } from '../../utils/mediaUrl';

type Placement = 'header' | 'footer' | 'home' | 'news' | 'contact';

type DraftItem = {
    id?: string;
    platformName: string;
    targetUrl: string;
    iconUploadOrUrl: string;
    description: string;
    enabled: boolean;
    placements: Placement[];
};

const placementList: Placement[] = ['header', 'footer', 'home', 'news', 'contact'];

function toDraft(item?: PublicSocialLinkItem): DraftItem {
    if (!item) {
        return {
            platformName: '',
            targetUrl: '',
            iconUploadOrUrl: '',
            description: '',
            enabled: true,
            placements: ['header', 'footer', 'home', 'news', 'contact'],
        };
    }
    return {
        id: item.id,
        platformName: item.platformName,
        targetUrl: item.targetUrl,
        iconUploadOrUrl: item.iconUploadOrUrl,
        description: item.description,
        enabled: item.enabled,
        placements: item.placements,
    };
}

export default function SocialLinksManager() {
    const queryClient = useQueryClient();
    const runtimeFlags = useAdminRuntimeFlags();
    const [draft, setDraft] = useState<DraftItem>(toDraft());
    const [editingId, setEditingId] = useState<string>('');
    const [uploadingIcon, setUploadingIcon] = useState(false);

    const listQuery = useQuery({
        queryKey: queryKeys.socialLinks,
        queryFn: async () => (await adminGetSocialLinks()).data.items || [],
    });

    const invalidateAll = async () => {
        await invalidateQueryGroup(queryClient, invalidationGroups.socialSave);
    };

    const saveMutation = useMutation({
        mutationFn: async (payload: DraftItem) => {
            if (payload.id) {
                return (await adminUpdateSocialLink(payload.id, payload)).data;
            }
            return (await adminCreateSocialLink(payload)).data;
        },
        onSuccess: async () => {
            toast.success(editingId ? 'Social link updated' : 'Social link created');
            await invalidateAll();
            setDraft(toDraft());
            setEditingId('');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to save social link');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => (await adminDeleteSocialLink(id)).data,
        onSuccess: async () => {
            toast.success('Social link deleted');
            await invalidateAll();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to delete social link');
        },
    });

    const canSave = useMemo(
        () => Boolean(draft.platformName.trim() && draft.targetUrl.trim()),
        [draft.platformName, draft.targetUrl]
    );

    const uploadIcon = async (file?: File | null) => {
        if (!file) return;
        try {
            setUploadingIcon(true);
            const response = await adminUploadNewsMedia(file);
            const payload = response.data as {
                item?: { url?: string };
                url?: string;
                absoluteUrl?: string;
            };
            const uploadedUrl = String(payload?.item?.url || payload?.url || payload?.absoluteUrl || '').trim();
            if (!uploadedUrl) throw new Error('Upload URL missing');
            setDraft((prev) => ({ ...prev, iconUploadOrUrl: uploadedUrl }));
            toast.success('Icon uploaded');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to upload icon');
        } finally {
            setUploadingIcon(false);
        }
    };

    const startEdit = (item: PublicSocialLinkItem) => {
        setDraft(toDraft(item));
        setEditingId(item.id);
    };

    const resetDraft = () => {
        setDraft(toDraft());
        setEditingId('');
    };

    return (
        <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-white">
                        Global Social Links Manager
                        {runtimeFlags.trainingMode ? (
                            <InfoHint
                                className="ml-2"
                                title="Placement Controls"
                                description="Enable only the sections where this social link should appear (header, footer, home, news, contact)."
                            />
                        ) : null}
                    </h3>
                    <p className="text-xs text-slate-400">Manage icon URL, destination URL, placement, and enable state from one place.</p>
                </div>
                <button
                    type="button"
                    onClick={() => listQuery.refetch()}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 px-2.5 py-1.5 text-xs text-indigo-200 hover:bg-indigo-500/20"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                    <label className="text-xs text-slate-400">Platform Name</label>
                    <input
                        value={draft.platformName}
                        onChange={(event) => setDraft((prev) => ({ ...prev, platformName: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                        placeholder="facebook"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400">Target URL</label>
                    <input
                        value={draft.targetUrl}
                        onChange={(event) => setDraft((prev) => ({ ...prev, targetUrl: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                        placeholder="https://facebook.com/..."
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400">Icon (Upload or URL)</label>
                    <div className="mt-1 flex items-center gap-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-indigo-500/20 bg-slate-950/65 flex items-center justify-center">
                            {draft.iconUploadOrUrl ? (
                                    <img src={buildMediaUrl(draft.iconUploadOrUrl)} alt={draft.platformName || 'icon'} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-[11px] text-slate-500">Icon</span>
                            )}
                        </div>
                        <label className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 px-2.5 py-2 text-xs text-indigo-200 hover:bg-indigo-500/20 cursor-pointer">
                            {uploadingIcon ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            {uploadingIcon ? 'Uploading...' : 'Upload'}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                    void uploadIcon(event.target.files?.[0] || null);
                                    event.currentTarget.value = '';
                                }}
                            />
                        </label>
                    </div>
                    <input
                        value={draft.iconUploadOrUrl}
                        onChange={(event) => setDraft((prev) => ({ ...prev, iconUploadOrUrl: event.target.value }))}
                        className="mt-2 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                        placeholder="https://.../icon.svg"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400">Description</label>
                    <input
                        value={draft.description}
                        onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                        placeholder="Join our Facebook community"
                    />
                </div>
            </div>

            <div className="mt-3 rounded-xl border border-indigo-500/10 bg-slate-950/45 p-3">
                <p className="text-xs text-slate-400">Placements</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {placementList.map((placement) => {
                        const checked = draft.placements.includes(placement);
                        return (
                            <label key={placement} className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/20 px-2.5 py-1.5 text-xs text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                        setDraft((prev) => {
                                            if (event.target.checked) {
                                                return { ...prev, placements: [...new Set([...prev.placements, placement])] };
                                            }
                                            return { ...prev, placements: prev.placements.filter((item) => item !== placement) };
                                        });
                                    }}
                                />
                                {placement}
                            </label>
                        );
                    })}
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-200">
                    <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(event) => setDraft((prev) => ({ ...prev, enabled: event.target.checked }))}
                    />
                    Enabled
                </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => saveMutation.mutate({ ...draft, id: editingId || undefined })}
                    disabled={!canSave || saveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                    {saveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingId ? 'Update Link' : 'Add Link'}
                </button>
                {editingId ? (
                    <button
                        type="button"
                        onClick={resetDraft}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-slate-400"
                    >
                        <Plus className="h-4 w-4" />
                        New Link
                    </button>
                ) : null}
            </div>

            <div className="mt-5 space-y-2">
                {(listQuery.data || []).map((item: PublicSocialLinkItem, index) => (
                    <article key={item.id || `${item.platformName}-${item.targetUrl}-${index}`} className="rounded-xl border border-indigo-500/10 bg-slate-950/50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-indigo-500/20 bg-slate-900 flex items-center justify-center">
                                        {item.iconUploadOrUrl ? (
                                            <img src={buildMediaUrl(item.iconUploadOrUrl)} alt={item.platformName} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] text-slate-400">{(item.platformName || '?').slice(0, 1).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-white">{item.platformName}</p>
                                </div>
                                <p className="truncate text-xs text-slate-400">{item.targetUrl}</p>
                                <p className="mt-1 text-[11px] text-slate-500">{item.description || 'No description'}</p>
                                <p className="mt-1 text-[11px] text-cyan-300">{item.placements.join(', ')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => startEdit(item)}
                                    className="rounded-lg border border-indigo-500/30 px-2 py-1 text-xs text-indigo-200 hover:bg-indigo-500/20"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (runtimeFlags.requireDeleteKeywordConfirm) {
                                            const typed = await showPromptDialog({
                                                title: 'Delete social link',
                                                message: 'Type DELETE to remove this social link.',
                                                expectedValue: 'DELETE',
                                                confirmLabel: 'Delete',
                                                tone: 'danger',
                                            });
                                            if (typed !== 'DELETE') {
                                                toast.error('Delete cancelled');
                                                return;
                                            }
                                        } else {
                                            const okay = await showConfirmDialog({
                                                title: 'Delete social link',
                                                message: 'Delete this social link?',
                                                confirmLabel: 'Delete',
                                                tone: 'danger',
                                            });
                                            if (!okay) return;
                                        }
                                        deleteMutation.mutate(item.id);
                                    }}
                                    className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                                >
                                    <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" />Delete</span>
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
