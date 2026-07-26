import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, CheckCircle2, AlertCircle, X, Sparkles, GraduationCap } from 'lucide-react';
import { submitPublicTestimonial } from '../../services/api';

interface Props {
    onClose?: () => void;
    onSuccess?: () => void;
}

export default function TestimonialSubmitForm({ onClose, onSuccess }: Props) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('Student');
    const [university, setUniversity] = useState('');
    const [department, setDepartment] = useState('');
    const [batch, setBatch] = useState('');
    const [quote, setQuote] = useState('');
    const [rating, setRating] = useState(5);
    const [category, setCategory] = useState('student');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setErrorMsg('অনুগ্রহ করে আপনার নাম প্রদান করুন।');
            return;
        }
        if (!quote.trim()) {
            setErrorMsg('অনুগ্রহ করে আপনার মতামত লিখুন।');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');

        try {
            await submitPublicTestimonial({
                name: name.trim(),
                role: role.trim() || 'Student',
                university: university.trim(),
                department: department.trim(),
                batch: batch.trim(),
                fullQuote: quote.trim(),
                rating,
                category,
            });
            setSubmitted(true);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Testimonial submission error:', err);
            const apiMsg = err.response?.data?.error?.message || err.response?.data?.message;
            setErrorMsg(apiMsg || 'মতামত জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.05] p-8 text-center backdrop-blur-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500 shadow-lg mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-text dark:text-dark-text mb-2">ধন্যবাদ! আপনার রিভিউ জমা হয়েছে</h3>
                <p className="text-sm text-text-muted dark:text-dark-text/60 leading-relaxed mb-6 max-w-md mx-auto">
                    আপনার অমূল্য মতামত অ্যাডমিন অনুমোদনের জন্য অপেক্ষমান রয়েছে। রিভিউটি অনুমোদিত হলেই ওয়েবসাইটে প্রদর্শিত হবে।
                </p>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-500 transition-colors"
                    >
                        বন্ধ করুন
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="relative rounded-3xl border border-card-border/50 dark:border-white/[0.08] bg-white dark:bg-slate-900/95 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-full p-2 text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Close form"
                >
                    <X className="h-5 w-5" />
                </button>
            )}

            <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-text dark:text-dark-text">আপনার অভিজ্ঞতা শেয়ার করুন</h3>
                    <p className="text-xs text-text-muted dark:text-dark-text/50">CampusWay নিয়ে আপনার মতামত অন্যদের অনুপ্রাণিত করবে</p>
                </div>
            </div>

            {errorMsg && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-text/80 dark:text-dark-text/70 mb-1">
                            আপনার নাম <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="যেমন: মোঃ সাব্বির হোসেন"
                            className="w-full rounded-xl border border-card-border/60 dark:border-white/[0.1] bg-surface dark:bg-slate-800/60 px-4 py-2.5 text-sm text-text dark:text-dark-text focus:border-amber-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-text/80 dark:text-dark-text/70 mb-1">
                            ক্যাটাগরি
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-xl border border-card-border/60 dark:border-white/[0.1] bg-surface dark:bg-slate-800/60 px-4 py-2.5 text-sm text-text dark:text-dark-text focus:border-amber-500 focus:outline-none"
                        >
                            <option value="student">শিক্ষার্থী (Student)</option>
                            <option value="alumni">অ্যালামনাই / চান্সপ্রাপ্ত (Alumni)</option>
                            <option value="parent">অভিভাবক (Parent)</option>
                            <option value="teacher">শিক্ষক / মেন্টর (Teacher)</option>
                            <option value="other">অন্যান্য (Other)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-text/80 dark:text-dark-text/70 mb-1">
                            বিশ্ববিদ্যালয় / প্রতিষ্ঠান
                        </label>
                        <input
                            type="text"
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            placeholder="যেমন: ঢাকা বিশ্ববিদ্যালয়"
                            className="w-full rounded-xl border border-card-border/60 dark:border-white/[0.1] bg-surface dark:bg-slate-800/60 px-4 py-2.5 text-sm text-text dark:text-dark-text focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-text/80 dark:text-dark-text/70 mb-1">
                            ডিপার্টমেন্ট / বিভাগ
                        </label>
                        <input
                            type="text"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            placeholder="যেমন: সিএসই"
                            className="w-full rounded-xl border border-card-border/60 dark:border-white/[0.1] bg-surface dark:bg-slate-800/60 px-4 py-2.5 text-sm text-text dark:text-dark-text focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-text/80 dark:text-dark-text/70 mb-1">
                            ব্যাচ / শিক্ষাবর্ষ
                        </label>
                        <input
                            type="text"
                            value={batch}
                            onChange={(e) => setBatch(e.target.value)}
                            placeholder="যেমন: 2024-25"
                            className="w-full rounded-xl border border-card-border/60 dark:border-white/[0.1] bg-surface dark:bg-slate-800/60 px-4 py-2.5 text-sm text-text dark:text-dark-text focus:border-amber-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-text/80 dark:text-dark-text/70 mb-1">
                        রেটিং (Rating)
                    </label>
                    <div className="flex items-center gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="p-1 text-amber-400 focus:outline-none hover:scale-110 transition-transform"
                                aria-label={`Rate ${star} stars`}
                            >
                                <Star
                                    className={`h-6 w-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-text/80 dark:text-dark-text/70 mb-1">
                        আপনার মতামত / অভিজ্ঞতা <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                        rows={4}
                        placeholder="CampusWay কীভাবে আপনাকে সাহায্য করেছে বলুন..."
                        className="w-full rounded-xl border border-card-border/60 dark:border-white/[0.1] bg-surface dark:bg-slate-800/60 px-4 py-2.5 text-sm text-text dark:text-dark-text focus:border-amber-500 focus:outline-none"
                        required
                    />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-card-border/60 px-5 py-2.5 text-xs font-semibold text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            বাতিল
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 hover:opacity-95 disabled:opacity-50 transition-all"
                    >
                        <Send className="h-4 w-4" />
                        <span>{submitting ? 'জমা দেওয়া হচ্ছে...' : 'মতামত জমা দিন'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
