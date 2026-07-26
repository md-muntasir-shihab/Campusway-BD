import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { trackOpenPanelEvent } from '../../lib/openPanel';
import { ExternalLink, Sparkles } from 'lucide-react';

export interface AdCreativeData {
    _id: string;
    campaignId: string;
    placementSlug: string;
    variantName?: string;
    title: string;
    bodyText?: string;
    imageUrl?: string;
    targetUrl: string;
    callToAction?: string;
    sponsorName?: string;
    format: 'banner' | 'card' | 'native_card' | 'text_link' | 'modal_popup';
}

interface AdSlotProps {
    placementSlug: string;
    className?: string;
    fallbackComponent?: React.ReactNode;
    formatOverride?: 'banner' | 'card' | 'native';
}

export const AdSlot: React.FC<AdSlotProps> = ({
    placementSlug,
    className = '',
    fallbackComponent = null,
    formatOverride,
}) => {
    const [ad, setAd] = useState<AdCreativeData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(false);

        const fetchAd = async () => {
            try {
                const userAgent = navigator.userAgent.toLowerCase();
                const device = /mobile|android|iphone/i.test(userAgent) ? 'mobile' : 'desktop';
                
                const response = await api.get<{
                    success: boolean;
                    data: { served: boolean; creative?: AdCreativeData; impressionToken?: string };
                }>(`/ads/serve?placement=${encodeURIComponent(placementSlug)}&device=${device}`);

                if (isMounted) {
                    if (response.data?.success && response.data.data?.served && response.data.data.creative) {
                        setAd(response.data.data.creative);
                        trackOpenPanelEvent('native_ad_impression', {
                            creativeId: response.data.data.creative._id,
                            placementSlug,
                            title: response.data.data.creative.title,
                        });
                    } else {
                        setAd(null);
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        fetchAd();

        return () => {
            isMounted = false;
        };
    }, [placementSlug]);

    const handleClick = async () => {
        if (!ad) return;

        // Fire click tracking to backend asynchronously
        try {
            api.post(`/ads/click/${ad._id}`, { placementSlug });
            trackOpenPanelEvent('native_ad_click', {
                creativeId: ad._id,
                placementSlug,
                title: ad.title,
                targetUrl: ad.targetUrl,
            });
        } catch {
            // Ignore background click recording failures
        }

        if (ad.targetUrl) {
            window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
        }
    };

    if (loading) {
        return (
            <div className={`animate-pulse bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-4 min-h-[80px] flex items-center justify-center ${className}`}>
                <div className="flex items-center gap-2 text-emerald-400/60 text-xs font-mono">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading Partner Updates...</span>
                </div>
            </div>
        );
    }

    if (error || !ad) {
        return <>{fallbackComponent}</>;
    }

    const format = formatOverride || (ad.format === 'banner' ? 'banner' : 'card');

    if (format === 'banner') {
        return (
            <div
                onClick={handleClick}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/20 p-4 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer ${className}`}
            >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {ad.imageUrl && (
                        <div className="w-full sm:w-48 h-28 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0">
                            <img
                                src={ad.imageUrl}
                                alt={ad.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    )}
                    <div className="flex-1 space-y-1.5 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Sponsored
                            </span>
                            {ad.sponsorName && (
                                <span className="text-xs text-slate-400 font-medium">{ad.sponsorName}</span>
                            )}
                        </div>
                        <h4 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                            {ad.title}
                        </h4>
                        {ad.bodyText && <p className="text-xs text-slate-300 line-clamp-2">{ad.bodyText}</p>}
                    </div>
                    {ad.callToAction && (
                        <div className="flex-shrink-0">
                            <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-slate-950 group-hover:bg-emerald-400 transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                                <span>{ad.callToAction}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleClick}
            className={`group relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-800 p-4 transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-800/80 cursor-pointer ${className}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Sponsored • {ad.sponsorName || 'Campus Partner'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>

            {ad.imageUrl && (
                <div className="w-full h-36 rounded-lg overflow-hidden mb-3 bg-slate-950">
                    <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            )}

            <h5 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors mb-1">
                {ad.title}
            </h5>

            {ad.bodyText && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{ad.bodyText}</p>}

            {ad.callToAction && (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400 group-hover:underline gap-1">
                    {ad.callToAction} &rarr;
                </span>
            )}
        </div>
    );
};
