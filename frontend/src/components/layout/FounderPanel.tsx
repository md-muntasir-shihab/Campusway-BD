import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Award,
    Briefcase,
    Calendar,
    GraduationCap,
    Globe,
    Mail,
    MapPin,
    Phone,
    Quote,
    Sparkles,
    User,
    Users,
    X,
} from 'lucide-react';
import api from '../../services/api';

interface FounderContact {
    phones: string[];
    email: string;
    website: string;
}

interface FounderEducation {
    institution: string;
    degree: string;
    field: string;
    startYear: number;
    endYear?: number;
    description?: string;
}

interface FounderExperience {
    company: string;
    role: string;
    startYear: number;
    endYear?: number;
    description?: string;
    current?: boolean;
}

interface FounderData {
    name: string;
    tagline: string;
    founderMessage: string;
    photoUrl: string;
    role: string;
    aboutText: string;
    fatherName: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    location: string;
    contactDetails: FounderContact;
    skills: string[];
    education: FounderEducation[];
    experience: FounderExperience[];
}

interface FounderPanelProps {
    open: boolean;
    onClose: () => void;
}

function SkeletonLoader() {
    return (
        <div className="animate-pulse space-y-6 p-6">
            <div className="flex items-center gap-4">
                <div className="h-24 w-24 rounded-2xl bg-slate-700/40" />
                <div className="flex-1 space-y-2">
                    <div className="h-6 w-48 rounded-lg bg-slate-700/40" />
                    <div className="h-4 w-32 rounded-lg bg-slate-700/40" />
                    <div className="h-3 w-56 rounded-lg bg-slate-700/40" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-4 w-full rounded bg-slate-700/40" />
                <div className="h-4 w-5/6 rounded bg-slate-700/40" />
            </div>
            <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-7 w-24 rounded-full bg-slate-700/40" />)}
            </div>
            <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 w-full rounded-xl bg-slate-700/40" />)}
            </div>
        </div>
    );
}

const sectionLabel = "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400";
const cardBg = "rounded-xl bg-slate-800/50 p-3 border border-slate-700/30";

