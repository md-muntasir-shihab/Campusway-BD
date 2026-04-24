import { Search, X } from 'lucide-react';

interface HeroSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
    className?: string;
}

export default function HeroSearchInput({
    value,
    onChange,
    onSubmit,
    placeholder = 'Search...',
    className = '',
}: HeroSearchInputProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.();
    };

    return (
        <form onSubmit={handleSubmit} className={`w-full max-w-xl mx-auto ${className}`} role="search">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 group-focus-within:text-white/80 transition-colors pointer-events-none" aria-hidden="true" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md py-3 sm:py-3.5 pl-12 pr-10 text-sm text-white placeholder-white/40 outline-none transition-all focus:border-white/30 focus:bg-white/15 focus:ring-2 focus:ring-white/10 shadow-lg shadow-black/10"
                    autoComplete="off"
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                        aria-label="Clear search"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </form>
    );
}
