import { ApiExam, ApiExamSession } from '../../services/api';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';
import { CheckCircle, AlertTriangle, Maximize, Clock } from 'lucide-react';
import { buildMediaUrl } from '../../utils/mediaUrl';
import screenfull from 'screenfull';

interface Props {
    exam: ApiExam | null;
    session: ApiExamSession | null;
    timeLeftFormatted: string;
    isTimeUp: boolean;
    isSaving: boolean;
    isOffline?: boolean;
    answeredCount: number;
    totalQuestions: number;
    lastSavedAt?: string | null;
}

function formatSavedAgo(lastSavedAt?: string | null): string {
    if (!lastSavedAt) return 'Saved';
    const savedTs = new Date(lastSavedAt).getTime();
    if (!Number.isFinite(savedTs)) return 'Saved';
    const seconds = Math.max(0, Math.floor((Date.now() - savedTs) / 1000));
    return `Saved ${seconds}s ago`;
}

export default function ExamHeader({ exam, timeLeftFormatted, isTimeUp, isSaving, isOffline, answeredCount, totalQuestions, lastSavedAt }: Props) {
    const { data: settings } = useWebsiteSettings();

    const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    const toggleFullscreen = () => {
        if (screenfull.isEnabled) {
            screenfull.toggle();
        }
    };

    if (!exam) return null;

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={buildMediaUrl(settings?.logoUrl || settings?.logo || '/logo.svg')} alt="Logo" className="h-7 sm:h-8 w-auto object-contain shrink-0" />
                        <div className="min-w-0">
                            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{exam.title}</h1>
                            <p className="text-[11px] text-slate-500 truncate">
                                {exam.subject || 'General'} • Answered {answeredCount}/{totalQuestions}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        title="Toggle Fullscreen"
                        aria-label="Toggle Fullscreen"
                    >
                        <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className={`inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full font-mono text-base sm:text-lg font-bold border ${isTimeUp ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                        {timeLeftFormatted}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5">
                        <div className="min-w-[140px]">
                            <div className="text-[11px] font-medium text-slate-500 mb-1">
                                Progress {progressPercentage}%
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                            {isOffline ? (
                                <span className="flex items-center text-rose-500">
                                    <AlertTriangle className="w-4 h-4 mr-1 animate-pulse" /> Offline
                                </span>
                            ) : isSaving ? (
                                <span className="flex items-center text-amber-500">
                                    <AlertTriangle className="w-4 h-4 mr-1 animate-pulse" /> Saving
                                </span>
                            ) : (
                                <span className="flex items-center text-emerald-500">
                                    <CheckCircle className="w-4 h-4 mr-1" /> {formatSavedAgo(lastSavedAt)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
