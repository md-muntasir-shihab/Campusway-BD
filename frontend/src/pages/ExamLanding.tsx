import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Activity, CalendarClock, Clock3, Copy, Search, Tag, Users } from 'lucide-react';
import { getExamLanding, trackAnalyticsEvent } from '../services/api';
import { useAuth } from '../hooks/useAuth';

type LandingCard = {
    _id: string;
    title: string;
    description?: string;
    subject?: string;
    subjectBn?: string;
    universityNameBn?: string;
    duration: number;
    totalQuestions: number;
    totalMarks: number;
    startDate: string;
    endDate: string;
    bannerImageUrl?: string;
    logoUrl?: string;
    group_category?: string;
    groupName?: string;
    status: 'upcoming' | 'live' | 'past' | 'in_progress' | 'locked';
    statusBadge?: string;
    totalParticipants?: number;
    attemptedUsers?: number;
    remainingUsers?: number;
    activeUsers?: number;
    timeBucket: 'upcoming' | 'live' | 'past';
    attemptsUsed: number;
    attemptsLeft: number;
    attemptLimit: number;
    share_link?: string;
    shareUrl?: string;
    paymentPending?: boolean;
};

const GROUP_OPTIONS = ['All', 'SSC', 'HSC', 'Admission', 'Custom'];
const STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'live', label: 'Live' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'locked', label: 'Locked' },
];

function statusBadge(status: LandingCard['status'], paymentPending?: boolean) {
    if (paymentPending) return 'bg-amber-500/20 text-amber-300';
    if (status === 'live' || status === 'in_progress') return 'bg-emerald-500/20 text-emerald-300';
    if (status === 'upcoming') return 'bg-cyan-500/20 text-cyan-300';
    if (status === 'past') return 'bg-slate-500/20 text-slate-300';
    return 'bg-rose-500/20 text-rose-300';
}

