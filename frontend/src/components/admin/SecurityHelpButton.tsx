import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Info as InformationCircleIcon, X as XMarkIcon } from 'lucide-react';

export type SecurityHelpAction = {
    label: string;
    description: string;
};

export interface SecurityHelpButtonProps {
    title: string;
    content: string;
    impact?: string;
    affected?: string;
    enabledNote?: string;
    disabledNote?: string;
    bestPractice?: string;
    actions?: SecurityHelpAction[];
    variant?: 'icon' | 'full';
    accent?: 'cyan' | 'indigo';
    headingLabel?: string;
    actionLabel?: string;
}

const accentClasses = {
    cyan: {
        icon: 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-400 dark:text-slate-500 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-300',
        text: 'text-[11px] font-semibold uppercase tracking-wide text-cyan-600 transition hover:text-cyan-500 dark:text-cyan-300 dark:hover:text-cyan-200',
        badge: 'text-cyan-600 dark:text-cyan-300',
    },
    indigo: {
        icon: 'text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-500 dark:text-slate-500 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-300',
        text: 'text-[11px] font-semibold uppercase tracking-wide text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200',
        badge: 'text-indigo-600 dark:text-indigo-300',
    },
} as const;

export default function SecurityHelpButton({
    title,
    content,
    impact,
    affected,
    enabledNote,
    disabledNote,
    bestPractice,
    actions,
    variant = 'icon',
    accent = 'cyan',
    headingLabel = 'Security control details',
    actionLabel = 'View details',
}: SecurityHelpButtonProps) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 12, left: 12, ready: false });
    const anchorRef = useRef<HTMLSpanElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const classes = accentClasses[accent];

    const handleOpenToggle = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen((current) => !current);
    };

    const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
    };

    const handleClose = (event?: MouseEvent<HTMLElement>) => {
        event?.preventDefault();
        event?.stopPropagation();
        setOpen(false);
    };

    useLayoutEffect(() => {
        if (!open) return;
        if (typeof window === 'undefined') return;

        const updatePosition = () => {
            const anchor = anchorRef.current?.getBoundingClientRect();
            if (!anchor) return;

            const viewportPadding = 12;
            const estimatedWidth = Math.min(popoverRef.current?.offsetWidth || 336, window.innerWidth - viewportPadding * 2);
            const estimatedHeight = popoverRef.current?.offsetHeight || 0;
            const canPlaceAbove = estimatedHeight > 0 && anchor.top - estimatedHeight - 10 >= viewportPadding;
            const shouldPlaceAbove = estimatedHeight > 0 && anchor.bottom + estimatedHeight + 10 > window.innerHeight - viewportPadding && canPlaceAbove;
            const left = Math.min(Math.max(anchor.left, viewportPadding), Math.max(viewportPadding, window.innerWidth - estimatedWidth - viewportPadding));
            const nextTop = shouldPlaceAbove
                ? Math.max(viewportPadding, anchor.top - estimatedHeight - 10)
                : Math.max(viewportPadding, Math.min(anchor.bottom + 10, window.innerHeight - estimatedHeight - viewportPadding));

            setPosition({ top: nextTop, left, ready: true });
        };

        updatePosition();
        const rafId = window.requestAnimationFrame(updatePosition);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    const popover = open && typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
                <div className="fixed inset-0 z-[79]" onClick={() => setOpen(false)} />
                <motion.div
                    ref={popoverRef}
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: position.ready ? 1 : 0, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="fixed z-[80] w-[21rem] max-w-[calc(100vw-1.5rem)] rounded-[1.4rem] border border-slate-200/80 bg-white/96 p-4 text-sm leading-6 shadow-[0_24px_70px_rgba(2,6,23,0.22)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/96"
                    style={{ top: position.top, left: position.left }}
                >
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-950 dark:text-white">{title}</h4>
                            <p className={`mt-1 ${classes.badge} text-[11px] font-medium uppercase tracking-wide`}>
                                {headingLabel}
                            </p>
                        </div>
                        <button
                            title="Close help"
                            aria-label="Close help"
                            onClick={handleClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            type="button"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{content}</p>
                    {actions && actions.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-indigo-200/60 bg-indigo-500/10 p-3 dark:border-indigo-900/50 dark:bg-indigo-500/10">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-900/80 dark:text-indigo-100/80">Main actions</p>
                            <div className="mt-2 space-y-2">
                                {actions.map((action) => (
                                    <div key={action.label} className="rounded-xl border border-indigo-200/60 bg-white/70 px-3 py-2 dark:border-indigo-900/50 dark:bg-slate-950/40">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900 dark:text-indigo-100">{action.label}</p>
                                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{action.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {impact ? (
                        <div className="mt-3 rounded-xl border border-amber-200/60 bg-amber-500/10 p-3 dark:border-amber-900/50 dark:bg-amber-500/10">
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                <span className="font-semibold">Risk reduced:</span> {impact}
                            </p>
                        </div>
                    ) : null}
                    {affected ? (
                        <div className="mt-2 rounded-xl border border-slate-200/70 bg-slate-100/80 p-3 dark:border-slate-700/60 dark:bg-slate-950/70">
                            <p className="text-xs text-slate-700 dark:text-slate-300">
                                <span className="font-semibold">Who is affected:</span> {affected}
                            </p>
                        </div>
                    ) : null}
                    {enabledNote ? (
                        <div className="mt-2 rounded-xl border border-emerald-200/60 bg-emerald-500/10 p-3 dark:border-emerald-900/50 dark:bg-emerald-500/10">
                            <p className="text-xs text-emerald-800 dark:text-emerald-200">
                                <span className="font-semibold">If enabled:</span> {enabledNote}
                            </p>
                        </div>
                    ) : null}
                    {disabledNote ? (
                        <div className="mt-2 rounded-xl border border-rose-200/60 bg-rose-500/10 p-3 dark:border-rose-900/50 dark:bg-rose-500/10">
                            <p className="text-xs text-rose-800 dark:text-rose-200">
                                <span className="font-semibold">If disabled:</span> {disabledNote}
                            </p>
                        </div>
                    ) : null}
                    {bestPractice ? (
                        <div className="mt-2 rounded-xl border border-cyan-200/60 bg-cyan-500/10 p-3 dark:border-cyan-900/50 dark:bg-cyan-500/10">
                            <p className="text-xs text-cyan-800 dark:text-cyan-200">
                                <span className="font-semibold">Best practice:</span> {bestPractice}
                            </p>
                        </div>
                    ) : null}
                </motion.div>
            </AnimatePresence>,
            document.body,
        )
        : null;

    return (
        <>
            <span ref={anchorRef} className="inline-flex items-center gap-1.5 overflow-visible">
                <button
                    onClick={handleOpenToggle}
                    className={`rounded-full p-0.5 transition-colors ${classes.icon}`}
                    aria-label={`Help: ${title}`}
                    type="button"
                >
                    <InformationCircleIcon className="h-4 w-4" />
                </button>
                {variant === 'full' ? (
                    <button
                        type="button"
                        onClick={handleOpen}
                        className={classes.text}
                    >
                        {actionLabel}
                    </button>
                ) : null}
            </span>
            {popover}
        </>
    );
}
