import { useEffect, useState } from 'react';
import DefaultLogo from './DefaultLogo';
import { buildUniversityLogoFallback, pickText } from '../../lib/universityPresentation';

interface UniversityLogoProps {
    name: string;
    shortForm?: string;
    logoUrl?: string;
    alt?: string;
    containerClassName?: string;
    imageClassName?: string;
    fallbackClassName?: string;
    fallbackTextClassName?: string;
}

function shouldForceFallback(logoUrl: string): boolean {
    const normalized = pickText(logoUrl);
    if (!normalized) return true;
    if (normalized.startsWith('data:') || normalized.startsWith('blob:') || normalized.startsWith('/')) return false;
    try {
        const parsed = new URL(normalized, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        const protocolAllowed = ['http:', 'https:'].includes(parsed.protocol);
        if (!protocolAllowed) return true;
        return parsed.hostname.endsWith('.local');
    } catch {
        return true;
    }
}

export default function UniversityLogo({
    name,
    shortForm = '',
    logoUrl = '',
    alt,
    containerClassName = '',
    imageClassName = 'h-full w-full object-contain',
    fallbackClassName = '',
    fallbackTextClassName,
}: UniversityLogoProps) {
    const normalizedLogoUrl = pickText(logoUrl);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [normalizedLogoUrl]);

    const fallbackText = buildUniversityLogoFallback(name, shortForm);
    const showImage = Boolean(normalizedLogoUrl) && !imageFailed && !shouldForceFallback(normalizedLogoUrl);

    return (
        <div className={containerClassName}>
            {showImage ? (
                <img
                    src={normalizedLogoUrl}
                    alt={alt || `${name} logo`}
                    className={imageClassName}
                    loading="lazy"
                    data-testid="university-image-logo"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <DefaultLogo
                    fallbackText={fallbackText}
                    className={fallbackClassName}
                    textClassName={fallbackTextClassName}
                />
            )}
        </div>
    );
}
