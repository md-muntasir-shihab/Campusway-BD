import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { CalculatorService } from '../../../services/calculatorApi';
import { calculateSSCHSCGPA, SSC_SUBJECTS, HSC_SUBJECTS, GradeRow } from '../../../lib/calculators/ssc-hsc';

interface SSCHSCCalculatorProps {
    mode: 'ssc' | 'hsc';
    /** Admin-managed Bangladesh Board grade table from the DB. When absent, hardcoded default is used. */
    table?: GradeRow[];
}

export default function SSCHSCCalculator({ mode, table }: SSCHSCCalculatorProps) {
    const [group, setGroup] = useState<string>('Science');
    const [marks, setMarks] = useState<Record<string, number>>({});
    const [optionalSubjectName, setOptionalSubjectName] = useState<string>('');

    useEffect(() => {
        CalculatorService.trackUsage(mode).catch(console.error);
    }, [mode]);

    const SUBJECTS = mode === 'ssc' ? SSC_SUBJECTS : HSC_SUBJECTS;
    const currentGroup = SUBJECTS[group as keyof typeof SUBJECTS] || SUBJECTS.Science;

    useEffect(() => {
        setOptionalSubjectName(currentGroup.optional[0] || '');
    }, [group, currentGroup]);

    const mainSubjects = useMemo(() => {
        return currentGroup.main.map(s => ({
            name: s.name,
            marks: marks[s.name] || 0,
            isMandatory: s.isMandatory
        }));
    }, [currentGroup, marks]);

    const optionalSubject = useMemo(() => {
        if (!optionalSubjectName) return undefined;
        return {
            name: optionalSubjectName,
            marks: marks[optionalSubjectName] || 0
        };
    }, [optionalSubjectName, marks]);

    const result = calculateSSCHSCGPA(mainSubjects, optionalSubject, table);

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Group Selector */}
            <div className="group relative p-5 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm transition-all duration-300 hover:shadow-lg">
                <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block">Group</label>
                    <select
                        value={group}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setGroup(e.target.value)}
                        title="Select Group"
                        aria-label="Select Group"
                        className="w-full h-12 rounded-xl border-0 bg-slate-100/80 dark:bg-slate-900/50 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer transition-all"
                    >
                        {Object.keys(SUBJECTS).map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Premium GPA Result Card */}
            <div className="relative group rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 shadow-2xl transition-all duration-500 hover:shadow-primary/20 dark:hover:shadow-primary/10">
                <div className={`absolute -inset-1 bg-gradient-to-r ${result.isPassed ? 'from-primary to-emerald-500' : 'from-rose-500 to-orange-500'} rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000`} />
                <div className="relative p-8 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                            <div className={`text-6xl font-black tracking-tight drop-shadow-sm transition-colors duration-500 ${result.isPassed ? 'text-primary dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {result.gpa.toFixed(2)}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-bold tracking-widest uppercase">GPA / 5.00</div>
                        </div>
                        <div className="text-center sm:text-right flex flex-col items-center sm:items-end gap-2">
                            <div className={`px-5 py-2 rounded-full border text-sm font-black uppercase tracking-wider shadow-sm transition-colors duration-500 ${result.isPassed ? 'bg-primary/10 text-primary border-primary/20 dark:text-blue-400 dark:border-blue-500/30 dark:bg-blue-500/10' : 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'}`}>
                                Grade: {result.letterGrade}
                            </div>
                            {result.isPassed ? (
                                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg">Passed</div>
                            ) : (
                                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-lg">Failed ({result.failedSubjects.length} subjects)</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Subjects */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="bg-gradient-to-r from-slate-50/80 to-transparent dark:from-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/60 py-3 px-4 sm:py-4 sm:px-6">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Main Subjects</h3>
                </div>
                <div>
                    <div className="grid grid-cols-[1fr_4.5rem_3rem] sm:grid-cols-[1fr_5.5rem_4rem] gap-2 sm:gap-4 p-3 sm:p-4 bg-slate-100/50 dark:bg-slate-800/30 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        <div className="pl-1 sm:pl-2">Subject Name</div>
                        <div className="text-center">Marks</div>
                        <div className="text-center">Grade</div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {currentGroup.main.map(subject => {
                            const val = marks[subject.name] || '';
                            const subResult = result.subjects.find(s => s.name === subject.name);
                            const isFailed = subResult?.grade === 'F';
                            return (
                                <div key={subject.name} className="grid grid-cols-[1fr_4.5rem_3rem] sm:grid-cols-[1fr_5.5rem_4rem] gap-2 sm:gap-4 p-3 sm:p-4 items-center group/subj hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="pl-1 sm:pl-2 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200">{subject.name}</div>
                                    <input
                                        type="number" min={0} max={100}
                                        value={val}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setMarks(m => ({ ...m, [subject.name]: Number(e.target.value) }))}
                                        className="h-9 sm:h-10 w-full rounded-lg border-0 bg-slate-100 dark:bg-slate-900/50 text-center text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/50 transition-all px-1 sm:px-2"
                                        placeholder="0"
                                        title={`Marks for ${subject.name}`}
                                        aria-label={`Marks for ${subject.name}`}
                                    />
                                    <div className={`text-center font-black text-xs sm:text-sm ${isFailed ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {subResult?.grade || '-'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Optional Subject */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="bg-gradient-to-r from-slate-50/80 to-transparent dark:from-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/60 py-3 px-4 sm:py-4 sm:px-6">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                        Optional Subject <span className="text-[10px] sm:text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">4th Subject</span>
                    </h3>
                </div>
                <div>
                    <div className="grid grid-cols-[1fr_4.5rem_3rem] sm:grid-cols-[1fr_5.5rem_4rem] gap-2 sm:gap-4 p-3 sm:p-4 bg-slate-100/50 dark:bg-slate-800/30 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        <div className="pl-1 sm:pl-2">Select Subject</div>
                        <div className="text-center">Marks</div>
                        <div className="text-center">Grade</div>
                    </div>
                    <div className="grid grid-cols-[1fr_4.5rem_3rem] sm:grid-cols-[1fr_5.5rem_4rem] gap-2 sm:gap-4 p-3 sm:p-4 items-center">
                        <select
                            value={optionalSubjectName}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setOptionalSubjectName(e.target.value)}
                            title="Select Optional Subject"
                            aria-label="Select Optional Subject"
                            className="h-9 sm:h-10 w-full rounded-lg border-0 bg-slate-100 dark:bg-slate-900/50 px-2 sm:px-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer transition-all truncate"
                        >
                            {currentGroup.optional.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <input
                            type="number" min={0} max={100}
                            value={marks[optionalSubjectName] || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setMarks(m => ({ ...m, [optionalSubjectName]: Number(e.target.value) }))}
                            className="h-9 sm:h-10 w-full rounded-lg border-0 bg-slate-100 dark:bg-slate-900/50 text-center text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 px-1 sm:px-2"
                            placeholder="0"
                            title="Optional subject marks"
                            aria-label="Optional subject marks"
                            disabled={!optionalSubjectName}
                        />
                        <div className="text-center font-black text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            {result.subjects.find(s => s.name === optionalSubjectName)?.grade || '-'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
