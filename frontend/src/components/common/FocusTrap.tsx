import { useEffect, useRef, useCallback, type ReactNode } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface FocusTrapProps {
    children: ReactNode;
    /** Whether the trap is active. Defaults to true. */
    active?: boolean;
    /** Element to return focus to on unmount. Defaults to document.activeElement at mount time. */
    returnFocusTo?: HTMLElement | null;
    /** Additional class name for the wrapper div */
    className?: string;
}

/**
 * Traps keyboard focus within its children while active.
 * Returns focus to the previously-focused element on unmount.
 */
export default function FocusTrap({
    children,
    active = true,
    returnFocusTo,
    className,
}: FocusTrapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Capture the element that had focus before the trap mounted
    useEffect(() => {
        previousFocusRef.current =
            returnFocusTo ?? (document.activeElement as HTMLElement | null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-focus the first focusable element inside the trap
    useEffect(() => {
        if (!active || !containerRef.current) return;
        const first = containerRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (first) {
            // Small delay so the DOM is painted before we move focus
            requestAnimationFrame(() => first.focus());
        }
    }, [active]);

    // Return focus on unmount
    useEffect(() => {
        return () => {
            const target = returnFocusTo ?? previousFocusRef.current;
            if (target && typeof target.focus === 'function') {
                requestAnimationFrame(() => target.focus());
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!active || e.key !== 'Tab' || !containerRef.current) return;

            const focusable = Array.from(
                containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        },
        [active],
    );

    return (
        <div ref={containerRef} onKeyDown={handleKeyDown} className={className}>
            {children}
        </div>
    );
}
