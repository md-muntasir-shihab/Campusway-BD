import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Pencil, Plus, Trash2, Save, FileText } from 'lucide-react';
import AdminGuardShell from '../../components/admin/AdminGuardShell';
import { showConfirmDialog } from '../../lib/appDialog';
import SimpleRichTextEditor from '../admin-news/components/SimpleRichTextEditor';
import {
    getAdminLegalPages,
    getAdminLegalPage,
    createAdminLegalPage,
    updateAdminLegalPage,
    deleteAdminLegalPage,
    type AdminLegalPageListItem,
} from '../../api/adminLegalPagesApi';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const textareaClass = `${inputClass} min-h-[80px]`;

type EditorForm = {
    title: string;
    slug: string;
    htmlContent: string;
    metaTitle: string;
    metaDescription: string;
};

const emptyForm: EditorForm = { title: '', slug: '', htmlContent: '', metaTitle: '', metaDescription: '' };

export default function AdminLegalPages() {
    const queryClient = useQueryClient();
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [form, setForm] = useState<EditorForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [slugError, setSlugError] = useState('');

    const pagesQuery = useQuery({ queryKey: ['admin-legal-pages'], queryFn: getAdminLegalPages });
    const pages = pagesQuery.data ?? [];

    async function refresh(): Promise<void> {
        await queryClient.invalidateQueries({ queryKey: ['admin-legal-pages'] });
    }

    function openNewPage(): void {
        setEditingSlug(null);
        setForm(emptyForm);
        setSlugError('');
        setView('editor');
    }

    async function openEditPage(slug: string): Promise<void> {
        try {
            const page = await getAdminLegalPage(slug);
            setEditingSlug(slug);
            setForm({
                title: page.title,
                slug: page.slug,
                htmlContent: page.htmlContent || '',
                metaTitle: page.metaTitle || '',
                metaDescription: page.metaDescription || '',
            });
            setSlugError('');
            setView('editor');
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to load page');
        }
    }

    function goBackToList(): void {
        setView('list');
        setEditingSlug(null);
        setForm(emptyForm);
        setSlugError('');
    }

    function validateSlug(slug: string): boolean {
        if (!slug.trim()) {
            setSlugError('Slug is required');
            return false;
        }
        if (!SLUG_REGEX.test(slug)) {
            setSlugError('Use lowercase letters, numbers, and hyphens only');
            return false;
        }
        setSlugError('');
        return true;
    }

    async function handleSave(): Promise<void> {
        if (!form.title.trim()) {
            toast.error('Title is required');
            return;
        }
        if (!validateSlug(form.slug)) return;

        setSaving(true);
        try {
            if (editingSlug) {
                await updateAdminLegalPage(editingSlug, {
                    title: form.title.trim(),
                    htmlContent: form.htmlContent,
                    metaTitle: form.metaTitle.trim(),
                    metaDescription: form.metaDescription.trim(),
                });
                toast.success('Legal page updated');
            } else {
                await createAdminLegalPage({
                    slug: form.slug.trim(),
                    title: form.title.trim(),
                    htmlContent: form.htmlContent,
                    metaTitle: form.metaTitle.trim(),
                    metaDescription: form.metaDescription.trim(),
                });
                toast.success('Legal page created');
            }
            await refresh();
            goBackToList();
        } catch (error: any) {
            const msg = error?.response?.data?.error || 'Failed to save legal page';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(slug: string): Promise<void> {
        const confirmed = await showConfirmDialog({
            title: 'Delete legal page?',
            message: `Are you sure you want to delete the "${slug}" page? This action cannot be undone.`,
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (!confirmed) return;

        try {
            await deleteAdminLegalPage(slug);
            toast.success('Legal page deleted');
            await refresh();
            if (editingSlug === slug) goBackToList();
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to delete page');
        }
    }

    return (
        <AdminGuardShell title="Legal Pages" description="অতিরিক্ত আইনি পেজ ম্যানেজ করুন। About, Terms ও Privacy পেজ Site Settings → Static Pages থেকে ম্যানেজ হয়।">
            {view === 'list' ? (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Legal Pages</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{pages.length} page(s)</p>
                        </div>
                        <button type="button" onClick={openNewPage} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                            <Plus className="h-4 w-4" /> New Page
                        </button>
                    </div>

                    {pagesQuery.isLoading && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading pages...
                        </div>
                    )}

                    {pages.length === 0 && !pagesQuery.isLoading && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                            <FileText className="mx-auto h-8 w-8 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No legal pages yet. Create your first one.</p>
                        </div>
                    )}

                    {pages.map((page: AdminLegalPageListItem) => (
                        <div key={page._id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{page.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        /{page.slug} • Updated {new Date(page.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button type="button" onClick={() => openEditPage(page.slug)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                </button>
                                <button type="button" onClick={() => handleDelete(page.slug)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30">
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </section>
            ) : (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2">
                        <button type="button" onClick={goBackToList} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {editingSlug ? `Edit: ${editingSlug}` : 'New Legal Page'}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Title *</label>
                            <input
                                aria-label="Page title"
                                className={inputClass}
                                placeholder="Page title"
                                value={form.title}
                                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Slug *</label>
                            <input
                                aria-label="URL slug"
                                className={inputClass}
                                placeholder="e.g. about, terms, privacy-policy"
                                value={form.slug}
                                disabled={!!editingSlug}
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase();
                                    setForm((prev) => ({ ...prev, slug: val }));
                                    if (val) validateSlug(val);
                                    else setSlugError('');
                                }}
                            />
                            {slugError && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{slugError}</p>}
                            {editingSlug && <p className="mt-1 text-xs text-slate-500">Slug cannot be changed after creation.</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Meta Title</label>
                            <input
                                aria-label="Meta title for SEO"
                                className={inputClass}
                                placeholder="SEO title (shown in browser tab)"
                                value={form.metaTitle}
                                onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Meta Description</label>
                            <textarea
                                aria-label="Meta description for SEO"
                                className={textareaClass}
                                placeholder="SEO description"
                                value={form.metaDescription}
                                onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Content</label>
                            <SimpleRichTextEditor
                                value={form.htmlContent}
                                onChange={(value) => setForm((prev) => ({ ...prev, htmlContent: value }))}
                                placeholder="Write page content..."
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving || !form.title.trim() || !form.slug.trim()}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {editingSlug ? 'Update Page' : 'Create Page'}
                            </button>
                            {editingSlug && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(editingSlug)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                >
                                    <Trash2 className="h-4 w-4" /> Delete
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </AdminGuardShell>
    );
}
