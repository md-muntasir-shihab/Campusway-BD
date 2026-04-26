import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface HeroSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
    className?: string;
    /** Show a subtle loading spinner while results are being fetched */
    loading?: boolean;
    /** Auto-focus the input on mount (default: false) */
    autoFocus?: boolean;
}

export default function HeroSearchInput({
    value,
    onChange,
    onSubmit,
    placeholder = 'Search...',
    className = '',
    loading = false,
    autoFocus = false,
}: HeroSearchInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [focused, setFocused] = useState(false);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.();
    }, [onSubmit]);

    const handleClear = useCallback(() => {
        onChange('');
        inputRef.current?.focus();
    }, [onChange]);

    // Keyboard shortcut: "/" to focus search when not already focused
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === '/' && !focused
                && document.activeElement?.tagName !== 'INPUT'
                && document.activeElement?.tagName !== 'TEXTAREA'
                && !document.activeElement?.getAttribute('contenteditable')
            ) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [focused]);

    return (
        <form onSubmit={handleSubmit} className={`w-full max-w-xl mx-auto ${className}`} role="search">
            <div
                className={`relative group transition-all duration-300 ${focused
                        ? 'scale-[1.02] drop-shadow-[0_8px_30px_rgba(255,255,255,0.08)]'
                        : ''
                    }`}
            >
                {/* Search icon / loading spinner */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    {loading ? (
                        <Loader2 className="h-5 w-5 text-white/60 animate-spin" aria-hidden="true" />
                    ) : (
                        <Search
                            className={`h-5 w-5 transition-colors duration-200 ${focused ? 'text-white/90' : 'text-white/40'
                                }`}
                            aria-hidden="true"
                        />
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    className={`
                        w-full rounded-2xl border py-3 sm:py-3.5 pl-12 pr-20 text-sm text-white
                        placeholder-white/40 outline-none transition-all duration-300
                        backdrop-blur-md shadow-lg shadow-black/10
                        ${focused
                            ? 'border-white/30 bg-white/[0.18] ring-2 ring-white/15 placeholder-white/55'
                            : 'border-white/15 bg-white/10 hover:border-white/20 hover:bg-white/[0.12]'
                        }
                    `}
                />

                {/* Right side: clear button + keyboard hint */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {value ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="rounded-full p-1.5 text-white/40 hover:text-white/90 hover:bg-white/15 transition-all duration-200 active:scale-90"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    ) : !focused ? (
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-white/15 bg-white/[0.08] px-2 py-1 text-[10px] font-medium text-white/35 select-none">
                            /
                        </kbd>
                    ) : null}
                </div>

                {/* Animated bottom glow line */}
                <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-all duration-500 ${focused ? 'w-4/5 opacity-100' : 'w-0 opacity-0'
                        }`}
                />
            </div>
        </form>
    );
}
