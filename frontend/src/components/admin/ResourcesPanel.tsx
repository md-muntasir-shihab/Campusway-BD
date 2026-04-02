import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    Search,
    Star,
    Copy,
    Eye,
    EyeOff,
    Download,
    Tag,
    CalendarDays,
    Hash,
    Link as LinkIcon,
    FileText,
    Settings,
} from 'lucide-react';
import { adminGetResources, adminCreateResource, adminUpdateResource, adminDeleteResource, adminToggleResourcePublish, adminToggleResourceFeatured } from '../../services/api';
import AdminFileUploadField from './AdminFileUploadField';
import AdminImageUploadField from './AdminImageUploadField';
import { buildYouTubeEmbedUrl } from '../../utils/youtube';
import { showConfirmDialog } from '../../lib/appDialog';

type ResourceType = 'pdf' | 'link' | 'video' | 'audio' | 'image' | 'note';

interface ResourceRecord {
    _id: string;
    title: string;
    description?: string;
    type: ResourceType;
    category?: string;
    tags?: string[];
    fileUrl?: string;
    externalUrl?: string;
    thumbnailUrl?: string;
    isPublic: boolean;
    isFeatured: boolean;
    views?: number;
    downloads?: number;
    order?: number;
    publishDate?: string;
    expiryDate?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface ResourceFormState {
    title: string;
    type: ResourceType;
    category: string;
    description: string;
    tagsInput: string;
    fileUrl: string;
    externalUrl: string;
    thumbnailUrl: string;
    isPublic: boolean;
    isFeatured: boolean;
    order: string;
    views: string;
    downloads: string;
    publishDate: string;
    expiryDate: string;
}

const CATEGORIES = ['Question Banks', 'Study Materials', 'Official Links', 'Tips & Tricks', 'Scholarships', 'Admit Cards', 'Other'];
const RESOURCE_TYPES: ResourceType[] = ['pdf', 'link', 'video', 'audio', 'image', 'note'];

const createInitialForm = (): ResourceFormState => ({
    title: '',
    type: 'pdf',
    category: '',
    description: '',
    tagsInput: '',
    fileUrl: '',
    externalUrl: '',
    thumbnailUrl: '',
    isPublic: true,
    isFeatured: false,
    order: '0',
    views: '0',
    downloads: '0',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
});

const toDateInput = (value?: string): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const toSafeNumber = (value: string, fallback = 0): number => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return fallback;
    return parsed;
};

