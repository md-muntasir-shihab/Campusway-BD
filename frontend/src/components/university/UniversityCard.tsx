import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Layers3, MapPin, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { normalizeExternalUrl } from '../../utils/url';
import { trackAnalyticsEvent, type HomeAnimationLevel, type HomeUniversityCardConfig } from '../../services/api';
import DaysLeftChip from './DaysLeftChip';
import { DeadlineProgress } from '../home/CountdownChip';
import UniversityLogo from './UniversityLogo';
import type { UrgencyState } from '../../lib/apiClient';
import {
    daysUntilUniversityDate,
    formatUniversityDate,
    getUniversityNameSizeClass,
    getUniversityShortFormClass,
    parseUniversityDate,
    pickNearestUniversityExamDate,
    pickText,
    toUniversitySlug,
} from '../../lib/universityPresentation';

export const DEFAULT_UNIVERSITY_CARD_CONFIG: HomeUniversityCardConfig = {
    defaultUniversityLogo: '',
    showExamCentersPreview: true,
    closingSoonDays: 7,
    showAddress: true,
    showEmail: true,
    showApplicationProgress: true,
    showExamDates: true,
    defaultSort: 'alphabetical',
};

export type UniversityCardActionVariant = 'default' | 'deadline' | 'exam';
export type UniversityCardVisualVariant = 'modern' | 'classic';

type UniversityCardEntity = any;

interface UniversityCardProps {
    university: UniversityCardEntity;
    config?: Partial<HomeUniversityCardConfig>;
    animationLevel?: HomeAnimationLevel;
    className?: string;
    actionVariant?: UniversityCardActionVariant;
    cardVariant?: UniversityCardVisualVariant;
    isAdmin?: boolean;
    onAdminEdit?: (university: UniversityCardEntity) => void;
    onFavoriteToggle?: (id: string) => void;
    isFavorited?: boolean;
}

function buildApplicationMeta(startRaw: unknown, endRaw: unknown, closingSoonDays: number) {
    const start = parseUniversityDate(startRaw);
    const end = parseUniversityDate(endRaw);
    if (!start || !end) {
        return {
            urgencyState: 'unknown' as UrgencyState,
            daysLeft: null as number | null,
            windowLabel: 'N/A',
            deadlineLabel: 'Apply by N/A',
        };
    }

    const now = new Date();
    const nowMs = now.getTime();
    const startMs = start.getTime();
    const endMs = end.getTime();
    const daysToEnd = daysUntilUniversityDate(end);

    if (nowMs < startMs) {
        return {
            urgencyState: 'upcoming' as UrgencyState,
            daysLeft: daysToEnd,
            windowLabel: `${formatUniversityDate(start, 'en-GB', { day: '2-digit', month: 'short' })} - ${formatUniversityDate(end, 'en-GB', { day: '2-digit', month: 'short' })}`,
            deadlineLabel: `Starts ${formatUniversityDate(start, 'en-GB', { day: '2-digit', month: 'short' })}`,
        };
    }

    if (nowMs > endMs) {
        return {
            urgencyState: 'closed' as UrgencyState,
            daysLeft: 0,
            windowLabel: `${formatUniversityDate(start, 'en-GB', { day: '2-digit', month: 'short' })} - ${formatUniversityDate(end, 'en-GB', { day: '2-digit', month: 'short' })}`,
            deadlineLabel: `Closed ${formatUniversityDate(end, 'en-GB', { day: '2-digit', month: 'short' })}`,
        };
    }

    return {
        urgencyState: (daysToEnd !== null && daysToEnd <= Math.max(1, closingSoonDays) ? 'closing_soon' : 'open') as UrgencyState,
        daysLeft: daysToEnd,
        windowLabel: `${formatUniversityDate(start, 'en-GB', { day: '2-digit', month: 'short' })} - ${formatUniversityDate(end, 'en-GB', { day: '2-digit', month: 'short' })}`,
        deadlineLabel: `Apply by ${formatUniversityDate(end, 'en-GB', { day: '2-digit', month: 'short' })}`,
    };
}

