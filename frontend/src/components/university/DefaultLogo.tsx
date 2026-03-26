import { getUniversityFallbackTextSizeClass } from '../../lib/universityPresentation';

interface DefaultLogoProps {
    fallbackText: string;
    className?: string;
    /** Override text size class (default: text-xl) */
    textClassName?: string;
}

export default function DefaultLogo({ fallbackText, className = '', textClassName }: DefaultLogoProps) {
    const effectiveTextClassName = textClassName || getUniversityFallbackTextSizeClass(fallbackText);

    return (
        <div
            className={`flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 ${className}`}
            data-testid="university-fallback-logo"
        >
            <span
                className={`${effectiveTextClassName} max-w-full break-all px-1 text-center font-black leading-none tracking-tight text-primary select-none dark:text-primary/90`}
                title={fallbackText}
            >
                {fallbackText}
            </span>
        </div>
    );
}
