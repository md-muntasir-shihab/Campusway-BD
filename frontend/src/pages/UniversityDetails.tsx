import { useEffect, useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MapPin, Calendar, Users, Globe, ExternalLink,
    AlertTriangle, Clock, BookOpen, Phone, Mail, Loader2, ArrowLeft,
} from 'lucide-react';
import { useUniversityDetail } from '../hooks/useUniversityQueries';
import { normalizeExternalUrl } from '../utils/url';
import UniversityLogo from '../components/university/UniversityLogo';

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Helpers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
function fmtDate(d: string | undefined | null): string {
    if (!d) return 'N/A';
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

function progressPct(start?: string | null, end?: string | null): number {
    if (!start || !end) return 0;
    const s = new Date(start).getTime(), e = new Date(end).getTime(), n = Date.now();
    if (Number.isNaN(s) || Number.isNaN(e)) return 0;
    if (n < s) return 0;
    if (n > e) return 100;
    return Math.round(((n - s) / (e - s)) * 100);
}

function daysUntil(d: string | undefined | null): number | null {
    if (!d) return null;
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return null;
    return Math.ceil((t - Date.now()) / 86_400_000);
}

function countdownLabel(days: number | null): string {
    if (days === null) return '';
    if (days < 0) return 'Ended';
    if (days === 0) return 'Today';
    return `${days} day${days !== 1 ? 's' : ''} left`;
}

function countdownColor(days: number | null): string {
    if (days === null || days < 0) return 'text-[var(--muted)]';
    if (days < 3) return 'text-red-500';
    if (days <= 10) return 'text-amber-500';
    return 'text-emerald-500';
}

function seatValue(v: string | number | undefined | null): string {
    if (v === undefined || v === null || v === '') return 'N/A';
    const n = Number(v);
    if (Number.isNaN(n) || n <= 0) return 'N/A';
    return n.toLocaleString();
}

function descriptionBlocks(value: string): string[] {
    const source = String(value || '').trim();
    if (!source) return [];

    const explicitBlocks = source.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    if (explicitBlocks.length > 1) return explicitBlocks;

    const sentences = source.split(/(?<=[.!?\u0964])\s+/).map((item) => item.trim()).filter(Boolean);
    if (sentences.length <= 2) return [source];

    const blocks: string[] = [];
    for (let index = 0; index < sentences.length; index += 2) {
        blocks.push(sentences.slice(index, index + 2).join(' '));
    }
    return blocks;
}

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ SEO ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
function useSEO(title: string, description: string) {
    useEffect(() => {
        if (!title) return;
        document.title = `${title} - CampusWay`;
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', description);
        return () => { document.title = 'CampusWay - Your Admission Gateway'; };
    }, [title, description]);
}

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Skeleton ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
function DetailSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                <div className="h-10 w-48 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-6 w-72 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        </div>
    );
}

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Section wrapper with fade-in ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
function Section({ title, icon: Icon, children }: {
    title: string;
    icon: React.FC<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-[2rem] bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
        >
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4 dark:border-slate-800/80">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/40">
                    <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">{title}</h2>
            </div>
            {children}
        </motion.section>
    );
}

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Exam-center item ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
function ExamCenterItem({ center }: { center: string | { city: string; address?: string } }) {
    const label = typeof center === 'string' ? center : `${center.city}${center.address ? ` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ${center.address}` : ''}`;
    return (
        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
    );
}

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ MAIN PAGE ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
export default function UniversityDetailsPage() {
    const { slug } = useParams<{ slug: string }>();
    const { data: uni, isLoading, isError, refetch } = useUniversityDetail(slug);
    const [shareMsg, setShareMsg] = useState('');

    useSEO(
        uni ? `${uni.name} (${uni.shortForm}) Admission ${new Date().getFullYear()}` : 'University Details',
        uni?.description || uni?.shortDescription || ''
    );

    const handleShare = useCallback(() => {
        if (navigator.share && uni) {
            navigator.share({ title: uni.name, url: window.location.href }).catch(() => {});
        } else {
            navigator.clipboard?.writeText(window.location.href).then(() => {
                setShareMsg('Copied!');
                setTimeout(() => setShareMsg(''), 2000);
            });
        }
    }, [uni]);

    /* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Loading ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
    if (isLoading) return <DetailSkeleton />;

    /* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Error ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
    if (isError || !uni) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-5 text-center bg-slate-50 dark:bg-slate-950">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-heading font-bold text-slate-900 dark:text-white">University Not Found</h1>
                <p className="text-sm text-slate-500 max-w-sm">
                    The university page you're looking for doesn't exist or has been removed.
                </p>
                <div className="flex gap-3 mt-4">
                    <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                        <Loader2 className="w-4 h-4" /> Retry
                    </button>
                    <Link to="/universities" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                        <ArrowLeft className="w-4 h-4" /> Back to list
                    </Link>
                </div>
            </div>
        );
    }

    /* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Derived values ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
    const appStart = uni.applicationStartDate || uni.applicationStart;
    const appEnd = uni.applicationEndDate || uni.applicationEnd;
    const appProgress = progressPct(appStart, appEnd);
    const appDaysLeft = daysUntil(appEnd);
    const durationDays = (() => {
        if (!appStart || !appEnd) return null;
        const s = new Date(appStart).getTime(), e = new Date(appEnd).getTime();
        if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
        return Math.ceil((e - s) / 86_400_000);
    })();

    const sciExam = uni.examDateScience || uni.scienceExamDate;
    const artsExam = uni.examDateArts || uni.artsExamDate;
    const bizExam = uni.examDateBusiness || uni.businessExamDate;

    const totalSeats = seatValue(uni.totalSeats);
    const sciSeats = seatValue(uni.seatsScienceEng || uni.scienceSeats);
    const artsSeats = seatValue(uni.seatsArtsHum || uni.artsSeats);
    const bizSeats = seatValue(uni.seatsBusiness || uni.businessSeats);

    const websiteUrl = normalizeExternalUrl(uni.websiteUrl || uni.website);
    const admissionUrl = normalizeExternalUrl(uni.admissionUrl || uni.admissionWebsite);

    const established = uni.establishedYear || uni.established;
    const contact = uni.contactNumber || '';
    const email = uni.email || '';
    const leadDescription = String(uni.shortDescription || '').trim();
    const fullDescription = String(uni.description || '').trim();
    const hasFullDescription = fullDescription.length > 0;
    const readableDescription = descriptionBlocks(fullDescription);
    const descriptionIntro = hasFullDescription
        ? (readableDescription[0] || '')
        : leadDescription;
    const descriptionBodyBlocks = hasFullDescription
        ? readableDescription.slice(1)
        : [];

    const examCenters: Array<string | { city: string; address?: string }> = uni.examCenters ?? [];

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 space-y-8">

                {/* Back link */}
                <Link to="/universities" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary-600 transition dark:text-slate-400 dark:hover:text-primary-400">
                    <ArrowLeft className="w-4 h-4" /> Back to Universities
                </Link>

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 1. HEADER ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                <motion.header
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 rounded-[2rem] bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
                >
                    <UniversityLogo
                        name={uni.name || ''}
                        shortForm={uni.shortForm || ''}
                        logoUrl={uni.logoUrl || ''}
                        alt={`${uni.shortForm || uni.name} logo`}
                        containerClassName="h-20 w-20 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-slate-100 shadow-sm dark:border-slate-800"
                        imageClassName="h-full w-full rounded-2xl bg-white object-contain p-2"
                        fallbackTextClassName="text-3xl sm:text-4xl"
                    />

                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl sm:text-4xl font-heading font-black text-slate-900 dark:text-white leading-tight">
                            {uni.name}
                        </h1>
                        {uni.shortForm && (
                            <p className="mt-1.5 text-base font-bold text-primary-600 dark:text-primary-400">{uni.shortForm}</p>
                        )}
                        {!hasFullDescription && leadDescription ? (
                            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                                {leadDescription}
                            </p>
                        ) : null}
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            <span className="px-3 py-1 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-full text-xs font-bold uppercase tracking-wider">
                                {uni.category}
                            </span>
                            {uni.clusterGroup && (
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {uni.clusterGroup}
                                </span>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                            {admissionUrl ? (
                                <a href={admissionUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700" aria-label="Apply now">
                                    Apply Now <ExternalLink className="w-4 h-4" />
                                </a>
                            ) : (
                                <button disabled className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500">
                                    Apply N/A
                                </button>
                            )}
                            {websiteUrl ? (
                                <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" aria-label="Official website">
                                    <Globe className="w-4 h-4" /> Official Site
                                </a>
                            ) : (
                                <button disabled className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500">
                                    <Globe className="w-4 h-4" /> Website N/A
                                </button>
                            )}
                            <button onClick={handleShare} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" aria-label="Share link">
                                {shareMsg || 'Share'}
                            </button>
                        </div>
                    </div>
                </motion.header>

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 2. OVERVIEW ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                <Section title="Overview" icon={BookOpen}>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                        {established && (
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                                <Calendar className="h-5 w-5 text-slate-400" />
                                <span className="font-medium text-slate-800 dark:text-slate-200">Est. {established}</span>
                            </div>
                        )}
                        {uni.address && (
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                                <MapPin className="h-5 w-5 shrink-0 text-slate-400" />
                                <span className="line-clamp-2 font-medium text-slate-800 dark:text-slate-200">{uni.address}</span>
                            </div>
                        )}
                        {contact && (
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                                <Phone className="h-5 w-5 text-slate-400" />
                                <a href={`tel:${contact}`} className="font-medium text-slate-800 hover:text-primary-600 dark:text-slate-200 dark:hover:text-primary-400 transition">{contact}</a>
                            </div>
                        )}
                        {email && (
                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                                <Mail className="h-5 w-5 text-slate-400" />
                                <a href={`mailto:${email}`} className="font-medium text-slate-800 hover:text-primary-600 dark:text-slate-200 dark:hover:text-primary-400 transition">{email}</a>
                            </div>
                        )}
                    </div>
                    {!established && !uni.address && !contact && !email && (
                        <p className="text-sm text-slate-500 italic">No overview information available.</p>
                    )}
                </Section>

                {(fullDescription || leadDescription) && (
                    <Section title="Description" icon={BookOpen}>
                        <div className="overflow-hidden rounded-[1.55rem] border border-slate-800/80 bg-slate-950/82 shadow-[0_18px_45px_rgba(2,6,23,0.22)]">
                            <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))] px-5 py-4 sm:px-6">
                                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">University profile</p>
                                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                                    {descriptionIntro || 'Description will appear here when the university profile is updated.'}
                                </p>
                            </div>

                            <div className="px-5 py-5 sm:px-6 sm:py-6">
                                <div className="space-y-4">
                                    {descriptionBodyBlocks.length > 0 ? descriptionBodyBlocks.map((block, index) => (
                                        <p
                                            key={`${uni._id || uni.slug || uni.name}-description-${index}`}
                                            className="max-w-4xl break-words text-[15px] leading-[1.95] tracking-[0.01em] text-slate-300"
                                        >
                                            {block}
                                        </p>
                                    )) : hasFullDescription ? null : (
                                        <p className="text-[15px] leading-[1.95] tracking-[0.01em] text-slate-300">
                                            Detailed description is not available yet.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Section>
                )}

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 3. SEATS TABLE ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                <Section title="Available Seats" icon={Users}>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-sm" aria-label="Seat distribution">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="py-3.5 pl-5 pr-4 text-left font-semibold text-slate-500 uppercase tracking-wider text-xs">Department</th>
                                    <th className="py-3.5 pl-4 pr-5 text-right font-semibold text-slate-500 uppercase tracking-wider text-xs">Total Seats</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                                {[
                                    { label: 'Science & Engineering', value: sciSeats },
                                    { label: 'Arts & Humanities', value: artsSeats },
                                    { label: 'Business Studies', value: bizSeats },
                                    { label: 'Total Capacity', value: totalSeats, isTotal: true },
                                ].map(row => (
                                    <tr key={row.label} className={row.isTotal ? 'bg-slate-50/50 font-bold dark:bg-slate-800/20' : ''}>
                                        <td className={`py-3.5 pl-5 pr-4 ${row.isTotal ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{row.label}</td>
                                        <td className={`py-3.5 pl-4 pr-5 text-right font-semibold ${row.value === 'N/A' ? 'text-slate-400' : 'text-primary-600 dark:text-primary-400'}`}>
                                            {row.value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 4. APPLICATION TIMELINE ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                <Section title="Application Timeline" icon={Clock}>
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50 text-sm">
                            <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Opens</p>
                                <p className="font-semibold text-slate-900 dark:text-slate-200">{fmtDate(appStart)}</p>
                            </div>
                            <div className="text-right">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Closes</p>
                                <p className="font-semibold text-slate-900 dark:text-slate-200">{fmtDate(appEnd)}</p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        {(appStart || appEnd) && (
                            <div className="px-1">
                                <div className="flex items-center justify-between mb-2 text-xs font-semibold">
                                    <span className="text-slate-500">Timeline Progress</span>
                                    <span className={countdownColor(appDaysLeft)}>
                                        {appDaysLeft !== null ? countdownLabel(appDaysLeft) : 'Dates N/A'}
                                    </span>
                                </div>
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner" aria-hidden="true">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700"
                                        ref={(el) => { if (el) el.style.width = `${appProgress}%`; }}
                                    />
                                </div>
                                {durationDays !== null && (
                                    <p className="mt-2 text-right text-[11px] font-medium text-slate-400">Total duration: {durationDays} days ({appProgress}% elapsed)</p>
                                )}
                            </div>
                        )}

                        {!appStart && !appEnd && (
                            <p className="text-sm font-medium italic text-slate-500">Application dates not yet published.</p>
                        )}
                    </div>
                </Section>

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 5. EXAM SCHEDULE ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                <Section title="Exam Schedule" icon={Calendar}>
                    <div className="space-y-3">
                        {[
                            { label: 'Science / Engineering', date: sciExam },
                            { label: 'Arts / Humanities', date: artsExam },
                            { label: 'Business Studies', date: bizExam },
                        ].map(row => {
                            const days = daysUntil(row.date);
                            return (
                                <div key={row.label} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{row.label}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-1">{fmtDate(row.date)}</p>
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white dark:bg-slate-900/50 shadow-sm ${countdownColor(days)}`}>
                                        {row.date ? countdownLabel(days) : 'TBA'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 6. EXAM CENTERS ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
                <Section title="Exam Centers" icon={MapPin}>
                    {examCenters.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {examCenters.map((c, i) => (
                                <ExamCenterItem key={i} center={c} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm font-medium italic text-slate-500">No exam center data announced yet.</p>
                    )}
                </Section>

            </div>
        </div>
    );
}
