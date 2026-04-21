import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface LegalPageData {
    slug: string;
    title: string;
    htmlContent: string;
    metaTitle: string;
    metaDescription: string;
}

function LegalPageSkeleton() {
    return (
        <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
                <div className="skeleton h-10 w-2/3 rounded-xl" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-2/3 rounded" />
            </div>
        </div>
    );
}

export default function LegalPageView() {
    const { slug: paramSlug } = useParams<{ slug: string }>();
    const location = useLocation();
    // Derive slug from route param or from the pathname (e.g. "/about" → "about")
    const slug = paramSlug || location.pathname.replace(/^\//, '').split('/')[0] || undefined;

    const { data, isLoading, isError } = useQuery<LegalPageData>({
        queryKey: ['legal-page', slug],
        queryFn: () => api.get(`/legal-pages/${slug}`).then((r) => r.data),
        enabled: Boolean(slug),
        staleTime: 60_000,
    });

    const sanitizedHtml = useMemo(
        () => DOMPurify.sanitize(String(data?.htmlContent ?? ''), { USE_PROFILES: { html: true } }),
        [data?.htmlContent],
    );

    useEffect(() => {
        if (data?.metaTitle) {
            document.title = data.metaTitle;
        }
    }, [data?.metaTitle]);

    if (isLoading) return <LegalPageSkeleton />;

    if (isError || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-warning/10">
                        <AlertCircle className="h-10 w-10 text-warning" />
                    </div>
                    <h1 className="text-2xl font-bold text-text dark:text-dark-text mb-3">Page not found</h1>
                    <p className="text-sm text-text-muted dark:text-dark-text/60 mb-8">
                        The page you're looking for doesn't exist or has been removed.
                    </p>
                    <Link to="/" className="btn-primary inline-flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
                <h1 className="text-3xl font-bold text-text dark:text-dark-text sm:text-4xl">
                    {data.title}
                </h1>
                <div
                    className="prose prose-slate mt-8 max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
            </div>
        </div>
    );
}