function getAnimationVariants(level: HomeAnimationLevel): Variants {
    if (level === 'off') {
        return {
            hidden: { opacity: 1, y: 0 },
            show: { opacity: 1, y: 0 },
        };
    }
    if (level === 'minimal') {
        return {
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { duration: 0.2 } },
        };
    }
    return {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.26 } },
    };
}

function UnitDateChip({ label, value }: { label: string; value: unknown }) {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-950/55">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                {formatUniversityDate(value, 'en-GB', { day: '2-digit', month: 'short' })}
            </p>
        </div>
    );
}

function calculateApplicationDurationDays(startRaw: unknown, endRaw: unknown): number | null {
    const start = parseUniversityDate(startRaw);
    const end = parseUniversityDate(endRaw);
    if (!start || !end) return null;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return null;
    const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return Number.isFinite(days) ? days : null;
}

function normalizeSeat(value: unknown): string {
    const text = pickText(value);
    if (!text || text.toLowerCase() === 'n/a') return 'N/A';
    const onlyNumbers = text.replace(/[^\d]/g, '');
    if (!onlyNumbers) return 'N/A';
    const numeric = Number(onlyNumbers);
    if (!Number.isFinite(numeric) || numeric <= 0) return 'N/A';
    return numeric.toLocaleString();
}

function shortenAddress(address: string): string {
    if (!address) return 'N/A';
    const pieces = address.split(',').map((part) => part.trim()).filter(Boolean);
    if (pieces.length >= 2) return `${pieces[0]}, ${pieces[1]}`;
    if (address.length <= 44) return address;
    return `${address.slice(0, 41)}...`;
}

function getCompactMetaTextClass(value: string): string {
    const length = pickText(value).length;
    if (length >= 40) return 'text-[10px] leading-4';
    if (length >= 26) return 'text-[10.5px] leading-4';
    if (length >= 18) return 'text-[11px] leading-4';
    return 'text-xs leading-4';
}

function getContactValueClass(value: string): string {
    const length = pickText(value).length;
    if (length >= 34) return 'text-[10px] leading-4';
    if (length >= 24) return 'text-[11px] leading-4';
    return 'text-[12px] leading-4';
}

function buildPhoneHref(phone?: string): string {
    const value = String(phone || '').trim();
    if (!value) return '';
    return `tel:${value.replace(/\s+/g, '')}`;
}

function buildEmailHref(email?: string): string {
    const value = String(email || '').trim();
    if (!value) return '';
    return `mailto:${value}`;
}

function getClassicStatusLabel(urgencyState: UrgencyState): string {
    if (urgencyState === 'closing_soon') return 'Closing soon';
    if (urgencyState === 'open') return 'Open';
    if (urgencyState === 'upcoming') return 'Upcoming';
    if (urgencyState === 'closed') return 'Closed';
    return 'N/A';
}

function getClassicStatusTone(urgencyState: UrgencyState): string {
    if (urgencyState === 'closing_soon') {
        return 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-200 dark:bg-amber-500/15 dark:border-amber-500/35';
    }
    if (urgencyState === 'open') {
        return 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/35';
    }
    if (urgencyState === 'upcoming') {
        return 'text-sky-700 bg-sky-100 border-sky-200 dark:text-sky-200 dark:bg-sky-500/15 dark:border-sky-500/35';
    }
    if (urgencyState === 'closed') {
        return 'text-rose-700 bg-rose-100 border-rose-200 dark:text-rose-200 dark:bg-rose-500/15 dark:border-rose-500/35';
    }
    return 'text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800/70 dark:border-slate-700';
}

