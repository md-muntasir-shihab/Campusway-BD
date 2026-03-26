import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    Plus, Edit, Trash2, Image, RefreshCw, Eye, EyeOff,
    Calendar, Clock, ExternalLink, X, ChevronUp, ChevronDown,
    Megaphone,
} from 'lucide-react';
import {
    adminGetBanners,
    adminCreateBanner,
    adminUpdateBanner,
    adminDeleteBanner,
    adminPublishBanner,
} from '../../services/api';
import AdminImageUploadField from './AdminImageUploadField';
import { uploadSignedBannerAsset } from './bannerUpload';

/* ── Types ── */
interface CampaignBanner {
    _id: string;
    title?: string;
    subtitle?: string;
    imageUrl: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
    isActive: boolean;
    status: 'draft' | 'published';
    slot: string;
    priority: number;
    order: number;
    startDate?: string;
    endDate?: string;
}

type ScheduleState = 'live' | 'scheduled' | 'expired' | 'draft';

const EMPTY_FORM = {
    title: '',
    subtitle: '',
    imageUrl: '',
    mobileImageUrl: '',
    linkUrl: '',
    altText: '',
    isActive: true,
    priority: 0,
    order: 0,
    startDate: '',
    endDate: '',
};

/* ── Helpers ── */
function getScheduleState(b: CampaignBanner): ScheduleState {
    if (b.status !== 'published' || !b.isActive) return 'draft';
    const now = Date.now();
    if (b.startDate && new Date(b.startDate).getTime() > now) return 'scheduled';
    if (b.endDate && new Date(b.endDate).getTime() < now) return 'expired';
    return 'live';
}

const SCHEDULE_BADGE: Record<ScheduleState, { bg: string; text: string; label: string }> = {
    live: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Live' },
    scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Scheduled' },
    expired: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Expired' },
    draft: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Draft' },
};