export default function ExamLandingPage() {
    const { isAuthenticated, isLoading, user } = useAuth();
    const [group, setGroup] = useState('All');
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const { data, isLoading: loadingCards } = useQuery({
        queryKey: ['examLanding', group, status, search],
        queryFn: async () => {
            const { data: resData } = await getExamLanding({
                group: group === 'All' ? '' : group,
                status,
                search,
                limit: 100,
            });
            const fetchedCards = resData.items || resData.exams || [];

            void trackAnalyticsEvent({
                eventName: 'exam_viewed',
                module: 'exams',
                source: 'student',
                meta: {
                    filters: { group, status, search: search || '' },
                    total: Number(fetchedCards.length || 0),
                },
            }).catch(() => undefined);

            return {
                cards: fetchedCards,
                featured: resData.featured || []
            };
        },
        enabled: isAuthenticated,
        staleTime: 60 * 1000,
    });

    const loading = loadingCards;
    const cards: LandingCard[] = data?.cards || [];
    const featured: LandingCard[] = data?.featured || [];

    const groupedByCategory = useMemo(() => {
        return cards.reduce((acc: Record<string, LandingCard[]>, card: LandingCard) => {
            const key = card.group_category || 'Custom';
            if (!acc[key]) acc[key] = [];
            acc[key].push(card);
            return acc;
        }, {} as Record<string, LandingCard[]>);
    }, [cards]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'student') {
        return <Navigate to="/exam-portal" replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#07101f] via-[#0b1730] to-[#101e3f] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
                <section className="rounded-3xl border border-cyan-500/15 bg-white/5 backdrop-blur-sm p-6 sm:p-8">
                    <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-cyan-300/80">
                        <Tag className="w-3.5 h-3.5" />
                        Exam Landing
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold mt-3">Grouped Exam Cards</h1>
                    <p className="text-sm text-slate-300 mt-2">Filter by group, status, and keyword to find active exams quickly.</p>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs text-slate-400">Group</span>
                            <select value={group} onChange={(event) => setGroup(event.target.value)} className="bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm">
                                {GROUP_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs text-slate-400">Status</span>
                            <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm">
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="md:col-span-2 flex flex-col gap-1">
                            <span className="text-xs text-slate-400">Search</span>
                            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2">
                                <Search className="w-4 h-4 text-slate-500" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Title, subject, description"
                                    className="w-full bg-transparent outline-none text-sm"
                                />
                            </div>
                        </label>
                    </div>
                </section>

                {featured.length > 0 ? (
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-cyan-200">Featured</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {featured.map((card: LandingCard) => (
                                <article key={`featured-${card._id}`} className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                                    <h3 className="text-base font-semibold">{card.title}</h3>
                                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">{card.description || card.subjectBn || card.subject || ''}</p>
                                </article>
                            ))}
                        </div>
                    </section>
                ) : null}

                {loading ? (
                    <div className="text-slate-300">Loading exams...</div>
                ) : (
                    <section className="space-y-6">
                        {Object.keys(groupedByCategory).length === 0 ? (
                            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-400">No exams found for current filters.</div>
                        ) : (
                            Object.entries(groupedByCategory).map(([category, categoryCards]) => (
                                <div key={category} className="space-y-3">
                                    <h2 className="text-lg font-semibold text-white">{category}</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {(categoryCards as LandingCard[]).map((card: LandingCard) => (
                                            <article key={card._id} className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-4 space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-semibold line-clamp-2">{card.title}</h3>
                                                    <span className={`text-[10px] px-2 py-1 rounded-full uppercase ${statusBadge(card.status, card.paymentPending)}`}>
                                                        {card.paymentPending ? 'Payment Pending' : card.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-300 line-clamp-2">{card.description || card.subjectBn || card.subject || ''}</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                                                    <div className="flex items-center gap-1"><Clock3 className="w-3.5 h-3.5 text-cyan-300" /> {card.duration} min</div>
                                                    <div>{card.totalQuestions} Q / {card.totalMarks} marks</div>
                                                    <div className="flex items-center gap-1 col-span-2"><CalendarClock className="w-3.5 h-3.5 text-cyan-300" /> {new Date(card.startDate).toLocaleString()} → {new Date(card.endDate).toLocaleString()}</div>
                                                    <div className="col-span-2">Attempts: {card.attemptsUsed}/{card.attemptLimit}</div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-200">
                                                    <div className="rounded-lg border border-indigo-500/20 bg-slate-950/40 px-2.5 py-2">
                                                        <p className="text-slate-400">Participants</p>
                                                        <p className="font-semibold flex items-center gap-1"><Users className="w-3 h-3 text-cyan-300" /> {Number(card.totalParticipants || 0)}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-indigo-500/20 bg-slate-950/40 px-2.5 py-2">
                                                        <p className="text-slate-400">Attempted</p>
                                                        <p className="font-semibold">{Number(card.attemptedUsers || 0)}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-indigo-500/20 bg-slate-950/40 px-2.5 py-2">
                                                        <p className="text-slate-400">Remaining</p>
                                                        <p className="font-semibold">{Number(card.remainingUsers || 0)}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-indigo-500/20 bg-slate-950/40 px-2.5 py-2">
                                                        <p className="text-slate-400">Live Active</p>
                                                        <p className="font-semibold flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-300" /> {Number(card.activeUsers || 0)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 pt-2">
                                                    <Link
                                                        to={`/exam/take/${card.share_link || card._id}`}
                                                        onClick={() => {
                                                            if (card.status === 'locked' && !card.paymentPending) return;
                                                            void trackAnalyticsEvent({
                                                                eventName: 'exam_started',
                                                                module: 'exams',
                                                                source: 'student',
                                                                meta: { examId: card._id, status: card.status, entry: 'landing' },
                                                            }).catch(() => undefined);
                                                        }}
                                                        className={`text-xs px-3 py-2 rounded-lg ${card.status === 'locked' && !card.paymentPending ? 'bg-slate-700 text-slate-400 pointer-events-none' : card.paymentPending ? 'bg-amber-600/20 text-amber-200 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'}`}
                                                    >
                                                        {card.paymentPending ? 'Clear Due' : card.status === 'in_progress' ? 'Resume' : 'Start'}
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const url = card.shareUrl || (card.share_link ? `/exam/take/${card.share_link}` : '');
                                                            if (!url) return;
                                                            await navigator.clipboard.writeText(`${window.location.origin}${url}`);
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200"
                                                    >
                                                        <Copy className="w-3 h-3" /> Share URL
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
