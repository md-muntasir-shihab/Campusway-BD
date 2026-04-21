import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowLeft,
    Award,
    Bell,
    BookOpen,
    CheckCircle2,
    Database,
    Eye,
    FileText,
    Globe,
    GraduationCap,
    Heart,
    Info,
    Lock,
    Mail,
    Shield,
    Sparkles,
    Target,
    Users,
} from 'lucide-react';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';
import { mergeWebsiteStaticPages, sortByOrder } from '../../lib/websiteStaticPages';
import PageHeroBanner from '../common/PageHeroBanner';
import { usePageHeroSettings } from '../../hooks/usePageHeroSettings';
import type { PageHeroKey } from '../../services/api';

type StaticPageKey = 'about' | 'terms' | 'privacy';

const PAGE_HERO_KEY_MAP: Record<StaticPageKey, PageHeroKey> = {
    about: 'about',
    terms: 'terms',
    privacy: 'privacy',
};

const ICON_MAP = {
    info: Info,
    target: Target,
    globe: Globe,
    heart: Heart,
    'graduation-cap': GraduationCap,
    'book-open': BookOpen,
    users: Users,
    award: Award,
    'file-text': FileText,
    shield: Shield,
    'alert-triangle': AlertTriangle,
    mail: Mail,
    eye: Eye,
    database: Database,
    lock: Lock,
    bell: Bell,
} as const;

const TONE_BG_MAP = {
    neutral: 'bg-slate-100 dark:bg-slate-800/60',
    info: 'bg-blue-50 dark:bg-blue-950/40',
    success: 'bg-emerald-50 dark:bg-emerald-950/40',
    warning: 'bg-amber-50 dark:bg-amber-950/40',
    accent: 'bg-violet-50 dark:bg-violet-950/40',
} as const;

const TONE_ICON_BG_MAP = {
    neutral: 'from-slate-500 to-slate-700',
    info: 'from-blue-500 to-indigo-600',
    success: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-600',
    accent: 'from-violet-500 to-fuchsia-600',
} as const;

const TONE_BORDER_MAP = {
    neutral: 'border-slate-200/60 dark:border-slate-700/40',
    info: 'border-blue-200/60 dark:border-blue-800/30',
    success: 'border-emerald-200/60 dark:border-emerald-800/30',
    warning: 'border-amber-200/60 dark:border-amber-800/30',
    accent: 'border-violet-200/60 dark:border-violet-800/30',
} as const;

function getIcon(iconKey: string) {
    return ICON_MAP[iconKey as keyof typeof ICON_MAP] || Info;
}

const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    }),
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    }),
};

type StaticContentPageProps = { page: StaticPageKey };

