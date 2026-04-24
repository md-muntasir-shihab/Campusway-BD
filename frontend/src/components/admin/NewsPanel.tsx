import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Plus, Edit, Trash2, RefreshCw, Search,
    FolderOpen, Newspaper, Star, Image as ImageIcon,
    Settings, Calendar, CheckCircle, Clock, Archive
} from 'lucide-react';
import {
    adminGetNews, adminCreateNews, adminUpdateNews,
    adminDeleteNews,
    adminGetNewsCategories, adminCreateNewsCategory, adminUpdateNewsCategory,
    adminDeleteNewsCategory, adminToggleNewsCategory,
    ApiNews, ApiNewsCategory
} from '../../services/api';
import { showConfirmDialog } from '../../lib/appDialog';
import AdminImageUploadField from './AdminImageUploadField';

export default function NewsPanel() {
    const [activeTab, setActiveTab] = useState<'articles' | 'categories'>('articles');

    // articles state
    const [news, setNews] = useState<ApiNews[]>([]);
    const [categoriesList, setCategoriesList] = useState<ApiNewsCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    // const [filterStatus, setFilterStatus] = useState('All');

    // category state
    const [catsLoading, setCatsLoading] = useState(false);

    // forms
    const [showArticleForm, setShowArticleForm] = useState(false);
    const [editingArticle, setEditingArticle] = useState<ApiNews | null>(null);
    const [articleForm, setArticleForm] = useState<Partial<ApiNews>>({
        title: '',
        category: '',
        shortDescription: '',
        content: '',
        featuredImage: '',
        coverImage: '',
        tags: [],
        status: 'draft',
        isPublished: false,
        isFeatured: false,
        seoTitle: '',
        seoDescription: '',
        publishDate: new Date().toISOString()
    });
    const [tagInput, setTagInput] = useState('');

    const [showCatForm, setShowCatForm] = useState(false);
    const [editingCat, setEditingCat] = useState<ApiNewsCategory | null>(null);
    const [catForm, setCatForm] = useState<Partial<ApiNewsCategory>>({ name: '', description: '', isActive: true });

    const fetchCategories = useCallback(async () => {
        setCatsLoading(true);
        try {
            const r = await adminGetNewsCategories();
            setCategoriesList(r.data.categories || []);
        } catch {
            toast.error('Failed to load categories');
        } finally {
            setCatsLoading(false);
        }
    }, []);

    const fetchNews = useCallback(async () => {
        setLoading(true);
        try {
            const p: any = { q: search };
            if (filterCategory !== 'All') p.category = filterCategory;
            // if (filterStatus !== 'All') p.status = filterStatus.toLowerCase(); // filterStatus is commented out
            const r = await adminGetNews(p);
            setNews(r.data.news || []);
        } catch {
            toast.error('Failed to load news');
        } finally {
            setLoading(false);
        }
    }, [search, filterCategory]); // Removed filterStatus from dependencies

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        if (activeTab === 'articles') fetchNews();
    }, [fetchNews, activeTab]);

    /* --- Article Handlers --- */
    const openCreateArticle = () => {
        setEditingArticle(null);
        setArticleForm({
            title: '',
            category: categoriesList[0]?.name || '',
            shortDescription: '',
            content: '',
            featuredImage: '',
            coverImage: '',
            tags: [],
            status: 'draft',
            isPublished: false,
            isFeatured: false,
            seoTitle: '',
            seoDescription: '',
            publishDate: new Date().toISOString()
        });
        setTagInput('');
        setShowArticleForm(true);
    };

    const openEditArticle = (n: ApiNews) => {
        setEditingArticle(n);
        setArticleForm({ ...n });
        setTagInput(n.tags?.join(', ') || '');
        setShowArticleForm(true);
    };

    const saveArticle = async () => {
        try {
            const payload = {
                ...articleForm,
                tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
                isPublished: articleForm.status === 'published'
            };
            if (editingArticle) {
                await adminUpdateNews(editingArticle._id, payload);
                toast.success('News updated');
            } else {
                await adminCreateNews(payload);
                toast.success('News created');
            }
            setShowArticleForm(false);
            fetchNews();
        } catch { toast.error('Failed to save article'); }
    };

    const deleteArticle = async (id: string) => {
        const confirmed = await showConfirmDialog({
            title: 'Delete news article',
            message: 'Are you sure you want to delete this news article? This action cannot be undone.',
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await adminDeleteNews(id);
            toast.success('News article deleted successfully');
            fetchNews();
        } catch { toast.error('Failed to delete news article'); }
    };

    const toggleArticleStatus = async (article: ApiNews, newStatus: string) => {
        try {
            const payload = { ...article, status: newStatus as any, isPublished: newStatus === 'published' };
            await adminUpdateNews(article._id, payload);
            toast.success(`Status updated to ${newStatus} `);
            fetchNews();
        } catch {
            toast.error('Failed to update status');
        }
    };

    /* --- Category Handlers --- */
    const openCreateCat = () => { setEditingCat(null); setCatForm({ name: '', description: '', isActive: true }); setShowCatForm(true); };
    const openEditCat = (c: ApiNewsCategory) => { setEditingCat(c); setCatForm({ ...c }); setShowCatForm(true); };

    const saveCat = async () => {
        try {
            if (editingCat) { await adminUpdateNewsCategory(editingCat._id, catForm); toast.success('Category updated'); }
            else { await adminCreateNewsCategory(catForm); toast.success('Category created'); }
            setShowCatForm(false); fetchCategories();
        } catch { toast.error('Failed to save category'); }
    };

    const deleteCat = async (id: string) => {
        const confirmed = await showConfirmDialog({
            title: 'Delete category',
            message: 'Delete category?',
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (!confirmed) return;
        try { await adminDeleteNewsCategory(id); toast.success('Deleted'); fetchCategories(); }
        catch { toast.error('Delete failed'); }
    };

    const toggleCat = async (id: string) => {
        try { await adminToggleNewsCategory(id); toast.success('Status toggled'); fetchCategories(); }
        catch { toast.error('Toggle failed'); }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'draft': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'archived': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Newspaper className="w-6 h-6 text-indigo-400" />
                        News Management
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Create, edit and manage news articles and categories.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('articles')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'articles' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'} `}
                    >
                        Articles
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'} `}
                    >
                        Categories
                    </button>
                </div>
            </div>

            {/* ================= ARTICLES TAB ================= */}
            {activeTab === 'articles' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search news titles..."
                                className="w-full bg-slate-900/65 border border-indigo-500/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="bg-slate-900/65 border border-indigo-500/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <option value="All">All Categories</option>
                            {categoriesList.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                        </select>
                        <button
                            onClick={openCreateArticle}
                            className="bg-indigo-600 text-white text-sm px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-5 h-5" /> Write Article
                        </button>
                    </div>

                    {showArticleForm && (
                        <div className="bg-slate-900/75 backdrop-blur-md rounded-3xl border border-indigo-500/10 p-8 shadow-2xl animate-fade-in-up">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    {editingArticle ? <Edit className="w-5 h-5 text-indigo-400" /> : <Plus className="w-5 h-5 text-indigo-400" />}
                                    {editingArticle ? 'Edit News Article' : 'Compose News Article'}
                                </h3>
                                <button onClick={() => setShowArticleForm(false)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Main Content */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Article Title</label>
                                        <input
                                            type="text"
                                            value={articleForm.title}
                                            onChange={e => setArticleForm({ ...articleForm, title: e.target.value })}
                                            placeholder="Enter news headline..."
                                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Short Summary</label>
                                        <textarea
                                            rows={2}
                                            value={articleForm.shortDescription}
                                            onChange={e => setArticleForm({ ...articleForm, shortDescription: e.target.value })}
                                            placeholder="Catchy brief (SEO meta description)"
                                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                                            Article Body
                                            <span className="text-[10px] text-indigo-400 font-normal normal-case italic">Supports HTML content</span>
                                        </label>
                                        <textarea
                                            rows={12}
                                            value={articleForm.content}
                                            onChange={e => setArticleForm({ ...articleForm, content: e.target.value })}
                                            placeholder="Write your news content here..."
                                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-2xl px-4 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Sidebar Settings */}
                                <div className="space-y-6">
                                    <div className="bg-slate-950/45 p-6 rounded-2xl border border-indigo-500/5 space-y-6">
                                        <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2 mb-2">
                                            <Settings className="w-4 h-4" /> Attributes
                                        </h4>

                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">News Category</label>
                                            <select
                                                value={articleForm.category}
                                                onChange={e => setArticleForm({ ...articleForm, category: e.target.value })}
                                                className="w-full bg-slate-900/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                            >
                                                <option value="">Select Category</option>
                                                {categoriesList.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Publish Status</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['draft', 'published', 'archived'] as const).map((s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setArticleForm({ ...articleForm, status: s })}
                                                        className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all border ${articleForm.status === s
                                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                                            : 'bg-slate-900/65 border-indigo-500/10 text-slate-400'
                                                            } `}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-10 h-5 rounded-full p-1 transition-all ${articleForm.isFeatured ? 'bg-indigo-600' : 'bg-slate-700'} `}>
                                                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${articleForm.isFeatured ? 'translate-x-5' : 'translate-x-0'} `} />
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={articleForm.isFeatured}
                                                    onChange={e => setArticleForm({ ...articleForm, isFeatured: e.target.checked })}
                                                    className="hidden"
                                                />
                                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Set as Featured</span>
                                                <Star className={`w-4 h-4 transition-colors ${articleForm.isFeatured ? 'text-amber-400 fill-amber-400' : 'text-slate-500'} `} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/45 p-6 rounded-2xl border border-indigo-500/5 space-y-6">
                                        <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2 mb-2">
                                            <ImageIcon className="w-4 h-4" /> Media
                                        </h4>

                                        <AdminImageUploadField
                                            label="Thumbnail Image"
                                            value={articleForm.featuredImage}
                                            onChange={(nextValue) => setArticleForm((prev) => ({ ...prev, featuredImage: nextValue }))}
                                            helper="Primary news thumbnail used in cards and list previews."
                                            category="admin_upload"
                                            previewAlt={articleForm.title || 'News thumbnail'}
                                            previewClassName="min-h-[160px]"
                                            panelClassName="bg-slate-900/45 border-indigo-500/10"
                                        />

                                        <AdminImageUploadField
                                            label="Cover Image"
                                            value={articleForm.coverImage}
                                            onChange={(nextValue) => setArticleForm((prev) => ({ ...prev, coverImage: nextValue }))}
                                            helper="Optional wide image for the article detail header."
                                            category="admin_upload"
                                            previewAlt={articleForm.title || 'News cover'}
                                            previewClassName="min-h-[160px]"
                                            panelClassName="bg-slate-900/45 border-indigo-500/10"
                                        />
                                    </div>

                                    <div className="bg-slate-950/45 p-6 rounded-2xl border border-indigo-500/5 space-y-4">
                                        <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2 mb-2">
                                            <Calendar className="w-4 h-4" /> Scheduling
                                        </h4>
                                        <input
                                            type="datetime-local"
                                            value={articleForm.publishDate ? new Date(articleForm.publishDate).toISOString().slice(0, 16) : ''}
                                            onChange={e => setArticleForm({ ...articleForm, publishDate: e.target.value })}
                                            className="w-full bg-slate-900/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none color-scheme-dark"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-indigo-500/10">
                                <button onClick={() => setShowArticleForm(false)} className="text-slate-400 hover:text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors">Discard changes</button>
                                <button onClick={saveArticle} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 active:scale-95">
                                    {editingArticle ? 'Update News' : 'Publish News'}
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                            <p className="text-slate-400 text-sm animate-pulse">Syncing your news desk...</p>
                        </div>
                    ) : news.length === 0 ? (
                        <div className="bg-slate-900/25 rounded-3xl border border-indigo-500/10 py-24 text-center">
                            <div className="bg-indigo-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Newspaper className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Your news list is empty</h3>
                            <p className="text-slate-400 max-w-sm mx-auto">Start publishing informative articles and keep your students updated with the latest campus news.</p>
                            <button onClick={openCreateArticle} className="mt-8 text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-2 mx-auto">
                                <Plus className="w-5 h-5" /> Write your first article
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate-900/60 backdrop-blur-sm rounded-3xl border border-indigo-500/10 overflow-hidden shadow-xl">
                            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                                <table className="w-full text-sm min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-indigo-500/10 bg-slate-950/30">
                                            <th className="text-left py-5 px-6 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Article Details</th>
                                            <th className="text-left py-5 px-6 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Category</th>
                                            <th className="text-center py-5 px-6 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Stats</th>
                                            <th className="text-left py-5 px-6 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Publishing</th>
                                            <th className="text-center py-5 px-6 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Manage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-500/5">
                                        {news.map(n => (
                                            <tr key={n._id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-4">
                                                        {n.featuredImage ? (
                                                            <img src={n.featuredImage} alt="" className="w-12 h-12 rounded-lg object-cover ring-2 ring-indigo-500/10" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                                <Newspaper className="w-6 h-6 text-indigo-400" />
                                                            </div>
                                                        )}
                                                        <div className="max-w-[300px]">
                                                            <p className="text-white font-bold group-hover:text-indigo-400 transition-colors truncate">
                                                                {n.isFeatured && <Star className="inline w-3 h-3 text-amber-400 mr-2 mb-0.5 fill-amber-400" />}
                                                                {n.title}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                                By {n.createdBy?.fullName || 'Admin'} • {new Date(n.publishDate).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/10 uppercase tracking-tighter">
                                                        {n.category}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-white font-mono font-bold">{n.views || 0}</span>
                                                        <span className="text-[10px] text-slate-500 uppercase font-medium">Views</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit border ${getStatusStyle(n.status)} `}>
                                                            {n.status === 'published' && <CheckCircle className="w-3 h-3" />}
                                                            {n.status === 'draft' && <Clock className="w-3 h-3" />}
                                                            {n.status === 'archived' && <Archive className="w-3 h-3" />}
                                                            {n.status || (n.isPublished ? 'published' : 'draft')}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            {(['draft', 'published', 'archived'] as const).filter(s => s !== n.status).map(s => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => toggleArticleStatus(n, s)}
                                                                    className="text-[9px] text-slate-500 hover:text-indigo-400 underline decoration-slate-700 underline-offset-4 capitalize transition-all"
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openEditArticle(n)}
                                                            className="p-2.5 bg-white/5 hover:bg-indigo-500 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                                                            title="Edit Article"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteArticle(n._id)}
                                                            className="p-2.5 bg-white/5 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                                                            title="Delete Article"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ================= CATEGORIES TAB ================= */}
            {activeTab === 'categories' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-end">
                        <button
                            onClick={openCreateCat}
                            className="bg-indigo-600 text-white text-sm px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                        >
                            <Plus className="w-5 h-5" /> New Category
                        </button>
                    </div>

                    {showCatForm && (
                        <div className="bg-slate-900/75 backdrop-blur-md rounded-3xl border border-indigo-500/10 p-8 shadow-2xl animate-fade-in-up max-w-2xl mx-auto">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <FolderOpen className="w-6 h-6 text-indigo-400" />
                                {editingCat ? 'Modify Category' : 'Create Category'}
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Category Name</label>
                                    <input
                                        type="text"
                                        value={catForm.name}
                                        onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                        placeholder="Admission, Scholar, Exam Tips etc."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Brief Description</label>
                                    <input
                                        type="text"
                                        value={catForm.description}
                                        onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                        placeholder="e.g. Latest updates about university admissions"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w - 10 h - 5 rounded - full p - 1 transition - all ${catForm.isActive ? 'bg-indigo-600' : 'bg-slate-700'} `}>
                                            <div className={`w - 3 h - 3 bg - white rounded - full transition - all ${catForm.isActive ? 'translate-x-5' : 'translate-x-0'} `} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={catForm.isActive}
                                            onChange={e => setCatForm({ ...catForm, isActive: e.target.checked })}
                                            className="hidden"
                                        />
                                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Activate Category</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 mt-10">
                                <button onClick={() => setShowCatForm(false)} className="px-6 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors">Discard</button>
                                <button onClick={saveCat} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
                                    {editingCat ? 'Update Category' : 'Create Category'}
                                </button>
                            </div>
                        </div>
                    )}

                    {catsLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                            <p className="text-slate-400 text-sm animate-pulse">Organizing folders...</p>
                        </div>
                    ) : categoriesList.length === 0 ? (
                        <div className="bg-slate-900/25 rounded-3xl border border-indigo-500/10 py-24 text-center">
                            <h3 className="text-xl font-bold text-white mb-2">No categories yet</h3>
                            <button onClick={openCreateCat} className="mt-4 text-indigo-400 font-bold">Add first category</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categoriesList.map(c => (
                                <div key={c._id} className="bg-slate-900/60 backdrop-blur-sm rounded-3xl border border-indigo-500/10 p-6 flex flex-col group hover:border-indigo-500/40 transition-all hover:-translate-y-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-indigo-500/10 p-3 rounded-2xl group-hover:bg-indigo-600 transition-colors">
                                            <FolderOpen className="w-5 h-5 text-indigo-400 group-hover:text-white" />
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                            <button onClick={() => openEditCat(c)} className="p-2 bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-xl shadow-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => deleteCat(c._id)} className="p-2 bg-white/5 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl shadow-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">{c.name}</h4>
                                    <p className="text-sm text-slate-400 flex-1 line-clamp-2">{c.description || 'No description provided for this news category.'}</p>
                                    <div className="mt-6 pt-5 border-t border-indigo-500/5 flex items-center justify-between">
                                        <span className={`px - 2.5 py - 1 rounded - lg text - [10px] uppercase font - black tracking - widest ${c.isActive ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'} `}>
                                            {c.isActive ? 'Active' : 'Hidden'}
                                        </span>
                                        <button onClick={() => toggleCat(c._id)} className="text-[10px] font-bold text-indigo-400 hover:underline">
                                            Toggle Visibility
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