export default function ResourcesPanel() {
    const navigate = useNavigate();
    const [resources, setResources] = useState<ResourceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<ResourceRecord | null>(null);
    const [form, setForm] = useState<ResourceFormState>(createInitialForm());

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const response = await adminGetResources({});
            setResources((response.data.resources || []) as ResourceRecord[]);
        } catch {
            toast.error('Failed to load resources');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetch();
    }, [fetch]);

    const openCreate = () => {
        setEditing(null);
        setForm(createInitialForm());
        setShowForm(true);
    };

    const openEdit = (resource: ResourceRecord) => {
        setEditing(resource);
        setForm({
            title: resource.title || '',
            type: resource.type || 'pdf',
            category: resource.category || '',
            description: resource.description || '',
            tagsInput: Array.isArray(resource.tags) ? resource.tags.join(', ') : '',
            fileUrl: resource.fileUrl || '',
            externalUrl: resource.externalUrl || '',
            thumbnailUrl: resource.thumbnailUrl || '',
            isPublic: Boolean(resource.isPublic),
            isFeatured: Boolean(resource.isFeatured),
            order: String(resource.order ?? 0),
            views: String(resource.views ?? 0),
            downloads: String(resource.downloads ?? 0),
            publishDate: toDateInput(resource.publishDate) || new Date().toISOString().split('T')[0],
            expiryDate: toDateInput(resource.expiryDate),
        });
        setShowForm(true);
    };

    const onSave = async () => {
        if (!form.title.trim()) {
            toast.error('Title is required');
            return;
        }

        try {
            const payload: Record<string, unknown> = {
                title: form.title.trim(),
                type: form.type,
                category: form.category.trim(),
                description: form.description.trim(),
                tags: form.tagsInput
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                fileUrl: form.fileUrl.trim(),
                externalUrl: form.externalUrl.trim(),
                thumbnailUrl: form.thumbnailUrl.trim(),
                isPublic: form.isPublic,
                isFeatured: form.isFeatured,
                order: toSafeNumber(form.order, 0),
                views: toSafeNumber(form.views, 0),
                downloads: toSafeNumber(form.downloads, 0),
                publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : new Date().toISOString(),
            };

            if (form.expiryDate) {
                payload.expiryDate = new Date(form.expiryDate).toISOString();
            }

            if (!payload.fileUrl) delete payload.fileUrl;
            if (!payload.externalUrl) delete payload.externalUrl;
            if (!payload.thumbnailUrl) delete payload.thumbnailUrl;
            if (!payload.category) delete payload.category;
            if (!((payload.tags as string[])?.length)) delete payload.tags;

            if (editing) {
                await adminUpdateResource(editing._id, payload);
                toast.success('Resource updated');
            } else {
                await adminCreateResource(payload);
                toast.success('Resource created');
            }

            setShowForm(false);
            setEditing(null);
            setForm(createInitialForm());
            void fetch();
        } catch {
            toast.error('Save failed');
        }
    };

    const onDelete = async (id: string) => {
        const confirmed = await showConfirmDialog({
            title: 'Delete resource?',
            message: 'This resource will be removed from the admin library and public/student listings.',
            confirmLabel: 'Delete resource',
            cancelLabel: 'Keep resource',
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await adminDeleteResource(id);
            toast.success('Resource deleted');
            void fetch();
        } catch {
            toast.error('Delete failed');
        }
    };

    const onTogglePublish = async (id: string) => {
        try {
            await adminToggleResourcePublish(id);
            void fetch();
        } catch {
            toast.error('Toggle failed');
        }
    };

    const onToggleFeatured = async (id: string) => {
        try {
            await adminToggleResourceFeatured(id);
            void fetch();
        } catch {
            toast.error('Toggle failed');
        }
    };

    const copyLink = (resource: ResourceRecord) => {
        const url = resource.externalUrl || resource.fileUrl || `${window.location.origin}/resources`;
        void navigator.clipboard.writeText(url);
        toast.success('Link copied');
    };

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return resources;
        return resources.filter((resource) => {
            const tags = Array.isArray(resource.tags) ? resource.tags.join(' ') : '';
            return [resource.title, resource.category, resource.description, resource.type, tags]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(needle);
        });
    }, [resources, search]);

    const youtubeEmbedUrl = useMemo(
        () => (form.type === 'video' ? buildYouTubeEmbedUrl(form.externalUrl) : null),
        [form.externalUrl, form.type],
    );
    const showUploadedFileField = form.type !== 'link' && form.type !== 'note';

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white">Resources Management</h2>
                    <p className="text-xs text-slate-500">Card view with complete details. Everything is editable from admin.</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search title/category/type/tags..."
                            className="w-full sm:w-64 bg-slate-900/65 border border-indigo-500/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={openCreate}
                        className="bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-500/20 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Add
                    </button>
                    <button
                        onClick={() => void fetch()}
                        className="p-2 bg-white/5 text-slate-400 hover:text-white rounded-xl"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => navigate('/__cw_admin__/settings/resource-settings')}
                        title="Resource Settings"
                        className="p-2 bg-white/5 text-slate-400 hover:text-white rounded-xl"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-indigo-500/10 p-6 space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-white text-lg">{editing ? 'Edit Resource' : 'Create Resource'}</h3>
                            <p className="mt-1 text-xs text-slate-400">
                                Upload files directly or keep using external links. YouTube video links will render as embeds on the public detail page.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.isPublic}
                                    onChange={(event) => setForm((prev) => ({ ...prev, isPublic: event.target.checked }))}
                                    className="w-4 h-4 rounded bg-slate-950 border-indigo-500/30 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                                />
                                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">Public</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.isFeatured}
                                    onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
                                    className="w-4 h-4 rounded bg-slate-950 border-indigo-500/30 text-amber-600 focus:ring-0 focus:ring-offset-0"
                                />
                                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">Featured</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="md:col-span-2 xl:col-span-2">
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Title</label>
                            <input
                                value={form.title}
                                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                                placeholder="Enter resource title..."
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Type</label>
                            <select
                                value={form.type}
                                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ResourceType }))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                            >
                                {RESOURCE_TYPES.map((type) => (
                                    <option key={type} value={type}>{type.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Category</label>
                            <select
                                value={form.category}
                                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                            >
                                <option value="">Select Category</option>
                                {CATEGORIES.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2 xl:col-span-2">
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Tags (comma separated)</label>
                            <input
                                value={form.tagsInput}
                                onChange={(event) => setForm((prev) => ({ ...prev, tagsInput: event.target.value }))}
                                placeholder="Admission, DU, Scholarship"
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Publish Date</label>
                            <input
                                type="date"
                                value={form.publishDate}
                                onChange={(event) => setForm((prev) => ({ ...prev, publishDate: event.target.value }))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Expiry Date</label>
                            <input
                                type="date"
                                value={form.expiryDate}
                                onChange={(event) => setForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Display Order</label>
                            <input
                                type="number"
                                min={0}
                                value={form.order}
                                onChange={(event) => setForm((prev) => ({ ...prev, order: event.target.value }))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Views</label>
                            <input
                                type="number"
                                min={0}
                                value={form.views}
                                onChange={(event) => setForm((prev) => ({ ...prev, views: event.target.value }))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">Downloads/Hits</label>
                            <input
                                type="number"
                                min={0}
                                value={form.downloads}
                                onChange={(event) => setForm((prev) => ({ ...prev, downloads: event.target.value }))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
                            />
                        </div>

                        <div className="md:col-span-2 xl:col-span-4 grid gap-4 xl:grid-cols-2">
                            <AdminImageUploadField
                                label="Thumbnail"
                                value={form.thumbnailUrl}
                                onChange={(nextValue) => setForm((prev) => ({ ...prev, thumbnailUrl: nextValue }))}
                                helper="Upload a cover thumbnail instead of pasting an image URL manually."
                                previewAlt={form.title || 'Resource thumbnail'}
                                category="admin_upload"
                                emptyTitle="No thumbnail uploaded"
                                emptyDescription="Upload an image cover for resource cards and previews."
                                panelClassName="border-indigo-500/10 bg-slate-950/20"
                            />
                            {showUploadedFileField ? (
                                <AdminFileUploadField
                                    label="Uploaded File"
                                    value={form.fileUrl}
                                    onChange={(nextValue) => setForm((prev) => ({ ...prev, fileUrl: nextValue }))}
                                    helper={form.type === 'video'
                                        ? 'Upload MP4 or WebM for direct hosted playback, or use a YouTube URL below.'
                                        : 'Upload PDF, Excel, CSV, image, or supported media and keep the saved URL in the existing file field.'}
                                    emptyTitle="No file uploaded"
                                    emptyDescription="Use this for PDF, Excel, CSV, MP4, WebM, or other supported resource files."
                                />
                            ) : (
                                <div className="rounded-2xl border border-indigo-500/10 bg-slate-950/30 p-4 text-sm text-slate-400">
                                    <p className="font-semibold text-slate-200">Hosted file upload not needed for this type</p>
                                    <p className="mt-2 text-xs leading-6 text-slate-400">
                                        Link and note resources can keep using the external URL and description fields below.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 xl:col-span-2">
                            <label className="text-xs text-slate-400 block mb-1.5 ml-1">External / Video URL</label>
                            <input
                                value={form.externalUrl}
                                onChange={(event) => setForm((prev) => ({ ...prev, externalUrl: event.target.value }))}
                                placeholder={form.type === 'video' ? 'YouTube watch/share/shorts URL or external video link' : 'https://...'}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
                            />
                            <p className="mt-2 text-[11px] text-slate-500">
                                {form.type === 'video'
                                    ? 'Paste a YouTube URL to show an embedded preview on the public detail page.'
                                    : 'Keep this field for direct external resources when you do not want to upload a file.'}
                            </p>
                        </div>
                    </div>

                    {form.type === 'video' ? (
                        <div className="rounded-2xl border border-indigo-500/10 bg-slate-950/35 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">Video Source Preview</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {youtubeEmbedUrl
                                            ? 'Recognized YouTube link. This will render as an embedded video.'
                                            : form.externalUrl.trim()
                                                ? 'External video link saved as a normal outbound URL.'
                                                : 'Add a YouTube URL or upload a video file.'}
                                    </p>
                                </div>
                                {youtubeEmbedUrl ? (
                                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                                        YouTube Embed Enabled
                                    </span>
                                ) : null}
                            </div>
                            {youtubeEmbedUrl ? (
                                <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-500/10 bg-slate-950/70">
                                    <div className="aspect-video">
                                        <iframe
                                            src={youtubeEmbedUrl}
                                            title="YouTube preview"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            className="h-full w-full"
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div>
                        <label className="text-xs text-slate-400 block mb-1.5 ml-1">Description</label>
                        <textarea
                            rows={4}
                            value={form.description}
                            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                            placeholder="Enter resource description..."
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            onClick={() => {
                                setShowForm(false);
                                setEditing(null);
                                setForm(createInitialForm());
                            }}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => void onSave()}
                            className="bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all"
                        >
                            Save Resource
                        </button>
                    </div>
                </div>
            )}

            {loading && resources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin opacity-50" />
                    <p className="text-slate-500 animate-pulse">Synchronizing resources...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {filtered.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-indigo-500/10">
                            No resources found matching your search.
                        </div>
                    ) : filtered.map((resource) => (
                        <article
                            key={resource._id}
                            className="rounded-2xl border border-indigo-500/15 bg-slate-900/60 p-4 shadow-xl space-y-3"
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-950/70 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                    {resource.thumbnailUrl ? (
                                        <img src={resource.thumbnailUrl} alt={resource.title} className="h-full w-full object-cover" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-indigo-300" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-white font-semibold text-base leading-tight break-words">{resource.title}</h3>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        {resource.publishDate ? new Date(resource.publishDate).toLocaleString() : 'Publish date not set'}
                                    </p>
                                </div>
                                {resource.isFeatured && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${resource.isPublic ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' : 'bg-slate-500/10 text-slate-300 border-slate-500/25'}`}>
                                    {resource.isPublic ? 'PUBLIC' : 'PRIVATE'}
                                </span>
                                <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold border border-indigo-500/20">
                                    {String(resource.type || 'note').toUpperCase()}
                                </span>
                                <span className="px-2 py-1 rounded-lg bg-slate-800/70 text-slate-300 text-[10px] font-semibold border border-slate-700/60">
                                    {resource.category || 'Uncategorized'}
                                </span>
                            </div>

                            <p className="text-sm text-slate-300 break-words">{resource.description || 'No description added.'}</p>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl border border-indigo-500/10 bg-slate-950/40 p-2">
                                    <p className="text-slate-500 flex items-center gap-1"><Eye className="w-3 h-3" /> Views</p>
                                    <p className="text-cyan-300 font-semibold mt-1">{resource.views || 0}</p>
                                </div>
                                <div className="rounded-xl border border-indigo-500/10 bg-slate-950/40 p-2">
                                    <p className="text-slate-500 flex items-center gap-1"><Download className="w-3 h-3" /> Hits</p>
                                    <p className="text-cyan-300 font-semibold mt-1">{resource.downloads || 0}</p>
                                </div>
                                <div className="rounded-xl border border-indigo-500/10 bg-slate-950/40 p-2">
                                    <p className="text-slate-500 flex items-center gap-1"><Hash className="w-3 h-3" /> Order</p>
                                    <p className="text-slate-200 font-semibold mt-1">{resource.order || 0}</p>
                                </div>
                                <div className="rounded-xl border border-indigo-500/10 bg-slate-950/40 p-2">
                                    <p className="text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Expiry</p>
                                    <p className="text-slate-200 font-semibold mt-1">
                                        {resource.expiryDate ? new Date(resource.expiryDate).toLocaleDateString() : 'No expiry'}
                                    </p>
                                </div>
                            </div>

                            {Array.isArray(resource.tags) && resource.tags.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {resource.tags.map((tag, index) => (
                                            <span key={`${resource._id}-${tag}-${index}`} className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1 text-[11px]">
                                {resource.fileUrl && (
                                    <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 break-all">
                                        <LinkIcon className="w-3 h-3 shrink-0" /> File URL
                                    </a>
                                )}
                                {resource.externalUrl && (
                                    <a href={resource.externalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 break-all">
                                        <LinkIcon className="w-3 h-3 shrink-0" /> External URL
                                    </a>
                                )}
                                {resource.thumbnailUrl && (
                                    <a href={resource.thumbnailUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 break-all">
                                        <LinkIcon className="w-3 h-3 shrink-0" /> Thumbnail URL
                                    </a>
                                )}
                            </div>

                            <div className="pt-3 border-t border-indigo-500/10 grid grid-cols-5 gap-2">
                                <button onClick={() => openEdit(resource)} className="rounded-xl bg-indigo-500/15 text-indigo-200 text-xs font-semibold py-2 hover:bg-indigo-500/25 flex items-center justify-center gap-1">
                                    <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button onClick={() => copyLink(resource)} className="rounded-xl bg-cyan-500/15 text-cyan-200 text-xs font-semibold py-2 hover:bg-cyan-500/25 flex items-center justify-center gap-1">
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </button>
                                <button onClick={() => void onTogglePublish(resource._id)} title={resource.isPublic ? 'Set Private' : 'Set Public'} className={`rounded-xl text-xs font-semibold py-2 flex items-center justify-center gap-1 ${resource.isPublic ? 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25' : 'bg-slate-500/15 text-slate-300 hover:bg-slate-500/25'}`}>
                                    {resource.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    {resource.isPublic ? 'Pub' : 'Priv'}
                                </button>
                                <button onClick={() => void onToggleFeatured(resource._id)} title={resource.isFeatured ? 'Unfeature' : 'Feature'} className={`rounded-xl text-xs font-semibold py-2 flex items-center justify-center gap-1 ${resource.isFeatured ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'bg-slate-500/15 text-slate-300 hover:bg-slate-500/25'}`}>
                                    <Star className={`w-3.5 h-3.5 ${resource.isFeatured ? 'fill-amber-400' : ''}`} />
                                    {resource.isFeatured ? 'Feat' : 'Pin'}
                                </button>
                                <button onClick={() => void onDelete(resource._id)} className="rounded-xl bg-red-500/15 text-red-200 text-xs font-semibold py-2 hover:bg-red-500/25 flex items-center justify-center gap-1">
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
