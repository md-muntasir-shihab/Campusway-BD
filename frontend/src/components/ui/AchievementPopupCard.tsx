import { useEffect, useState } from 'react';
import { Trophy, X, Sparkles, Target, TrendingUp } from 'lucide-react';
import FocusTrap from '../common/FocusTrap';

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
    open, onClose, score, rank, message, showForSec = 10, dismissible = true,
}: AchievementPopupCardProps) {
    const [visible, setVisible] = useState(false);
    const [render, setRender] = useState(false);

    useEffect(() => {
        if (open) { setRender(true); setTimeout(() => setVisible(true), 10); }
        else { setVisible(false); const t = setTimeout(() => setRender(false), 300); return () => clearTimeout(t); }
    }, [open]);

    useEffect(() => {
        if (!visible) return;
        const t = window.setTimeout(() => {
            setVisible(false);
            setTimeout(() => { setRender(false); onClose(); }, 300);
        }, Math.max(3, showForSec) * 1000);
        return () => window.clearTimeout(t);
    }, [visible, showForSec, onClose]);

    const close = () => { setVisible(false); setTimeout(() => { setRender(false); onClose(); }, 300); };
    if (!render) return null;

    const title = score >= 90 ? 'Outstanding!' : score >= 80 ? 'Excellent Work!' : score >= 60 ? 'Great Result!' : score >= 40 ? 'Good Effort!' : 'Keep Trying!';

    return (
        <div role="dialog" aria-modal="true" aria-label={`Achievement: ${title}`} className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 transition-all duration-500 backdrop-blur-[10px] ${visible ? 'opacity-100' : 'opacity-0'}`} onKeyDown={(e) => { if (e.key === 'Escape' && dismissible) close(); }}>
            <FocusTrap active={visible}>
                <div className={`relative w-full max-w-[360px] sm:max-w-md overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-b from-indigo-950 via-indigo-950 to-slate-950 p-6 sm:p-8 text-white shadow-[0_0_100px_rgba(79,70,229,0.3),0_25px_60px_rgba(0,0,0,0.4)] transition-all duration-500 transform ${visible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}`}>
                    {/* BG effects */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:20px_20px] opacity-20 mix-blend-overlay" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[140px] bg-gradient-to-b from-indigo-500/30 to-transparent blur-3xl opacity-60" />
                    <div className="absolute bottom-[-15%] left-[-5%] w-[110%] h-[40%] bg-gradient-to-t from-fuchsia-600/20 to-transparent blur-3xl rounded-full opacity-50" />
                    <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] border border-white/[0.08] pointer-events-none" />
                    <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] pointer-events-none" />

                    {dismissible && (
                        <button type="button" onClick={close} aria-label="Close achievement popup" className="absolute right-4 top-4 sm:right-5 sm:top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 hover:scale-110 transition-all text-slate-300 hover:text-white">
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    <div className="relative z-10 flex flex-col items-center">
                        {/* Trophy */}
                        <div className="relative mb-5 sm:mb-6">
                            <div className="absolute inset-[-8px] animate-ping rounded-full bg-amber-400/15 blur-md" style={{ animationDuration: '3s' }} />
                            <div className="absolute inset-[-60%] animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(251,191,36,0.4)_360deg)] opacity-30" style={{ animationDuration: '4s' }} />
                            <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 border-amber-300/25 bg-gradient-to-tr from-amber-500/15 to-fuchsia-500/15 shadow-[inset_0_2px_20px_rgba(251,191,36,0.1)] backdrop-blur-md">
                                <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/8 px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
                            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            Achievement Unlocked
                        </div>

                        <h3 className="mt-3 sm:mt-4 text-center text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">{title}</h3>
                        <p className="mt-1.5 sm:mt-2 text-center text-[13px] sm:text-[15px] font-medium leading-relaxed text-indigo-100/70 max-w-[280px] sm:max-w-none">{message}</p>

                        {/* Stats */}
                        <div className="mt-6 sm:mt-8 flex w-full flex-col gap-2.5 sm:gap-3">
                            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 sm:p-4 backdrop-blur-md transition-all hover:bg-white/[0.07]">
                                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-indigo-500/15 blur-2xl" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-500/15 text-indigo-300">
                                            <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400">Final Score</p>
                                            <div className="flex items-baseline gap-1 sm:gap-1.5 pt-0.5">
                                                <p className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">{Math.round(score)}</p>
                                                <span className="text-xs sm:text-sm font-medium text-slate-400">%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-400/15">
                                        <svg viewBox="0 0 36 36" className="h-full w-full rotate-[-90deg]">
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#818cf8" strokeWidth="3" strokeDasharray={`${Math.round(score)}, 100`} className="transition-all duration-1000 ease-out" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {rank ? (
                                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 sm:p-4 backdrop-blur-md transition-all hover:bg-white/[0.07]">
                                    <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-fuchsia-500/15 blur-2xl" />
                                    <div className="flex items-center gap-2.5 sm:gap-3 relative z-10">
                                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
                                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400">Rank Position</p>
                                            <div className="flex items-baseline gap-0.5 sm:gap-1 pt-0.5">
                                                <span className="text-xs sm:text-sm font-bold text-fuchsia-400 leading-none">#</span>
                                                <p className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">{rank}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <button onClick={close} className="mt-6 sm:mt-8 w-full rounded-xl sm:rounded-2xl bg-gradient-to-r from-white to-slate-100 px-5 py-3 sm:py-3.5 text-sm font-bold text-indigo-950 transition-all duration-300 hover:from-slate-100 hover:to-white hover:-translate-y-0.5 shadow-[0_4px_24px_rgba(255,255,255,0.08)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.15)] active:scale-[0.98]">
                            Continue
                        </button>
                    </div>
                </div>
            </FocusTrap>
        </div>
    );
}
