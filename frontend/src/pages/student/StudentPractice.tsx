import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpenCheck,
    CheckCircle2,
    ChevronRight,
    Flame,
    Loader2,
    Sparkles,
    Target,
    Trophy,
    XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    getPracticeQuestions,
    getPracticeStats,
    getPracticeTaxonomy,
    submitPracticeAnswer,
    type PracticeCategoryNode,
    type PracticeGroupNode,
    type PracticeQuestion,
    type PracticeSubmitResult,
    type PracticeTopicNode,
} from '../../services/api';

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

interface SelectedFilter {
    group: PracticeGroupNode | null;
    category: PracticeCategoryNode | null;
    topic: PracticeTopicNode | null;
    difficulty: Difficulty;
    count: number;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; en: string; bn: string }[] = [
    { value: 'mixed', en: 'Mixed', bn: 'মিশ্র' },
    { value: 'easy', en: 'Easy', bn: 'সহজ' },
    { value: 'medium', en: 'Medium', bn: 'মাঝারি' },
    { value: 'hard', en: 'Hard', bn: 'কঠিন' },
];

const COUNT_OPTIONS = [5, 10, 20, 30];

function bn(text: { en: string; bn: string } | undefined): string {
    if (!text) return '';
    return text.bn || text.en || '';
}

function getQuestionOptions(q: PracticeQuestion): { key: string; text: string }[] {
    if (q.optionsLocalized && q.optionsLocalized.length > 0) {
        return q.optionsLocalized.map((o) => ({ key: o.key, text: bn(o.text) }));
    }
    if (q.options && q.options.length > 0) {
        return q.options.map((o) => ({ key: o.key, text: o.text }));
    }
    const legacy: { key: string; text: string }[] = [];
    if (q.optionA) legacy.push({ key: 'A', text: q.optionA });
    if (q.optionB) legacy.push({ key: 'B', text: q.optionB });
    if (q.optionC) legacy.push({ key: 'C', text: q.optionC });
    if (q.optionD) legacy.push({ key: 'D', text: q.optionD });
    return legacy;
}

function getQuestionText(q: PracticeQuestion): string {
    if (q.questionText) {
        const value = bn(q.questionText);
        if (value) return value;
    }
    return q.question || '';
}

