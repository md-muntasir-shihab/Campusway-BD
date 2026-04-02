import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { UniversityCardSort } from '../../services/api';

interface FilterBottomSheetProps {
    open: boolean;
    onClose: () => void;
    search: string;
    setSearch: (v: string) => void;
    sort: UniversityCardSort;
    setSort: (v: UniversityCardSort) => void;
    clusters: string[];
    showClusterFilter?: boolean;
    selectedCluster: string;
    setSelectedCluster: (v: string) => void;
}

export default function FilterBottomSheet({
    open,
    onClose,
    search,
    setSearch,
    sort,
    setSort,
    clusters,
    showClusterFilter = true,
    selectedCluster,
    setSelectedCluster,
}: FilterBottomSheetProps) {
    const backdropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        ref={backdropRef}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-card-border bg-white p-5 shadow-elevated dark:border-dark-border dark:bg-dark-surface"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-dark-border" />

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-heading font-bold text-text dark:text-dark-text">Filters</h3>
                            <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border" aria-label="Close filters">
                                <X className="h-5 w-5 text-text-muted" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text/50 mb-1.5 block">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name or short form..."
                                        className="input-field h-11 pl-10 w-full"
                                    />
                                </div>
                            </div>

                            {showClusterFilter && clusters.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text/50 mb-1.5 block">
                                        Cluster Group
                                    </label>
                                    <select
                                        value={selectedCluster}
                                        onChange={(e) => setSelectedCluster(e.target.value)}
                                        className="input-field h-11 w-full"
                                    >
                                        <option value="">All Clusters</option>
                                        {clusters.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text/50 mb-1.5 block">
                                    Sort By
                                </label>
                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value as UniversityCardSort)}
                                    className="input-field h-11 w-full"
                                >
                                    <option value="name_asc">Name (A-Z)</option>
                                    <option value="name_desc">Name (Z-A)</option>
                                    <option value="closing_soon">Closing Soon</option>
                                    <option value="exam_soon">Exam Soon</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-primary w-full mt-5"
                        >
                            Apply Filters
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
