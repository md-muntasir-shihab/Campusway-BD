import { useState, useEffect, type ChangeEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CalculatorService } from '../../../services/calculatorApi';
import { calculateOLevel, calculateALevel, calculateCombinedOA, OA_GRADES, gradeToPointOA, OLevelSubject } from '../../../lib/calculators/olevel';

let idCounter = 0;
const uid = () => `${Date.now()}-${idCounter++}`;

export default function OLevelCalculator() {
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
                return { ...s, grade: value, point: gradeToPointOA(value) };
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-4 px-5">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                    <div className="text-right">
                        <div className="font-bold text-lg text-primary">{result.avgGPA.toFixed(2)}</div>
                        <div className={`text-xs font-semibold ${result.isEligible ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {result.isEligible ? 'Eligible' : 'Not Eligible'}
                        </div>
                    </div>
                </div>
            </div>
            <div>
                {!result.isEligible && result.reason && (
                    <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm p-3 font-medium border-b border-rose-200 dark:border-rose-800/30">
                        {result.reason}
                    </div>
                )}
                <div className="grid grid-cols-[1fr_5rem_3rem_2rem] gap-4 p-3 bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="pl-2">Subject</div>
                    <div className="text-center">Grade</div>
                    <div className="text-right">GP</div>
                    <div></div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 p-3 space-y-2">
                    {subjects.map((subject) => (
                        <div key={subject.id} className="grid grid-cols-[1fr_5rem_3rem_2rem] gap-4 items-center pt-2">
                            <input
                                value={subject.name}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateSubject(list, subject.id, 'name', e.target.value)}
                                placeholder="Subject name"
                                title="Subject name"
                                aria-label="Subject name"
                                className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                            />
                            <select
                                value={subject.grade}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSubject(list, subject.id, 'grade', e.target.value)}
                                title="Subject grade"
                                aria-label="Subject grade"
                                className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 cursor-pointer"
                            >
                                {OA_GRADES.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            <div className="text-right font-bold text-sm text-slate-700 dark:text-slate-300">
                                {subject.point.toFixed(1)}
                            </div>
                            <button
                                title="Remove subject"
                                aria-label="Remove subject"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 transition-colors"
                                onClick={() => removeSubject(list, subject.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    <button
                        className="w-full mt-4 border-2 border-dashed border-slate-300 dark:border-slate-600 text-primary hover:bg-primary/5 rounded-md py-2 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                        onClick={() => addSubject(list)}
                    >
                        <Plus className="h-4 w-4" /> Add Subject
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Combined GPA Card */}
            <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-primary/5 to-transparent p-6 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium tracking-wide uppercase">Combined Average GPA</div>
                        <div className="text-5xl font-black text-primary">{combined.toFixed(2)}</div>
                    </div>
                    <div className="text-right text-sm font-medium text-slate-600 dark:text-slate-400">
                        Calculation: <br /> (O-Level &times; 5 + A-Level &times; 2) &divide; 7
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {renderSubjectList("O-Level (Best 5)", "O", oSubjects, oResult)}
                {renderSubjectList("A-Level (Best 2)", "A", aSubjects, aResult)}
            </div>
        </div>
    );
}
