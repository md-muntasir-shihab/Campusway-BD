import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { CalculatorService } from '../../../services/calculatorApi';
import { calculateSSCHSCGPA, SSC_SUBJECTS, HSC_SUBJECTS } from '../../../lib/calculators/ssc-hsc';

export default function SSCHSCCalculator({ mode }: { mode: 'ssc' | 'hsc' }) {
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

    const result = calculateSSCHSCGPA(mainSubjects, optionalSubject);

    return (
        <div className="space-y-6">
            {/* Group Selector */}
            <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Group</label>
                    <select
                        value={group}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setGroup(e.target.value)}
                        title="Select Group"
                        aria-label="Select Group"
                        className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 cursor-pointer"
                    >
                        {Object.keys(SUBJECTS).map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* GPA Result Card */}
            <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <div className="text-5xl font-black text-primary">{result.gpa.toFixed(2)}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium tracking-wide uppercase">GPA / 5.00</div>
                    </div>
                    <div className="text-right">
                        <div className="px-4 py-2 rounded-full border text-sm font-bold mb-2 bg-primary/10 text-primary border-primary/20">
                            Grade: {result.letterGrade}
                        </div>
                        {result.isPassed ? (
                            <div className="text-sm font-medium text-emerald-600">Passed</div>
                        ) : (
                            <div className="text-sm font-medium text-rose-600">Failed ({result.failedSubjects.length} subjects)</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Subjects */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-4 px-5">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Main Subjects</h3>
                </div>
                <div>
                    <div className="grid grid-cols-[1fr_5rem_4rem] gap-4 p-3 bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <div className="pl-2">Subject Name</div>
                        <div className="text-center">Marks</div>
                        <div className="text-center">Grade</div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {currentGroup.main.map(subject => {
                            const val = marks[subject.name] || '';
                            const subResult = result.subjects.find(s => s.name === subject.name);
                            return (
                                <div key={subject.name} className="grid grid-cols-[1fr_5rem_4rem] gap-4 p-3 items-center">
                                    <div className="pl-2 font-medium text-sm text-slate-700 dark:text-slate-300">{subject.name}</div>
                                    <input
                                        type="number" min={0} max={100}
                                        value={val}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setMarks(m => ({ ...m, [subject.name]: Number(e.target.value) }))}
                                        className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                        placeholder="0"
                                        title={`Marks for ${subject.name}`}
                                        aria-label={`Marks for ${subject.name}`}
                                    />
                                    <div className="text-center font-bold text-sm text-slate-700 dark:text-slate-300">
                                        {subResult?.grade || '-'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Optional Subject */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-4 px-5">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Optional Subject (4th Subject)</h3>
                </div>
                <div>
                    <div className="grid grid-cols-[1fr_5rem_4rem] gap-4 p-3 bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <div className="pl-2">Select Subject</div>
                        <div className="text-center">Marks</div>
                        <div className="text-center">Grade</div>
                    </div>
                    <div className="grid grid-cols-[1fr_5rem_4rem] gap-4 p-3 items-center">
                        <select
                            value={optionalSubjectName}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setOptionalSubjectName(e.target.value)}
                            title="Select Optional Subject"
                            aria-label="Select Optional Subject"
                            className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 cursor-pointer"
                        >
                            {currentGroup.optional.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <input
                            type="number" min={0} max={100}
                            value={marks[optionalSubjectName] || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setMarks(m => ({ ...m, [optionalSubjectName]: Number(e.target.value) }))}
                            className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                            placeholder="0"
                            title="Optional subject marks"
                            aria-label="Optional subject marks"
                            disabled={!optionalSubjectName}
                        />
                        <div className="text-center font-bold text-sm text-slate-700 dark:text-slate-300">
                            {result.subjects.find(s => s.name === optionalSubjectName)?.grade || '-'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
