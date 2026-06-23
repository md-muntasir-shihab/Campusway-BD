import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { buildMediaUrl } from '../../utils/mediaUrl';

interface MediaImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    /** Raw media path/URL (relative upload path, absolute URL, or empty). */
    src: string | null | undefined;
    /** Rendered when src is empty or the image fails to load. */
    fallback: ReactNode;
}

/**
 * Image that resolves upload/logo paths via buildMediaUrl (so they work in
 * production across the frontend/backend domains) and shows `fallback` when
 * the source is empty or fails to load — instead of a broken image / alt text.
 */
export default function MediaImage({ src, fallback, alt = '', ...rest }: MediaImageProps) {
    const resolved = src && src.trim() ? buildMediaUrl(src) : '';
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [resolved]);

    if (!resolved || failed) {
        return <>{fallback}</>;
    }

    return <img src={resolved} alt={alt} onError={() => setFailed(true)} {...rest} />;
}