/* ── Main Page Component ── */
export default function StaticContentPage({ page }: StaticContentPageProps) {
    const { data: websiteSettings } = useWebsiteSettings();
    const staticPages = mergeWebsiteStaticPages(websiteSettings?.staticPages);
    const pageConfig = staticPages[page];
    const sortedSections = sortByOrder(pageConfig.sections.filter((item) => item.enabled));
    const featureCards = page === 'about'
        ? sortByOrder(staticPages.about.featureCards.filter((item) => item.enabled))
        : [];
    const isAboutPage = page === 'about';
    const heroKey = PAGE_HERO_KEY_MAP[page];
    const hero = usePageHeroSettings(heroKey);

    return (
        <div className="min-h-screen">
            {hero.enabled && (
                <PageHeroBanner
                    title={hero.title}
                    subtitle={hero.subtitle}
                    pillText={hero.pillText}
                    vantaEffect={hero.vantaEffect}
                    vantaColor={hero.vantaColor}
                    vantaBackgroundColor={hero.vantaBackgroundColor}
                    gradientFrom={hero.gradientFrom}
                    gradientTo={hero.gradientTo}
                    primaryCTA={hero.primaryCTA}
                    secondaryCTA={hero.secondaryCTA}
                />
            )}

            <div className="section-container py-12 lg:py-16">
                <div className={isAboutPage ? 'space-y-16' : 'mx-auto max-w-4xl space-y-8'}>

                    {pageConfig.lastUpdatedLabel && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6 }}
                            className="text-center text-xs uppercase tracking-[0.22em] text-text-muted dark:text-dark-text/50"
                        >
                            {pageConfig.lastUpdatedLabel}
                        </motion.p>
                    )}

                    {isAboutPage && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="mx-auto max-w-3xl text-center"
                        >
                            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary dark:bg-primary/20 mb-4">
                                <Sparkles className="h-3.5 w-3.5" />
                                {pageConfig.eyebrow}
                            </span>
                            <h2 className="text-3xl font-extrabold tracking-tight text-text dark:text-dark-text sm:text-4xl lg:text-5xl">
                                {pageConfig.title}
                            </h2>
                            <p className="mt-4 text-base leading-relaxed text-text-muted dark:text-dark-text/60 sm:text-lg">
                                {pageConfig.subtitle}
                            </p>
                        </motion.div>
                    )}

                    {/* Sections */}
                    <div className={isAboutPage ? 'grid gap-6 md:grid-cols-2 lg:gap-8' : 'space-y-6'}>
                        {sortedSections.map((section, index) => {
                            const SectionIcon = getIcon(section.iconKey);
                            const toneBg = TONE_BG_MAP[section.tone] || TONE_BG_MAP.neutral;
                            const toneIconBg = TONE_ICON_BG_MAP[section.tone] || TONE_ICON_BG_MAP.neutral;
                            const toneBorder = TONE_BORDER_MAP[section.tone] || TONE_BORDER_MAP.neutral;
                            return (
                                <motion.section
                                    key={`${section.title}-${section.order}`}
                                    custom={index}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.2 }}
                                    variants={fadeUp}
                                    className={`group relative overflow-hidden rounded-2xl border ${toneBorder} ${toneBg} p-6 sm:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
                                >
                                    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl group-hover:opacity-[0.12] transition-opacity duration-500"
                                        style={{ backgroundImage: `linear-gradient(135deg, var(--color-primary), var(--color-primary-light, #60a5fa))` }} />
                                    <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${toneIconBg} shadow-lg shadow-black/10`}>
                                        <SectionIcon className="h-6 w-6 text-white" />
                                    </div>
                                    <h2 className="mb-3 text-xl font-bold text-text dark:text-dark-text">{section.title}</h2>
                                    <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted dark:text-dark-text/65">{section.body}</p>
                                    {section.bullets.length > 0 && (
                                        <ul className="mt-5 space-y-2.5">
                                            {section.bullets.map((bullet, bIdx) => (
                                                <li key={`bullet-${bIdx}`} className="flex items-start gap-2.5 text-sm text-text-muted dark:text-dark-text/65">
                                                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                                                    <span>{bullet}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </motion.section>
                            );
                        })}
                    </div>

                    {/* Feature Cards */}
                    {featureCards.length > 0 && (
                        <section className="space-y-8">
                            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center">
                                <h2 className="section-title">Platform Highlights</h2>
                                <p className="mx-auto mt-3 max-w-2xl text-sm text-text-muted dark:text-dark-text/60 sm:text-base">
                                    Everything you need for your academic journey — all in one place.
                                </p>
                            </motion.div>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                                {featureCards.map((card, index) => {
                                    const CardIcon = getIcon(card.iconKey);
                                    return (
                                        <motion.div
                                            key={`${card.title}-${card.order}`}
                                            custom={index}
                                            initial="hidden"
                                            whileInView="visible"
                                            viewport={{ once: true, amount: 0.15 }}
                                            variants={scaleIn}
                                            className="group relative overflow-hidden rounded-2xl border border-card-border bg-surface dark:bg-dark-surface p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/30"
                                        >
                                            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20 transition-transform duration-300 group-hover:scale-110">
                                                <CardIcon className="h-7 w-7 text-white" />
                                            </div>
                                            <h3 className="relative text-base font-bold text-text dark:text-dark-text">{card.title}</h3>
                                            <p className="relative mt-2 text-sm leading-relaxed text-text-muted dark:text-dark-text/60">{card.description}</p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Back link */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="pt-4 text-center"
                    >
                        <Link to={pageConfig.backLinkUrl || '/'} className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                            <ArrowLeft className="h-4 w-4" />
                            {pageConfig.backLinkLabel || 'Back to Home'}
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
