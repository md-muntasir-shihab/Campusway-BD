import { Link } from 'react-router-dom';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';

type AuthBrandHeaderProps = {
    subtitle: string;
    homeHref?: string;
};

export default function AuthBrandHeader({ subtitle, homeHref = '/' }: AuthBrandHeaderProps) {
    const { data: settings } = useWebsiteSettings();
    const siteName = String(
        settings?.websiteName || (settings as Record<string, unknown> | null)?.siteName || 'CampusWay'
    ).trim() || 'CampusWay';
    const logo = String(
        settings?.logo || (settings as Record<string, unknown> | null)?.logoUrl || '/logo.png'
    ).trim() || '/logo.png';

    return (
        <Link to={homeHref} className="mx-auto mb-8 flex w-fit flex-col items-center gap-2">
            <img
                src={logo}
                alt={siteName}
                className="h-14 w-auto max-w-[220px] object-contain"
                onError={(event) => {
                    const target = event.currentTarget;
                    if (target.src.endsWith('/logo.png')) return;
                    target.src = '/logo.png';
                }}
            />
            <div className="text-center">
                <p className="text-lg font-heading font-bold cw-text">{siteName}</p>
                <p className="text-xs font-semibold uppercase tracking-wider cw-muted">{subtitle}</p>
            </div>
        </Link>
    );
}