function FounderContent({ founder }: { founder: FounderData }) {
    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div className="relative flex-shrink-0">
                    <div className="h-24 w-24 overflow-hidden rounded-2xl ring-4 ring-blue-500/20 shadow-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                        {founder.photoUrl ? (
                            <img src={founder.photoUrl} alt={founder.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="text-3xl font-bold text-blue-400">{founder.name.charAt(0)}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                    <h2 id="founder-panel-title" className="text-xl font-extrabold text-white sm:text-2xl">{founder.name}</h2>
                    {founder.role && <p className="mt-0.5 text-sm font-bold text-blue-400">{founder.role}</p>}
                    {founder.tagline && (
                        <div className="mt-2 flex items-start justify-center gap-1.5 sm:justify-start">
                            <Quote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500/50" />
                            <p className="text-xs italic text-slate-400">{founder.tagline}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── About ── */}
            {founder.aboutText && (
                <p className="text-sm leading-relaxed text-slate-300">{founder.aboutText}</p>
            )}

            {/* ── বাণী / Founder Message ── */}
            {founder.founderMessage && (
                <div className="relative rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-950/40 to-slate-900/60 p-5">
                    <Quote className="absolute right-4 top-4 h-8 w-8 text-blue-500/10" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-1 w-6 rounded-full bg-blue-500" />
                        <h3 className={sectionLabel}>প্রতিষ্ঠাতার বাণী</h3>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300 italic">{founder.founderMessage}</p>
                </div>
            )}

            {/* ── Location ── */}
            {founder.location && (
                <div className="flex items-start gap-2.5 text-sm text-slate-400">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                    <span>{founder.location}</span>
                </div>
            )}

            {/* ── Personal Details ── */}
            {(founder.fatherName || founder.dateOfBirth || founder.gender || founder.address) && (
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-blue-400" />
                        <h3 className={sectionLabel}>ব্যক্তিগত তথ্য</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {founder.fatherName && (
                            <div className={cardBg}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">পিতার নাম</p>
                                <p className="mt-0.5 text-sm text-slate-200">{founder.fatherName}</p>
                            </div>
                        )}
                        {founder.dateOfBirth && (
                            <div className={cardBg}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">জন্ম তারিখ</p>
                                <p className="mt-0.5 text-sm text-slate-200">{founder.dateOfBirth}</p>
                            </div>
                        )}
                        {founder.gender && (
                            <div className={cardBg}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">লিঙ্গ</p>
                                <p className="mt-0.5 text-sm text-slate-200">{founder.gender}</p>
                            </div>
                        )}
                        {founder.address && (
                            <div className={`${cardBg} sm:col-span-2`}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">স্থায়ী ঠিকানা</p>
                                <p className="mt-0.5 text-sm text-slate-200">{founder.address}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Contact ── */}
            {founder.contactDetails && (founder.contactDetails.phones?.length > 0 || founder.contactDetails.email || founder.contactDetails.website) && (
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-blue-400" />
                        <h3 className={sectionLabel}>যোগাযোগ</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {founder.contactDetails.phones?.map((phone, idx) => (
                            <a key={idx} href={`tel:${phone.replace(/\s/g, '')}`} className={`${cardBg} flex items-center gap-2.5 transition-colors hover:border-blue-500/30`}>
                                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-sm text-slate-200">{phone}</span>
                            </a>
                        ))}
                        {founder.contactDetails.email && (
                            <a href={`mailto:${founder.contactDetails.email}`} className={`${cardBg} flex items-center gap-2.5 transition-colors hover:border-blue-500/30`}>
                                <Mail className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-sm text-slate-200 break-all">{founder.contactDetails.email}</span>
                            </a>
                        )}
                        {founder.contactDetails.website && (
                            <a href={founder.contactDetails.website.startsWith('http') ? founder.contactDetails.website : `https://${founder.contactDetails.website}`} target="_blank" rel="noopener noreferrer" className={`${cardBg} flex items-center gap-2.5 transition-colors hover:border-blue-500/30`}>
                                <Globe className="h-3.5 w-3.5 text-cyan-400" />
                                <span className="text-sm text-slate-200">{founder.contactDetails.website}</span>
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* ── Skills ── */}
            {founder.skills?.length > 0 && (
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                        <h3 className={sectionLabel}>দক্ষতা</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {founder.skills.map((skill, idx) => (
                            <span key={idx} className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Education Timeline ── */}
            {founder.education?.length > 0 && (
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-blue-400" />
                        <h3 className={sectionLabel}>শিক্ষাগত যোগ্যতা</h3>
                    </div>
                    <div className="relative ml-2 border-l-2 border-blue-500/20 pl-5 space-y-3">
                        {founder.education.map((edu, idx) => (
                            <div key={idx} className="relative">
                                <div className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-blue-400 bg-slate-900" />
                                <div className={cardBg}>
                                    <p className="text-sm font-bold text-white">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
                                    <p className="mt-0.5 text-xs text-slate-400">{edu.institution}</p>
                                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                                        <Calendar className="h-3 w-3" />
                                        <span>{edu.startYear}{edu.endYear ? ` – ${edu.endYear}` : ' – Present'}</span>
                                    </div>
                                    {edu.description && <p className="mt-1 text-xs text-slate-400">{edu.description}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Experience ── */}
            {founder.experience?.length > 0 && (
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-blue-400" />
                        <h3 className={sectionLabel}>অভিজ্ঞতা</h3>
                    </div>
                    <div className="relative ml-2 border-l-2 border-cyan-500/20 pl-5 space-y-3">
                        {founder.experience.map((exp, idx) => (
                            <div key={idx} className="relative">
                                <div className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-cyan-400 bg-slate-900" />
                                <div className={cardBg}>
                                    <p className="text-sm font-bold text-white">{exp.role}</p>
                                    <p className="mt-0.5 text-xs text-slate-400">{exp.company}</p>
                                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                                        <Calendar className="h-3 w-3" />
                                        <span>{exp.startYear}{exp.current ? ' – Present' : exp.endYear ? ` – ${exp.endYear}` : ''}</span>
                                    </div>
                                    {exp.description && <p className="mt-1 text-xs text-slate-400">{exp.description}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function FounderPanel({ open, onClose }: FounderPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    const { data: founder, isLoading } = useQuery<FounderData>({
        queryKey: ['founder'],
        queryFn: async () => {
            const res = await api.get('/founder');
            return res.data;
        },
        enabled: open,
        staleTime: 60_000,
    });

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key !== 'Tab') return;
            const panel = panelRef.current;
            if (!panel) return;
            const focusable = panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (!open) return;
        document.addEventListener('keydown', handleKeyDown);
        const timer = setTimeout(() => {
            const panel = panelRef.current;
            if (!panel) return;
            const firstFocusable = panel.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            firstFocusable?.focus();
        }, 50);
        return () => { document.removeEventListener('keydown', handleKeyDown); clearTimeout(timer); };
    }, [open, handleKeyDown]);

    return (
        <AnimatePresence>
            {open && (
                <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="founder-panel-title" className="fixed inset-0 z-[9999] flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="relative z-10 mx-4 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-700/50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-[0_32px_80px_rgba(0,0,0,0.5)] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50"
                    >
                        {/* Top accent */}
                        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 rounded-t-3xl" />

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-3 top-4 z-20 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                            aria-label="Close founder panel"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="p-6 sm:p-7">
                            {isLoading || !founder ? <SkeletonLoader /> : <FounderContent founder={founder} />}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
