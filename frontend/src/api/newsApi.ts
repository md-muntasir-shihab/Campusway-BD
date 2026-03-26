import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export const getPublicNews = (params: Record<string, unknown>) => api.get("/news", { params }).then((r) => r.data);
export const getNewsDetail = (slug: string) => api.get(`/news/${slug}`).then((r) => r.data);
export const getNewsSettings = () => api.get("/news/settings").then((r) => r.data);
export const getNewsSources = () => api.get("/news/sources").then((r) => r.data);

export const getAdminNews = (params: Record<string, unknown>) => api.get("/admin/news", { params }).then((r) => r.data);
export const updateAdminNews = (id: string, payload: unknown) => api.put(`/admin/news/${id}`, payload).then((r) => r.data);
export const approvePublish = (id: string) => api.post(`/admin/news/${id}/approve-publish`).then((r) => r.data);
export const scheduleNews = (id: string, scheduledAt: string) =>
  api.post(`/admin/news/${id}/schedule`, { scheduledAt }).then((r) => r.data);
export const rejectNews = (id: string) => api.post(`/admin/news/${id}/reject`).then((r) => r.data);
export const moveToDraft = (id: string) => api.post(`/admin/news/${id}/move-to-draft`).then((r) => r.data);
