import { useState, useRef, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, GraduationCap, ClipboardCheck, Newspaper, BookOpen, Loader2, ArrowRight } from 'lucide-react';
import {
    getGlobalSearch,
    type GlobalSearchUniversityResult,
    type GlobalSearchExamResult,
    type GlobalSearchNewsResult,
    type GlobalSearchResourceResult,
} from '../../services/api';
import { buildMediaUrl } from '../../utils/mediaUrl';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type AnyResult = GlobalSearchUniversityResult | GlobalSearchExamResult | GlobalSearchNewsResult | GlobalSearchResourceResult;

interface Props {
    /** Mirrors into the parent's local `search` state for on-page filtering */
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Hide the search bar entirely */
    hidden?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function GlobalSearchBar({ value, onChange, placeholder, hidden }: Props) {
    const navigate = useNavigate();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /* ── API dropdown state ── */
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [universities, setUniversities] = useState<GlobalSearchUniversityResult[]>([]);
    const [exams, setExams] = useState<GlobalSearchExamResult[]>([]);
    const [news, setNews] = useState<GlobalSearchNewsResult[]>([]);
    const [resources, setResources] = useState<GlobalSearchResourceResult[]>([]);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* Flat list for keyboard navigation */
    const flatResults: AnyResult[] = [...universities, ...exams, ...news, ...resources];
    const hasResults = flatResults.length > 0;

    /* ── Debounced fetch ── */
    const fetchResults = useCallback((q: string) => {
        if (q.length < 2) {
            setUniversities([]);
            setExams([]);
            setNews([]);
            setResources([]);
            setOpen(false);
            return;
        }
        setLoading(true);
        getGlobalSearch(q)
            .then((res) => {
                setUniversities(res.data.universities ?? []);
                setExams(res.data.exams ?? []);
                setNews(res.data.news ?? []);
                setResources(res.data.resources ?? []);
                setOpen(true);
            })
            .catch(() => {
                setUniversities([]);
                setExams([]);
                setNews([]);
                setResources([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
        setHighlightIndex(-1);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchResults(val.trim()), 350);
    };

    const clearSearch = () => {
        onChange('');
        setOpen(false);
        setUniversities([]);
        setExams([]);
        setNews([]);
        setResources([]);
        inputRef.current?.focus();
    };

    /* ── Navigate on result click ── */
    const goToResult = (item: AnyResult) => {
        setOpen(false);
        if (item.type === 'university') navigate(`/university/${item.slug}`);
        else if (item.type === 'exam') navigate(`/exams/${item.slug || item._id}`);
        else if (item.type === 'news') navigate(`/news/${item.slug}`);
        else if (item.type === 'resource') navigate(`/resources/${item.slug || item._id}`);
    };

    /* ── Keyboard navigation ── */
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!open || !hasResults) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
        } else if (e.key === 'Enter' && highlightIndex >= 0) {
            e.preventDefault();
            goToResult(flatResults[highlightIndex]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    /* ── Click-outside dismiss ── */
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ── Cleanup debounce on unmount ── */
    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    if (hidden) return null;

    /* ── Helpers ── */
    const sectionIcon = (type: string) => {
        if (type === 'university') return <GraduationCap className="w-4 h-4" />;
        if (type === 'exam') return <ClipboardCheck className="w-4 h-4" />;
        if (type === 'resource') return <BookOpen className="w-4 h-4" />;
        return <Newspaper className="w-4 h-4" />;
    };

    const sectionTitle = (type: string) => {
        if (type === 'university') return 'Universities';
        if (type === 'exam') return 'Exams';
        if (type === 'resource') return 'Resources';
        return 'News';
    };

    /* Track flat index per group */
    let flatIdx = 0;

    return (
        <div className="sticky top-0 z-30 bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl border-b border-gray-200/40 dark:border-gray-800/40 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="max-w-3xl mx-auto px-4 py-3.5">
                <div ref={wrapperRef} className="relative group">
                    {/* Search icon */}
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-[var(--primary)] transition-colors duration-300 pointer-events-none" />

                    {/* Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => { if (hasResults && value.trim().length >= 2) setOpen(true); }}
                        placeholder={placeholder || 'Search universities, news, exams…'}
                        aria-label="Search universities, news, exams and resources"
                        aria-expanded={open}
                        aria-haspopup="listbox"
                        role="combobox"
                        autoComplete="off"
                        className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200/60 dark:border-gray-700/60 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:bg-white dark:focus:bg-gray-800/80 outline-none transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus:shadow-[0_4px_20px_rgba(13,95,219,0.12)]"
                    />

                    {/* Clear / Loader */}
                    {loading ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)] animate-spin" />
                    ) : value ? (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                            aria-label="Clear search"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : null}

                    {/* ── Dropdown ── */}
                    {open && (
                        <div
                            role="listbox"
                            className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.12),0_2px_12px_rgba(0,0,0,0.06)] max-h-[420px] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700"
                            style={{ backdropFilter: 'blur(20px) saturate(1.3)' }}
                        >
                            {!hasResults && !loading ? (
                                <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    No results found for "<span className="font-medium text-gray-500 dark:text-gray-400">{value}</span>"
                                </div>
                            ) : (
                                <>
                                    {/* Universities */}
                                    {universities.length > 0 && (() => {
                                        const startIdx = flatIdx;
                                        const section = (
                                            <div key="universities">
                                                <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100/60 dark:border-gray-800/60 bg-gray-50/40 dark:bg-gray-800/30 sticky top-0 backdrop-blur-sm">
                                                    {sectionIcon('university')}
                                                    {sectionTitle('university')}
                                                    <span className="ml-auto text-[10px] font-normal normal-case text-gray-400/70">{universities.length}</span>
                                                </div>
                                                {universities.map((u, i) => {
                                                    const idx = startIdx + i;
                                                    return (
                                                        <button
                                                            key={u._id}
                                                            role="option"
                                                            aria-selected={highlightIndex === idx}
                                                            onClick={() => goToResult(u)}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 border-b border-gray-100/40 dark:border-gray-800/30 last:border-b-0 ${highlightIndex === idx ? 'bg-[var(--primary)]/8 dark:bg-[var(--primary)]/12' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'}`}
                                                        >
                                                            {u.logoUrl ? (
                                                                <img src={buildMediaUrl(u.logoUrl)} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-200/60 dark:ring-gray-700/50 flex-shrink-0" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 flex items-center justify-center flex-shrink-0">
                                                                    <GraduationCap className="w-4 h-4 text-[var(--primary)]" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.shortForm} · {u.category}</p>
                                                            </div>
                                                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                        flatIdx += universities.length;
                                        return section;
                                    })()}

                                    {/* Exams */}
                                    {exams.length > 0 && (() => {
                                        const startIdx = flatIdx;
                                        const section = (
                                            <div key="exams">
                                                <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100/60 dark:border-gray-800/60 bg-gray-50/40 dark:bg-gray-800/30 sticky top-0 backdrop-blur-sm">
                                                    {sectionIcon('exam')}
                                                    {sectionTitle('exam')}
                                                    <span className="ml-auto text-[10px] font-normal normal-case text-gray-400/70">{exams.length}</span>
                                                </div>
                                                {exams.map((e, i) => {
                                                    const idx = startIdx + i;
                                                    return (
                                                        <button
                                                            key={e._id}
                                                            role="option"
                                                            aria-selected={highlightIndex === idx}
                                                            onClick={() => goToResult(e)}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 border-b border-gray-100/40 dark:border-gray-800/30 last:border-b-0 ${highlightIndex === idx ? 'bg-[var(--primary)]/8 dark:bg-[var(--primary)]/12' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/5 flex items-center justify-center flex-shrink-0">
                                                                <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{e.title}</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                    {e.subject}{e.groupCategory ? ` · ${e.groupCategory}` : ''}
                                                                    {e.status ? ` · ${e.status}` : ''}
                                                                </p>
                                                            </div>
                                                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                        flatIdx += exams.length;
                                        return section;
                                    })()}

                                    {/* News */}
                                    {news.length > 0 && (() => {
                                        const startIdx = flatIdx;
                                        const section = (
                                            <div key="news">
                                                <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100/60 dark:border-gray-800/60 bg-gray-50/40 dark:bg-gray-800/30 sticky top-0 backdrop-blur-sm">
                                                    {sectionIcon('news')}
                                                    {sectionTitle('news')}
                                                    <span className="ml-auto text-[10px] font-normal normal-case text-gray-400/70">{news.length}</span>
                                                </div>
                                                {news.map((n, i) => {
                                                    const idx = startIdx + i;
                                                    return (
                                                        <button
                                                            key={n._id}
                                                            role="option"
                                                            aria-selected={highlightIndex === idx}
                                                            onClick={() => goToResult(n)}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 border-b border-gray-100/40 dark:border-gray-800/30 last:border-b-0 ${highlightIndex === idx ? 'bg-[var(--primary)]/8 dark:bg-[var(--primary)]/12' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'}`}
                                                        >
                                                            {n.coverImageUrl ? (
                                                                <img src={n.coverImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-200/60 dark:ring-gray-700/50 flex-shrink-0" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex items-center justify-center flex-shrink-0">
                                                                    <Newspaper className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{n.title}</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                    {n.category}
                                                                    {n.publishDate ? ` · ${new Date(n.publishDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                                                                </p>
                                                            </div>
                                                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                        flatIdx += news.length;
                                        return section;
                                    })()}

                                    {/* Resources */}
                                    {resources.length > 0 && (() => {
                                        const startIdx = flatIdx;
                                        const section = (
                                            <div key="resources">
                                                <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100/60 dark:border-gray-800/60 bg-gray-50/40 dark:bg-gray-800/30 sticky top-0 backdrop-blur-sm">
                                                    {sectionIcon('resource')}
                                                    {sectionTitle('resource')}
                                                    <span className="ml-auto text-[10px] font-normal normal-case text-gray-400/70">{resources.length}</span>
                                                </div>
                                                {resources.map((r, i) => {
                                                    const idx = startIdx + i;
                                                    return (
                                                        <button
                                                            key={r._id}
                                                            role="option"
                                                            aria-selected={highlightIndex === idx}
                                                            onClick={() => goToResult(r)}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 border-b border-gray-100/40 dark:border-gray-800/30 last:border-b-0 ${highlightIndex === idx ? 'bg-[var(--primary)]/8 dark:bg-[var(--primary)]/12' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'}`}
                                                        >
                                                            {r.thumbnailUrl ? (
                                                                <img src={buildMediaUrl(r.thumbnailUrl)} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-200/60 dark:ring-gray-700/50 flex-shrink-0" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/5 flex items-center justify-center flex-shrink-0">
                                                                    <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                    {r.resourceType}{r.category ? ` · ${r.category}` : ''}
                                                                </p>
                                                            </div>
                                                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                        flatIdx += resources.length;
                                        return section;
                                    })()}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
