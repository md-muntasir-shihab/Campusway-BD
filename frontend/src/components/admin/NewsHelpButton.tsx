import { useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleHelp, X } from 'lucide-react';

export interface NewsHelpButtonProps {
    title: string;
    content: string;
    impact?: string;
    affected?: string;
    publishNote?: string;
    publishSendNote?: string;
    enabledNote?: string;
    disabledNote?: string;
    bestPractice?: string;
    variant?: 'icon' | 'full';
}

export default function NewsHelpButton({
    title,
    content,
    impact,
    affected,
    publishNote,
    publishSendNote,
    enabledNote,
    disabledNote,
    bestPractice,
    variant = 'icon',
}: NewsHelpButtonProps) {
    const [open, setOpen] = useState(false);

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
    }

    function handleClose(event?: MouseEvent<HTMLElement>) {
        event?.preventDefault();
        event?.stopPropagation();
        setOpen(false);
    }

    return (
        <>
            <span className="inline-flex items-center gap-2">
                <button
                    type="button"
                    aria-label={`Help: ${title}`}
                    title={title}
                    onClick={handleOpen}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-500/20 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                >
                    <CircleHelp className="h-4 w-4" />
                </button>
                {variant === 'full' ? (
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300 transition hover:text-cyan-200"
                    >
                        View details
                    </button>
                ) : null}
            </span>

            <AnimatePresence>
                {open ? (
                    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] md:items-center">
                        <button
                            type="button"
                            aria-label="Close help panel"
                            className="absolute inset-0 cursor-default"
                            onClick={handleClose}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            transition={{ duration: 0.18 }}
                            className="relative z-[71] w-full max-w-2xl rounded-[1.75rem] border border-slate-200/80 bg-white/96 p-4 shadow-[0_30px_90px_rgba(2,6,23,0.28)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/96 md:p-5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                                        News control details
                                    </p>
                                    <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="mt-4 grid gap-3">
                                <Section label="What this does" tone="blue" value={content} />
                                {impact ? <Section label="Risk reduced" tone="amber" value={impact} /> : null}
                                {affected ? <Section label="Who is affected" tone="slate" value={affected} /> : null}
                                {publishNote ? <Section label="If published" tone="cyan" value={publishNote} /> : null}
                                {publishSendNote ? <Section label="If publish + send is used" tone="violet" value={publishSendNote} /> : null}
                                {enabledNote ? <Section label="If enabled" tone="emerald" value={enabledNote} /> : null}
                                {disabledNote ? <Section label="If disabled" tone="rose" value={disabledNote} /> : null}
                                {bestPractice ? <Section label="Best practice" tone="cyan" value={bestPractice} /> : null}
                            </div>
                        </motion.div>
                    </div>
                ) : null}
            </AnimatePresence>
        </>
    );
}

function Section({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: 'blue' | 'amber' | 'slate' | 'emerald' | 'rose' | 'cyan' | 'violet';
}) {
    const classes: Record<typeof tone, string> = {
        blue: 'border-blue-200/70 bg-blue-500/10 text-blue-900 dark:border-blue-900/40 dark:bg-blue-500/10 dark:text-blue-100',
        amber: 'border-amber-200/70 bg-amber-500/10 text-amber-900 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-100',
        slate: 'border-slate-200/70 bg-slate-100/90 text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200',
        emerald: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-100',
        rose: 'border-rose-200/70 bg-rose-500/10 text-rose-900 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-100',
        cyan: 'border-cyan-200/70 bg-cyan-500/10 text-cyan-900 dark:border-cyan-900/40 dark:bg-cyan-500/10 dark:text-cyan-100',
        violet: 'border-violet-200/70 bg-violet-500/10 text-violet-900 dark:border-violet-900/40 dark:bg-violet-500/10 dark:text-violet-100',
    };

    return (
        <div className={`rounded-2xl border p-3 ${classes[tone]}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">{label}</p>
            <p className="mt-1 text-sm leading-6">{value}</p>
        </div>
    );
}
