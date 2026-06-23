import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getExamLeaderboardStreamUrl, getBrainClashStreamUrl } from '../services/api';

// ─── API Clients ─────────────────────────────────────────────────────────
import * as hierarchyApi from '../api/questionHierarchyApi';
import * as questionBankApi from '../api/questionBankApi';
import * as examBuilderApi from '../api/examBuilderApi';
import * as examRunnerApi from '../api/examRunnerApi';
import * as gamificationApi from '../api/gamificationApi';
import * as battleApi from '../api/battleApi';
import * as mistakeVaultApi from '../api/mistakeVaultApi';
import * as practiceApi from '../api/practiceApi';
import * as studyRoutineApi from '../api/studyRoutineApi';
import * as doubtsApi from '../api/doubtsApi';
import * as examinerApi from '../api/examinerApi';
import * as examPackagesApi from '../api/examPackagesApi';
import * as adaptiveDifficultyApi from '../api/adaptiveDifficultyApi';
import * as brainClashApi from '../api/brainClashApi';

// ─── Types ───────────────────────────────────────────────────────────────
import type {
    CreateGroupDto,
    UpdateGroupDto,
    CreateSubGroupDto,
    CreateSubjectDto,
    CreateChapterDto,
    CreateTopicDto,
    QuestionFilters,
    CreateQuestionDto,
    UpdateQuestionDto,
    BulkActionDto,
    ReviewActionDto,
    ExamInfoDto,
    QuestionSelectionDto,
    AutoPickConfig,
    ExamSettingsDto,
    ExamSchedulingDto,
    DeviceInfo,
    AnswerUpdate,
    PaginationParams,
    BattleChallengeDto,
    BattleAnswerDto,
    MistakeVaultFilters,
    StudyRoutineDto,
    DoubtCreateDto,
    DoubtReplyDto,
    DoubtVoteDto,
    ExaminerApplicationDto,
    ExamPackageDto,
    HierarchyLevel,
    ReorderNodesDto,
    MergeNodesDto,
} from '../types/exam-system';

// ═════════════════════════════════════════════════════════════════════════
// Query Key Factory
// ═════════════════════════════════════════════════════════════════════════

export const examSystemKeys = {
    // Hierarchy
    hierarchy: ['examSystem', 'hierarchy'] as const,
    hierarchyTree: ['examSystem', 'hierarchy', 'tree'] as const,

    // Question Bank
    questions: ['examSystem', 'questions'] as const,
    questionList: (filters: QuestionFilters) =>
        ['examSystem', 'questions', 'list', filters] as const,
    questionDetail: (id: string) =>
        ['examSystem', 'questions', 'detail', id] as const,

    // Exam Builder
    exams: ['examSystem', 'exams'] as const,
    examPreview: (examId: string) =>
        ['examSystem', 'exams', 'preview', examId] as const,

    // Exam Runner
    examSession: (examId: string) =>
        ['examSystem', 'examRunner', 'session', examId] as const,
    examResult: (examId: string) =>
        ['examSystem', 'examRunner', 'result', examId] as const,
    examLeaderboard: (examId: string, params?: PaginationParams) =>
        ['examSystem', 'examRunner', 'leaderboard', examId, params] as const,

    // Gamification
    gamification: ['examSystem', 'gamification'] as const,
    gamificationProfile: ['examSystem', 'gamification', 'profile'] as const,
    weeklyLeaderboard: (params?: PaginationParams) =>
        ['examSystem', 'gamification', 'leaderboard', 'weekly', params] as const,
    globalLeaderboard: (params?: PaginationParams) =>
        ['examSystem', 'gamification', 'leaderboard', 'global', params] as const,
    badges: ['examSystem', 'gamification', 'badges'] as const,
    myBadges: ['examSystem', 'gamification', 'myBadges'] as const,
    points: ['examSystem', 'gamification', 'points'] as const,

    // Battle
    battles: ['examSystem', 'battles'] as const,
    battleHistory: (params?: PaginationParams) =>
        ['examSystem', 'battles', 'history', params] as const,

    // Mistake Vault
    mistakes: ['examSystem', 'mistakeVault'] as const,
    mistakeList: (filters?: MistakeVaultFilters) =>
        ['examSystem', 'mistakeVault', 'list', filters] as const,

    // Practice
    practice: ['examSystem', 'practice'] as const,
    practiceSession: (topicId: string) =>
        ['examSystem', 'practice', 'session', topicId] as const,

    // Study Routine
    studyRoutine: ['examSystem', 'studyRoutine'] as const,

    // Doubts
    doubts: ['examSystem', 'doubts'] as const,
    doubtThreads: (questionId: string) =>
        ['examSystem', 'doubts', 'threads', questionId] as const,

    // Examiner
    examiner: ['examSystem', 'examiner'] as const,
    examinerDashboard: ['examSystem', 'examiner', 'dashboard'] as const,
    examinerEarnings: ['examSystem', 'examiner', 'earnings'] as const,

    // Exam Packages
    packages: ['examSystem', 'packages'] as const,
    packageList: (params?: PaginationParams) =>
        ['examSystem', 'packages', 'list', params] as const,

    // Adaptive Difficulty
    adaptiveDifficulty: ['examSystem', 'adaptiveDifficulty'] as const,
    topicDifficulty: (topicId: string) =>
        ['examSystem', 'adaptiveDifficulty', 'topic', topicId] as const,
    allDifficulties: ['examSystem', 'adaptiveDifficulty', 'all'] as const,

    // Brain Clash (Live 1v1 Battle)
    brainClash: ['examSystem', 'brainClash'] as const,
    brainClashDetails: (battleId: string) =>
        ['examSystem', 'brainClash', 'details', battleId] as const,
    brainClashHistory: (params?: PaginationParams) =>
        ['examSystem', 'brainClash', 'history', params] as const,
} as const;


