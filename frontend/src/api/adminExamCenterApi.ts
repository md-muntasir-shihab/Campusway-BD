import api from "../services/api";

export type ExamCenterSyncMode = "none" | "fill_missing_only" | "overwrite_mapped_fields";

export type ExamCenterTemplate = {
    _id: string;
    name: string;
    description?: string;
    expectedColumns: string[];
    requiredColumns: string[];
    columnMapping: Record<string, string>;
    matchPriority: string[];
    profileUpdateFields: string[];
    recordOnlyFields: string[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type ExamCenterMappingProfile = {
    _id: string;
    name: string;
    description?: string;
    matchPriority: string[];
    fieldMapping: Record<string, string>;
    requiredColumns: string[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type ExamCenterLocation = {
    _id: string;
    name: string;
    address: string;
    code?: string;
    note?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type ExamImportPreviewRow = {
    rowNumber: number;
    mappedData: Record<string, unknown>;
    matchedStudentId?: string;
    matchedStudentLabel?: string;
    matchedBy?: string;
    matchedLogId?: string;
    issues: Array<{ issueType: string; reason: string; blocking: boolean }>;
    blocking: boolean;
};

export type ExamImportPreviewResponse = {
    message: string;
    job: {
        _id: string;
        previewToken: string;
        status: string;
        summary: {
            totalRows: number;
            matchedRows: number;
            unmatchedRows: number;
            duplicateMatches: number;
            invalidRows: number;
            committedRows: number;
            updatedProfiles: number;
            failedRows: number;
        };
        headers: string[];
        resolvedMapping: Record<string, string>;
        matchPriority: string[];
        profileUpdateFields: string[];
        recordOnlyFields: string[];
        rows: ExamImportPreviewRow[];
        totalPreviewRows: number;
    };
};

export type ExamImportLogResponse = {
    logs: Array<Record<string, unknown>>;
    issues: Array<Record<string, unknown>>;
};

export type ExamSyncLog = {
    _id: string;
    examId?: string;
    studentId?: string | { _id?: string; full_name?: string; username?: string; email?: string };
    source: string;
    status: string;
    syncMode: string;
    changedFields: string[];
    createdAt: string;
};

export type ExamCenterSettings = {
    defaultSyncMode: "fill_missing_only" | "overwrite_mapped_fields";
    autoCreateExamCenters: boolean;
    notifyStudentsOnSync: boolean;
    notifyGuardiansOnResult: boolean;
    allowExternalImports: boolean;
};

export const getExamImportTemplates = () =>
    api.get<{ templates: ExamCenterTemplate[] }>("/admin/exam-import-templates").then((res) => res.data.templates || []);

export const createExamImportTemplate = (payload: Partial<ExamCenterTemplate>) =>
    api.post<{ template: ExamCenterTemplate }>("/admin/exam-import-templates", payload).then((res) => res.data.template);

export const updateExamImportTemplate = (id: string, payload: Partial<ExamCenterTemplate>) =>
    api.put<{ template: ExamCenterTemplate }>(`/admin/exam-import-templates/${id}`, payload).then((res) => res.data.template);

export const deleteExamImportTemplate = (id: string) => api.delete(`/admin/exam-import-templates/${id}`);

export const getExamMappingProfiles = () =>
    api.get<{ profiles: ExamCenterMappingProfile[] }>("/admin/exam-mapping-profiles").then((res) => res.data.profiles || []);

export const createExamMappingProfile = (payload: Partial<ExamCenterMappingProfile>) =>
    api.post<{ profile: ExamCenterMappingProfile }>("/admin/exam-mapping-profiles", payload).then((res) => res.data.profile);

export const updateExamMappingProfile = (id: string, payload: Partial<ExamCenterMappingProfile>) =>
    api.put<{ profile: ExamCenterMappingProfile }>(`/admin/exam-mapping-profiles/${id}`, payload).then((res) => res.data.profile);

export const deleteExamMappingProfile = (id: string) => api.delete(`/admin/exam-mapping-profiles/${id}`);

export const getExamCenters = () =>
    api.get<{ centers: ExamCenterLocation[] }>("/admin/exam-centers").then((res) => res.data.centers || []);

export const createExamCenter = (payload: Partial<ExamCenterLocation>) =>
    api.post<{ center: ExamCenterLocation }>("/admin/exam-centers", payload).then((res) => res.data.center);

export const updateExamCenter = (id: string, payload: Partial<ExamCenterLocation>) =>
    api.put<{ center: ExamCenterLocation }>(`/admin/exam-centers/${id}`, payload).then((res) => res.data.center);

export const deleteExamCenter = (id: string) => api.delete(`/admin/exam-centers/${id}`);

export const previewExamImport = async (
    examId: string,
    file: File,
    options: {
        templateId?: string;
        mappingProfileId?: string;
        mapping?: Record<string, string>;
        matchPriority?: string[];
        syncProfileMode?: ExamCenterSyncMode;
    } = {},
) => {
    const formData = new FormData();
    formData.append("file", file);
    if (options.templateId) formData.append("templateId", options.templateId);
    if (options.mappingProfileId) formData.append("mappingProfileId", options.mappingProfileId);
    if (options.mapping && Object.keys(options.mapping).length > 0) formData.append("mapping", JSON.stringify(options.mapping));
    if (options.matchPriority && options.matchPriority.length > 0) formData.append("matchPriority", options.matchPriority.join(","));
    if (options.syncProfileMode) formData.append("syncProfileMode", options.syncProfileMode);
    return api.post<ExamImportPreviewResponse>(`/admin/exams/${examId}/import/preview`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => res.data);
};

export const commitExamImport = (examId: string, previewToken: string, syncProfileMode?: ExamCenterSyncMode) =>
    api.post<{ message: string; job: Record<string, unknown> }>(`/admin/exams/${examId}/import/commit`, {
        previewToken,
        syncProfileMode,
    }).then((res) => res.data);

export const getExamImportLogs = (examId: string) =>
    api.get<ExamImportLogResponse>(`/admin/exams/${examId}/import/logs`).then((res) => res.data);

export const runExamProfileSync = (examId: string) =>
    api.post<{ message: string; synced: number; failed: number }>(`/admin/exams/${examId}/profile-sync/run`).then((res) => res.data);

export const getExamProfileSyncLogs = (examId: string) =>
    api.get<{ logs: ExamSyncLog[] }>(`/admin/exams/${examId}/profile-sync/logs`).then((res) => res.data.logs || []);

export const getExamCenterSettings = () =>
    api.get<{ settings: ExamCenterSettings }>("/admin/exam-center-settings").then((res) => res.data.settings);

export const updateExamCenterSettings = (payload: ExamCenterSettings) =>
    api.put<{ settings: ExamCenterSettings }>("/admin/exam-center-settings", payload).then((res) => res.data.settings);
