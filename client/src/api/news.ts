import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';
import { AuditLogEntry, NewsItem, NewsSettings, NewsStatus, RssSource } from '../types/news';

export const newsQueryKeys = {
  newsSettings: ['newsSettings'] as const,
  newsList: (filters: Record<string, unknown>) => ['newsList', filters] as const,
  newsDetail: (slug: string) => ['newsDetail', slug] as const,
  newsSources: ['newsSources'] as const,
  adminNewsList: (status: string, filters: Record<string, unknown>) => ['adminNewsList', status, filters] as const,
  adminNewsItem: (id: string) => ['adminNewsItem', id] as const,
  adminRssSources: ['adminRssSources'] as const,
  adminNewsSettings: ['adminNewsSettings'] as const
};

const adminConfig = { headers: { Authorization: 'Bearer dev-admin-token' } };

export const useNewsSettingsQuery = () =>
  useQuery({
    queryKey: newsQueryKeys.newsSettings,
    queryFn: async () => (await http.get('/news/settings')).data.data as Partial<NewsSettings>
  });

export const useNewsSourcesQuery = () =>
  useQuery({
    queryKey: newsQueryKeys.newsSources,
    queryFn: async () => (await http.get('/news/sources')).data.data.items as RssSource[]
  });

export const useNewsListQuery = (filters: Record<string, unknown>) =>
  useQuery({
    queryKey: newsQueryKeys.newsList(filters),
    queryFn: async () => (await http.get('/news', { params: filters })).data.data as {
      items: NewsItem[];
      total: number;
      page: number;
      pages: number;
    }
  });

export const useNewsDetailQuery = (slug: string) =>
  useQuery({
    queryKey: newsQueryKeys.newsDetail(slug),
    enabled: Boolean(slug),
    queryFn: async () => (await http.get(`/news/${slug}`)).data.data as { item: NewsItem; related: NewsItem[] }
  });

export const useAdminNewsListQuery = (status: string, filters: Record<string, unknown>) =>
  useQuery({
    queryKey: newsQueryKeys.adminNewsList(status, filters),
    queryFn: async () => (await http.get('/admin/news', { ...adminConfig, params: { status, ...filters } })).data.data as {
      items: NewsItem[];
      total: number;
      page: number;
      pages: number;
    }
  });

export const useAdminNewsItemQuery = (id: string) =>
  useQuery({
    queryKey: newsQueryKeys.adminNewsItem(id),
    enabled: Boolean(id),
    queryFn: async () => (await http.get(`/admin/news/${id}`, adminConfig)).data.data.item as NewsItem
  });

export const useAdminRssSourcesQuery = () =>
  useQuery({
    queryKey: newsQueryKeys.adminRssSources,
    queryFn: async () => (await http.get('/admin/rss-sources', adminConfig)).data.data.items as RssSource[]
  });

export const useAdminNewsSettingsQuery = () =>
  useQuery({
    queryKey: newsQueryKeys.adminNewsSettings,
    queryFn: async () => (await http.get('/admin/news-settings', adminConfig)).data.data as Partial<NewsSettings>
  });

const invalidateNews = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: newsQueryKeys.newsSettings });
  queryClient.invalidateQueries({ queryKey: ['newsList'] });
  queryClient.invalidateQueries({ queryKey: ['newsDetail'] });
  queryClient.invalidateQueries({ queryKey: ['adminNewsList'] });
  queryClient.invalidateQueries({ queryKey: ['adminNewsItem'] });
  queryClient.invalidateQueries({ queryKey: newsQueryKeys.adminRssSources });
  queryClient.invalidateQueries({ queryKey: newsQueryKeys.adminNewsSettings });
  queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
};

export const useSaveAdminNewsItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<NewsItem> & { _id?: string }) => {
      if (payload._id) {
        return (await http.put(`/admin/news/${payload._id}`, payload, adminConfig)).data.data as NewsItem;
      }
      return (await http.post('/admin/news', payload, adminConfig)).data.data as NewsItem;
    },
    onSuccess: () => invalidateNews(queryClient)
  });
};

export const useDeleteAdminNewsItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await http.delete(`/admin/news/${id}`, adminConfig)).data.data,
    onSuccess: () => invalidateNews(queryClient)
  });
};

export const useAdminWorkflowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { action: string; id: string; body?: Record<string, unknown> }) => {
      const actionMap: Record<string, string> = {
        approve: `/admin/news/${payload.id}/approve`,
        approvePublish: `/admin/news/${payload.id}/approve-publish`,
        reject: `/admin/news/${payload.id}/reject`,
        schedule: `/admin/news/${payload.id}/schedule`,
        moveToDraft: `/admin/news/${payload.id}/move-to-draft`,
        publishAnyway: `/admin/news/${payload.id}/duplicate/publish-anyway`,
        mergeDuplicate: `/admin/news/${payload.id}/duplicate/merge`
      };
      const url = actionMap[payload.action];
      if (!url) throw new Error('Unknown workflow action');
      return (await http.post(url, payload.body || {}, adminConfig)).data.data;
    },
    onSuccess: () => invalidateNews(queryClient)
  });
};

export const useSaveRssSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<RssSource> & { _id?: string }) => {
      if (payload._id) {
        return (await http.put(`/admin/rss-sources/${payload._id}`, payload, adminConfig)).data.data as RssSource;
      }
      return (await http.post('/admin/rss-sources', payload, adminConfig)).data.data as RssSource;
    },
    onSuccess: () => invalidateNews(queryClient)
  });
};

export const useDeleteRssSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await http.delete(`/admin/rss-sources/${id}`, adminConfig)).data.data,
    onSuccess: () => invalidateNews(queryClient)
  });
};

export const useTestRssSource = () =>
  useMutation({
    mutationFn: async (id: string) => (await http.post(`/admin/rss-sources/${id}/test`, {}, adminConfig)).data.data as { ok: boolean; preview: unknown[] }
  });

export const useFetchRssNow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceIds: string[] = []) => (await http.post('/admin/rss/fetch-now', { sourceIds }, adminConfig)).data.data,
    onSuccess: () => invalidateNews(queryClient)
  });
};

export const useSaveNewsSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<NewsSettings>) => (await http.put('/admin/news-settings', payload, adminConfig)).data.data as NewsSettings,
    onSuccess: () => invalidateNews(queryClient)
  });
};

export const useUploadNewsMedia = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return (await http.post('/admin/media/upload', formData, {
        headers: {
          ...adminConfig.headers,
          'Content-Type': 'multipart/form-data'
        }
      })).data.data as { url: string; filename: string; size: number };
    }
  });

export const useAuditLogsQuery = (module = 'news', page = 1, limit = 50) =>
  useQuery({
    queryKey: ['auditLogs', module, page, limit],
    queryFn: async () => (await http.get('/admin/audit-logs', { ...adminConfig, params: { module, page, limit } })).data.data as {
      items: AuditLogEntry[];
      total: number;
      page: number;
      pages: number;
    }
  });

export const useTrackNewsShare = () =>
  useMutation({
    mutationFn: async (payload: { slug: string; channel: string }) =>
      (await http.post('/news/share/track', payload)).data.data
  });

export const downloadNewsExport = async (params: { type: 'csv' | 'xlsx'; status?: NewsStatus | 'all'; dateRange?: string; sourceId?: string }) => {
  const response = await http.get('/admin/news/export', {
    ...adminConfig,
    params,
    responseType: 'blob'
  });
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `news_export.${params.type}`;
  link.click();
  URL.revokeObjectURL(link.href);
};