// ═════════════════════════════════════════════════════════════════════════
// 1. Hierarchy Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Fetch the full hierarchy tree (Group → Sub-Group → Subject → Chapter → Topic). */
export const useHierarchyTree = () =>
    useQuery({
        queryKey: examSystemKeys.hierarchyTree,
        queryFn: hierarchyApi.getTree,
        staleTime: 5 * 60 * 1000,
    });

/** Create a top-level group. */
export const useCreateGroup = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateGroupDto) => hierarchyApi.createGroup(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Update a group. */
export const useUpdateGroup = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateGroupDto }) =>
            hierarchyApi.updateGroup(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Delete a group (rejected if children exist). */
export const useDeleteGroup = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => hierarchyApi.deleteGroup(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Create a sub-group under a group. */
export const useCreateSubGroup = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateSubGroupDto) => hierarchyApi.createSubGroup(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Create a subject under a sub-group. */
export const useCreateSubject = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateSubjectDto) => hierarchyApi.createSubject(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Create a chapter under a subject. */
export const useCreateChapter = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateChapterDto) => hierarchyApi.createChapter(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Create a topic under a chapter. */
export const useCreateTopic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateTopicDto) => hierarchyApi.createTopic(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Reorder nodes at a hierarchy level. */
export const useReorderNodes = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ level, id, payload }: { level: HierarchyLevel; id: string; payload: ReorderNodesDto }) =>
            hierarchyApi.reorderNodes(level, id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Merge two nodes at the same hierarchy level. */
export const useMergeNodes = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ level, payload }: { level: HierarchyLevel; payload: MergeNodesDto }) =>
            hierarchyApi.mergeNodes(level, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Update a sub-group. */
export const useUpdateSubGroup = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateGroupDto }) =>
            hierarchyApi.updateSubGroup(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Update a subject. */
export const useUpdateSubject = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateGroupDto }) =>
            hierarchyApi.updateSubject(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Update a chapter. */
export const useUpdateChapter = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateGroupDto }) =>
            hierarchyApi.updateChapter(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Update a topic. */
export const useUpdateTopic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateGroupDto }) =>
            hierarchyApi.updateTopic(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Delete a sub-group. */
export const useDeleteSubGroup = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => hierarchyApi.deleteSubGroup(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Delete a subject. */
export const useDeleteSubject = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => hierarchyApi.deleteSubject(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Delete a chapter. */
export const useDeleteChapter = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => hierarchyApi.deleteChapter(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

/** Delete a topic. */
export const useDeleteTopic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => hierarchyApi.deleteTopic(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.hierarchyTree });
        },
    });
};

