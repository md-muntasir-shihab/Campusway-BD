import { Filter } from 'lucide-react';
import CascadingDropdowns from '../../../components/admin/question-bank/CascadingDropdowns';
import type { CascadingDropdownsValue } from '../../../components/admin/question-bank/CascadingDropdowns';
import type {
    DifficultyLevel,
    QuestionType,
    QuestionStatus,
    QuestionReviewStatus,
} from '../../../types/exam-system';

// ─── Option maps ─────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
    { value: 'expert', label: 'Expert' },
];

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
    { value: 'mcq', label: 'MCQ' },
    { value: 'written_cq', label: 'Written / CQ' },
    { value: 'fill_blank', label: 'Fill in the Blank' },
    { value: 'true_false', label: 'True / False' },
    { value: 'image_mcq', label: 'Image MCQ' },
];

const STATUS_OPTIONS: { value: QuestionStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
    { value: 'flagged', label: 'Flagged' },
];

const REVIEW_OPTIONS: { value: QuestionReviewStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

// ─── Shared select class ─────────────────────────────────────────────────

const selectCls =
    'w-full appearance-none rounded-xl border px-3 py-2 pr-8 text-sm transition ' +
    'bg-white dark:bg-slate-800 ' +
    'border-slate-200 dark:border-slate-700/60 ' +
    'text-slate-900 dark:text-white ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

// ─── Props ───────────────────────────────────────────────────────────────

interface FilterBarProps {
    hierarchyValue: CascadingDropdownsValue;
    onHierarchyChange: (value: CascadingDropdownsValue) => void;
    difficulty: DifficultyLevel | '';
    onDifficultyChange: (value: DifficultyLevel | '') => void;
    questionType: QuestionType | '';
    onQuestionTypeChange: (value: QuestionType | '') => void;
    status: QuestionStatus | '';
    onStatusChange: (value: QuestionStatus | '') => void;
    reviewStatus: QuestionReviewStatus | '';
    onReviewStatusChange: (value: QuestionReviewStatus | '') => void;
}

// ─── Component ───────────────────────────────────────────────────────────

/**
 * Filter bar for the Question Bank Manager.
 * Includes CascadingDropdowns for hierarchy and additional filter dropdowns.
 */
export default function FilterBar({
    hierarchyValue,
    onHierarchyChange,
    difficulty,
    onDifficultyChange,
    questionType,
    onQuestionTypeChange,
    status,
    onStatusChange,
    reviewStatus,
    onReviewStatusChange,
}: FilterBarProps) {
    return (
        <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/50">
            {/* Section label */}
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Filter size={14} />
                Filters
            </div>

            {/* Hierarchy cascading dropdowns */}
            <CascadingDropdowns value={hierarchyValue} onChange={onHierarchyChange} />

            {/* Additional filter dropdowns */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* Difficulty */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Difficulty
                    </label>
                    <select
                        value={difficulty}
                        onChange={(e) => onDifficultyChange(e.target.value as DifficultyLevel | '')}
                        className={selectCls}
                        aria-label="Filter by difficulty"
                    >
                        <option value="">All Difficulties</option>
                        {DIFFICULTY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Question Type */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Question Type
                    </label>
                    <select
                        value={questionType}
                        onChange={(e) => onQuestionTypeChange(e.target.value as QuestionType | '')}
                        className={selectCls}
                        aria-label="Filter by question type"
                    >
                        <option value="">All Types</option>
                        {TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Status
                    </label>
                    <select
                        value={status}
                        onChange={(e) => onStatusChange(e.target.value as QuestionStatus | '')}
                        className={selectCls}
                        aria-label="Filter by status"
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Review Status */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Review Status
                    </label>
                    <select
                        value={reviewStatus}
                        onChange={(e) => onReviewStatusChange(e.target.value as QuestionReviewStatus | '')}
                        className={selectCls}
                        aria-label="Filter by review status"
                    >
                        <option value="">All Reviews</option>
                        {REVIEW_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
