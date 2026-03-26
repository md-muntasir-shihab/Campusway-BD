import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeMode;
    resolvedTheme: 'light' | 'dark';
    setTheme: (mode: ThemeMode) => void;
    darkMode: boolean;
    toggleDarkMode: () => void;
}

const STORAGE_KEY = 'campusway_theme';
const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system'];

function getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && VALID_MODES.includes(stored as ThemeMode)) {
            return stored as ThemeMode;
        }
    } catch {
        // Ignore localStorage failures.
    }
    return 'system';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') return getSystemPreference();
    return mode;
}

function applyTheme(resolved: 'light' | 'dark') {
    const root = document.documentElement;
    if (resolved === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'system',
    resolvedTheme: 'dark',
    setTheme: () => {
        // no-op default
    },
    darkMode: true,
    toggleDarkMode: () => {
        // no-op default
    },
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(getStoredTheme()));

    const setTheme = useCallback((mode: ThemeMode) => {
        setThemeState(mode);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            // Ignore localStorage failures.
        }
        const resolved = resolveTheme(mode);
        setResolvedTheme(resolved);
        applyTheme(resolved);
    }, []);

    useLayoutEffect(() => {
        const resolved = resolveTheme(theme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
    }, [theme]);

    useEffect(() => {
        if (theme !== 'system') return;

        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            const resolved = resolveTheme('system');
            setResolvedTheme(resolved);
            applyTheme(resolved);
        };
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [theme]);

    const toggleDarkMode = useCallback(() => {
        setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
    }, [theme, setTheme]);

    const value = useMemo<ThemeContextType>(
        () => ({
            theme,
            resolvedTheme,
            setTheme,
            darkMode: resolvedTheme === 'dark',
            toggleDarkMode,
        }),
        [theme, resolvedTheme, setTheme, toggleDarkMode],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