// ═════════════════════════════════════════════════════════════════════════
// 2. Question Bank Hooks
// ═════════════════════════════════════════════════════════════════════════

/** List/search questions with filters and pagination. */
export const useQuestions = (filters: QuestionFilters) =>
    useQuery({
        queryKey: examSystemKeys.questionList(filters),
        queryFn: () => questionBankApi.listQuestions(filters),
        placeholderData: (prev) => prev,
    });

/** Get a single question by ID. */
export const useQuestion = (id: string) =>
    useQuery({
        queryKey: examSystemKeys.questionDetail(id),
        queryFn: () => questionBankApi.getQuestion(id),
        enabled: !!id,
    });

/** Create a new question. */
export const useCreateQuestion = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateQuestionDto) => questionBankApi.createQuestion(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.questions });
        },
    });
};

/** Update a question (creates revision if referenced by published exam). */
export const useUpdateQuestion = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateQuestionDto }) =>
            questionBankApi.updateQuestion(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.questions });
        },
    });
};

/** Archive (soft-delete) a question. */
export const useArchiveQuestion = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => questionBankApi.archiveQuestion(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.questions });
        },
    });
};

/** Bulk operations on questions (archive, status change, category reassign). */
export const useBulkAction = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: BulkActionDto) => questionBankApi.bulkAction(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.questions });
        },
    });
};

/** Approve or reject a question. */
export const useReviewQuestion = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ReviewActionDto }) =>
            questionBankApi.reviewQuestion(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.questions });
        },
    });
};

/** Import questions from a file (Excel/CSV/JSON) with optional column mapping. */
export const useImportQuestions = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ file, mapping }: { file: File; mapping?: Record<string, string> }) =>
            questionBankApi.importQuestions(file, mapping),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.questions });
        },
    });
};

/** Check for potential duplicate questions via text similarity. */
export const useCheckDuplicate = () => {
    return useMutation({
        mutationFn: (questionText: string) => questionBankApi.checkDuplicate(questionText),
    });
};

// ═════════════════════════════════════════════════════════════════════════
// 3. Exam Builder Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Create a new exam draft (Step 1). */
export const useCreateDraft = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: ExamInfoDto) => examBuilderApi.createDraft(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.exams });
        },
    });
};

/** Set selected questions on an exam (Step 2 manual). */
export const useUpdateQuestions = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ examId, payload }: { examId: string; payload: QuestionSelectionDto }) =>
            examBuilderApi.updateQuestions(examId, payload),
        onSuccess: (_data, { examId }) => {
            qc.invalidateQueries({ queryKey: examSystemKeys.examPreview(examId) });
        },
    });
};

/** Auto-pick questions by difficulty distribution (Step 2 auto). */
export const useAutoPick = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ examId, payload }: { examId: string; payload: AutoPickConfig }) =>
            examBuilderApi.autoPick(examId, payload),
        onSuccess: (_data, { examId }) => {
            qc.invalidateQueries({ queryKey: examSystemKeys.examPreview(examId) });
        },
    });
};

/** Update exam settings (Step 3). */
export const useUpdateSettings = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ examId, payload }: { examId: string; payload: ExamSettingsDto }) =>
            examBuilderApi.updateSettings(examId, payload),
        onSuccess: (_data, { examId }) => {
            qc.invalidateQueries({ queryKey: examSystemKeys.examPreview(examId) });
        },
    });
};

/** Update scheduling and pricing (Step 4). */
export const useUpdateScheduling = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ examId, payload }: { examId: string; payload: ExamSchedulingDto }) =>
            examBuilderApi.updateScheduling(examId, payload),
        onSuccess: (_data, { examId }) => {
            qc.invalidateQueries({ queryKey: examSystemKeys.examPreview(examId) });
        },
    });
};

/** Publish a draft exam (Step 5). */
export const usePublishExam = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (examId: string) => examBuilderApi.publishExam(examId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.exams });
        },
    });
};

/** Clone an existing exam as a new draft. */
export const useCloneExam = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (examId: string) => examBuilderApi.cloneExam(examId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.exams });
        },
    });
};

