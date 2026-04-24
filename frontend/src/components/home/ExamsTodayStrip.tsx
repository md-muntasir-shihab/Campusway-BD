import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink } from 'lucide-react';
import type { University } from '../../types/university';

export default function ExamsTodayStrip({ universities }: { universities: University[] }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextPeriod = new Date(today);
    nextPeriod.setDate(nextPeriod.getDate() + 14);

    const upcomingExams = universities.flatMap(u => {
        const units = [];
        if (u.scienceExamDate && u.scienceExamDate !== 'N/A' && u.scienceExamDate !== 'n/a') units.push({ name: 'Science', date: new Date(u.scienceExamDate) });
        if (u.artsExamDate && u.artsExamDate !== 'N/A' && u.artsExamDate !== 'n/a') units.push({ name: 'Humanities', date: new Date(u.artsExamDate) });
        if (u.businessExamDate && u.businessExamDate !== 'N/A' && u.businessExamDate !== 'n/a') units.push({ name: 'Commerce', date: new Date(u.businessExamDate) });

        return units
            .filter(unit => {
                // Ignore dates that are invalid.
                if (isNaN(unit.date.getTime())) return false;
                return unit.date >= today && unit.date < nextPeriod;
            })
            .map(unit => ({
                university: u,
                unitName: unit.name,
                date: unit.date
            }));
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic for a marquee-like effect if there are many items
    useEffect(() => {
        if (!scrollRef.current || upcomingExams.length < 3) return;

        let animationId: number;
        let start = 0;
        const scrollAmount = 0.5;

        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const el = scrollRef.current;
            if (el) {
                el.scrollLeft += scrollAmount;
                if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
                    el.scrollLeft = 0;
                }
            }
            animationId = window.requestAnimationFrame(step);
        };
        animationId = window.requestAnimationFrame(step);

        return () => window.cancelAnimationFrame(animationId);
    }, [upcomingExams.length]);

    const hasExams = upcomingExams.length > 0;

    return (
        <section id="upcoming-exams" className="mb-8">
            <h2 className="text-lg font-bold text-text dark:text-dark-text flex items-center gap-2 mb-3">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Upcoming Exams
            </h2>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide select-none min-h-[100px]"
            >
                {hasExams ? (
                    upcomingExams.map((exam, idx) => {
                        const isToday = exam.date >= today && exam.date < tomorrow;

                        return (
                            <div
                                key={`${exam.university._id}-${idx}`}
                                className={`flex flex-col flex-shrink-0 w-64 p-3 rounded-2xl border ${isToday
                                    ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-500/30 shadow-sm'
                                    : 'bg-white dark:bg-[#111d33] border-card-border dark:border-dark-border'
                                    } transition-transform hover:-translate-y-1 hover:shadow-md cursor-grab active:cursor-grabbing group`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {exam.university.logo?.url ? (
                                            <img src={exam.university.logo.url} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                                                {exam.university.shortForm?.slice(0, 2)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-sm leading-tight text-text dark:text-dark-text group-hover:text-primary transition-colors line-clamp-1">{exam.university.shortForm || exam.university.name}</h3>
                                            <p className="text-[11px] text-text-muted dark:text-dark-text/60">{exam.unitName} Unit</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-auto">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${isToday ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                                        }`}>
                                        <Clock className="w-3.5 h-3.5" />
                                        {isToday ? 'TODAY' : exam.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>

                                    <Link to={`/university/${exam.university.slug}`} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-primary hover:text-white transition-colors">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="w-full py-6 px-6 rounded-2xl bg-gray-50 dark:bg-dark-surface/50 border border-dashed border-gray-200 dark:border-gray-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-text-muted">No upcoming entrance exams scheduled for the next 14 days.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
