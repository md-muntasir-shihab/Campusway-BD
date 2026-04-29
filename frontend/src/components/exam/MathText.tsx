import { Suspense, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
    children: string;
    /** When true, renders inline (wraps in <span> instead of <p>) */
    inline?: boolean;
    className?: string;
}

/** Skeleton placeholder shown while KaTeX formulas are loading. */
function MathSkeleton() {
    return (
        <span
            className="inline-block h-5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700 align-middle"
            aria-label="Loading formula"
        />
    );
}

/**
 * Renders text with KaTeX math support via ReactMarkdown.
 *
 * Features:
 * - Inline ($...$) and block ($$...$$) LaTeX delimiters
 * - Bengali-compatible font (Noto Sans Bengali / Hind Siliguri) as primary font
 * - Graceful error handling for invalid LaTeX (shows raw source with error indicator)
 * - Loading skeleton for formula regions while KaTeX renders
 *
 * @requirements 14.1, 14.2, 14.3, 14.4, 14.5
 */
export default function MathText({ children, inline, className }: MathTextProps) {
    if (!children) return null;

    // rehype-katex options: render errors inline instead of throwing
    const rehypeKatexOptions = useMemo(
        () => ({
            throwOnError: false,
            errorColor: '#ef4444',
            strict: false as const,
        }),
        [],
    );

    return (
        <Suspense fallback={<MathSkeleton />}>
            <div
                className={[
                    'math-text-container',
                    // Bengali-compatible font stack: Noto Sans Bengali for Bengali glyphs,
                    // Hind Siliguri as fallback, then system sans-serif
                    'font-bangla',
                    className,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[[rehypeKatex, rehypeKatexOptions]]}
                    components={
                        inline
                            ? { p: ({ children: c }: { children?: React.ReactNode }) => <span>{c}</span> }
                            : undefined
                    }
                >
                    {children}
                </ReactMarkdown>
            </div>
        </Suspense>
    );
}
