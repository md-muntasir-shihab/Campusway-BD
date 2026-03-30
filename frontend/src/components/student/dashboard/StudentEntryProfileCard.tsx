import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BadgeCheck,
    BookOpenCheck,
    CircleAlert,
    GraduationCap,
    IdCard,
    LifeBuoy,
    Phone,
    ShieldCheck,
    Sparkles,
    UserCircle,
    Settings,
    X,
    Trophy
} from 'lucide-react';
import type { StudentDashboardFullResponse } from '../../../services/api';

interface Props {
    header: StudentDashboardFullResponse['header'];
    support: StudentDashboardFullResponse['support'];
    onClose?: () => void;
}

function formatValue(value: string | null | undefined, fallback: string): string {
    const normalized = String(value || '').trim();
    return normalized || fallback;
}

function maskPhone(value: string | null | undefined): string {
    const normalized = String(value || '').replace(/\s+/g, '').trim();
    if (!normalized) return 'Add phone';
    if (normalized.length <= 4) return normalized;
    return `${normalized.slice(0, 4)}***${normalized.slice(-3)}`;
}

export default function StudentEntryProfileCard({ header, support, onClose }: Props) {
    const progressPct = Math.min(100, Math.max(0, header.profileCompletionPercentage || 0));
    const missingFields = [...new Set((header.missingFields || []).filter(Boolean))];
    const isGuardianVerified = header.guardian_phone_verification_status === 'verified';
    const isGuardianPending = header.guardian_phone_verification_status === 'pending';
    const isPremium = header.subscription?.isActive;

    const detailCards = [
        {
            label: 'Department',
            value: formatValue(header.profile?.department, 'Not chosen'),
            icon: GraduationCap,
            color: 'from-blue-500 to-cyan-500',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'College',
            value: formatValue(header.profile?.college_name, 'Not added'),
            icon: BookOpenCheck,
            color: 'from-violet-500 to-purple-500',
            bg: 'bg-violet-500/10'
        },
        {
            label: 'Batches',
            value: [header.profile?.ssc_batch, header.profile?.hsc_batch]
                .map((value, index) => value ? `${index === 0 ? 'SSC' : 'HSC'} ${value}` : '')
                .filter(Boolean)
                .join(' • ') || 'No batches',
            icon: BadgeCheck,
            color: 'from-amber-500 to-orange-500',
            bg: 'bg-amber-500/10'
        },
        {
            label: 'Contact',
            value: maskPhone(header.profile?.phone),
            icon: Phone,
            color: 'from-emerald-500 to-teal-500',
            bg: 'bg-emerald-500/10'
        },
    ];

    return (
        <div className="relative w-full max-w-4xl mx-auto drop-shadow-2xl">
            <section
                data-testid="student-entry-card"
                className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/60 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-slate-900/60 transition-all duration-500"
            >
                {/* Dynamic Glowing Orbs Background */}
                <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-sky-500/20 dark:from-indigo-600/30 dark:via-purple-600/20 dark:to-blue-600/30 blur-3xl opacity-60" />
                <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-indigo-500/30 blur-[100px] dark:bg-indigo-500/20" />
                <div className="absolute -right-32 top-20 h-64 w-64 rounded-full bg-sky-500/30 blur-[100px] dark:bg-cyan-500/20" />
                <div className="absolute left-1/2 bottom-0 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-500/20 blur-[100px] dark:bg-purple-500/10" />

                {/* Top Cover Section (Decorative) */}
                <div className="h-32 w-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-sky-500/10 dark:from-indigo-900/40 dark:via-purple-900/40 dark:to-sky-900/40 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] dark:opacity-10 mix-blend-overlay"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-white/60 dark:from-slate-900/60 to-transparent backdrop-blur-[2px]"></div>
                </div>

                <div className="relative z-10 px-8 pb-8 pt-0 -mt-20">
                    {onClose && (
                        <button 
                            onClick={onClose} 
                            className="absolute xl:fixed top-4 right-4 xl:-top-4 xl:-right-12 z-50 p-2.5 rounded-full bg-white/20 hover:bg-white/40 dark:bg-slate-800/40 dark:hover:bg-slate-700/60 backdrop-blur-md transition-all text-slate-700 dark:text-slate-200 border border-white/30 dark:border-white/10 hover:shadow-lg hover:scale-110 active:scale-95 group"
                        >
                            <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        </button>
                    )}

                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start pl-2">
                        {/* Profile Info (Left) */}
                        <div className="flex flex-1 flex-col items-center sm:items-start text-center sm:text-left gap-5">
                            
                            {/* Avatar Stack */}
                            <div className="relative group shrink-0 mt-5">
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-400 via-purple-400 to-sky-400 opacity-70 blur-md group-hover:opacity-100 group-hover:blur-lg transition duration-500 animate-pulse-slow" />
                                <div className={`relative flex h-28 w-28 overflow-hidden rounded-full border-4 border-white/80 dark:border-slate-800/80 shadow-2xl ${isPremium ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent' : ''}`}>
                                    {header.profilePicture ? (
                                        <img
                                            src={header.profilePicture}
                                            alt={header.name}
                                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                                            <UserCircle className="h-14 w-14 text-slate-400 dark:text-slate-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 sm:right-2">
                                    {header.isProfileEligible ? (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-slate-800 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl hover:scale-110 transition-transform cursor-help" title="Profile Ready">
                                            <BadgeCheck className="w-4 h-4" />
                                        </div>
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-slate-800 bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xl hover:scale-110 transition-transform cursor-help animate-bounce" title="Needs Attention">
                                            <CircleAlert className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col min-w-0 w-full">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 backdrop-blur-md">
                                        <Sparkles className="h-3 w-3" />
                                        Student
                                    </span>
                                    {isGuardianVerified && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 backdrop-blur-md">
                                            <ShieldCheck className="h-3 w-3" /> Guardian Verified
                                        </span>
                                    )}
                                    {isGuardianPending && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 border border-amber-500/20 backdrop-blur-md animate-pulse">
                                            Guardian Pending
                                        </span>
                                    )}
                                    {isPremium && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 dark:from-amber-600 dark:to-yellow-700 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-yellow-900 dark:text-yellow-100 shadow-sm">
                                            <Trophy className="h-3 w-3" /> Premium
                                        </span>
                                    )}
                                </div>
                                
                                <h1 className="truncate text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-1 mb-2 drop-shadow-sm">
                                    {header.name}
                                </h1>
                                
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300 bg-white/30 dark:bg-slate-800/30 w-fit sm:mx-0 mx-auto px-4 py-2 rounded-2xl border border-white/50 dark:border-white/10 backdrop-blur-md">
                                    <p className="flex items-center gap-2 font-medium">
                                        <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                            <IdCard className="h-4 w-4 shrink-0" />
                                        </div>
                                        <span className="truncate">{formatValue(header.userUniqueId, 'Pending ID')}</span>
                                    </p>
                                    <div className="hidden sm:block h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                                    <p className="flex items-center gap-2 font-medium">
                                        <div className="p-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                            <span className="h-2 w-2 rounded-full bg-sky-500 block m-1" />
                                        </div>
                                        <span className="truncate">{header.email}</span>
                                    </p>
                                </div>

                                {/* Support link floating row */}
                                <div className="mt-4 flex justify-center sm:justify-start">
                                    <Link 
                                        to="/support" 
                                        className={`group inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 ${
                                            support.openTickets > 0 
                                                ? 'border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:text-amber-400 hover:bg-amber-500/20 shadow-lg shadow-amber-500/10' 
                                                : 'border-white/50 bg-white/40 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 shadow-lg shadow-slate-200/20 dark:shadow-none'
                                        }`}
                                    >
                                        <LifeBuoy className="h-4 w-4 transition-transform group-hover:rotate-12" />
                                        {support.openTickets} Support Ticket{support.openTickets !== 1 ? 's' : ''} Open
                                        <ArrowRight className="h-3.5 w-3.5 opacity-50 -ml-1 transition-transform group-hover:translate-x-1 group-hover:opacity-100" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-64 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent self-center"></div>

                        {/* Actions & Details (Right) */}
                        <div className="flex shrink-0 w-full flex-col gap-5 lg:w-[380px] lg:mt-8">
                            
                            {/* Readiness Widget */}
                            <div className="group relative rounded-3xl border border-white/50 bg-white/40 p-5 dark:border-white/10 dark:bg-slate-800/40 backdrop-blur-xl shadow-lg transition-transform hover:-translate-y-1">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent rounded-3xl pointer-events-none" />
                                <div className="relative flex items-end justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300">Profile Readiness</span>
                                    </div>
                                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500 dark:from-indigo-400 dark:to-sky-400">
                                        {progressPct}%
                                    </span>
                                </div>
                                <div className="h-3.5 overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300/30 dark:border-slate-700/30 shadow-inner">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 transition-all duration-1000 ease-out relative overflow-hidden"
                                        style={{ width: `${progressPct}%` }}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-[100%] animate-[shimmer_2s_infinite]" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Grid of details */}
                            <div className="grid grid-cols-2 gap-3">
                                {detailCards.slice(0, 4).map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="group flex items-center gap-3 rounded-2xl border border-white/40 bg-white/30 p-3 dark:border-white/5 dark:bg-slate-800/30 backdrop-blur-md hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors shadow-sm">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} shadow-lg text-white group-hover:scale-110 transition-transform`}>
                                                <Icon className="h-5 w-5 drop-shadow-sm" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-0.5">{item.label}</p>
                                                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{item.value}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 mt-1">
                                <Link
                                    to="/profile"
                                    className="group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-95 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-2xl"></div>
                                    <span className="relative flex items-center gap-2">
                                        Edit Profile
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </span>
                                </Link>
                                <Link
                                    to="/profile/security"
                                    className="group flex shrink-0 items-center justify-center rounded-2xl border border-slate-300/50 bg-white/50 px-4 py-3.5 text-slate-700 shadow-md backdrop-blur-md transition-all hover:bg-white/80 hover:scale-[1.02] active:scale-95 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                                    title="Security Settings"
                                >
                                    <Settings className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {missingFields.length > 0 && (
                        <div className="mt-8 overflow-hidden rounded-3xl border border-amber-200/50 bg-gradient-to-r from-amber-50/80 to-orange-50/80 p-5 dark:border-amber-500/20 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-xl shadow-lg relative">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl"></div>
                            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg animate-bounce shadow-amber-500/30">
                                    <CircleAlert className="h-6 w-6 drop-shadow-sm" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-black text-amber-900 dark:text-amber-200 tracking-tight">Profile Incomplete</h3>
                                    <p className="text-sm font-medium text-amber-700/80 dark:text-amber-400/80 mt-0.5 max-w-lg leading-snug">
                                        You are missing important profile details. Please complete them to unlock all platform features.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {missingFields.map(field => (
                                            <span key={field} className="rounded-xl bg-white/60 backdrop-blur-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-800 shadow-sm transition-transform hover:scale-105 border border-amber-200/40 dark:bg-black/20 dark:text-amber-400 dark:border-amber-500/20">
                                                {field}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <Link 
                                    to="/profile"
                                    className="mt-4 sm:mt-0 whitespace-nowrap px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 transition-colors text-white font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                    Complete Now
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

