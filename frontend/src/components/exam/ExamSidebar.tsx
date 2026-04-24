

interface Props {
    totalQuestions: number;
    answeredKeys: Set<string>;
    markedForReviewKeys: Set<string>;
    questionIds: string[];
    onScrollToQuestion: (id: string) => void;
    onSubmitClick: () => void;
}

export default function ExamSidebar({
    totalQuestions,
    answeredKeys,
    markedForReviewKeys,
    questionIds,
    onScrollToQuestion,
    onSubmitClick
}: Props) {

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:sticky lg:top-24 h-fit lg:max-h-[calc(100vh-8rem)] flex flex-col dark:bg-slate-900 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                Question Palette
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400">{totalQuestions} Items</span>
            </h3>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mb-6 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Answered
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></div> Not Visited
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div> Review
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div> Skipped
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto lg:pr-2 custom-scrollbar">
                <div className="flex flex-wrap gap-2">
                    {questionIds.map((qId, idx) => {
                        const isAnswered = answeredKeys.has(qId);
                        const isReview = markedForReviewKeys.has(qId);

                        let baseColor = 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-slate-500';
                        if (isAnswered) baseColor = 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600';
                        else if (isReview) baseColor = 'bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-500';
                        // if skipped -> we can only detect skipped if it was visited but not answered. We'll simplify to 'visited' state tracking if requested later.

                        return (
                            <button
                                key={qId}
                                onClick={() => onScrollToQuestion(qId)}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold border transition-colors ${baseColor}`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Submit Action */}
            <div className="pt-6 mt-6 border-t border-slate-200">
                <button
                    onClick={onSubmitClick}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow active:scale-95"
                >
                    Submit Final Exam
                </button>
            </div>
        </div>
    );
}
