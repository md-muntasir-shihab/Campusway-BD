import { type ReactNode } from 'react';

/* ── Skeleton Variants ── */

export type SkeletonVariant = 'card' | 'table-row' | 'text-line';

export interface SkeletonProps {
    variant: SkeletonVariant;
    count?: number;
    className?: string;
}

/**
 * Base shimmer class shared across all skeleton variants.
 * Uses CSS custom properties from ThemeProvider for dark mode support.
 */
const shimmer =
    'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full ' +
    'before:animate-shimmer before:bg-gradient-to-r before:from-transparent ' +
    'before:via-white/20 dark:before:via-white/5 before:to-transparent';

const variantStyles: Record<SkeletonVariant, string> = {
    card: `rounded-2xl h-48 bg-[var(--border)] dark:bg-[var(--surface2)] ${shimmer}`,
    'table-row': `rounded-lg h-12 bg-[var(--border)] dark:bg-[var(--surface2)] ${shimmer}`,
    'text-line': `rounded h-4 bg-[var(--border)] dark:bg-[var(--surface2)] ${shimmer}`,
};

/**
 * Skeleton placeholder component with card, table-row, and text-line variants.
 * Supports dark mode via CSS custom properties inherited from ThemeProvider.
 */
export function Skeleton({ variant, count = 1, className = '' }: SkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={`${variantStyles[variant]} ${className}`}
                    style={{ animationDelay: `${i * 120}ms` }}
                    aria-hidden="true"
                />
            ))}
        </>
    );
}

/* ── LoadingState Wrapper ── */

export interface LoadingStateProps {
    isLoading: boolean;
    skeleton: SkeletonVariant;
    count?: number;
    children: ReactNode;
    className?: string;
}

/**
 * Wrapper that shows skeleton placeholders while data queries are pending.
 * Renders children once loading completes.
 */
export function LoadingState({
    isLoading,
    skeleton,
    count = 3,
    children,
    className = '',
}: LoadingStateProps) {
    if (isLoading) {
        return (
            <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
                <Skeleton variant={skeleton} count={count} />
                <span className="sr-only">Loading…</span>
            </div>
        );
    }

    return <>{children}</>;
}

/* ── ProgressBar ── */

export interface ProgressBarProps {
    isActive?: boolean;
}

/**
 * Thin progress bar shown at the top of the page during route transitions.
 * Uses CSS custom properties for theming.
 */
export function ProgressBar({ isActive = true }: ProgressBarProps) {
    if (!isActive) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden"
            role="progressbar"
            aria-label="Page loading"
        >
            <div
                className="h-full animate-progress-bar rounded-r"
                style={{ backgroundColor: 'var(--primary)' }}
            />
        </div>
    );
}

export default Skeleton;
