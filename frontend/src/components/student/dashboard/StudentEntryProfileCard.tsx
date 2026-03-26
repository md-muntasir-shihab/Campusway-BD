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
} from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentDashboardFullResponse } from '../../../services/api';

interface Props {
    header: StudentDashboardFullResponse['header'];
    support: StudentDashboardFullResponse['support'];
}

function formatValue(value: string | null | undefined, fallback: string): string {
    const normalized = String(value || '').trim();
    return normalized || fallback;
}

function maskPhone(value: string | null | undefined): string {
    const normalized = String(value || '').replace(/\s+/g, '').trim();
    if (!normalized) return 'Add your phone number';
    if (normalized.length <= 4) return normalized;
    return `${normalized.slice(0, 4)}${'*'.repeat(Math.max(0, normalized.length - 7))}${normalized.slice(-3)}`;
}

function formatGuardianStatus(status: StudentDashboardFullResponse['header']['guardian_phone_verification_status']) {
    if (status === 'verified') {
        return {
            label: 'Guardian verified',
            tone: 'border-emerald-400/30 bg-emerald-400/12 text-emerald-50',
        };
    }

    if (status === 'pending') {
        return {
            label: 'Guardian pending',
            tone: 'border-amber-300/30 bg-amber-400/12 text-amber-50',
        };
    }

    return {
        label: 'Guardian not verified',
        tone: 'border-white/15 bg-white/10 text-slate-100',
    };
}