/** List exams for the Exam Center management table. */
export const useExamList = (params?: { status?: string }) =>
    useQuery({
        queryKey: [...examSystemKeys.exams, 'list', params ?? {}],
        queryFn: () => examBuilderApi.listExams(params),
    });

/** Delete an exam (refused server-side if it already has participant results). */
export const useDeleteExam = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (examId: string) => examBuilderApi.deleteExam(examId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.exams });
        },
    });
};

/** Preview exam with questions (read-only). */
export const usePreviewExam = (examId: string) =>
    useQuery({
        queryKey: examSystemKeys.examPreview(examId),
        queryFn: () => examBuilderApi.previewExam(examId),
        enabled: !!examId,
    });

// ═════════════════════════════════════════════════════════════════════════
// 4. Exam Runner Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Start an exam session. */
export const useStartExam = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ examId, deviceInfo }: { examId: string; deviceInfo: DeviceInfo }) =>
            examRunnerApi.startExam(examId, deviceInfo),
        onSuccess: (_data, { examId }) => {
            qc.invalidateQueries({ queryKey: examSystemKeys.examSession(examId) });
        },
    });
};

/**
 * Auto-save answers with optimistic update.
 * Immediately updates the cached session data before the server responds,
 * rolling back on error for a seamless auto-save experience.
 */
export const useSaveAnswers = (examId: string, sessionId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (answers: AnswerUpdate[]) =>
            examRunnerApi.saveAnswers(sessionId, answers),
        onMutate: async (answers) => {
            // Cancel outgoing refetches so they don't overwrite our optimistic update
            await qc.cancelQueries({ queryKey: examSystemKeys.examSession(examId) });

            // Snapshot the previous value
            const previous = qc.getQueryData(examSystemKeys.examSession(examId));

            // Optimistically update the cached session with the new answers
            qc.setQueryData(examSystemKeys.examSession(examId), (old: unknown) => {
                if (!old || typeof old !== 'object') return old;
                const record = old as Record<string, unknown>;
                const existingAnswers = (Array.isArray(record.answers) ? record.answers : []) as AnswerUpdate[];
                const answerMap = new Map(existingAnswers.map((a) => [a.questionId, a]));
                for (const answer of answers) {
                    answerMap.set(answer.questionId, answer);
                }
                return { ...record, answers: Array.from(answerMap.values()) };
            });

            return { previous };
        },
        onError: (_err, _answers, context) => {
            // Roll back to the previous value on error
            if (context?.previous) {
                qc.setQueryData(examSystemKeys.examSession(examId), context.previous);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.examSession(examId) });
        },
    });
};

/** Submit an exam session (manual or auto on timer expiry). */
export const useSubmitExam = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ examId, sessionId }: { examId: string; sessionId?: string }) =>
            examRunnerApi.submitExam(examId, sessionId ? { sessionId } : undefined),
        onSuccess: (_data, { examId }) => {
            qc.invalidateQueries({ queryKey: examSystemKeys.examSession(examId) });
            qc.invalidateQueries({ queryKey: examSystemKeys.examResult(examId) });
            qc.invalidateQueries({ queryKey: examSystemKeys.gamification });
            qc.invalidateQueries({ queryKey: examSystemKeys.mistakes });
        },
    });
};

/** Get exam result for the authenticated student. */
export const useExamResult = (examId: string, enabled = true) =>
    useQuery({
        queryKey: examSystemKeys.examResult(examId),
        queryFn: () => examRunnerApi.getResult(examId),
        enabled: !!(enabled && examId),
    });

/** Get exam leaderboard (paginated). */
export const useExamLeaderboard = (examId: string, params?: PaginationParams) =>
    useQuery({
        queryKey: examSystemKeys.examLeaderboard(examId, params),
        queryFn: () => examRunnerApi.getLeaderboard(examId, params),
        enabled: !!examId,
    });

// ═════════════════════════════════════════════════════════════════════════
// 5. Gamification Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Get the student's gamification profile (XP, Coins, Streak, League, Badges). */
export const useGamificationProfile = () =>
    useQuery({
        queryKey: examSystemKeys.gamificationProfile,
        queryFn: gamificationApi.getProfile,
    });

