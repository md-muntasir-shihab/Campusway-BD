
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    totalQuestions: number;
    answeredCount: number;
    markedForReviewCount: number;
    isTimeUp?: boolean;
    isSubmitting: boolean;
}

export default function ExamSubmitModal({
    isOpen,
    onClose,
    onConfirm,
    totalQuestions,
    answeredCount,
    markedForReviewCount,
    isTimeUp,
    isSubmitting
}: Props) {
    if (!isOpen) return null;

    const notAnsweredCount = totalQuestions - answeredCount;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                >
                    <div className={`p-6 text-white flex items-center gap-3 ${isTimeUp ? 'bg-red-500' : 'bg-indigo-600'}`}>
                        {isTimeUp ? <Clock className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                        <div>
                            <h2 className="text-xl font-bold">{isTimeUp ? "Time's Up!" : "Submit Exam"}</h2>
                            <p className="text-sm opacity-90">{isTimeUp ? "Your exam will be auto-submitted." : "Are you sure you want to finish?"}</p>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid gap-4 mb-6">
                            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                <span className="text-sm font-medium text-emerald-800 flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Answered</span>
                                <span className="text-lg font-bold text-emerald-600">{answeredCount}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                                <span className="text-sm font-medium text-red-800 flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-full"></div> Not Answered</span>
                                <span className="text-lg font-bold text-red-600">{notAnsweredCount}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <span className="text-sm font-medium text-amber-800 flex items-center gap-2"><div className="w-3 h-3 bg-amber-400 rounded-full"></div> Marked for Review</span>
                                <span className="text-lg font-bold text-amber-600">{markedForReviewCount}</span>
                            </div>
                        </div>

                        {!isTimeUp && (
                            <p className="text-sm text-slate-500 text-center mb-6">
                                Once you submit, you will not be able to change your answers. Do you wish to proceed?
                            </p>
                        )}

                        <div className="flex items-center gap-3">
                            {!isTimeUp && (
                                <button
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 text-slate-600 font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={onConfirm}
                                disabled={isSubmitting}
                                className={`flex-1 py-3 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${isTimeUp ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isSubmitting ? (
                                    <><span>Submitting</span><span className="animate-pulse">...</span></>
                                ) : (
                                    <>
                                        {isTimeUp ? 'Acknowledge & Submit' : 'Yes, Submit'}
                                        <CheckCircle className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
