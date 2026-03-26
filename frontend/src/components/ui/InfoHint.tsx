import { CircleHelp } from 'lucide-react';

type InfoHintProps = {
    title: string;
    description?: string;
    className?: string;
};

export default function InfoHint({ title, description, className = '' }: InfoHintProps) {
    const message = description ? `${title} ${description}` : title;

    return (
        <span className={`group relative inline-flex ${className}`}>
            <button
                type="button"
                aria-label={message}
                title={message}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-cyan-500/45 bg-cyan-500/10 text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
                <CircleHelp className="h-3.5 w-3.5" />
            </button>
            <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-40 hidden w-64 -translate-x-1/2 rounded-xl border border-cyan-500/35 bg-slate-950/95 px-3 py-2 text-[11px] leading-relaxed text-slate-100 shadow-2xl group-hover:block group-focus-within:block">
                <strong className="block text-cyan-200">{title}</strong>
                {description ? <span className="mt-1 block text-slate-200">{description}</span> : null}
            </span>
        </span>
    );
}