/** Get the weekly leaderboard. */
export const useWeeklyLeaderboard = (params?: PaginationParams) =>
    useQuery({
        queryKey: examSystemKeys.weeklyLeaderboard(params),
        queryFn: () => gamificationApi.getWeeklyLeaderboard(params),
    });

/** Get the global leaderboard. */
export const useGlobalLeaderboard = (params?: PaginationParams) =>
    useQuery({
        queryKey: examSystemKeys.globalLeaderboard(params),
        queryFn: () => gamificationApi.getGlobalLeaderboard(params),
    });

/** Get all active badges. */
export const useBadges = () =>
    useQuery({
        queryKey: examSystemKeys.badges,
        queryFn: gamificationApi.getBadges,
    });

/** Get student's earned badges. */
export const useMyBadges = () =>
    useQuery({
        queryKey: examSystemKeys.myBadges,
        queryFn: gamificationApi.getStudentBadges,
    });

/** Get student points/coins. */
export const useUserPoints = () =>
    useQuery({
        queryKey: examSystemKeys.points,
        queryFn: gamificationApi.getUserPoints,
    });

/** Claim daily login bonus. */
export const useClaimDailyBonus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: gamificationApi.claimDailyBonus,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.gamificationProfile });
            qc.invalidateQueries({ queryKey: examSystemKeys.points });
        },
    });
};

// ═════════════════════════════════════════════════════════════════════════
// 6. Battle Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Create a battle challenge. */
export const useCreateChallenge = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: BattleChallengeDto) => battleApi.createChallenge(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.battles });
        },
    });
};

/** Accept a pending battle challenge. */
export const useAcceptChallenge = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (battleId: string) => battleApi.acceptChallenge(battleId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.battles });
        },
    });
};

/** Submit an answer during an active battle. */
export const useSubmitBattleAnswer = () =>
    useMutation({
        mutationFn: ({ battleId, payload }: { battleId: string; payload: BattleAnswerDto }) =>
            battleApi.submitAnswer(battleId, payload),
    });

/** Get paginated battle history. */
export const useBattleHistory = (params?: PaginationParams) =>
    useQuery({
        queryKey: examSystemKeys.battleHistory(params),
        queryFn: () => battleApi.getBattleHistory(params),
    });

// ═════════════════════════════════════════════════════════════════════════
// 7. Mistake Vault Hooks
// ═════════════════════════════════════════════════════════════════════════

/** List the student's mistake vault entries with filters. */
export const useMistakes = (filters?: MistakeVaultFilters) =>
    useQuery({
        queryKey: examSystemKeys.mistakeList(filters),
        queryFn: () => mistakeVaultApi.listMistakes(filters),
        placeholderData: (prev) => prev,
    });

/** Create a retry practice session from filtered mistakes. */
export const useCreateRetrySession = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (filters?: Pick<MistakeVaultFilters, 'subject' | 'chapter' | 'topic' | 'masteryStatus'>) =>
            mistakeVaultApi.createRetrySession(filters),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.mistakes });
            qc.invalidateQueries({ queryKey: examSystemKeys.practice });
        },
    });
};

// ═════════════════════════════════════════════════════════════════════════
// 8. Practice Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Start a practice session for a topic. */
export const useStartPractice = (topicId: string) =>
    useQuery({
        queryKey: examSystemKeys.practiceSession(topicId),
        queryFn: () => practiceApi.startPractice(topicId),
        enabled: !!topicId,
    });

/** Submit an answer during a practice session. */
export const useSubmitPracticeAnswer = () =>
    useMutation({
        mutationFn: ({ sessionId, payload }: { sessionId: string; payload: { questionId: string; answer: string } }) =>
            practiceApi.submitAnswer(sessionId, payload),
    });

// ═════════════════════════════════════════════════════════════════════════
// 9. Study Routine Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Get the student's study routine. */
export const useStudyRoutine = () =>
    useQuery({
        queryKey: examSystemKeys.studyRoutine,
        queryFn: studyRoutineApi.getRoutine,
    });

/** Update the student's study routine. */
export const useUpdateRoutine = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: StudyRoutineDto) => studyRoutineApi.updateRoutine(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.studyRoutine });
        },
    });
};

