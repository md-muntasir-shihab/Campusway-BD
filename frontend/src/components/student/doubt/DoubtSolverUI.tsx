import { useCallback, useState } from 'react';
import {
    Brain,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    Loader2,
    MessageCircle,
    Pin,
    Send,
    ThumbsDown,
    ThumbsUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useCreateDoubt,
    useDoubtThreads,
    usePostReply,
    useVote,
} from '../../../hooks/useExamSystemQueries';
import type { DoubtReply, DoubtThread, VoteDirection } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════════

interface DoubtSolverUIProps {
    questionId: string;
    /** Compact mode shows just the button; expanded shows full thread */
    compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function AIExplanation({ explanation }: { explanation: string }) {
    return (
        <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI Explanation</span>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap">
                {explanation}
            </p>
        </div>
    );
}

function ReplyItem({
    reply,
    threadId,
    onVote,
    isVoting,
}: {
    reply: DoubtReply;
    threadId: string;
    onVote: (threadId: string, replyId: string, vote: VoteDirection) => void;
    isVoting: boolean;
}) {
    const replyId = reply._id ?? '';

    return (
        <div className={`rounded-lg border p-3 ${reply.isPinned
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
            }`}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    {reply.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                        {reply.author}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(reply.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap mb-3">
                {reply.content}
            </p>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => onVote(threadId, replyId, 'up')}
                    disabled={isVoting || !replyId}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
                    aria-label="Upvote"
                >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {reply.upvotes}
                </button>
                <button
                    type="button"
                    onClick={() => onVote(threadId, replyId, 'down')}
                    disabled={isVoting || !replyId}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    aria-label="Downvote"
                >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    {reply.downvotes}
                </button>
            </div>
        </div>
    );
}

function ReplyForm({
    threadId,
    onSubmit,
    isSubmitting,
}: {
    threadId: string;
    onSubmit: (threadId: string, content: string) => void;
    isSubmitting: boolean;
}) {
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSubmit(threadId, content.trim());
        setContent('');
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
            <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
            >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
        </form>
    );
}

function ThreadView({
    thread,
    onReply,
    onVote,
    isReplying,
    isVoting,
}: {
    thread: DoubtThread;
    onReply: (threadId: string, content: string) => void;
    onVote: (threadId: string, replyId: string, vote: VoteDirection) => void;
    isReplying: boolean;
    isVoting: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between px-4 py-3 text-left min-h-[44px]"
            >
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Doubt Thread</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${thread.status === 'resolved'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        }`}>
                        {thread.status}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                    {thread.aiExplanation && <AIExplanation explanation={thread.aiExplanation} />}

                    {thread.replies.length > 0 && (
                        <div className="space-y-2 mb-3">
                            {thread.replies.map((reply, idx) => (
                                <ReplyItem
                                    key={reply._id ?? idx}
                                    reply={reply}
                                    threadId={thread._id}
                                    onVote={onVote}
                                    isVoting={isVoting}
                                />
                            ))}
                        </div>
                    )}

                    <ReplyForm threadId={thread._id} onSubmit={onReply} isSubmitting={isReplying} />
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function DoubtSolverUI({ questionId, compact = false }: DoubtSolverUIProps) {
    const [isOpen, setIsOpen] = useState(!compact);

    const { data: threadsData, isLoading, refetch } = useDoubtThreads(questionId);
    const createDoubtMutation = useCreateDoubt();
    const postReplyMutation = usePostReply();
    const voteMutation = useVote();

    const threads: DoubtThread[] = (threadsData?.data ?? []) as unknown as DoubtThread[];
    const threadCount = threads.length;

    const handleCreateDoubt = useCallback(async () => {
        try {
            await createDoubtMutation.mutateAsync({ questionId });
            toast.success('Doubt submitted! AI explanation will appear shortly.');
            void refetch();
        } catch {
            toast.error('Failed to create doubt thread');
        }
    }, [questionId, createDoubtMutation, refetch]);

    const handleReply = useCallback(async (threadId: string, content: string) => {
        try {
            await postReplyMutation.mutateAsync({ threadId, payload: { content } });
            void refetch();
        } catch {
            toast.error('Failed to post reply');
        }
    }, [postReplyMutation, refetch]);

    const handleVote = useCallback(async (threadId: string, replyId: string, vote: VoteDirection) => {
        try {
            await voteMutation.mutateAsync({ threadId, payload: { replyId, vote } });
            void refetch();
        } catch {
            toast.error('Failed to vote');
        }
    }, [voteMutation, refetch]);

    // Compact mode: just a button with badge
    if (compact && !isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[40px]"
            >
                <HelpCircle className="h-4 w-4 text-amber-500" />
                Doubt
                {threadCount > 0 && (
                    <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {threadCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header with Doubt button */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                    Doubts
                    {threadCount > 0 && (
                        <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {threadCount}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    {compact && (
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            Close
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => void handleCreateDoubt()}
                        disabled={createDoubtMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 min-h-[40px]"
                    >
                        {createDoubtMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <HelpCircle className="h-3.5 w-3.5" />
                        )}
                        Ask Doubt
                    </button>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
            )}

            {/* Empty state */}
            {!isLoading && threads.length === 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No doubts yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Click &quot;Ask Doubt&quot; to get an AI explanation
                    </p>
                </div>
            )}

            {/* Threads */}
            {!isLoading && threads.map((thread) => (
                <ThreadView
                    key={thread._id}
                    thread={thread}
                    onReply={(tid, content) => void handleReply(tid, content)}
                    onVote={(tid, rid, v) => void handleVote(tid, rid, v)}
                    isReplying={postReplyMutation.isPending}
                    isVoting={voteMutation.isPending}
                />
            ))}
        </div>
    );
}
