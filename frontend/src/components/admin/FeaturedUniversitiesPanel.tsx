import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Star, GripVertical, Save, Search, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { ApiUniversity, adminGetUniversitySettings, adminUpdateUniversitySettings } from '../../services/api';

const ADMIN_API_PATH = (
    String(import.meta.env.VITE_ADMIN_PATH || 'campusway-secure-admin').trim().replace(/^\/+|\/+$/g, '')
    || 'campusway-secure-admin'
);

export default function FeaturedUniversitiesPanel() {
    const [universities, setUniversities] = useState<ApiUniversity[]>([]);
    const [featured, setFeatured] = useState<ApiUniversity[]>([]);
    const [featuredSlugs, setFeaturedSlugs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const fetchUniversities = useCallback(async () => {
        setLoading(true);
        try {
            const [universitiesResponse, settingsResponse] = await Promise.all([
                api.get(`/${ADMIN_API_PATH}/universities`, { params: { limit: 1000 } }),
                adminGetUniversitySettings(),
            ]);
            // Extract the universities array from the response object
            const uniArray = Array.isArray(universitiesResponse.data)
                ? universitiesResponse.data
                : (universitiesResponse.data.universities || []);
            setUniversities(uniArray);

            const configuredSlugs = (settingsResponse.data?.data?.featuredUniversitySlugs || [])
                .map((slug) => String(slug || '').trim().toLowerCase())
                .filter(Boolean);
            setFeaturedSlugs(configuredSlugs);

            const bySlug = new Map(
                (uniArray as ApiUniversity[])
                    .map((item) => [String(item.slug || '').trim().toLowerCase(), item] as const)
                    .filter(([slug]) => Boolean(slug)),
            );

            const configuredFeatured = configuredSlugs
                .map((slug) => bySlug.get(slug) || null)
                .filter((item): item is ApiUniversity => item !== null);

            if (configuredFeatured.length > 0) {
                setFeatured(configuredFeatured);
            } else {
                const legacyFeatured = (uniArray as ApiUniversity[])
                    .filter((u) => u.featured)
                    .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));
                setFeatured(legacyFeatured);
            }
        } catch (err: any) {
            console.error('Failed to fetch universities:', err);
            toast.error(err.message || 'Failed to fetch universities');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUniversities();
    }, [fetchUniversities]);

    const handleSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        if (dragItem.current === dragOverItem.current) return;

        const _items = [...featured];
        const draggedItemContent = _items.splice(dragItem.current, 1)[0];
        _items.splice(dragOverItem.current, 0, draggedItemContent);

        dragItem.current = null;
        dragOverItem.current = null;
        setFeatured(_items);
    };

    const toggleFeatured = (uni: ApiUniversity) => {
        if (featured.find(f => f._id === uni._id)) {
            setFeatured(featured.filter(f => f._id !== uni._id));
        } else {
            setFeatured([...featured, { ...uni, featured: true }]);
        }
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const originalFeaturedConfigs = universities.filter(u => u.featured).map(u => u._id);
            const newFeaturedConfigs = featured.map(u => u._id);

            const added = newFeaturedConfigs.filter(id => !originalFeaturedConfigs.includes(id));
            const removed = originalFeaturedConfigs.filter(id => !newFeaturedConfigs.includes(id));

            for (const id of added) {
                await api.put(`/${ADMIN_API_PATH}/universities/${id}`, { featured: true });
            }
            for (const id of removed) {
                await api.put(`/${ADMIN_API_PATH}/universities/${id}`, { featured: false, featuredOrder: 0 });
            }

            const orderPayload = featured.map((u, index) => ({ id: u._id, featuredOrder: index + 1 }));
            if (orderPayload.length > 0) {
                await api.put(`/${ADMIN_API_PATH}/universities/reorder-featured`, { order: orderPayload });
            }

            const nextFeaturedSlugs = featured
                .map((u) => String(u.slug || '').trim().toLowerCase())
                .filter(Boolean);
            const hasSlugDiff =
                nextFeaturedSlugs.length !== featuredSlugs.length
                || nextFeaturedSlugs.some((slug, index) => slug !== featuredSlugs[index]);

            if (hasSlugDiff) {
                await adminUpdateUniversitySettings({ featuredUniversitySlugs: nextFeaturedSlugs });
                setFeaturedSlugs(nextFeaturedSlugs);
            }

            toast.success('Featured universities saved successfully.');
            fetchUniversities();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error saving featured universities');
        } finally {
            setSaving(false);
        }
    };

    const filteredAvailable = universities
        .filter(u => !featured.find(f => f._id === u._id))
        .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.shortForm && u.shortForm.toLowerCase().includes(search.toLowerCase())));

    if (loading) {
        return <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl pb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400" />
                        Featured Universities
                    </h2>
                    <p className="text-xs text-slate-500">Select and drag-and-drop to reorder featured universities on the Home page.</p>
                </div>
                <button onClick={saveChanges} disabled={saving} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white text-sm px-5 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-500/20">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-amber-500/20 p-5 space-y-4 shadow-xl shadow-amber-500/5">
                    <h3 className="font-bold text-white flex items-center justify-between">
                        <span>Current Featured ({featured.length})</span>
                        <span className="text-xs font-normal text-slate-400 bg-slate-950/65 px-2 py-1 rounded-lg">Drag to reorder</span>
                    </h3>

                    {featured.length === 0 ? (
                        <div className="text-center py-10 bg-slate-950/65 rounded-xl border border-dashed border-indigo-500/20 text-slate-500 text-sm flex flex-col items-center gap-2">
                            <AlertCircle className="w-8 h-8 opacity-50 text-amber-500" />
                            <p>No featured universities selected</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {featured.map((u, index) => (
                                <div
                                    key={u._id}
                                    draggable
                                    onDragStart={(e) => {
                                        dragItem.current = index;
                                        setTimeout(() => {
                                            (e.target as HTMLElement).classList.add('opacity-50');
                                        }, 0);
                                    }}
                                    onDragEnter={() => {
                                        dragOverItem.current = index;
                                    }}
                                    onDragEnd={(e) => {
                                        (e.target as HTMLElement).classList.remove('opacity-50');
                                        handleSort();
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/65 border border-indigo-500/10 hover:border-amber-500/30 transition-colors cursor-move group"
                                >
                                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                        <div className="flex bg-slate-800/50 p-1.5 rounded-lg cursor-grab active:cursor-grabbing text-slate-500 group-hover:text-amber-400 transition-colors">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                                            {u.logoUrl ? (
                                                <img src={u.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <span className="text-[10px] font-bold text-indigo-300">{u.shortForm?.slice(0, 2) || 'UN'}</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-white truncate max-w-[200px]">{u.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleFeatured(u)}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium whitespace-nowrap"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-indigo-500/10 p-5 space-y-4">
                    <h3 className="font-bold text-white">Available Universities</h3>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search universities..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500/30 outline-none"
                        />
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500/20">
                        {filteredAvailable.length === 0 ? (
                            <p className="text-center py-6 text-slate-500 text-sm">No available universities found</p>
                        ) : (
                            filteredAvailable.map(u => (
                                <div key={u._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/65 border border-indigo-500/5 hover:border-indigo-500/20 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700">
                                            {u.logoUrl ? (
                                                <img src={u.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-400">{u.shortForm?.slice(0, 2) || 'UN'}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-slate-300 truncate">{u.name}</span>
                                            <span className="text-[10px] text-slate-500">{u.category}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleFeatured(u)}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors font-medium whitespace-nowrap"
                                    >
                                        Add
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