// ═════════════════════════════════════════════════════════════════════════
// 10. Doubt Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Create a new doubt thread for a question. */
export const useCreateDoubt = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: DoubtCreateDto) => doubtsApi.createDoubt(payload),
        onSuccess: (_data, payload) => {
            qc.invalidateQueries({ queryKey: examSystemKeys.doubtThreads(payload.questionId) });
        },
    });
};

/** Get doubt threads for a question. */
export const useDoubtThreads = (questionId: string) =>
    useQuery({
        queryKey: examSystemKeys.doubtThreads(questionId),
        queryFn: () => doubtsApi.getThreads(questionId),
        enabled: !!questionId,
    });

/** Post a reply to a doubt thread. */
export const usePostReply = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ threadId, payload }: { threadId: string; payload: DoubtReplyDto }) =>
            doubtsApi.postReply(threadId, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.doubts });
        },
    });
};

/** Vote on a reply in a doubt thread. */
export const useVote = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ threadId, payload }: { threadId: string; payload: DoubtVoteDto }) =>
            doubtsApi.vote(threadId, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.doubts });
        },
    });
};

// ═════════════════════════════════════════════════════════════════════════
// 11. Examiner Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Submit an examiner application. */
export const useApplyForExaminer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: ExaminerApplicationDto) => examinerApi.applyForExaminer(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.examiner });
        },
    });
};

/** Get examiner dashboard data. */
export const useExaminerDashboard = () =>
    useQuery({
        queryKey: examSystemKeys.examinerDashboard,
        queryFn: examinerApi.getDashboard,
    });

/** Get examiner revenue report. */
export const useExaminerEarnings = () =>
    useQuery({
        queryKey: examSystemKeys.examinerEarnings,
        queryFn: examinerApi.getEarnings,
    });

// ═════════════════════════════════════════════════════════════════════════
// 12. Exam Packages Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Create a new exam package (admin/examiner only). */
export const useCreatePackage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: ExamPackageDto) => examPackagesApi.createPackage(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.packages });
        },
    });
};

/** List active exam packages. */
export const usePackages = (params?: PaginationParams) =>
    useQuery({
        queryKey: examSystemKeys.packageList(params),
        queryFn: () => examPackagesApi.listPackages(params),
    });

/** Purchase an exam package. */
export const usePurchasePackage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ packageId, couponCode }: { packageId: string; couponCode?: string }) =>
            examPackagesApi.purchasePackage(packageId, couponCode),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: examSystemKeys.packages });
            qc.invalidateQueries({ queryKey: examSystemKeys.exams });
            qc.invalidateQueries({ queryKey: examSystemKeys.gamification });
        },
    });
};

const IS_MOCK_MODE = String(import.meta.env.VITE_USE_MOCK_API || '').toLowerCase() === 'true';

/**
 * Hook to subscribe to real-time leaderboard update stream using EventSource (SSE).
 * Automatically invalidates the exam leaderboard query cache on new broadcasts.
 */
export const useExamLeaderboardStream = (examId: string, enabled = true) => {
    const queryClient = useQueryClient();
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptRef = useRef(0);

    useEffect(() => {
        if (IS_MOCK_MODE || !enabled || !examId) {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            return;
        }

        let source: EventSource | null = null;
        let disposed = false;

        const invalidate = () => {
            queryClient.invalidateQueries({
                queryKey: ['examSystem', 'examRunner', 'leaderboard', examId],
            }).catch(() => undefined);
        };

        const clearReconnect = () => {
            if (!reconnectTimerRef.current) return;
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        };

        const closeSource = () => {
            if (!source) return;
            source.close();
            source = null;
        };

        const connect = () => {
            if (disposed) return;
            closeSource();
            
            source = new EventSource(getExamLeaderboardStreamUrl(examId), {
                withCredentials: true,
            });

            source.addEventListener('rank-update', invalidate);
            source.addEventListener('leaderboard-refresh', invalidate);
            source.addEventListener('ping', () => {});

            source.onopen = () => {
                clearReconnect();
                reconnectAttemptRef.current = 0;
            };

            source.onerror = () => {
                if (disposed) return;
                if (!reconnectTimerRef.current) {
                    const attempt = reconnectAttemptRef.current;
                    const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000);
                    const jitter = Math.floor(Math.random() * 1000);
                    const delay = baseDelay + jitter;
                    reconnectAttemptRef.current = attempt + 1;

                    reconnectTimerRef.current = setTimeout(() => {
                        reconnectTimerRef.current = null;
                        connect();
                    }, delay);
                }
            };
        };

        connect();

        const handlePageHide = () => {
            closeSource();
            clearReconnect();
        };

        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);

        return () => {
            disposed = true;
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            closeSource();
            clearReconnect();
        };
    }, [examId, enabled, queryClient]);
};

