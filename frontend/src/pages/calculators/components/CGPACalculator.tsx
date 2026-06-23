import { useState, useCallback, useEffect, type ChangeEvent, type MouseEvent } from 'react';
import { Course, Semester, calculateSGPA, calculateCGPA, getDegreeClass, gradeToPointUniversity, ALL_UNIVERSITY_GRADES } from '../../../lib/calculators/cgpa';
import { CalculatorService } from '../../../services/calculatorApi';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

type UniType = 'public' | 'private';

let idCounter = 0;
const uid = () => `${Date.now()}-${idCounter++}`;

function createCourse(isPrivate: boolean): Course {
    return {
        id: uid(),
        name: '',
        credits: 3,
        grade: 'B',
        gradePoint: gradeToPointUniversity('B', isPrivate),
    };
}

function createSemester(isPrivate: boolean): Semester {
    return {
        id: uid(),
        name: `Semester ${Math.floor(Math.random() * 8) + 1}`,
        courses: [createCourse(isPrivate)],
        sgpa: 0,
        totalCredits: 3,
    };
}

export default function CGPACalculator() {
    const [uniType, setUniType] = useState<UniType>('public');
    const isPrivate = uniType === 'private';
    const grades = isPrivate ? ALL_UNIVERSITY_GRADES.private : ALL_UNIVERSITY_GRADES.public;

    const [semesters, setSemesters] = useState<Semester[]>([createSemester(false)]);
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
                            return { ...c, grade: value as string, gradePoint: gradeToPointUniversity(value as string, isPrivate) };
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
        [isPrivate, recalc]
    );

    const addCourse = useCallback((semId: string) => {
        setSemesters(prev => recalc(prev.map(sem => sem.id === semId ? { ...sem, courses: [...sem.courses, createCourse(isPrivate)] } : sem)));
    }, [isPrivate, recalc]);

    const removeCourse = useCallback((semId: string, courseId: string) => {
        setSemesters(prev => recalc(prev.map(sem => {
            if (sem.id !== semId) return sem;
            const courses = sem.courses.filter(c => c.id !== courseId);
            return { ...sem, courses: courses.length ? courses : sem.courses };
        })));
    }, [recalc]);

    const addSemester = useCallback(() => {
        const newSem = createSemester(isPrivate);
        setSemesters(prev => recalc([...prev, newSem]));
        setExpandedSem(newSem.id);
    }, [isPrivate, recalc]);

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
        <div className="space-y-6">
            {/* University Type Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isPrivate ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    onClick={() => { setUniType('public'); setSemesters([createSemester(false)]); }}
                >
                    Public University
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isPrivate ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    onClick={() => { setUniType('private'); setSemesters([createSemester(true)]); }}
                >
                    Private University
                </button>
            </div>

            {/* CGPA Result Card */}
            <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <div className={`text-5xl font-black ${getDegreeColorClass().split(' ')[0]}`}>{cgpa.toFixed(2)}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium tracking-wide uppercase">CGPA / 4.00</div>
                    </div>
                    <div className="text-right">
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold mb-2 ${getDegreeColorClass()}`}>
                            {degreeClass.en}
                        </div>
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{totalCredits} Total Credits</div>
                    </div>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${getDegreeColorClass().split(' ')[0].replace('text-', 'bg-')}`} style={{ width: `${(cgpa / 4.0) * 100}%` }} />
                </div>
            </div>

            {/* Semesters */}
            <div className="space-y-4">
                {semesters.map((sem, idx) => (
                    <div key={sem.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm">
                        <div
                            className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-800/70 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => setExpandedSem(expandedSem === sem.id ? '' : sem.id)}
                        >
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">Semester {idx + 1}</h3>
                                <p className="text-sm font-medium text-primary mt-0.5">SGPA: {sem.sgpa.toFixed(2)} &middot; {sem.totalCredits} Credits</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {semesters.length > 1 && (
                                    <button
                                        title="Remove semester"
                                        aria-label="Remove semester"
                                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                        onClick={(e: MouseEvent) => { e.stopPropagation(); removeSemester(sem.id); }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                                {expandedSem === sem.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                            </div>
                        </div>

                        {expandedSem === sem.id && (
                            <div className="p-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-[1fr_4rem_5rem_3rem_2rem] gap-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                                    <div>Course</div>
                                    <div className="text-center">Cr.</div>
                                    <div>Grade</div>
                                    <div className="text-right">GP</div>
                                    <div></div>
                                </div>
                                <div className="space-y-2">
                                    {sem.courses.map((course) => (
                                        <div key={course.id} className="grid grid-cols-[1fr_4rem_5rem_3rem_2rem] gap-3 items-center">
                                            <input
                                                value={course.name}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateCourse(sem.id, course.id, 'name', e.target.value)}
                                                placeholder="Course name"
                                                title="Course name"
                                                aria-label="Course name"
                                                className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                            />
                                            <input
                                                type="number"
                                                min={1} max={4}
                                                value={course.credits}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateCourse(sem.id, course.id, 'credits', e.target.value)}
                                                placeholder="Credits"
                                                title="Course credits"
                                                aria-label="Course credits"
                                                className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                            />
                                            <select
                                                value={course.grade}
                                                onChange={(e: ChangeEvent<HTMLSelectElement>) => updateCourse(sem.id, course.id, 'grade', e.target.value)}
                                                title="Course grade"
                                                aria-label="Course grade"
                                                className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 cursor-pointer"
                                            >
                                                {grades.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                            <div className="text-right font-bold text-sm text-slate-700 dark:text-slate-300">
                                                {course.gradePoint.toFixed(2)}
                                            </div>
                                            <button
                                                title="Remove course"
                                                aria-label="Remove course"
                                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 transition-colors"
                                                onClick={() => removeCourse(sem.id, course.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className="w-full mt-4 border-2 border-dashed border-slate-300 dark:border-slate-600 text-primary hover:bg-primary/5 rounded-md py-2 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
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
                className="w-full h-12 rounded-lg bg-primary text-white font-semibold text-sm shadow-md hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                onClick={addSemester}
            >
                <Plus className="h-5 w-5" /> Add Semester
            </button>
        </div>
    );
}
