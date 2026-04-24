import { ApiQuestion } from '../../services/api';
import { Flag, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import CompressedImageInput from '../common/CompressedImageInput';

interface Props {
    question: ApiQuestion;
    questionNumber: number;
    selectedOption: string | undefined;
    isMarkedForReview: boolean;
    onSelectOption: (optionId: string) => void;
    onToggleReview: () => void;
    onWrittenUpload?: (file: File) => void;
    writtenUploadUrl?: string; // If already uploaded
}

export default function QuestionCard({
    question,
    questionNumber,
    selectedOption,
    isMarkedForReview,
    onSelectOption,
    onToggleReview,
    onWrittenUpload,
    writtenUploadUrl
}: Props) {
    const isWritten = question.questionType === 'written';
    const options = [
        { id: 'A', text: question.optionA },
        { id: 'B', text: question.optionB },
        { id: 'C', text: question.optionC },
        { id: 'D', text: question.optionD },
    ];

    const handleFileChange = (file: File | null) => {
        if (file && onWrittenUpload) {
            onWrittenUpload(file);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 dark:bg-slate-900 dark:border-slate-700" id={`question-${question._id}`}>
            {/* Header info */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-lg dark:bg-indigo-950/40 dark:text-indigo-300">
                        {questionNumber}
                    </div>
                    {question.subject && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {question.subject}
                        </span>
                    )}
                    {question.tags && question.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            {tag}
                        </span>
                    ))}
                </div>

                <button
                    onClick={onToggleReview}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isMarkedForReview ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                >
                    <Flag className={`w-4 h-4 ${isMarkedForReview ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Review later</span>
                </button>
            </div>

            {/* Question Text & Image */}
            <div className="prose prose-slate max-w-none mb-6">
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                >
                    {String(question.question || '')}
                </ReactMarkdown>

                {question.questionImage && (
                    <img
                        src={question.questionImage}
                        alt="Question Reference"
                        className="mt-4 rounded-xl border border-slate-200 max-h-80 object-contain bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                    />
                )}
            </div>

            {/* Options or Written Upload */}
            {isWritten ? (
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 dark:text-white">Upload Written Answer</h4>
                    <p className="text-xs text-slate-500 mb-4">Write your solution on paper and upload a photo of it here for manual review.</p>

                    {writtenUploadUrl ? (
                        <div className="relative inline-block">
                            <img src={writtenUploadUrl} alt="Uploaded Answer" className="h-40 w-auto rounded-lg border border-slate-300 shadow-sm" />
                            <label className="absolute -bottom-3 -right-3 bg-white border border-slate-200 shadow-sm p-2 rounded-full cursor-pointer hover:bg-slate-50 text-indigo-600 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">
                                <Upload className="w-4 h-4" />
                                <CompressedImageInput accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full max-w-sm h-32 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl cursor-pointer transition-colors group">
                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 mb-2" />
                            <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600">Click to upload photo or PDF</span>
                            <span className="text-xs text-slate-400 mt-1">JPG, PNG, PDF up to 5MB</span>
                            <CompressedImageInput accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {options.map((opt) => {
                        const isSelected = selectedOption === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => onSelectOption(opt.id)}
                                className={`w-full min-h-[56px] flex items-center p-4 rounded-xl border text-left transition-all duration-200 ${isSelected
                                    ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-indigo-900 shadow-sm dark:bg-indigo-950/40 dark:text-indigo-200'
                                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-indigo-500/40 dark:hover:bg-slate-800 dark:text-slate-300'
                                    }`}
                            >
                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold mr-4 flex-shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                    {opt.id}
                                </div>
                                <div className="flex-1 overflow-x-hidden">
                                    {/* Option could have math formula too */}
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{ p: ({ node, ...props }) => <span {...props} /> }}
                                    >
                                        {String(opt.text || '')}
                                    </ReactMarkdown>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