export default function StudentEntryProfileCard({ header, support }: Props) {
    const progressPct = Math.min(100, Math.max(0, header.profileCompletionPercentage || 0));
    const missingFields = [...new Set((header.missingFields || []).filter(Boolean))];
    const guardianStatus = formatGuardianStatus(header.guardian_phone_verification_status);
    const subscriptionLabel = header.subscription?.isActive
        ? header.subscription.planName || 'Active plan'
        : 'Plan not active';
    const supportLabel = support.openTickets > 0
        ? `${support.openTickets} support ticket${support.openTickets === 1 ? '' : 's'} open`
        : 'No open support tickets';

    const detailCards = [
        {
            label: 'Department',
            value: formatValue(header.profile?.department, 'Choose your stream'),
            icon: GraduationCap,
        },
        {
            label: 'College',
            value: formatValue(header.profile?.college_name, 'Add college details'),
            icon: BookOpenCheck,
        },
        {
            label: 'Batches',
            value: [header.profile?.ssc_batch, header.profile?.hsc_batch]
                .map((value, index) => value ? `${index === 0 ? 'SSC' : 'HSC'} ${value}` : '')
                .filter(Boolean)
                .join(' • ') || 'Add SSC / HSC batch',
            icon: BadgeCheck,
        },
        {
            label: 'Student ID',
            value: formatValue(header.userUniqueId, 'ID pending'),
            icon: IdCard,
        },
        {
            label: 'Contact',
            value: maskPhone(header.profile?.phone),
            icon: Phone,
        },
        {
            label: 'Support',
            value: supportLabel,
            icon: LifeBuoy,
        },
    ];

    return (
        <DashboardSection delay={0.05}>
            <section
                data-testid="student-entry-card"
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
                    <div className="relative isolate overflow-hidden px-5 py-6 sm:px-6 sm:py-7">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_90%_20%,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(135deg,_rgba(248,250,252,0.98)_0%,_rgba(238,242,255,0.96)_52%,_rgba(224,242,254,0.94)_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.20),_transparent_34%),radial-gradient(circle_at_90%_20%,_rgba(99,102,241,0.18),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(17,24,39,0.98)_48%,_rgba(8,47,73,0.98)_100%)]" />
                        <div className="absolute inset-y-0 right-0 hidden w-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.04)_100%)] blur-3xl dark:bg-[linear-gradient(180deg,rgba(14,165,233,0.18)_0%,rgba(14,165,233,0.02)_100%)] sm:block" />

                        <div className="relative z-10">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 shadow-sm dark:border-cyan-400/20 dark:bg-white/5 dark:text-cyan-200">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Student Access Card
                                </span>
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${guardianStatus.tone}`}>
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    {guardianStatus.label}
                                </span>
                            </div>

                            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/85 shadow-lg shadow-cyan-500/10 dark:border-white/10 dark:bg-slate-950/70">
                                        {header.profilePicture ? (
                                            <img
                                                src={header.profilePicture}
                                                alt={header.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <UserCircle className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                                            Logged in to the student portal
                                        </p>
                                        <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">
                                            {header.name}
                                        </h2>
                                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            {header.welcomeMessage}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-slate-200 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                                {subscriptionLabel}
                                            </span>
                                            <span className="rounded-full border border-slate-200 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                                {header.email}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid shrink-0 gap-3 rounded-[1.6rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45 sm:min-w-[220px]">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                            Profile readiness
                                        </p>
                                        <div className="mt-1 flex items-end gap-2">
                                            <span className="text-3xl font-black text-slate-950 dark:text-white">{progressPct}%</span>
                                            <span className="pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                complete
                                            </span>
                                        </div>
                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 transition-[width] duration-700"
                                                style={{ width: `${progressPct}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-slate-400 dark:text-slate-500">Exam access</p>
                                            <p className="mt-1 font-bold text-slate-900 dark:text-white">
                                                {header.isProfileEligible ? 'Ready' : 'Locked'}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                            <p className="text-slate-400 dark:text-slate-500">Support</p>
                                            <p className="mt-1 font-bold text-slate-900 dark:text-white">
                                                {support.openTickets}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <Link
                                    to="/profile"
                                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[1.2rem] bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                                >
                                    Open Profile
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    to="/profile/security"
                                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[1.2rem] border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                                >
                                    Security Center
                                </Link>
                                <Link
                                    to="/support"
                                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[1.2rem] border border-transparent bg-cyan-500/12 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-500/18 dark:bg-cyan-400/12 dark:text-cyan-100 dark:hover:bg-cyan-400/20"
                                >
                                    Need Support
                                </Link>
                            </div>

                            <div className="mt-5 rounded-[1.5rem] border border-slate-200/80 bg-white/72 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                            Next step for this account
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            {missingFields.length > 0
                                                ? 'Complete the missing profile fields below so admissions, support, and exam workflows stay unlocked.'
                                                : 'Your main profile blocks are already in good shape. You can review exams, support, and security from here.'}
                                        </p>
                                    </div>
                                    {header.isProfileEligible ? (
                                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                            <BadgeCheck className="h-3.5 w-3.5" />
                                            Ready for exams
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                            <CircleAlert className="h-3.5 w-3.5" />
                                            Profile still needs attention
                                        </span>
                                    )}
                                </div>

                                {missingFields.length > 0 ? (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {missingFields.map((field) => (
                                            <span
                                                key={field}
                                                className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300"
                                            >
                                                {field}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-950 px-5 py-6 text-white dark:bg-slate-950/95 sm:px-6 sm:py-7">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
                                    Snapshot
                                </p>
                                <h3 className="mt-2 text-2xl font-black tracking-tight">Profile signals that matter</h3>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                                {header.isProfileEligible ? 'Live ready' : 'Update needed'}
                            </span>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {detailCards.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.label}
                                        className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 backdrop-blur"
                                    >
                                        <div className="flex items-center gap-2 text-cyan-100/80">
                                            <Icon className="h-4 w-4" />
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                                                {item.label}
                                            </p>
                                        </div>
                                        <p className="mt-3 text-sm font-semibold leading-6 text-white">
                                            {item.value}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-5 rounded-[1.5rem] border border-cyan-300/15 bg-cyan-400/10 p-4">
                            <p className="text-sm font-semibold text-white">
                                Portal entry card is now shown directly on dashboard.
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-200">
                                This gives students the same key profile context right after login without opening the
                                full profile page first.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </DashboardSection>
    );
}
