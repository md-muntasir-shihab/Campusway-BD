import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Quote, GraduationCap, Sparkles, Award } from 'lucide-react';
import { getPublicTestimonials } from '../../services/api';

interface Testimonial {
    _id: string; name: string; role: string; university?: string; department?: string;
    batch?: string; location?: string; avatarUrl?: string; shortQuote?: string;
    fullQuote: string; rating: number; category?: string; featured?: boolean; socialProofLabel?: string;
}

const AVATAR_GRADIENTS = [
    'from-indigo-500 to-cyan-500', 'from-violet-500 to-fuchsia-500', 'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500', 'from-sky-500 to-blue-500',
];
const CARD_GLOWS = [
    'hover:shadow-indigo-500/10', 'hover:shadow-violet-500/10', 'hover:shadow-amber-500/10',
    'hover:shadow-emerald-500/10', 'hover:shadow-rose-500/10', 'hover:shadow-sky-500/10',
];

export default function TestimonialsSection() {
    const { data, isLoading } = useQuery({
        queryKey: ['public-testimonials'],
        queryFn: async () => {
            const res = await getPublicTestimonials();
            const p = res.data as any;
            return (p.items || (Array.isArray(p) ? p : [])) as Testimonial[];
        },
        staleTime: 5 * 60_000,
    });
    const items = data || [];
    if (!isLoading && items.length === 0) return null;

    return (
        <section className="section-container">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                            <Quote className="h-6 w-6 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-text dark:text-dark-text tracking-tight">Student Voices</h2>
                        <p className="text-sm text-text-muted dark:text-dark-text/50 mt-0.5">What our students say about CampusWay</p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{items.length} Reviews</span>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-surface2 dark:bg-slate-800/40 animate-pulse" />)}
                </div>
            ) : (
                <motion.div initial="hidden" animate="show"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((t, idx) => {
                        const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                        const glow = CARD_GLOWS[idx % CARD_GLOWS.length];
                        return (
                            <motion.div key={t._id}
                                variants={{ hidden: { opacity: 0, y: 24, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1 } }}
                                className={`group relative rounded-3xl border border-card-border/50 dark:border-white/[0.06] bg-white dark:bg-slate-900/70 backdrop-blur-xl p-7 shadow-sm hover:shadow-2xl ${glow} transition-all duration-500 hover:-translate-y-1 overflow-hidden`}>
                                {t.featured && (
                                    <div className="absolute top-4 left-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 shadow-lg shadow-amber-500/30 z-10">
                                        <Award className="h-3 w-3 text-white" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Featured</span>
                                    </div>
                                )}
                                <div className="absolute top-5 right-5 z-0">
                                    <Quote className="h-16 w-16 text-primary/[0.04] dark:text-white/[0.03] group-hover:text-primary/[0.08] dark:group-hover:text-white/[0.06] transition-colors duration-500" />
                                </div>
                                <div className="flex gap-1 mb-5 relative z-10">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} className={`h-[18px] w-[18px] transition-transform duration-300 ${i < t.rating ? 'text-amber-400 fill-amber-400 group-hover:scale-110' : 'text-slate-200 dark:text-slate-700'}`}
                                            style={{ transitionDelay: `${i * 50}ms` }} />
                                    ))}
                                    {t.socialProofLabel && (
                                        <span className="ml-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">{t.socialProofLabel}</span>
                                    )}
                                </div>
                                <blockquote className="relative z-10 mb-6">
                                    <p className="text-[15px] leading-[1.75] text-text/85 dark:text-dark-text/80 font-medium line-clamp-4">&ldquo;{t.shortQuote || t.fullQuote}&rdquo;</p>
                                </blockquote>
                                <div className="relative z-10 flex items-center gap-3.5 pt-5 border-t border-card-border/30 dark:border-white/[0.04]">
                                    {t.avatarUrl ? (
                                        <img src={t.avatarUrl} alt={t.name} className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-md" />
                                    ) : (
                                        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-base font-black shadow-lg`}>{t.name.charAt(0)}</div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-text dark:text-dark-text truncate">{t.name}</p>
                                        <div className="flex items-center gap-1.5 text-[11px] text-text-muted dark:text-dark-text/45 mt-0.5">
                                            <span className="font-medium">{t.role}</span>
                                            {t.university && (<><span className="text-primary/40">•</span><span className="flex items-center gap-1 truncate"><GraduationCap className="h-3 w-3 flex-shrink-0 text-primary/50" /><span className="truncate">{t.university}</span></span></>)}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </section>
    );
}
