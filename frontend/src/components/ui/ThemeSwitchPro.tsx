import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

type ThemeSwitchProProps = {
    className?: string;
    /** @deprecated Use the hook directly; these props are ignored now */
    checked?: boolean;
    /** @deprecated Use the hook directly; these props are ignored now */
    onToggle?: () => void;
};

const MODE_ICONS = {
    light: Sun,
    dark: Moon,
    system: Monitor,
} as const;

const MODE_LABELS = {
    light: 'Light mode',
    dark: 'Dark mode',
    system: 'System theme',
} as const;

export default function ThemeSwitchPro({ className = '' }: ThemeSwitchProProps) {
    const { theme, toggleDarkMode } = useTheme();
    const Icon = MODE_ICONS[theme];

    return (
        <button
            type="button"
            onClick={toggleDarkMode}
            data-testid="theme-toggle"
            aria-label={MODE_LABELS[theme]}
            title={MODE_LABELS[theme]}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:border-primary/50 hover:text-primary ${className}`}
            style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--muted)',
            }}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}
