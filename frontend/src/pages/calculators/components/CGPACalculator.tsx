import { useState, useCallback, useEffect, useMemo, type ChangeEvent, type MouseEvent } from 'react';
import { Course, Semester, calculateSGPA, calculateCGPA, getDegreeClass, gradeToPointUniversity, universityGradeLetters, GradeRow } from '../../../lib/calculators/cgpa';
import { CalculatorService } from '../../../services/calculatorApi';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

type UniType = 'public' | 'private';

interface CGPACalculatorProps {
    /** Admin-managed grading tables from the DB. When absent, hardcoded defaults are used. */
    publicTable?: GradeRow[];
    privateTable?: GradeRow[];
}

let idCounter = 0;
const uid = () => `${Date.now()}-${idCounter++}`;

function createCourse(isPrivate: boolean, table?: GradeRow[]): Course {
    return {
        id: uid(),
        name: '',
        credits: 3,
        grade: 'B',
        gradePoint: gradeToPointUniversity('B', isPrivate, table),
    };
}

function createSemester(isPrivate: boolean, table?: GradeRow[]): Semester {
    return {
        id: uid(),
        name: `Semester ${Math.floor(Math.random() * 8) + 1}`,
        courses: [createCourse(isPrivate, table)],
        sgpa: 0,
        totalCredits: 3,
    };
}

