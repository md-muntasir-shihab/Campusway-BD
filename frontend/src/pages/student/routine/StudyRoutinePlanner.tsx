import { useCallback, useMemo, useState } from 'react';
import {
    BookOpen,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Edit3,
    Loader2,
    Plus,
    Save,
    Target,
    Trash2,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useStudyRoutine,
    useUpdateRoutine,
} from '../../../hooks/useExamSystemQueries';
import type {
    DailySchedule,
    DayOfWeek,
    ExamCountdown,
    RoutineItem,
} from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_LABELS: Record<DayOfWeek, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const DAY_FULL_LABELS: Record<DayOfWeek, string> = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
    friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

function getTodayDay(): DayOfWeek {
    const dayIndex = new Date().getDay();
    const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[dayIndex] ?? 'monday';
}

function getDaysUntil(dateStr: string): number {
    const now = new Date();
    const target = new Date(dateStr);
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function AdherenceBar({ percentage }: { percentage: number }) {
    const color = percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-500" />
                    Adherence
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{percentage}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                <div className={`h-2.5 rounded-full ${color} transition-all duration-300`} style={{ width: `${Math.min(100, percentage)}%` }} />
            </div>
        </div>
    );
}

function ExamCountdownCard({ countdown }: { countdown: ExamCountdown }) {
    const daysLeft = getDaysUntil(countdown.examDate);
    const isUrgent = daysLeft <= 3;
    return (
        <div className={`rounded-lg border p-3 ${isUrgent ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <Calendar className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-red-500' : 'text-indigo-500'}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{countdown.examTitle}</span>
                </div>
                <span className={`text-sm font-bold shrink-0 ml-2 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {daysLeft === 0 ? 'Today!' : `${daysLeft}d`}
                </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(countdown.examDate).toLocaleDateString()}</p>
        </div>
    );
}