export default function StudentPractice() {
    const [step, setStep] = useState<'pick' | 'run' | 'finish'>('pick');
    const [filter, setFilter] = useState<SelectedFilter>({
        group: null,
        category: null,
        topic: null,
        difficulty: 'mixed',
        count: 10,
    });
    const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<PracticeSubmitResult | null>(null);
    const [scoreCard, setScoreCard] = useState({ correct: 0, attempted: 0 });

    const taxonomyQuery = useQuery({
        queryKey: ['practice', 'taxonomy'],
        queryFn: async () => (await getPracticeTaxonomy()).data,
        staleTime: 10 * 60 * 1000,
    });

    const statsQuery = useQuery({
        queryKey: ['practice', 'stats'],
        queryFn: async () => (await getPracticeStats()).data,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
    });

    const submitMutation = useMutation({
        mutationFn: async ({ questionId, keys }: { questionId: string; keys: string[] }) =>
            (await submitPracticeAnswer(questionId, keys)).data,
        onSuccess: (data) => {
            setFeedback(data);
            setScoreCard((prev) => ({
                correct: prev.correct + (data.isCorrect ? 1 : 0),
                attempted: prev.attempted + 1,
            }));
            statsQuery.refetch();
        },
        onError: () => toast.error('উত্তর জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'),
    });

    const startMutation = useMutation({
        mutationFn: async () => {
            const params = {
                groupId: filter.group?._id,
                categoryId: filter.category?._id,
                topicId: filter.topic?._id,
                difficulty: filter.difficulty === 'mixed' ? undefined : filter.difficulty,
                count: filter.count,
            };
            return (await getPracticeQuestions(params)).data;
        },
        onSuccess: (data) => {
            if (!data.items || data.items.length === 0) {
                toast.error('এই বিষয়ে এখনো কোনো প্রশ্ন পাওয়া যায়নি।');
                return;
            }
            setQuestions(data.items);
            setCurrentIndex(0);
            setSelected([]);
            setFeedback(null);
            setScoreCard({ correct: 0, attempted: 0 });
            setStep('run');
        },
        onError: () => toast.error('প্রশ্ন আনতে সমস্যা হয়েছে।'),
    });

    const groups = taxonomyQuery.data?.groups || [];
    const stats = statsQuery.data;

    const currentQuestion = questions[currentIndex];
    const currentOptions = useMemo(
        () => (currentQuestion ? getQuestionOptions(currentQuestion) : []),
        [currentQuestion],
    );

    function handleSelectGroup(group: PracticeGroupNode) {
        setFilter({ ...filter, group, category: null, topic: null });
    }
    function handleSelectCategory(category: PracticeCategoryNode) {
        setFilter({ ...filter, category, topic: null });
    }
    function handleSelectTopic(topic: PracticeTopicNode | null) {
        setFilter({ ...filter, topic });
    }

    function handleToggleAnswer(key: string) {
        if (feedback) return;
        const isMulti = currentQuestion?.question_type === 'MULTI';
        if (isMulti) {
            setSelected((prev) =>
                prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
            );
        } else {
            setSelected([key]);
        }
    }

    function handleSubmitAnswer() {
        if (!currentQuestion || selected.length === 0) return;
        submitMutation.mutate({ questionId: currentQuestion._id, keys: selected });
    }

    function handleNextQuestion() {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= questions.length) {
            setStep('finish');
            return;
        }
        setCurrentIndex(nextIndex);
        setSelected([]);
        setFeedback(null);
    }

    function handleRestart() {
        setStep('pick');
        setQuestions([]);
        setCurrentIndex(0);
        setSelected([]);
        setFeedback(null);
        setScoreCard({ correct: 0, attempted: 0 });
    }

    useEffect(() => {
        if (step === 'pick') {
            statsQuery.refetch();
        }
    }, [step, statsQuery]);

    // ─── PICK STEP ────────────────────────────────────────────────
    if (step === 'pick') {
        return (
            <div className="space-y-6">
                <header className="rounded-3xl border border-white/60 bg-white/70 p-6 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                                Practice Mode
                            </p>
                            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                অনুশীলন কেন্দ্র
                            </h1>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                বিষয় বেছে নিয়ে instant feedback সহ অনুশীলন শুরু করো। প্রতিদিন অনুশীলন করলে streak বাড়বে।
                            </p>
                        </div>
                        {stats && (
                            <div className="flex items-center gap-3">
                                <StatBadge
                                    icon={<Flame className="h-4 w-4" />}
                                    label="Streak"
                                    value={`${stats.streak.current} দিন`}
                                    tone="orange"
                                />
                                <StatBadge
                                    icon={<Target className="h-4 w-4" />}
                                    label="Today"
                                    value={`${stats.dailyCompleted}/${stats.dailyGoal}`}
                                    tone="indigo"
                                />
                                <StatBadge
                                    icon={<Trophy className="h-4 w-4" />}
                                    label="Points"
                                    value={String(stats.lifetimePoints)}
                                    tone="emerald"
                                />
                            </div>
                        )}
                    </div>
                </header>

                {/* Group selector */}
                <section className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        ১. পরীক্ষার ধরন বেছে নাও
                    </h2>
                    {taxonomyQuery.isLoading ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {groups.map((g) => {
                                const isActive = filter.group?._id === g._id;
                                return (
                                    <button
                                        key={g._id}
                                        type="button"
                                        onClick={() => handleSelectGroup(g)}
                                        className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                                            isActive
                                                ? 'border-indigo-500 bg-indigo-50 shadow-md dark:border-indigo-400 dark:bg-indigo-500/10'
                                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm dark:border-white/10 dark:bg-slate-900/60'
                                        }`}
                                    >
                                        <div
                                            className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                                            style={{ backgroundColor: g.color || '#6366F1' }}
                                        >
                                            <BookOpenCheck className="h-5 w-5" />
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 text-pretty">
                                            {bn(g.title)}
                                        </p>
                                        {g.description && (
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                                {bn(g.description)}
                                            </p>
                                        )}
                                        <p className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                                            {g.categories.length} টি বিভাগ
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Category selector */}
                {filter.group && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            ২. বিভাগ বেছে নাও
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {filter.group.categories.map((c) => {
                                const isActive = filter.category?._id === c._id;
                                return (
                                    <button
                                        key={c._id}
                                        type="button"
                                        onClick={() => handleSelectCategory(c)}
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                            isActive
                                                ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                                        }`}
                                    >
                                        {bn(c.title)}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Topic selector */}
                {filter.category && filter.category.topics.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            ৩. বিষয় (ঐচ্ছিক)
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => handleSelectTopic(null)}
                                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                    !filter.topic
                                        ? 'border-cyan-500 bg-cyan-500 text-white shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                                }`}
                            >
                                সব বিষয়
                            </button>
                            {filter.category.topics.map((t) => {
                                const isActive = filter.topic?._id === t._id;
                                return (
                                    <button
                                        key={t._id}
                                        type="button"
                                        onClick={() => handleSelectTopic(t)}
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                            isActive
                                                ? 'border-cyan-500 bg-cyan-500 text-white shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                                        }`}
                                    >
                                        {bn(t.title)}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Difficulty + count */}
                {filter.category && (
                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                ৪. কঠিনতা
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {DIFFICULTY_OPTIONS.map((d) => {
                                    const isActive = filter.difficulty === d.value;
                                    return (
                                        <button
                                            key={d.value}
                                            type="button"
                                            onClick={() => setFilter({ ...filter, difficulty: d.value })}
                                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                isActive
                                                    ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                                            }`}
                                        >
                                            {d.bn}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                ৫. প্রশ্ন সংখ্যা
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {COUNT_OPTIONS.map((n) => {
                                    const isActive = filter.count === n;
                                    return (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setFilter({ ...filter, count: n })}
                                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                isActive
                                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                                            }`}
                                        >
                                            {n} টি
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* Start CTA */}
                {filter.category && (
                    <div className="sticky bottom-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => startMutation.mutate()}
                            disabled={startMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {startMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            অনুশীলন শুরু করো
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ─── RUN STEP ─────────────────────────────────────────────────
    if (step === 'run' && currentQuestion) {
        const correctSet = new Set(feedback?.correctAnswer ?? []);
        return (
            <div className="space-y-5">
                <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                            প্রশ্ন {currentIndex + 1}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500 dark:text-slate-400">{questions.length}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            ✓ {scoreCard.correct}
                        </span>
                        <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                            ✗ {scoreCard.attempted - scoreCard.correct}
                        </span>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
                    <p className="text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100 text-pretty">
                        {getQuestionText(currentQuestion)}
                    </p>
                    <div className="mt-5 grid grid-cols-1 gap-3">
                        {currentOptions.map((opt) => {
                            const isSelected = selected.includes(opt.key);
                            const isCorrect = correctSet.has(opt.key);
                            const showFeedback = Boolean(feedback);

                            let style =
                                'border-slate-200 bg-white text-slate-900 hover:border-indigo-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100';
                            if (showFeedback) {
                                if (isCorrect) {
                                    style =
                                        'border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-100';
                                } else if (isSelected) {
                                    style =
                                        'border-rose-500 bg-rose-50 text-rose-900 dark:border-rose-400 dark:bg-rose-500/15 dark:text-rose-100';
                                } else {
                                    style =
                                        'border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400';
                                }
                            } else if (isSelected) {
                                style =
                                    'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-100';
                            }

                            return (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => handleToggleAnswer(opt.key)}
                                    disabled={Boolean(feedback)}
                                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${style}`}
                                >
                                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                                        {opt.key}
                                    </span>
                                    <span className="flex-1 text-sm leading-relaxed text-pretty">
                                        {opt.text}
                                    </span>
                                    {showFeedback && isCorrect && (
                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                                    )}
                                    {showFeedback && !isCorrect && isSelected && (
                                        <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <AnimatePresence>
                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`mt-5 rounded-2xl border px-4 py-3 ${
                                    feedback.isCorrect
                                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                                        : 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
                                }`}
                            >
                                <p
                                    className={`text-sm font-bold ${
                                        feedback.isCorrect
                                            ? 'text-emerald-700 dark:text-emerald-300'
                                            : 'text-rose-700 dark:text-rose-300'
                                    }`}
                                >
                                    {feedback.isCorrect ? 'চমৎকার! সঠিক উত্তর।' : 'ভুল উত্তর।'}
                                </p>
                                {bn(feedback.explanation) && (
                                    <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                                        {bn(feedback.explanation)}
                                    </p>
                                )}
                                {feedback.streak?.incrementedToday && (
                                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-200">
                                        <Flame className="h-3 w-3" />
                                        Streak {feedback.streak.current} দিন!
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-5 flex justify-end gap-2">
                        {!feedback ? (
                            <button
                                type="button"
                                onClick={handleSubmitAnswer}
                                disabled={selected.length === 0 || submitMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                জমা দাও
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNextQuestion}
                                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                            >
                                {currentIndex + 1 >= questions.length ? 'শেষ করো' : 'পরবর্তী প্রশ্ন'}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── FINISH STEP ─────────────────────────────────────────────
    const accuracy = scoreCard.attempted
        ? Math.round((scoreCard.correct / scoreCard.attempted) * 100)
        : 0;
    return (
        <div className="space-y-5">
            <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-indigo-50 to-cyan-50 p-8 text-center backdrop-blur-md dark:border-white/10 dark:from-indigo-500/10 dark:to-cyan-500/10">
                <Trophy className="mx-auto h-12 w-12 text-amber-500" />
                <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    অনুশীলন সম্পন্ন!
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    মোট {scoreCard.attempted} টি প্রশ্নের মধ্যে {scoreCard.correct} টি সঠিক
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3 max-w-md mx-auto">
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-900/60">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Score</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {scoreCard.correct}/{scoreCard.attempted}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-900/60">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Accuracy</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {accuracy}%
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-900/60">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Streak</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {feedback?.streak?.current ?? stats?.streak.current ?? 0}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleRestart}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700"
                >
                    আবার অনুশীলন করো
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function StatBadge({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: 'orange' | 'indigo' | 'emerald';
}) {
    const tones: Record<typeof tone, string> = {
        orange: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
        indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
        emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    };
    return (
        <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${tones[tone]}`}>
            {icon}
            <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
                <p className="font-bold">{value}</p>
            </div>
        </div>
    );
}

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 dark:border-white/10 dark:bg-slate-800/40"
                />
            ))}
        </div>
    );
}