export default function CGPACalculator({ publicTable, privateTable }: CGPACalculatorProps) {
    const [uniType, setUniType] = useState<UniType>('public');
    const isPrivate = uniType === 'private';
    const activeTable = isPrivate ? privateTable : publicTable;
    const grades = useMemo(() => universityGradeLetters(isPrivate, activeTable), [isPrivate, activeTable]);

    const [semesters, setSemesters] = useState<Semester[]>([createSemester(false, publicTable)]);
    const [expandedSem, setExpandedSem] = useState<string>(semesters[0].id);

    useEffect(() => {
        CalculatorService.trackUsage('cgpa').catch(console.error);
    }, []);

    const recalc = useCallback((updatedSems: Semester[]) => {
        return updatedSems.map(sem => {
            const sgpa = calculateSGPA(sem.courses);
            const totalCredits = sem.courses.reduce((s, c) => s + c.credits, 0);
            return { ...sem, sgpa, totalCredits };
        });
    }, []);

    const updateCourse = useCallback(
        (semId: string, courseId: string, field: keyof Course, value: string | number) => {
            setSemesters(prev => {
                const updated = prev.map(sem => {
                    if (sem.id !== semId) return sem;
                    const courses = sem.courses.map(c => {
                        if (c.id !== courseId) return c;
                        if (field === 'grade') {
                            return { ...c, grade: value as string, gradePoint: gradeToPointUniversity(value as string, isPrivate, activeTable) };
                        }
                        if (field === 'credits') {
                            return { ...c, credits: Math.max(1, Math.min(4, Number(value) || 0)) };
                        }
                        return { ...c, [field]: value };
                    });
                    return { ...sem, courses };
                });
                return recalc(updated);
            });
        },
        [isPrivate, activeTable, recalc]
    );

    const addCourse = useCallback((semId: string) => {
        setSemesters(prev => recalc(prev.map(sem => sem.id === semId ? { ...sem, courses: [...sem.courses, createCourse(isPrivate, activeTable)] } : sem)));
    }, [isPrivate, activeTable, recalc]);

    const removeCourse = useCallback((semId: string, courseId: string) => {
        setSemesters(prev => recalc(prev.map(sem => {
            if (sem.id !== semId) return sem;
            const courses = sem.courses.filter(c => c.id !== courseId);
            return { ...sem, courses: courses.length ? courses : sem.courses };
        })));
    }, [recalc]);

    const addSemester = useCallback(() => {
        const newSem = createSemester(isPrivate, activeTable);
        setSemesters(prev => recalc([...prev, newSem]));
        setExpandedSem(newSem.id);
    }, [isPrivate, activeTable, recalc]);

    const removeSemester = useCallback((semId: string) => {
        setSemesters(prev => prev.length <= 1 ? prev : recalc(prev.filter(s => s.id !== semId)));
    }, [recalc]);

    const cgpa = calculateCGPA(semesters);
    const degreeClass = getDegreeClass(cgpa);
    const totalCredits = semesters.reduce((s, sem) => s + sem.totalCredits, 0);

    const getDegreeColorClass = () => {
        if (cgpa >= 3.5) return "text-yellow-600 bg-yellow-100 border-yellow-200";
        if (cgpa >= 3.0) return "text-primary bg-primary/10 border-primary/20";
        if (cgpa >= 2.25) return "text-blue-600 bg-blue-100 border-blue-200";
        if (cgpa >= 2.0) return "text-orange-600 bg-orange-100 border-orange-200";
        return "text-red-600 bg-red-100 border-red-200";
    };

    return (
        <div className="space-y-8 animate-slide-up">
            {/* University Type Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                <button
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${!isPrivate ? 'bg-white dark:bg-slate-700 shadow-md text-primary ring-1 ring-primary/20 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
                    onClick={() => { setUniType('public'); setSemesters([createSemester(false)]); }}
                >
                    Public University
                </button>
                <button
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${isPrivate ? 'bg-white dark:bg-slate-700 shadow-md text-primary ring-1 ring-primary/20 scale-[1.02]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
                    onClick={() => { setUniType('private'); setSemesters([createSemester(true)]); }}
                >
                    Private University
                </button>
            </div>

            {/* Premium CGPA Result Card */}
            <div className="relative group rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 shadow-2xl transition-all duration-500 hover:shadow-primary/20 dark:hover:shadow-primary/10">
                {/* Glow Behind */}
                <div className={`absolute -inset-1 bg-gradient-to-r from-primary to-indigo-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200`} />
                <div className="relative p-8 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <div className="text-center sm:text-left">
                            <div className={`text-6xl font-black tracking-tight drop-shadow-sm transition-colors duration-500 ${getDegreeColorClass().split(' ')[0]}`}>
                                {cgpa.toFixed(2)}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-bold tracking-widest uppercase">CGPA / 4.00</div>
                        </div>
                        <div className="text-center sm:text-right flex flex-col items-center sm:items-end gap-2">
                            <div className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider shadow-sm transition-colors duration-500 ${getDegreeColorClass()}`}>
                                {degreeClass.en}
                            </div>
                            <div className="text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-lg">
                                <span className="text-primary dark:text-blue-400">{totalCredits}</span> Total Credits
                            </div>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${
                                cgpa >= 3.5 ? 'from-yellow-400 to-yellow-600' :
                                cgpa >= 3.0 ? 'from-primary to-indigo-500' :
                                cgpa >= 2.25 ? 'from-blue-400 to-blue-600' :
                                cgpa >= 2.0 ? 'from-orange-400 to-orange-600' :
                                'from-red-400 to-red-600'
                            }`} style={{ width: `${(cgpa / 4.0) * 100}%` }} />
                    </div>
                </div>
            </div>

            {/* Semesters */}
            <div className="space-y-5">
                {semesters.map((sem, idx) => (
                    <div key={sem.id} className="group rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                        <div
                            className="flex justify-between items-center p-4 sm:p-5 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-800/50 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-300"
                            onClick={() => setExpandedSem(expandedSem === sem.id ? '' : sem.id)}
                        >
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Semester {idx + 1}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-xs sm:text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">SGPA: {sem.sgpa.toFixed(2)}</span>
                                    <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">&middot; {sem.totalCredits} Credits</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                {semesters.length > 1 && (
                                    <button
                                        title="Remove semester"
                                        aria-label="Remove semester"
                                        className="h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-xl text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all duration-300 sm:opacity-0 sm:group-hover:opacity-100"
                                        onClick={(e: MouseEvent) => { e.stopPropagation(); removeSemester(sem.id); }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 transition-transform duration-300 ${expandedSem === sem.id ? 'rotate-180' : ''}`}>
                                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                                </div>
                            </div>
                        </div>

                        {expandedSem === sem.id && (
                            <div className="p-3 sm:p-5 border-t border-slate-100 dark:border-slate-700/50 bg-white/40 dark:bg-[#0B1121]/40 animate-fade-in">
                                <div className="grid grid-cols-[1fr_3rem_3.5rem_2rem_1.5rem] sm:grid-cols-[1fr_4.5rem_5.5rem_3rem_2rem] gap-2 sm:gap-3 mb-2 sm:mb-3 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
                                    <div>Course</div>
                                    <div className="text-center">Cr.</div>
                                    <div>Grade</div>
                                    <div className="text-right">GP</div>
                                    <div></div>
                                </div>
                                <div className="space-y-2 sm:space-y-3">
                                    {sem.courses.map((course) => (
                                        <div key={course.id} className="grid grid-cols-[1fr_3rem_3.5rem_2rem_1.5rem] sm:grid-cols-[1fr_4.5rem_5.5rem_3rem_2rem] gap-2 sm:gap-3 items-center group/course bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300 hover:shadow-sm">
                                            <input
                                                value={course.name}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateCourse(sem.id, course.id, 'name', e.target.value)}
                                                placeholder="Name"
                                                title="Course name"
                                                aria-label="Course name"
                                                className="h-9 sm:h-10 w-full rounded-lg border-0 bg-slate-50 dark:bg-slate-900/50 px-2 sm:px-3 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/50 transition-all"
                                            />
                                            <input
                                                type="number"
                                                min={1} max={4}
                                                value={course.credits}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateCourse(sem.id, course.id, 'credits', e.target.value)}
                                                placeholder="Cr"
                                                title="Course credits"
                                                aria-label="Course credits"
                                                className="h-9 sm:h-10 w-full rounded-lg border-0 bg-slate-50 dark:bg-slate-900/50 text-center text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/50 transition-all"
                                            />
                                            <select
                                                value={course.grade}
                                                onChange={(e: ChangeEvent<HTMLSelectElement>) => updateCourse(sem.id, course.id, 'grade', e.target.value)}
                                                title="Course grade"
                                                aria-label="Course grade"
                                                className="h-9 sm:h-10 w-full rounded-lg border-0 bg-slate-50 dark:bg-slate-900/50 text-xs sm:text-sm font-black text-primary outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary/50 cursor-pointer transition-all px-1 sm:px-3"
                                            >
                                                {grades.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                            <div className="text-right font-black text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                                {course.gradePoint.toFixed(2)}
                                            </div>
                                            <button
                                                title="Remove course"
                                                aria-label="Remove course"
                                                className="h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-rose-500 transition-all duration-300 sm:opacity-0 sm:group-hover/course:opacity-100"
                                                onClick={() => removeCourse(sem.id, course.id)}
                                            >
                                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className="w-full mt-5 border-2 border-dashed border-primary/30 text-primary hover:bg-primary hover:text-white rounded-xl py-3 text-sm font-bold inline-flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
                                    onClick={() => addCourse(sem.id)}
                                >
                                    <Plus className="h-4 w-4" /> Add Course
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button
                className="w-full bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90 text-white rounded-2xl py-4 text-base font-bold inline-flex items-center justify-center gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5"
                onClick={addSemester}
            >
                <Plus className="h-5 w-5" /> Add Semester
            </button>
        </div>
    );
}