function TodayRoutine({ items, onToggle }: { items: RoutineItem[]; onToggle: (index: number) => void }) {
    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No items scheduled for today</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                Today&apos;s Routine
            </h3>
            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${item.completed ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                        <button
                            type="button"
                            onClick={() => onToggle(idx)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${item.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                            aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                            {item.completed && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${item.completed ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                {item.subject}{item.topic && <span className="text-slate-400 dark:text-slate-500"> · {item.topic}</span>}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{item.goal}</p>
                        </div>
                        {item.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ScheduleEditor({ schedule, onChange }: { schedule: DailySchedule[]; onChange: (updated: DailySchedule[]) => void }) {
    const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);

    const scheduleMap = useMemo(() => {
        const map = new Map<DayOfWeek, RoutineItem[]>();
        for (const entry of schedule) map.set(entry.day, entry.items);
        return map;
    }, [schedule]);

    const handleAddItem = (day: DayOfWeek) => {
        const items = [...(scheduleMap.get(day) ?? []), { subject: '', goal: '', completed: false }];
        onChange(DAYS.map((d) => ({ day: d, items: d === day ? items : (scheduleMap.get(d) ?? []) })));
    };

    const handleRemoveItem = (day: DayOfWeek, idx: number) => {
        const items = [...(scheduleMap.get(day) ?? [])];
        items.splice(idx, 1);
        onChange(DAYS.map((d) => ({ day: d, items: d === day ? items : (scheduleMap.get(d) ?? []) })));
    };

    const handleItemChange = (day: DayOfWeek, idx: number, field: keyof RoutineItem, value: string) => {
        const items = [...(scheduleMap.get(day) ?? [])];
        items[idx] = { ...items[idx], [field]: value };
        onChange(DAYS.map((d) => ({ day: d, items: d === day ? items : (scheduleMap.get(d) ?? []) })));
    };

    return (
        <div className="space-y-2">
            {DAYS.map((day) => {
                const items = scheduleMap.get(day) ?? [];
                const isExpanded = expandedDay === day;
                const isToday = day === getTodayDay();
                return (
                    <div key={day} className={`rounded-xl border ${isToday ? 'border-indigo-200 dark:border-indigo-800' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-900 overflow-hidden`}>
                        <button type="button" onClick={() => setExpandedDay(isExpanded ? null : day)} className="flex w-full items-center justify-between px-4 py-3 text-left min-h-[44px]">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>{DAY_FULL_LABELS[day]}</span>
                                {isToday && <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">Today</span>}
                                <span className="text-xs text-slate-400 dark:text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>
                        {isExpanded && (
                            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <input type="text" value={item.subject} onChange={(e) => handleItemChange(day, idx, 'subject', e.target.value)} placeholder="Subject" className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none" />
                                            <input type="text" value={item.topic ?? ''} onChange={(e) => handleItemChange(day, idx, 'topic', e.target.value)} placeholder="Topic (optional)" className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none" />
                                            <input type="text" value={item.goal} onChange={(e) => handleItemChange(day, idx, 'goal', e.target.value)} placeholder="Goal" className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none" />
                                        </div>
                                        <button type="button" onClick={() => handleRemoveItem(day, idx)} className="mt-1 rounded-lg p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" aria-label="Remove item">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => handleAddItem(day)} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                                    <Plus className="h-3.5 w-3.5" />
                                    Add item
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function StudyRoutinePlanner() {
    const { data, isLoading, isError, refetch } = useStudyRoutine();
    const updateRoutineMutation = useUpdateRoutine();
    const [isEditing, setIsEditing] = useState(false);
    const [editSchedule, setEditSchedule] = useState<DailySchedule[]>([]);

    const routine = data?.data;
    const weeklySchedule = routine?.weeklySchedule ?? [];
    const examCountdowns = routine?.examCountdowns ?? [];
    const adherence = routine?.adherencePercentage ?? 0;
    const todayDay = getTodayDay();
    const todayItems = useMemo(() => weeklySchedule.find((d) => d.day === todayDay)?.items ?? [], [weeklySchedule, todayDay]);

    const handleStartEdit = useCallback(() => {
        setEditSchedule(weeklySchedule.length > 0 ? weeklySchedule : DAYS.map((d) => ({ day: d, items: [] })));
        setIsEditing(true);
    }, [weeklySchedule]);

    const handleSave = useCallback(async () => {
        try {
            await updateRoutineMutation.mutateAsync({ weeklySchedule: editSchedule, examCountdowns });
            toast.success('Routine updated!');
            setIsEditing(false);
            void refetch();
        } catch {
            toast.error('Failed to save routine');
        }
    }, [editSchedule, examCountdowns, updateRoutineMutation, refetch]);

    const handleToggleTodayItem = useCallback(async (idx: number) => {
        const updatedSchedule = weeklySchedule.map((entry) => {
            if (entry.day !== todayDay) return entry;
            return { ...entry, items: entry.items.map((item, i) => i === idx ? { ...item, completed: !item.completed } : item) };
        });
        try {
            await updateRoutineMutation.mutateAsync({ weeklySchedule: updatedSchedule, examCountdowns });
            void refetch();
        } catch {
            toast.error('Failed to update item');
        }
    }, [weeklySchedule, todayDay, examCountdowns, updateRoutineMutation, refetch]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <Calendar className="mx-auto h-12 w-12 text-red-300 dark:text-red-700 mb-3" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load study routine</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-3xl px-4 py-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Calendar className="h-6 w-6 text-indigo-500" />
                            Study Routine
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Plan your weekly study schedule</p>
                    </div>
                    {!isEditing ? (
                        <button type="button" onClick={handleStartEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[40px]">
                            <Edit3 className="h-4 w-4" />
                            Edit Schedule
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setIsEditing(false); setEditSchedule([]); }} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[40px]">
                                <X className="h-4 w-4" />
                                Cancel
                            </button>
                            <button type="button" onClick={() => void handleSave()} disabled={updateRoutineMutation.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[40px]">
                                {updateRoutineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save
                            </button>
                        </div>
                    )}
                </div>

                <div className="mb-4"><AdherenceBar percentage={adherence} /></div>

                {examCountdowns.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Upcoming Exams</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {examCountdowns.map((cd, idx) => <ExamCountdownCard key={idx} countdown={cd} />)}
                        </div>
                    </div>
                )}

                {!isEditing && <div className="mb-6"><TodayRoutine items={todayItems} onToggle={(idx) => void handleToggleTodayItem(idx)} /></div>}

                {isEditing ? (
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Weekly Schedule</h3>
                        <ScheduleEditor schedule={editSchedule} onChange={setEditSchedule} />
                    </div>
                ) : (
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Weekly Overview</h3>
                        <div className="grid grid-cols-7 gap-2">
                            {DAYS.map((day) => {
                                const items = weeklySchedule.find((d) => d.day === day)?.items ?? [];
                                const isToday = day === todayDay;
                                return (
                                    <div key={day} className={`rounded-xl border p-3 text-center ${isToday ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                                        <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>{DAY_LABELS[day]}</p>
                                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{items.length}</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">items</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