function getClassicStatusIndicatorTone(urgencyState: UrgencyState): string {
    if (urgencyState === 'closing_soon') {
        return 'text-amber-500 bg-amber-500/12 ring-amber-500/20';
    }
    if (urgencyState === 'open') {
        return 'text-emerald-500 bg-emerald-500/12 ring-emerald-500/20';
    }
    if (urgencyState === 'upcoming') {
        return 'text-sky-500 bg-sky-500/12 ring-sky-500/20';
    }
    if (urgencyState === 'closed') {
        return 'text-rose-500 bg-rose-500/12 ring-rose-500/20';
    }
    return 'text-slate-400 bg-slate-500/10 ring-slate-500/10';
}

const UniversityCard = memo(function UniversityCard({
    university,
    config,
    animationLevel = 'normal',
    className = '',
    actionVariant = 'default',
    cardVariant = 'modern',
}: UniversityCardProps) {
    const mergedConfig: HomeUniversityCardConfig = { ...DEFAULT_UNIVERSITY_CARD_CONFIG, ...(config || {}) };
    const id = pickText(university.id || university._id);
    const name = pickText(university.name, 'University');
    const shortForm = pickText(university.shortForm, 'N/A');
    const category = pickText(university.category, 'N/A');
    const clusterGroup = pickText(university.clusterGroup);
    const clusterSlug = pickText(university.clusterSlug) || toUniversitySlug(clusterGroup);
    const admissionWebsite = normalizeExternalUrl(pickText(university.admissionWebsite));
    const officialWebsite = normalizeExternalUrl(pickText(university.website));
    const slug = pickText(university.slug);
    const detailsUrl = slug ? `/universities/${slug}` : '/universities';
    const clusterUrl = clusterGroup && clusterSlug ? `/universities/cluster/${clusterSlug}` : '';
    const logoUrl = pickText(university.logoUrl || university.logo) || pickText(mergedConfig.defaultUniversityLogo);
    const universityNameSizeClass = getUniversityNameSizeClass(name);
    const shortFormClass = getUniversityShortFormClass(shortForm);
    const nearestExam = pickNearestUniversityExamDate(university);
    const startRaw = university.applicationStart || university.applicationStartDate;
    const endRaw = university.applicationEnd || university.applicationEndDate;
    const appMeta = buildApplicationMeta(
        startRaw,
        endRaw,
        mergedConfig.closingSoonDays,
    );
    const appDurationDays = calculateApplicationDurationDays(startRaw, endRaw);
    const contactNumber = pickText(university.contactNumber);
    const phoneHref = buildPhoneHref(contactNumber);
    const establishedYear = pickText(university.establishedYear || university.established);
    const email = pickText(university.email);
    const emailHref = buildEmailHref(email);
    const fullAddress = pickText(university.address);
    const address = shortenAddress(pickText(university.address));
    const seats = {
        total: normalizeSeat(university.totalSeats),
        science: normalizeSeat(university.scienceSeats),
        arts: normalizeSeat(university.artsSeats),
        business: normalizeSeat(university.businessSeats),
    };
    const classicStatusLabel = getClassicStatusLabel(appMeta.urgencyState);
    const classicStatusTone = getClassicStatusTone(appMeta.urgencyState);
    const classicStatusIndicatorTone = getClassicStatusIndicatorTone(appMeta.urgencyState);
    const examCenterPreview = Array.isArray(university.examCentersPreview)
        ? university.examCentersPreview.map((value: unknown) => pickText(value)).filter(Boolean).slice(0, 3)
        : [];
    const categoryTextClass = getCompactMetaTextClass(category);
    const clusterDisplay = clusterGroup || 'Cluster N/A';
    const clusterTextClass = getCompactMetaTextClass(clusterDisplay);
    const displayAddress = mergedConfig.showAddress ? address : 'Address N/A';
    const addressValueClass = getContactValueClass(displayAddress);
    const phoneValueClass = getContactValueClass(contactNumber || 'N/A');
    const emailValueClass = getContactValueClass(email || 'N/A');

    const sendEvent = (eventName: string, meta: Record<string, unknown>) => {
        void trackAnalyticsEvent({
            eventName,
            module: 'universities',
            source: 'public',
            meta,
        }).catch(() => undefined);
    };

    const variants = getAnimationVariants(animationLevel);
    const copyAddress = () => {
        if (!fullAddress) return;
        void navigator.clipboard.writeText(fullAddress)
            .then(() => toast.success('Address copied'))
            .catch(() => toast.error('Could not copy address'));
    };

    const detailsButton = (
        <Link
            to={detailsUrl}
            data-testid="university-card-details"
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        >
            View Details
        </Link>
    );

    const officialButton = officialWebsite ? (
        <a
            href={officialWebsite}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="university-card-official"
            onClick={() => sendEvent('university_official_click', { universityId: id, slug, website: officialWebsite })}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        >
            Official
        </a>
    ) : (
        <span className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Official N/A
        </span>
    );

    const applyButton = admissionWebsite ? (
        <a
            href={admissionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="university-card-apply"
            onClick={() => sendEvent('university_apply_click', { universityId: id, slug, admissionWebsite })}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
        >
            Apply
        </a>
    ) : (
        <span className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Apply N/A
        </span>
    );

    const actionRows = actionVariant === 'deadline'
        ? [applyButton, officialButton, detailsButton]
        : actionVariant === 'exam'
            ? [applyButton, detailsButton, officialButton]
            : [applyButton, officialButton, detailsButton];

    if (cardVariant === 'classic') {
        return (
            <motion.article
                variants={variants}
                whileHover={animationLevel === 'off' ? undefined : { y: -5, transition: { duration: 0.2 } }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-2xl dark:border-white/10 dark:bg-slate-900/60 ${className}`}
                data-university-card-id={id}
                data-university-category={category}
                data-university-cluster={clusterGroup}
                data-university-card-variant="classic"
            >
                <div
                    className={`absolute right-4 top-4 z-[1] flex h-6 w-6 items-center justify-center rounded-full shadow-sm ring-1 backdrop-blur-sm ${classicStatusIndicatorTone}`}
                    title={classicStatusLabel}
                    data-testid="university-card-status-indicator"
                    data-university-status={appMeta.urgencyState}
                >
                    <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-55" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                    </span>
                </div>
                <div className="space-y-4 p-5">
                    <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-4">
                        <div className="relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.3rem] border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[1.4rem] sm:p-2.5">
                            <UniversityLogo
                                name={name}
                                shortForm={shortForm}
                                logoUrl={logoUrl}
                                containerClassName="h-full w-full"
                                fallbackTextClassName="text-[0.95rem] sm:text-[1.05rem]"
                            />
                        </div>

                        <div className="min-w-0 space-y-3 pr-8 sm:pr-10">
                            <h3 className={`${universityNameSizeClass} line-clamp-2 min-h-[2.95rem] break-words font-bold text-slate-900 dark:text-white sm:min-h-[3.15rem]`} title={name}>
                                {name}
                            </h3>

                            <div className="grid grid-cols-2 gap-2">
                                <span className={`inline-flex min-h-[2rem] min-w-0 items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-center ${shortFormClass} font-bold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200`} title={shortForm && shortForm !== 'N/A' ? shortForm : 'Short form unavailable'}>
                                    <span className="truncate">{shortForm && shortForm !== 'N/A' ? shortForm : 'Short N/A'}</span>
                                </span>
                                <span className="inline-flex min-h-[2rem] min-w-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                    <span className="truncate">{establishedYear ? `Est. ${establishedYear}` : 'Est. N/A'}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2">
                            <span
                                className="inline-flex min-h-[3rem] min-w-0 items-center rounded-2xl border border-blue-500/15 bg-blue-50/90 px-3 py-2 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
                                title={category}
                            >
                                <span className={`line-clamp-2 break-words ${categoryTextClass} font-bold uppercase tracking-[0.08em]`}>{category}</span>
                            </span>
                            {clusterGroup ? (
                                clusterUrl ? (
                                    <Link
                                        to={clusterUrl}
                                        className="inline-flex min-h-[3rem] min-w-0 items-center gap-1.5 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-purple-700 transition hover:bg-purple-500/20 dark:text-purple-200"
                                        title={clusterGroup}
                                    >
                                        <Layers3 className="h-3.5 w-3.5 shrink-0" />
                                        <span className={`line-clamp-2 break-words ${clusterTextClass} font-bold uppercase tracking-[0.08em]`}>{clusterGroup}</span>
                                    </Link>
                                ) : (
                                    <span
                                        className="inline-flex min-h-[3rem] min-w-0 items-center gap-1.5 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-purple-700 dark:text-purple-200"
                                        title={clusterGroup}
                                    >
                                        <Layers3 className="h-3.5 w-3.5 shrink-0" />
                                        <span className={`line-clamp-2 break-words ${clusterTextClass} font-bold uppercase tracking-[0.08em]`}>{clusterGroup}</span>
                                    </span>
                                )
                            ) : (
                                <span className="inline-flex min-h-[3rem] min-w-0 items-center rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500">
                                    <span className={`line-clamp-2 break-words ${clusterTextClass} font-semibold uppercase tracking-[0.14em]`}>Cluster N/A</span>
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={copyAddress}
                                disabled={!mergedConfig.showAddress || !fullAddress}
                                className="group/contact col-span-2 flex min-h-[4.25rem] min-w-0 items-start gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-left transition hover:border-primary/30 hover:bg-slate-50 disabled:cursor-default disabled:opacity-75 disabled:hover:border-slate-200/80 disabled:hover:bg-white/90 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-primary/40 dark:hover:bg-slate-950/60"
                                title={mergedConfig.showAddress && fullAddress ? `${fullAddress} (click to copy)` : 'Address unavailable'}
                            >
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover/contact:text-primary dark:text-slate-500 group-hover/contact:dark:text-primary" />
                                <span className="min-w-0">
                                    <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Address</span>
                                    <span className={`mt-1 block line-clamp-2 break-words font-medium text-slate-600 dark:text-slate-300 ${addressValueClass}`}>{displayAddress}</span>
                                </span>
                            </button>

                            {phoneHref ? (
                                <a
                                    href={phoneHref}
                                    className="group/contact flex min-h-[4.1rem] min-w-0 items-start gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 transition hover:border-primary/30 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-primary/40 dark:hover:bg-slate-950/60"
                                    title={contactNumber}
                                >
                                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover/contact:text-primary dark:text-slate-500 group-hover/contact:dark:text-primary" />
                                    <span className="min-w-0">
                                        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Call</span>
                                        <span className={`mt-1 block line-clamp-2 break-all font-medium text-slate-600 dark:text-slate-300 ${phoneValueClass}`}>{contactNumber}</span>
                                    </span>
                                </a>
                            ) : (
                                <span className="flex min-h-[4.1rem] min-w-0 items-start gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500">
                                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="min-w-0">
                                        <span className="block text-[10px] font-bold uppercase tracking-[0.16em]">Call</span>
                                        <span className={`mt-1 block line-clamp-2 break-all font-medium ${phoneValueClass}`}>N/A</span>
                                    </span>
                                </span>
                            )}

                            {mergedConfig.showEmail ? (
                                emailHref ? (
                                    <a
                                        href={emailHref}
                                        className="group/contact flex min-h-[4.1rem] min-w-0 items-start gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 transition hover:border-primary/30 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-primary/40 dark:hover:bg-slate-950/60"
                                        title={email}
                                    >
                                        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover/contact:text-primary dark:text-slate-500 group-hover/contact:dark:text-primary" />
                                        <span className="min-w-0">
                                            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Email</span>
                                            <span className={`mt-1 block line-clamp-2 break-all font-medium text-slate-500 dark:text-slate-400 ${emailValueClass}`}>{email}</span>
                                        </span>
                                    </a>
                                ) : (
                                    <span className="flex min-h-[4.1rem] min-w-0 items-start gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500">
                                        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-[10px] font-bold uppercase tracking-[0.16em]">Email</span>
                                            <span className={`mt-1 block line-clamp-2 break-all font-medium ${emailValueClass}`}>N/A</span>
                                        </span>
                                    </span>
                                )
                            ) : null}
                        </div>

                        <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/35">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-200/60 pb-3 dark:border-slate-800/60">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Application</p>
                                    <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-slate-700 dark:text-slate-100">
                                        {appMeta.windowLabel}
                                        {appDurationDays !== null ? <span className="ml-1 text-slate-400">({appDurationDays} days)</span> : ''}
                                    </p>
                                </div>
                                <div className="min-w-[5rem] text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Nearest Exam</p>
                                    <p className="mt-1 text-[13px] font-semibold text-slate-700 dark:text-slate-100">
                                        {nearestExam ? formatUniversityDate(nearestExam, 'en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {mergedConfig.showApplicationProgress ? (
                                (() => {
                                    let pct = 0;
                                    let text = '';
                                    if (startRaw && endRaw) {
                                        const s = parseUniversityDate(startRaw);
                                        const e = parseUniversityDate(endRaw);
                                        if (s && e) {
                                            const total = e.getTime() - s.getTime();
                                            if (total > 0) {
                                                const elapsed = Math.max(0, Math.min(Date.now() - s.getTime(), total));
                                                pct = Math.round((elapsed / total) * 100);
                                            }
                                        }
                                    }
                                    
                                    if (appMeta.urgencyState === 'closed') {
                                        pct = 100;
                                        text = 'Closed';
                                    } else if (appMeta.urgencyState === 'upcoming') {
                                        pct = 0;
                                        text = `Starts in ${appMeta.daysLeft} days`;
                                    } else if (appMeta.daysLeft === 0) {
                                        text = 'Closes today';
                                    } else {
                                        text = `${appMeta.daysLeft} days left`;
                                    }

                                    const getProgressTone = () => {
                                        if (appMeta.urgencyState === 'closed') return 'bg-rose-500 dark:bg-rose-600';
                                        if (appMeta.urgencyState === 'closing_soon') return 'bg-amber-500 dark:bg-amber-500';
                                        if (appMeta.urgencyState === 'upcoming') return 'bg-sky-500 dark:bg-sky-600';
                                        return 'bg-emerald-500 dark:bg-emerald-600';
                                    };

                                    return (
                                        <div className="mt-4 overflow-hidden rounded-full border border-slate-200/50 bg-slate-200/80 shadow-inner dark:border-slate-800/80 dark:bg-slate-800/50">
                                            <div className="relative h-6 w-full">
                                                <div
                                                    className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressTone()}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tracking-wide text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.5)]">
                                                    {text}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : null}

                            {mergedConfig.showExamCentersPreview && examCenterPreview.length > 0 ? (
                                <p className="mt-3 flex min-w-0 items-start gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="line-clamp-2 break-words">Centers: {examCenterPreview.join(', ')}</span>
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="px-5">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />
                </div>
                <div className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-primary" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">Available Seats</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 p-2 text-center dark:border-slate-800 dark:bg-slate-950/30">
                            <span className="mb-0.5 text-[10px] text-slate-400 dark:text-slate-500">Total</span>
                            <span className="text-sm font-black text-primary">{seats.total}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 p-2 text-center dark:border-slate-800 dark:bg-slate-950/30">
                            <span className="mb-0.5 text-[10px] text-slate-400 dark:text-slate-500">Sci</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">{seats.science}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 p-2 text-center dark:border-slate-800 dark:bg-slate-950/30">
                            <span className="mb-0.5 text-[10px] text-slate-400 dark:text-slate-500">Com</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">{seats.business}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 p-2 text-center dark:border-slate-800 dark:bg-slate-950/30">
                            <span className="mb-0.5 text-[10px] text-slate-400 dark:text-slate-500">Arts</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">{seats.arts}</span>
                        </div>
                    </div>
                </div>
                {mergedConfig.showExamDates ? (
                    <>
                        <div className="px-5">
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />
                        </div>
                        <div className="flex-1 p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="h-1 w-4 rounded-full bg-amber-500" />
                                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">Upcoming Exams</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Science Unit</span>
                                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        {formatUniversityDate(university.scienceExamDate || university.examDateScience, 'en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Arts Unit</span>
                                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        {formatUniversityDate(university.artsExamDate || university.examDateArts, 'en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Commerce Unit</span>
                                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        {formatUniversityDate(university.businessExamDate || university.examDateBusiness, 'en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
                <div className="mt-auto grid grid-cols-1 gap-2 p-5 pt-0 sm:grid-cols-2">
                    {actionVariant === 'exam' ? (
                        <>
                            <Link
                                to={detailsUrl}
                                data-testid="university-card-details"
                                className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"
                            >
                                Details
                            </Link>
                            {officialWebsite ? (
                                <a
                                    href={officialWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="university-card-official"
                                    onClick={() => sendEvent('university_official_click', { universityId: id, slug, website: officialWebsite })}
                                    className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"
                                >
                                    Official
                                </a>
                            ) : (
                                <span className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-400 dark:border-slate-800 dark:text-slate-500">
                                    Official N/A
                                </span>
                            )}
                        </>
                    ) : null}
                    {actionVariant === 'deadline' ? (
                        <>
                            {admissionWebsite ? (
                                <a
                                    href={admissionWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="university-card-apply"
                                    onClick={() => sendEvent('university_apply_click', { universityId: id, slug, admissionWebsite })}
                                    className="flex min-h-[44px] items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-3 text-[13px] font-bold text-white shadow-lg shadow-indigo-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Apply
                                </a>
                            ) : (
                                <span className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-400 dark:border-slate-800 dark:text-slate-500">
                                    Apply N/A
                                </span>
                            )}
                            {officialWebsite ? (
                                <a
                                    href={officialWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="university-card-official"
                                    onClick={() => sendEvent('university_official_click', { universityId: id, slug, website: officialWebsite })}
                                    className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"
                                >
                                    Official
                                </a>
                            ) : (
                                <span className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-400 dark:border-slate-800 dark:text-slate-500">
                                    Official N/A
                                </span>
                            )}
                        </>
                    ) : null}
                    {actionVariant === 'default' ? (
                        <>
                            <Link
                                to={detailsUrl}
                                data-testid="university-card-details"
                                className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"
                            >
                                View Details
                            </Link>
                            {officialWebsite ? (
                                <a
                                    href={officialWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="university-card-official"
                                    onClick={() => sendEvent('university_official_click', { universityId: id, slug, website: officialWebsite })}
                                    className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"
                                >
                                    Official Site
                                </a>
                            ) : (
                                <span className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-400 dark:border-slate-800 dark:text-slate-500">
                                    Official N/A
                                </span>
                            )}
                            {admissionWebsite ? (
                                <a
                                    href={admissionWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="university-card-apply"
                                    onClick={() => sendEvent('university_apply_click', { universityId: id, slug, admissionWebsite })}
                                    className="flex min-h-[44px] items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-3 text-[13px] font-bold text-white shadow-lg shadow-indigo-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:col-span-2"
                                >
                                    Quick Apply
                                </a>
                            ) : (
                                <span className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:col-span-2">
                                    Apply N/A
                                </span>
                            )}
                        </>
                    ) : null}
                </div>
            </motion.article>
        );
    }

    return (
        <motion.article
            variants={variants}
            whileHover={animationLevel === 'off' ? undefined : { y: -4, transition: { duration: 0.2 } }}
            className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_14px_30px_rgba(15,23,42,0.10)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(15,23,42,0.14)] dark:border-slate-700/70 dark:bg-slate-900/95 dark:shadow-[0_14px_30px_rgba(4,12,24,0.26)] dark:hover:shadow-[0_20px_40px_rgba(4,12,24,0.30)] ${className}`}
            data-university-card-id={id}
            data-university-category={category}
            data-university-cluster={clusterGroup}
            data-university-card-variant="modern"
        >
            <div className="flex gap-3 p-4 pb-3">
                <div className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <UniversityLogo
                        name={name}
                        shortForm={shortForm}
                        logoUrl={logoUrl}
                        containerClassName="h-full w-full"
                        fallbackTextClassName="text-[0.95rem] sm:text-[1rem]"
                    />
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                    <div className="min-w-0">
                        <h3 className={`${universityNameSizeClass} line-clamp-3 min-h-[4em] text-balance font-bold text-slate-900 dark:text-white`} title={name}>
                            {name}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {shortForm && shortForm !== 'N/A' && (
                                <span className={`inline-flex min-w-0 max-w-full rounded-full border border-cyan-500/15 bg-cyan-500/10 px-2.5 py-1 ${shortFormClass} font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200`} title={shortForm}>
                                    <span className="truncate">{shortForm}</span>
                                </span>
                            )}
                            {establishedYear ? (
                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                    Est. {establishedYear}
                                </span>
                            ) : null}
                            <span className={`ml-auto shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${classicStatusTone}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {classicStatusLabel}
                            </span>
                        </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-200">
                            {category}
                        </span>
                        {clusterGroup && (
                            clusterUrl ? (
                                <Link
                                    to={clusterUrl}
                                    className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-700 transition hover:bg-purple-500/20 dark:text-purple-200"
                                >
                                    <Layers3 className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{clusterGroup}</span>
                                </Link>
                            ) : (
                                <span className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-200">
                                    <Layers3 className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{clusterGroup}</span>
                                </span>
                            )
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {address && address !== 'N/A' && (
                            <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{address}</span>
                            </span>
                        )}
                        {contactNumber && (
                            <a href={phoneHref} className="inline-flex min-w-0 max-w-full items-center gap-1 transition hover:text-primary-600 dark:hover:text-primary-300">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{contactNumber}</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-3 px-4 pb-4">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-slate-700/80 dark:bg-slate-950/55">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Application Window</div>
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">{appMeta.windowLabel}</div>
                        </div>
                        <DaysLeftChip daysLeft={appMeta.daysLeft} urgencyState={appMeta.urgencyState} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-500 dark:text-slate-400">{appMeta.deadlineLabel}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-100">
                            {nearestExam ? formatUniversityDate(nearestExam, 'en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <UnitDateChip label="Science" value={university.scienceExamDate || university.examDateScience} />
                    <UnitDateChip label="Arts" value={university.artsExamDate || university.examDateArts} />
                    <UnitDateChip label="Business" value={university.businessExamDate || university.examDateBusiness} />
                </div>
                {mergedConfig.showExamCentersPreview && examCenterPreview.length > 0 && (
                    <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                        Centers: {examCenterPreview.join(', ')}
                    </p>
                )}
            </div>

            <div className="mt-auto grid grid-cols-3 gap-2 px-4 pb-4 pt-0">
                {actionRows.map((actionNode, index) => (
                    <span key={`${id}-action-${index}`} className="contents">
                        {actionNode}
                    </span>
                ))}
            </div>
        </motion.article>
    );
});

export default UniversityCard;

export function UniversityCardSkeleton() {
    return (
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
            </div>
            <div className="mt-4 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
        </div>
    );
}
