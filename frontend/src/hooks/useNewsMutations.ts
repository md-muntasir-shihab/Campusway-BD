import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approvePublish, moveToDraft, rejectNews, scheduleNews, updateAdminNews } from "../api/newsApi";

const invalidateAll = async (queryClient: ReturnType<typeof useQueryClient>, status?: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["adminNewsDashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["newsList"] }),
    queryClient.invalidateQueries({ queryKey: ["newsDetail"] }),
    queryClient.invalidateQueries({ queryKey: ["newsSources"] }),
    queryClient.invalidateQueries({ queryKey: ["adminNewsList"] }),
    queryClient.invalidateQueries({ queryKey: ["adminNewsList", status] }),
    queryClient.invalidateQueries({ queryKey: ["adminNewsItem"] }),
    queryClient.invalidateQueries({ queryKey: ["adminRssSources"] }),
    queryClient.invalidateQueries({ queryKey: ["adminNewsSettings"] }),
    queryClient.invalidateQueries({ queryKey: ["newsSettings"] }),
  ]);
};

export const useAdminNewsMutations = (status: string) => {
  const queryClient = useQueryClient();

  return {
    approveNow: useMutation({
      mutationFn: approvePublish,
      onSuccess: () => invalidateAll(queryClient, status)
    }),
    schedule: useMutation({
      mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) => scheduleNews(id, scheduledAt),
      onSuccess: () => invalidateAll(queryClient, status)
    }),
    reject: useMutation({
      mutationFn: rejectNews,
      onSuccess: () => invalidateAll(queryClient, status)
    }),
    draft: useMutation({
      mutationFn: moveToDraft,
      onSuccess: () => invalidateAll(queryClient, status)
    }),
    edit: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: unknown }) => updateAdminNews(id, payload),
      onSuccess: () => invalidateAll(queryClient, status)
    })
  };
};
