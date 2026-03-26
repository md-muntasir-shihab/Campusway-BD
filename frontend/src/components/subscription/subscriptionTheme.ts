export type SubscriptionThemeToken = {
    shell: string;
    glow: string;
    accent: string;
    cap: string;
    badge: string;
    pill: string;
    muted: string;
    strongText: string;
    featureYes: string;
    featureNo: string;
    cta: string;
    ctaSecondary: string;
    ring: string;
};

const THEME_MAP: Record<string, SubscriptionThemeToken> = {
    basic: {
        shell: 'from-fuchsia-600 via-violet-600 to-rose-500',
        glow: 'shadow-[0_28px_70px_rgba(162,28,175,0.34)]',
        accent: 'bg-white/16 text-white',
        cap: 'from-white via-white to-rose-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        badge: 'bg-rose-500/12 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
        pill: 'bg-white/14 text-white/90',
        muted: 'text-white/78',
        strongText: 'text-slate-950 dark:text-white',
        featureYes: 'border-white/15 bg-white/12 text-white',
        featureNo: 'border-white/12 bg-black/10 text-white/60',
        cta: 'bg-white text-fuchsia-700 hover:bg-rose-50',
        ctaSecondary: 'border-white/25 bg-white/10 text-white hover:bg-white/16',
        ring: 'ring-fuchsia-300/40',
    },
    standard: {
        shell: 'from-orange-500 via-rose-500 to-red-600',
        glow: 'shadow-[0_28px_70px_rgba(234,88,12,0.34)]',
        accent: 'bg-white/16 text-white',
        cap: 'from-white via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        badge: 'bg-orange-500/12 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200',
        pill: 'bg-white/14 text-white/90',
        muted: 'text-white/78',
        strongText: 'text-slate-950 dark:text-white',
        featureYes: 'border-white/15 bg-white/12 text-white',
        featureNo: 'border-white/12 bg-black/10 text-white/60',
        cta: 'bg-white text-orange-700 hover:bg-orange-50',
        ctaSecondary: 'border-white/25 bg-white/10 text-white hover:bg-white/16',
        ring: 'ring-orange-300/40',
    },
    premium: {
        shell: 'from-cyan-500 via-sky-500 to-emerald-500',
        glow: 'shadow-[0_30px_78px_rgba(6,182,212,0.34)]',
        accent: 'bg-slate-950/18 text-white',
        cap: 'from-white via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        badge: 'bg-cyan-500/12 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200',
        pill: 'bg-slate-950/14 text-white/90',
        muted: 'text-white/78',
        strongText: 'text-slate-950 dark:text-white',
        featureYes: 'border-white/15 bg-white/12 text-white',
        featureNo: 'border-white/12 bg-black/10 text-white/60',
        cta: 'bg-slate-950 text-white hover:bg-slate-900',
        ctaSecondary: 'border-white/25 bg-white/10 text-white hover:bg-white/16',
        ring: 'ring-cyan-300/40',
    },
    enterprise: {
        shell: 'from-slate-900 via-slate-800 to-amber-700',
        glow: 'shadow-[0_30px_78px_rgba(120,53,15,0.32)]',
        accent: 'bg-white/10 text-amber-50',
        cap: 'from-white via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        badge: 'bg-amber-500/12 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
        pill: 'bg-white/12 text-white/90',
        muted: 'text-white/72',
        strongText: 'text-slate-950 dark:text-white',
        featureYes: 'border-white/15 bg-white/10 text-white',
        featureNo: 'border-white/12 bg-black/18 text-white/60',
        cta: 'bg-amber-300 text-slate-950 hover:bg-amber-200',
        ctaSecondary: 'border-white/25 bg-white/10 text-white hover:bg-white/16',
        ring: 'ring-amber-300/40',
    },
    custom: {
        shell: 'from-slate-700 via-slate-800 to-slate-950',
        glow: 'shadow-[0_28px_70px_rgba(15,23,42,0.32)]',
        accent: 'bg-white/14 text-white',
        cap: 'from-white via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        badge: 'bg-slate-500/12 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200',
        pill: 'bg-white/12 text-white/90',
        muted: 'text-white/72',
        strongText: 'text-slate-950 dark:text-white',
        featureYes: 'border-white/15 bg-white/12 text-white',
        featureNo: 'border-white/12 bg-black/10 text-white/60',
        cta: 'bg-white text-slate-900 hover:bg-slate-100',
        ctaSecondary: 'border-white/25 bg-white/10 text-white hover:bg-white/16',
        ring: 'ring-slate-300/40',
    },
};

export function getSubscriptionTheme(themeKey?: string): SubscriptionThemeToken {
    return THEME_MAP[themeKey || 'basic'] || THEME_MAP.basic;
}
