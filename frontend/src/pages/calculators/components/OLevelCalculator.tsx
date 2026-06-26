import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CalculatorService } from '../../../services/calculatorApi';
import { calculateOLevel, calculateALevel, calculateCombinedOA, gradeToPointOA, oaGradeLetters, OLevelSubject, GradeRow } from '../../../lib/calculators/olevel';

interface OLevelCalculatorProps {
    /** Admin-managed O/A-Level grade table from the DB. When absent, hardcoded default is used. */
    table?: GradeRow[];
}

let idCounter = 0;
const uid = () => `${Date.now()}-${idCounter++}`;

export default function OLevelCalculator({ table }: OLevelCalculatorProps) {
    const gradeLetters = useMemo(() => oaGradeLetters(table), [table]);
    const [oSubjects, setOSubjects] = useState<OLevelSubject[]>([
        { id: uid(), name: 'Subject 1', grade: 'A', point: 5.0 },
        { id: uid(), name: 'Subject 2', grade: 'A', point: 5.0 },
        { id: uid(), name: 'Subject 3', grade: 'B', point: 4.0 },
        { id: uid(), name: 'Subject 4', grade: 'B', point: 4.0 },
        { id: uid(), name: 'Subject 5', grade: 'C', point: 3.0 },
    ]);

    const [aSubjects, setASubjects] = useState<OLevelSubject[]>([
        { id: uid(), name: 'Subject 1', grade: 'A', point: 5.0 },
        { id: uid(), name: 'Subject 2', grade: 'B', point: 4.0 },
    ]);

    useEffect(() => {
        CalculatorService.trackUsage('olevel').catch(console.error);
    }, []);

    const updateSubject = (list: 'O' | 'A', id: string, field: keyof OLevelSubject, value: string) => {
        const updater = list === 'O' ? setOSubjects : setASubjects;
        updater(prev => prev.map(s => {
            if (s.id !== id) return s;
            if (field === 'grade') {
                return { ...s, grade: value, point: gradeToPointOA(value, table) };
            }
            return { ...s, [field]: value };
        }));
    };

    const addSubject = (list: 'O' | 'A') => {
        const updater = list === 'O' ? setOSubjects : setASubjects;
        updater(prev => [...prev, { id: uid(), name: `Subject ${prev.length + 1}`, grade: 'B', point: 4.0 }]);
    };

    const removeSubject = (list: 'O' | 'A', id: string) => {
        const updater = list === 'O' ? setOSubjects : setASubjects;
        updater(prev => prev.filter(s => s.id !== id));
    };

    const oResult = calculateOLevel(oSubjects);
    const aResult = calculateALevel(aSubjects);
    const combined = calculateCombinedOA(oResult, aResult);

    const renderSubjectList = (title: string, list: 'O' | 'A', subjects: OLevelSubject[], result: { avgGPA: number; isEligible: boolean; reason?: string }) => (
        <div className="group/card rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="bg-gradient-to-r from-slate-50/80 to-transparent dark:from-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/60 py-3 px-4 sm:py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0">
                        <div className="font-black text-lg sm:text-xl text-primary drop-shadow-sm">{result.avgGPA.toFixed(2)}</div>
                        <div className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md sm:mt-1 ${result.isEligible ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                            {result.isEligible ? 'Eligible' : 'Not Eligible'}
                        </div>
                    </div>
                </div>
            </div>
            <div>
                {!result.isEligible && result.reason && (
                    <div className="bg-rose-50/80 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm p-3 sm:p-4 font-semibold border-b border-rose-200/50 dark:border-rose-800/30">
                        {result.reason}
                    </div>
                )}
                <div className="grid grid-cols-[1fr_3.5rem_2.5rem_1.5rem] sm:grid-cols-[1fr_5rem_3rem_2rem] gap-2 sm:gap-4 p-3 sm:p-4 bg-slate-100/50 dark:bg-slate-800/30 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <div className="pl-1 sm:pl-2">Subject</div>
                    <div className="text-center">Grade</div>
                    <div className="text-right">GP</div>
                    <div></div>
                </div>
                <div className="divide-y divide-slate-100/50 dark:divide-slate-700/50 p-2 sm:p-4 space-y-2 sm:space-y-3">
                    {subjects.map((subject) => (
                        <div key={subject.id} className="grid grid-cols-[1fr_3.5rem_2.5rem_1.5rem] sm:grid-cols-[1fr_5rem_3rem_2rem] gap-2 sm:gap-4 items-center group/subj hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300">
                            <input
                                value={subject.name}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateSubject(list, subject.id, 'name', e.target.value)}
                                placeholder="Name"
                                title="Subject name"
                                aria-label="Subject name"
                                className="h-9 sm:h-10 w-full rounded-lg border-0 bg-slate-100 dark:bg-slate-900/50 px-2 sm:px-3 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                            <select
                                value={subject.grade}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSubject(list, subject.id, 'grade', e.target.value)}
                                title="Subject grade"
                                aria-label="Subject grade"
                                className="h-9 sm:h-10 w-full rounded-lg border-0 bg-slate-100 dark:bg-slate-900/50 text-xs sm:text-sm font-black text-primary outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer transition-all px-1 sm:px-3"
                            >
                                {gradeLetters.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            <div className="text-right font-black text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                {subject.point.toFixed(1)}
                            </div>
                            <button
                                title="Remove subject"
                                aria-label="Remove subject"
                                className="h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-rose-500 transition-all duration-300 sm:opacity-0 sm:group-hover/subj:opacity-100"
                                onClick={() => removeSubject(list, subject.id)}
                            >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                        </div>
                    ))}
                    <button
                        className="w-full mt-3 sm:mt-5 border-2 border-dashed border-primary/30 text-primary hover:bg-primary hover:text-white rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
                        onClick={() => addSubject(list)}
                    >
                        <Plus className="h-4 w-4" /> Add Subject
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Premium Combined GPA Card */}
            <div className="relative group rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 shadow-2xl transition-all duration-500 hover:shadow-primary/20 dark:hover:shadow-primary/10">
                <div className={`absolute -inset-1 bg-gradient-to-r from-primary to-indigo-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000`} />
                <div className="relative p-8 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-bold tracking-widest uppercase">Combined Average GPA</div>
                            <div className="text-6xl font-black tracking-tight drop-shadow-sm transition-colors duration-500 text-primary dark:text-blue-400">
                                {combined.toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center sm:text-right">
                            <div className="text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-600/50 inline-block text-left">
                                <span className="block text-xs uppercase tracking-widest text-slate-400 mb-1">Calculation Method</span>
                                <span className="font-mono text-primary dark:text-blue-300">(O-Level &times; 5 + A-Level &times; 2) &divide; 7</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {renderSubjectList("O-Level (Best 5)", "O", oSubjects, oResult)}
                {renderSubjectList("A-Level (Best 2)", "A", aSubjects, aResult)}
            </div>
        </div>
    );
}
