import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';

type AchievementPopupCardProps = {
    open: boolean;
    onClose: () => void;
    score: number;
    rank?: number | null;
    message: string;
    showForSec?: number;
    dismissible?: boolean;
};

export default function AchievementPopupCard({
    open,
    onClose,
    score,
    rank,
    message,
    showForSec = 10,
    dismissible = true,
}: AchievementPopupCardProps) {
    const [visible, setVisible] = useState(open);

    useEffect(() => {
        setVisible(open);
    }, [open]);

    useEffect(() => {
        if (!visible) return;
        const timer = window.setTimeout(() => {
            setVisible(false);
            onClose();
        }, Math.max(3, showForSec) * 1000);
        return () => window.clearTimeout(timer);
    }, [visible, showForSec, onClose]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-700 to-indigo-900 p-6 text-white shadow-2xl">
                {dismissible ? (
                    <button
                        type="button"
                        onClick={() => {
                            setVisible(false);
                            onClose();
                        }}
                        className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 hover:bg-white/20"
                        aria-label="Close celebration popup"
                    >
                        <X className="h-4 w-4" />
                    </button>
                ) : null}

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                    <Trophy className="h-8 w-8 text-amber-300" />
                </div>

                <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200">Achievement Unlocked</p>
                <h3 className="mt-2 text-center text-2xl font-black">Great Result!</h3>

                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-fuchsia-200">Score</p>
                        <p className="text-xl font-black">{Math.round(score)}%</p>
                    </div>
                    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-fuchsia-200">Best Rank</p>
                        <p className="text-xl font-black">{rank ? `#${rank}` : '-'}</p>
                    </div>
                </div>

                <p className="mt-4 text-center text-sm text-fuchsia-100">{message}</p>
            </div>
        </div>
    );
}
