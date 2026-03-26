import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import UniversityCard, { DEFAULT_UNIVERSITY_CARD_CONFIG } from '../components/university/UniversityCard';
import { getHomeClusterMembers } from '../services/api';

function formatDate(value?: string): string {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UniversityClusterBrowsePage() {
    const { clusterSlug } = useParams<{ clusterSlug: string }>();
    const [page, setPage] = useState(1);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['home-cluster-members', clusterSlug, page],
        queryFn: () => getHomeClusterMembers(String(clusterSlug || ''), { page, limit: 12 }).then((res) => res.data),
        enabled: Boolean(clusterSlug),
        staleTime: 60_000,
    });

    if (isLoading) {
        return (
            <div className="section-container py-12 text-center">
                <p className="text-lg font-semibold text-text dark:text-dark-text">Loading cluster universities...</p>
            </div>
        );
    }

    if (isError || !data?.cluster) {
        return (
            <div className="section-container py-12 text-center">
                <p className="text-lg font-semibold text-text dark:text-dark-text">Cluster not found</p>
                <p className="mt-1 text-sm text-text-muted dark:text-dark-text/70">
                    The cluster &ldquo;{clusterSlug}&rdquo; does not exist.
                </p>
            </div>
        );
    }

    const summary = data.summary;
    const pagination = data.pagination;

    return (
        <div className="section-container py-8 md:py-10 space-y-8">
            <div className="rounded-[28px] border border-slate-700/70 bg-slate-900/95 p-6 shadow-[0_22px_70px_rgba(4,12,24,0.28)]">
                <Link to="/universities" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                    Back to all universities
                </Link>
                <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">University Cluster</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">{data.cluster.name}</h1>
                        {data.cluster.description && (
                            <p className="mt-3 text-sm leading-7 text-slate-300">{data.cluster.description}</p>
                        )}
                        {summary.categories.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {summary.categories.map((category) => (
                                    <span key={category} className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                                        {category}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid min-w-[280px] grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Members</p>
                            <p className="mt-2 text-3xl font-black text-white">{summary.memberCount}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Application Window</p>
                            <p className="mt-2 text-base font-bold text-white">{formatDate(summary.applicationStartDate)} - {formatDate(summary.applicationEndDate)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Science Exam</p>
                            <p className="mt-2 text-base font-bold text-white">{formatDate(summary.scienceExamDate)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Arts Exam</p>
                            <p className="mt-2 text-base font-bold text-white">{formatDate(summary.artsExamDate)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-4 sm:col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Business Exam</p>
                            <p className="mt-2 text-base font-bold text-white">{formatDate(summary.businessExamDate)}</p>
                            <p className="mt-3 text-sm font-medium text-slate-300">Centers: {summary.examCentersPreview.join(', ') || 'N/A'}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {summary.admissionWebsite ? (
                                    <a
                                        href={summary.admissionWebsite}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
                                    >
                                        Apply to Cluster
                                    </a>
                                ) : null}
                                <div className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">
                                    Nearest deadline {formatDate(summary.nearestDeadline)}
                                </div>
                                <div className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">
                                    Nearest exam {formatDate(summary.nearestExam)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.universities.map((university) => (
                    <UniversityCard
                        key={university._id}
                        university={university}
                        config={DEFAULT_UNIVERSITY_CARD_CONFIG}
                        animationLevel="minimal"
                    />
                ))}
            </div>

            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm md:flex-row dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-slate-600 dark:text-slate-300">
                    Page {pagination.page} of {pagination.pages} | {pagination.total} universities
                </p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={pagination.page <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Prev
                    </button>
                    <button
                        type="button"
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                        className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
