import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    type FetchExamsParams,
    fetchExamDetail,
    fetchExamResult,
    fetchExamSolutions,
    fetchExams,
    probePdfEndpoint,
    fetchSessionQuestions,
    saveAnswers,
    startExamSession,
    submitExam,
} from "../api/examApi";
import type { SaveAnswersPayload } from "../types/exam";

/**
 * React Query keys used by the exam frontend module.
 * Keep this centralized so invalidation remains predictable across pages.
 */
export const examKeys = {
    all: ["exam"] as const,
    list: (filters: FetchExamsParams) => [...examKeys.all, "list", filters] as const,
    detail: (examId: string) => [...examKeys.all, "detail", examId] as const,
    session: (examId: string, sessionId: string) => [...examKeys.all, "session", examId, sessionId] as const,
    result: (examId: string, sessionId: string) => [...examKeys.all, "result", examId, sessionId] as const,
    solutions: (examId: string, sessionId: string) => [...examKeys.all, "solutions", examId, sessionId] as const,
    pdfAvailability: (url: string) => [...examKeys.all, "pdf", url] as const,
};

export const useExamList = (filters: FetchExamsParams) =>
    useQuery({
        queryKey: examKeys.list(filters),
        queryFn: () => fetchExams(filters),
    });

export const useExamDetail = (examId: string) =>
    useQuery({
        queryKey: examKeys.detail(examId),
        queryFn: () => fetchExamDetail(examId),
        enabled: Boolean(examId),
    });

export const useExamAccessForList = (examIds: string[]) =>
    useQueries({
        queries: examIds.map((examId) => ({
            queryKey: examKeys.detail(examId),
            queryFn: () => fetchExamDetail(examId),
            staleTime: 30_000,
        })),
    });

export const useStartSession = (examId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => startExamSession(examId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) }).catch(() => undefined);
            queryClient.invalidateQueries({ queryKey: [...examKeys.all, "list"] }).catch(() => undefined);
        },
    });
};

export const useSessionQuestions = (examId: string, sessionId?: string) =>
    useQuery({
        queryKey: examKeys.session(examId, sessionId || "none"),
        queryFn: () => fetchSessionQuestions(examId, String(sessionId)),
        enabled: Boolean(examId && sessionId),
    });

export const useSaveAnswers = (examId: string, sessionId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: SaveAnswersPayload) => saveAnswers(examId, sessionId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: examKeys.session(examId, sessionId) }).catch(() => undefined);
        },
    });
};

export const useSubmitExam = (examId: string, sessionId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => submitExam(examId, sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: examKeys.session(examId, sessionId) }).catch(() => undefined);
            queryClient.invalidateQueries({ queryKey: examKeys.result(examId, sessionId) }).catch(() => undefined);
            queryClient.invalidateQueries({ queryKey: [...examKeys.all, "list"] }).catch(() => undefined);
            queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) }).catch(() => undefined);
        },
    });
};

export const useExamResult = (examId: string, sessionId: string, enabled = true) =>
    useQuery({
        queryKey: examKeys.result(examId, sessionId),
        queryFn: () => fetchExamResult(examId, sessionId),
        enabled: Boolean(enabled && examId && sessionId),
        refetchInterval: (query) => {
            const data = query.state.data;
            return data && data.status === "locked" ? 10_000 : false;
        },
    });

export const useExamSolutions = (examId: string, sessionId: string, enabled = true) =>
    useQuery({
        queryKey: examKeys.solutions(examId, sessionId),
        queryFn: () => fetchExamSolutions(examId, sessionId),
        enabled: Boolean(enabled && examId && sessionId),
        refetchInterval: (query) => {
            const data = query.state.data;
            return data && data.status === "locked" ? 10_000 : false;
        },
    });

export const usePdfAvailability = (url: string, enabled = true) =>
    useQuery({
        queryKey: examKeys.pdfAvailability(url),
        queryFn: () => probePdfEndpoint(url),
        enabled: Boolean(enabled && url),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
