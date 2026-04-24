import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, GraduationCap, CalendarDays, ExternalLink, FlaskConical, BookOpen, Briefcase } from 'lucide-react';
import UniversityCard, { DEFAULT_UNIVERSITY_CARD_CONFIG } from '../components/university/UniversityCard';
import { getHomeClusterMembers } from '../services/api';

function formatDate(value?: string): string {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(val: number): string {
    if (!val) return '0';
    return val.toLocaleString('en-US');
}

/* ── Animated floating orbs for the hero background ── */
function HeroOrbs() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Large slow orb — top right */}
            <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full opacity-[0.07] dark:opacity-[0.05] bg-gradient-to-br from-indigo-400 to-cyan-400 blur-3xl animate-[float_18s_ease-in-out_infinite]" />
            {/* Medium orb — bottom left */}
            <div className="absolute -bottom-16 -left-16 w-[320px] h-[320px] rounded-full opacity-[0.06] dark:opacity-[0.04] bg-gradient-to-tr from-violet-500 to-fuchsia-400 blur-3xl animate-[float_22s_ease-in-out_infinite_reverse]" />
            {/* Small accent orb — center */}
            <div className="absolute top-1/2 left-1/3 w-[180px] h-[180px] rounded-full opacity-[0.05] dark:opacity-[0.03] bg-gradient-to-br from-emerald-400 to-cyan-300 blur-2xl animate-[float_14s_ease-in-out_infinite_2s]" />
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02]" style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '32px 32px',
            }} />
            {/* Subtle mesh gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.06),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.04),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.08),transparent_50%)]" />
        </div>
    );
}

export default function UniversityClusterBrowsePage() {
    const { clusterSlug } = useParams<{ clusterSlug: string }>();
    const [page, setPage] = useState(1);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['home-cluster-members', clusterSlug, page],
        queryFn: () => getHomeClusterMembers(String(clusterSlug || ''), { page, limit: 12 }).then((res) => res.data),
        enabled: Boolean(clusterSlug),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
    });

    if (isLoading) {
        return (
            <div className="section-container py-12">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !data?.cluster) {
        return (
            <div className="section-container py-16 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-4 text-lg font-semibold text-text dark:text-dark-text">Cluster not found</p>
                <p className="mt-1 text-sm text-text-muted dark:text-dark-text/70">
                    The cluster &ldquo;{clusterSlug}&rdquo; does not exist or has been removed.
                </p>
                <Link to="/universities" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition">
                    <ArrowLeft className="h-4 w-4" /> Back to Universities
                </Link>
            </div>
        );
    }

    const summary = data.summary;
    const pagination = data.pagination;

    return (
        <div className="section-container py-6 md:py-10 space-y-6 md:space-y-8 overflow-x-hidden">

            {/* ═══ Hero Header ═══ */}
            <div className="relative rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/80 to-primary-50/20 p-5 sm:p-7 lg:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden dark:border-white/[0.06] dark:from-slate-900 dark:via-[#0c1529] dark:to-indigo-950/40 dark:shadow-2xl">
                {/* Background image if available */}
                {data.cluster.heroImageUrl && (
                    <img
                        src={data.cluster.heroImageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-[0.06] dark:opacity-[0.08]"
                    />
                )}
                <HeroOrbs />

                <div className="relative z-10">
                    <Link to="/universities" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors dark:text-cyan-400 dark:hover:text-cyan-300">
                        <ArrowLeft className="h-4 w-4" /> Back to all universities
                    </Link>

                    <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        {/* Left: Info */}
                        <div className="max-w-2xl flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-500 dark:text-indigo-400/80">University Cluster</p>
                            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{data.cluster.name}</h1>
                            {data.cluster.description && (
                                <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300/90 max-w-xl">{data.cluster.description}</p>
                            )}
                            {summary.categories.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {summary.categories.map((category: string) => (
                                        <span key={category} className="rounded-full bg-primary-50 border border-primary-200/60 px-3 py-1 text-[11px] font-semibold text-primary-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300">
                                            {category}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="mt-6 flex flex-wrap gap-2.5">
                                {summary.admissionWebsite ? (
                                    <a href={summary.admissionWebsite} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/15 transition hover:shadow-primary-600/25 hover:scale-[1.02] dark:from-cyan-500 dark:to-indigo-500 dark:shadow-cyan-500/20 dark:hover:shadow-cyan-500/30">
                                        <ExternalLink className="h-4 w-4" /> Apply to Cluster
                                    </a>
                                ) : null}
                                {summary.nearestDeadline && (
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200">
                                        <CalendarDays className="h-4 w-4 text-amber-500 dark:text-amber-400" /> Deadline {formatDate(summary.nearestDeadline)}
                                    </div>
                                )}
                                {summary.nearestExam && (
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200">
                                        <GraduationCap className="h-4 w-4 text-primary-500 dark:text-cyan-400" /> Next Exam {formatDate(summary.nearestExam)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Stats Grid */}
                        <div className="grid min-w-0 sm:min-w-[340px] grid-cols-2 gap-2.5 sm:gap-3">
                            {/* Members */}
                            <div className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-sm p-4 dark:border-white/[0.06] dark:bg-white/[0.04]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-primary-500 dark:text-indigo-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Members</p>
                                </div>
                                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{summary.memberCount}</p>
                            </div>
                            {/* Total Seats */}
                            <div className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-sm p-4 dark:border-white/[0.06] dark:bg-white/[0.04]">
                                <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Total Seats</p>
                                </div>
                                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{formatNumber(summary.totalSeats || 0)}</p>
                            </div>
                            {/* Science */}
                            <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-emerald-50/80 to-white/70 backdrop-blur-sm p-3.5 dark:border-white/[0.06] dark:from-emerald-500/[0.08] dark:to-white/[0.02]">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <FlaskConical className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Science</p>
                                </div>
                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-300">{formatNumber(summary.scienceSeats || 0)}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">seats</p>
                            </div>
                            {/* Humanities */}
                            <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-violet-50/80 to-white/70 backdrop-blur-sm p-3.5 dark:border-white/[0.06] dark:from-violet-500/[0.08] dark:to-white/[0.02]">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <BookOpen className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Humanities</p>
                                </div>
                                <p className="text-xl font-black text-violet-600 dark:text-violet-300">{formatNumber(summary.artsSeats || 0)}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">seats</p>
                            </div>
                            {/* Commerce */}
                            <div className="col-span-2 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-amber-50/80 to-white/70 backdrop-blur-sm p-3.5 dark:border-white/[0.06] dark:from-amber-500/[0.08] dark:to-white/[0.02]">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Briefcase className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Commerce / Business</p>
                                </div>
                                <p className="text-xl font-black text-amber-600 dark:text-amber-300">{formatNumber(summary.commerceSeats || 0)} <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">seats</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Exam Dates + Application — compact row */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/70 backdrop-blur-sm px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                            <FlaskConical className="h-5 w-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Science Exam</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(summary.scienceExamDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/70 backdrop-blur-sm px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                            <BookOpen className="h-5 w-5 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Humanities Exam</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(summary.artsExamDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/70 backdrop-blur-sm px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                            <Briefcase className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Business Exam</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(summary.businessExamDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/70 backdrop-blur-sm px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                            <CalendarDays className="h-5 w-5 text-primary-500 dark:text-cyan-400 flex-shrink-0" />
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Application Window</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(summary.applicationStartDate)} — {formatDate(summary.applicationEndDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Universities Grid */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text dark:text-white">
                        Member Universities
                        <span className="ml-2 text-sm font-normal text-slate-500">({pagination.total})</span>
                    </h2>
                </div>
                <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {data.universities.map((university) => (
                        <UniversityCard
                            key={university._id}
                            university={university as unknown as Record<string, unknown>}
                            config={DEFAULT_UNIVERSITY_CARD_CONFIG}
                            animationLevel="minimal"
                            cardVariant="classic"
                        />
                    ))}
                </div>
                {data.universities.length === 0 && (
                    <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-12 text-center dark:border-white/[0.06] dark:bg-slate-900/50">
                        <GraduationCap className="mx-auto h-10 w-10 text-slate-400" />
                        <p className="mt-3 text-sm text-slate-500">No universities in this cluster yet.</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/50 bg-white/80 p-4 text-sm shadow-sm md:flex-row dark:border-white/[0.06] dark:bg-slate-900/70">
                    <p className="text-slate-600 dark:text-slate-300">
                        Page {pagination.page} of {pagination.pages} · {pagination.total} universities
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            className="rounded-xl border border-slate-200/60 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                            className="rounded-xl border border-slate-200/60 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
