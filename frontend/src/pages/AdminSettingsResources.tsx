import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, BookOpen, RefreshCw } from 'lucide-react';
import AdminGuardShell from '../components/admin/AdminGuardShell';
import { adminGetResourceSettings, adminUpdateResourceSettings } from '../services/api';

interface ResourceSettings {
    pageTitle: string;
    pageSubtitle: string;
    defaultThumbnailUrl: string;
    showFeatured: boolean;
    trackingEnabled: boolean;
}

function ResourceSettingsPanel() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<ResourceSettings>({
        pageTitle: '',
        pageSubtitle: '',
        defaultThumbnailUrl: '',
        showFeatured: true,
        trackingEnabled: true,
    });

    useEffect(() => {
        void adminGetResourceSettings()
            .then(res => {
                const s = res.data.settings as Partial<ResourceSettings>;
                setForm({
                    pageTitle: s.pageTitle ?? 'Student Resources',
                    pageSubtitle: s.pageSubtitle ?? '',
                    defaultThumbnailUrl: s.defaultThumbnailUrl ?? '',
                    showFeatured: s.showFeatured ?? true,
                    trackingEnabled: s.trackingEnabled ?? true,
                });
            })
            .catch(() => toast.error('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await adminUpdateResourceSettings(form as unknown as Record<string, unknown>);
            toast.success('Resource settings saved');
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-6">
            {/* Page branding */}
            <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">Page Branding</h3>
                </div>

                <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Page Title</label>
                    <input
                        value={form.pageTitle}
                        onChange={e => setForm(f => ({ ...f, pageTitle: e.target.value }))}
                        placeholder="Student Resources"
                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                    />
                </div>

                <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Page Subtitle</label>
                    <input
                        value={form.pageSubtitle}
                        onChange={e => setForm(f => ({ ...f, pageSubtitle: e.target.value }))}
                        placeholder="Curated materials to help you succeed"
                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                    />
                </div>

                <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Default Thumbnail URL</label>
                    <input
                        value={form.defaultThumbnailUrl}
                        onChange={e => setForm(f => ({ ...f, defaultThumbnailUrl: e.target.value }))}
                        placeholder="https://…/default-resource-thumb.jpg"
                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 ml-1">Shown when a resource has no thumbnail set.</p>
                </div>
            </div>

            {/* Feature toggles */}
            <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white mb-2">Feature Toggles</h3>

                <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                        <p className="text-sm text-slate-200 group-hover:text-white transition-colors">Show Featured Section</p>
                        <p className="text-xs text-slate-500 mt-0.5">Display pinned resources at the top of the page.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={form.showFeatured}
                        onClick={() => setForm(f => ({ ...f, showFeatured: !f.showFeatured }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none ${form.showFeatured ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${form.showFeatured ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                        <p className="text-sm text-slate-200 group-hover:text-white transition-colors">View & Download Tracking</p>
                        <p className="text-xs text-slate-500 mt-0.5">Record view and download counts per resource.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={form.trackingEnabled}
                        onClick={() => setForm(f => ({ ...f, trackingEnabled: !f.trackingEnabled }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none ${form.trackingEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${form.trackingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                </label>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Settings
                </button>
            </div>
        </div>
    );
}

export default function AdminSettingsResourcesPage() {
    return (
        <AdminGuardShell
            title="Resource Settings"
            description="Configure resources page title, featured section visibility, and view tracking."
            allowedRoles={['superadmin', 'admin', 'moderator']}
        >
            <ResourceSettingsPanel />
        </AdminGuardShell>
    );
}