/* ── Component ── */
export default function CampaignBannersPanel() {
    const [banners, setBanners] = useState<CampaignBanner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<null | 'create' | CampaignBanner>(null);
    const [form, setForm] = useState(EMPTY_FORM);

    /* Filter only home_ads banners */
    const campaigns = useMemo(
        () =>
            banners
                .filter((b) => b.slot === 'home_ads')
                .sort((a, b) => b.priority - a.priority || a.order - b.order),
        [banners],
    );

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const { data } = await adminGetBanners();
            setBanners(data.banners || []);
        } catch {
            toast.error('Failed to load campaign banners');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchBanners();
    }, []);

    /* ── Modal helpers ── */
    const openCreate = () => {
        setForm({ ...EMPTY_FORM, order: campaigns.length });
        setModal('create');
    };

    const openEdit = (banner: CampaignBanner) => {
        setForm({
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            imageUrl: banner.imageUrl || '',
            mobileImageUrl: banner.mobileImageUrl || '',
            linkUrl: banner.linkUrl || '',
            altText: banner.altText || '',
            isActive: banner.isActive,
            priority: Number(banner.priority || 0),
            order: Number(banner.order || 0),
            startDate: banner.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : '',
            endDate: banner.endDate ? new Date(banner.endDate).toISOString().slice(0, 16) : '',
        });
        setModal(banner);
    };

    /* ── Image upload ── */
    /* ── Save ── */
    const saveBanner = async () => {
        if (!form.imageUrl.trim()) {
            toast.error('Desktop banner image is required');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                slot: 'home_ads',
                status: form.isActive ? 'published' : 'draft',
                priority: Number(form.priority),
                order: Number(form.order),
                startDate: form.startDate || undefined,
                endDate: form.endDate || undefined,
            };
            if (modal === 'create') {
                await adminCreateBanner(payload);
                toast.success('Campaign banner created');
            } else if (modal && typeof modal === 'object') {
                await adminUpdateBanner(modal._id, payload);
                toast.success('Campaign banner updated');
            }
            setModal(null);
            await fetchBanners();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save banner');
        } finally {
            setSaving(false);
        }
    };

    const removeBanner = async (id: string) => {
        if (!confirm('Delete this campaign banner?')) return;
        try {
            await adminDeleteBanner(id);
            toast.success('Banner deleted');
            await fetchBanners();
        } catch {
            toast.error('Failed to delete banner');
        }
    };

    const togglePublish = async (banner: CampaignBanner) => {
        try {
            await adminPublishBanner(banner._id, banner.status !== 'published');
            await fetchBanners();
        } catch {
            toast.error('Failed to toggle publish state');
        }
    };

    const moveBanner = async (banner: CampaignBanner, direction: 'up' | 'down') => {
        const idx = campaigns.findIndex((b) => b._id === banner._id);
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= campaigns.length) return;
        const other = campaigns[swapIdx];
        try {
            await Promise.all([
                adminUpdateBanner(banner._id, { order: other.order }),
                adminUpdateBanner(other._id, { order: banner.order }),
            ]);
            await fetchBanners();
        } catch {
            toast.error('Failed to reorder');
        }
    };

    /* ── Render ── */
    return (
        <div className="space-y-5 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-[var(--primary)]" /> Campaign Banners
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Manage promotional banners displayed on the home screen carousel.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => void fetchBanners()}
                        className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={openCreate}
                        className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 shadow-lg shadow-[var(--primary)]/20"
                    >
                        <Plus className="w-4 h-4" /> New Campaign
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['live', 'scheduled', 'draft', 'expired'] as ScheduleState[]).map((st) => {
                    const count = campaigns.filter((b) => getScheduleState(b) === st).length;
                    const badge = SCHEDULE_BADGE[st];
                    return (
                        <div key={st} className={`rounded-xl border border-indigo-500/10 bg-slate-900/60 px-4 py-3`}>
                            <p className="text-2xl font-bold text-white">{count}</p>
                            <p className={`text-xs font-medium ${badge.text}`}>{badge.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Banner list */}
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-indigo-500/10 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-[var(--primary)] animate-spin mx-auto" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="p-12 text-center">
                        <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500">No campaign banners yet. Create one to promote on the home screen.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-indigo-500/10">
                        {campaigns.map((banner, idx) => {
                            const state = getScheduleState(banner);
                            const badge = SCHEDULE_BADGE[state];
                            return (
                                <article key={banner._id} className="p-4 flex flex-col md:flex-row gap-4">
                                    {/* Preview */}
                                    <div className="w-full md:w-56 h-28 rounded-xl overflow-hidden bg-slate-950/60 shrink-0">
                                        {banner.imageUrl ? (
                                            <img
                                                src={banner.imageUrl}
                                                alt={banner.altText || banner.title || 'Campaign'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center">
                                                <Image className="w-6 h-6 text-slate-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-semibold text-white truncate">
                                                {banner.title || 'Untitled Campaign'}
                                            </p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${badge.bg} ${badge.text}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        {banner.subtitle && (
                                            <p className="text-xs text-slate-400 truncate mb-1">{banner.subtitle}</p>
                                        )}
                                        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {banner.startDate
                                                    ? new Date(banner.startDate).toLocaleDateString()
                                                    : 'No start'}
                                                {' → '}
                                                {banner.endDate
                                                    ? new Date(banner.endDate).toLocaleDateString()
                                                    : 'No end'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                Priority: {banner.priority}
                                            </span>
                                            {banner.linkUrl && (
                                                <a
                                                    href={banner.linkUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[var(--primary)] hover:underline"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Link
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex md:flex-col items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => void togglePublish(banner)}
                                            className="p-1.5 rounded-lg hover:bg-emerald-500/10"
                                            title={state === 'live' ? 'Unpublish' : 'Publish'}
                                        >
                                            {banner.status === 'published' ? (
                                                <Eye className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-slate-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => openEdit(banner)}
                                            className="p-1.5 rounded-lg hover:bg-amber-500/10"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4 text-amber-400" />
                                        </button>
                                        <button
                                            onClick={() => void moveBanner(banner, 'up')}
                                            disabled={idx === 0}
                                            className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
                                            title="Move up"
                                        >
                                            <ChevronUp className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => void moveBanner(banner, 'down')}
                                            disabled={idx === campaigns.length - 1}
                                            className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
                                            title="Move down"
                                        >
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => void removeBanner(banner._id)}
                                            className="p-1.5 rounded-lg hover:bg-red-500/10"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Create / Edit Modal ── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-indigo-500/15 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-500/10">
                            <h3 className="text-base font-semibold text-white">
                                {modal === 'create' ? 'New Campaign Banner' : 'Edit Campaign Banner'}
                            </h3>
                            <button onClick={() => setModal(null)} className="p-1 hover:bg-white/10 rounded-lg">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Title</label>
                                <input
                                    value={form.title}
                                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                    className="w-full bg-slate-800/60 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    placeholder="Campaign title"
                                />
                            </div>

                            {/* Subtitle */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Subtitle</label>
                                <input
                                    value={form.subtitle}
                                    onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                                    className="w-full bg-slate-800/60 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    placeholder="Short description"
                                />
                            </div>

                            {/* Desktop image */}
                            <AdminImageUploadField
                                label="Desktop Image"
                                value={form.imageUrl}
                                onChange={(nextValue) => setForm((p) => ({ ...p, imageUrl: nextValue }))}
                                helper="Required main creative for the home campaign banner carousel."
                                required
                                previewAlt={form.altText || form.title || 'Desktop banner preview'}
                                onUpload={uploadSignedBannerAsset}
                                uploadSuccessMessage="Desktop image uploaded"
                                uploadErrorMessage="Failed to upload desktop image"
                                panelClassName="bg-slate-800/45 border-indigo-500/15"
                                previewClassName="min-h-[170px] bg-slate-900/70"
                            />

                            {/* Mobile image */}
                            <AdminImageUploadField
                                label="Mobile Image"
                                value={form.mobileImageUrl}
                                onChange={(nextValue) => setForm((p) => ({ ...p, mobileImageUrl: nextValue }))}
                                helper="Optional mobile-specific version. Leave empty to reuse the desktop image."
                                previewAlt={form.altText || form.title || 'Mobile banner preview'}
                                onUpload={uploadSignedBannerAsset}
                                uploadSuccessMessage="Mobile image uploaded"
                                uploadErrorMessage="Failed to upload mobile image"
                                panelClassName="bg-slate-800/45 border-indigo-500/15"
                                previewClassName="min-h-[170px] bg-slate-900/70"
                            />

                            {/* Link URL */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Link URL</label>
                                <input
                                    value={form.linkUrl}
                                    onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                                    className="w-full bg-slate-800/60 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    placeholder="https://example.com/promo"
                                />
                            </div>

                            {/* Alt text */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Alt Text</label>
                                <input
                                    value={form.altText}
                                    onChange={(e) => setForm((p) => ({ ...p, altText: e.target.value }))}
                                    className="w-full bg-slate-800/60 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    placeholder="Accessible description of the banner"
                                />
                            </div>

                            {/* Priority + order */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Priority</label>
                                    <input
                                        type="number"
                                        value={form.priority}
                                        onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                                        className="w-full bg-slate-800/60 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Order</label>
                                    <input
                                        type="number"
                                        value={form.order}
                                        onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
                                        className="w-full bg-slate-800/60 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            {/* Schedule */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Start Date
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.startDate}
                                        onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                                        className="w-full bg-slate-800/60 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> End Date
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.endDate}
                                        onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                                        className="w-full bg-slate-800/60 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div
                                    className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                    onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                                >
                                    <div
                                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`}
                                    />
                                </div>
                                <span className="text-sm text-slate-300">{form.isActive ? 'Active' : 'Inactive'}</span>
                            </label>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-indigo-500/10">
                            <button
                                onClick={() => setModal(null)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void saveBanner()}
                                disabled={saving}
                                className="px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 shadow-lg shadow-[var(--primary)]/20"
                            >
                                {saving ? 'Saving…' : modal === 'create' ? 'Create' : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