// ═════════════════════════════════════════════════════════════════════════
// 13. Adaptive Difficulty Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Get all topic difficulty records for the student. */
export const useAllTopicDifficulties = () =>
    useQuery({
        queryKey: examSystemKeys.allDifficulties,
        queryFn: adaptiveDifficultyApi.getAllMyDifficulties,
    });

/** Get difficulty for a specific topic. */
export const useTopicDifficulty = (topicId: string) =>
    useQuery({
        queryKey: examSystemKeys.topicDifficulty(topicId),
        queryFn: () => adaptiveDifficultyApi.getTopicDifficulty(topicId),
        enabled: !!topicId,
    });

// ═════════════════════════════════════════════════════════════════════════
// 14. Brain Clash Hooks
// ═════════════════════════════════════════════════════════════════════════

/** Get student's completed battle history. */
export const useBrainClashHistory = (params?: PaginationParams) =>
    useQuery({
        queryKey: examSystemKeys.brainClashHistory(params),
        queryFn: () => brainClashApi.getBattleHistory(params),
    });

/** Get battle details. */
export const useBrainClashDetails = (battleId: string) =>
    useQuery({
        queryKey: examSystemKeys.brainClashDetails(battleId),
        queryFn: () => brainClashApi.getBattleDetails(battleId),
        enabled: !!battleId,
    });

/** Mutation to join matchmaking queue. */
export const useJoinBrainClashQueue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (subjectId?: string) => brainClashApi.joinQueue(subjectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: examSystemKeys.brainClash });
        },
    });
};

/** Mutation to leave matchmaking queue. */
export const useLeaveBrainClashQueue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => brainClashApi.leaveQueue(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: examSystemKeys.brainClash });
        },
    });
};

/** Mutation to submit a battle answer. */
export const useSubmitBrainClashAnswer = (battleId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: { questionIndex: number; selectedAnswer: string; timeTakenMs: number }) =>
            brainClashApi.submitAnswer(battleId, payload.questionIndex, payload.selectedAnswer, payload.timeTakenMs),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: examSystemKeys.brainClashDetails(battleId) });
        },
    });
};

/** Hook to subscribe to live updates of an active battle session. */
export const useBrainClashLiveStream = (
    battleId: string,
    onUpdate: (data: any) => void,
    enabled = true,
) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!battleId || !enabled) return;

        let disposed = false;
        let source: EventSource | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

        const clearReconnect = () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
        };

        const closeSource = () => {
            if (source) {
                source.close();
                source = null;
            }
        };

        const connect = () => {
            if (disposed) return;
            closeSource();

            source = new EventSource(getBrainClashStreamUrl(battleId), {
                withCredentials: true,
            });

            source.onmessage = (event) => {
                if (disposed) return;
                try {
                    const data = JSON.parse(event.data);
                    onUpdate(data);
                    // Invalidating details so components re-fetch fresh state
                    queryClient.invalidateQueries({ queryKey: examSystemKeys.brainClashDetails(battleId) });
                } catch (err) {
                    console.error('Failed to parse Brain Clash SSE event:', err);
                }
            };

            source.onerror = () => {
                if (disposed) return;
                closeSource();
                clearReconnect();
                reconnectTimeout = setTimeout(connect, 5000);
            };
        };

        connect();

        const handlePageHide = () => {
            closeSource();
            clearReconnect();
        };

        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);

        return () => {
            disposed = true;
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            closeSource();
            clearReconnect();
        };
    }, [battleId, enabled, onUpdate, queryClient]);
};
