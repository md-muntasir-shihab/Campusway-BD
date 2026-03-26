import api from '../services/api';

export interface AdminHelpCategory {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    isActive: boolean;
    displayOrder: number;
    articleCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface AdminHelpArticle {
    _id: string;
    title: string;
    slug: string;
    categoryId: string | { _id: string; name: string; slug: string };
    shortDescription: string;
    fullContent: string;
    tags: string[];
    isPublished: boolean;
    isFeatured: boolean;
    relatedArticleIds: Array<string | { _id: string; title: string; slug: string }>;
    viewsCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AdminHelpArticleFilters {
    page?: number;
    limit?: number;
    q?: string;
    categoryId?: string;
    isPublished?: boolean | '';
}

export interface AdminHelpArticleListResponse {
    items: AdminHelpArticle[];
    total: number;
    page: number;
    pages: number;
}

export interface AdminHelpCategoryInput {
    name: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
    displayOrder?: number;
}

export interface AdminHelpArticleInput {
    title: string;
    categoryId: string;
    shortDescription: string;
    fullContent: string;
    tags: string[];
    isPublished?: boolean;
    isFeatured?: boolean;
    relatedArticleIds?: string[];
}

export function getAdminHelpCategories(): Promise<AdminHelpCategory[]> {
    return api.get('/admin/help-center/categories').then((response) => {
        const payload = response.data as { data?: AdminHelpCategory[] };
        return payload.data ?? [];
    });
}

export function createAdminHelpCategory(input: AdminHelpCategoryInput): Promise<AdminHelpCategory> {
    return api.post('/admin/help-center/categories', input).then((response) => {
        const payload = response.data as { data?: AdminHelpCategory };
        return payload.data as AdminHelpCategory;
    });
}

export function updateAdminHelpCategory(id: string, input: Partial<AdminHelpCategoryInput>): Promise<AdminHelpCategory> {
    return api.put(`/admin/help-center/categories/${id}`, input).then((response) => {
        const payload = response.data as { data?: AdminHelpCategory };
        return payload.data as AdminHelpCategory;
    });
}

export function deleteAdminHelpCategory(id: string): Promise<void> {
    return api.delete(`/admin/help-center/categories/${id}`).then(() => undefined);
}

export function getAdminHelpArticles(filters: AdminHelpArticleFilters = {}): Promise<AdminHelpArticleListResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (typeof filters.page === 'number') params.page = filters.page;
    if (typeof filters.limit === 'number') params.limit = filters.limit;
    if (filters.q) params.q = filters.q;
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (typeof filters.isPublished === 'boolean') params.isPublished = filters.isPublished;
    return api.get('/admin/help-center/articles', { params }).then((response) => response.data as AdminHelpArticleListResponse);
}

export function createAdminHelpArticle(input: AdminHelpArticleInput): Promise<AdminHelpArticle> {
    return api.post('/admin/help-center/articles', input).then((response) => {
        const payload = response.data as { data?: AdminHelpArticle };
        return payload.data as AdminHelpArticle;
    });
}

export function updateAdminHelpArticle(id: string, input: Partial<AdminHelpArticleInput>): Promise<AdminHelpArticle> {
    return api.put(`/admin/help-center/articles/${id}`, input).then((response) => {
        const payload = response.data as { data?: AdminHelpArticle };
        return payload.data as AdminHelpArticle;
    });
}

export function deleteAdminHelpArticle(id: string): Promise<void> {
    return api.delete(`/admin/help-center/articles/${id}`).then(() => undefined);
}

export function publishAdminHelpArticle(id: string): Promise<AdminHelpArticle> {
    return api.post(`/admin/help-center/articles/${id}/publish`).then((response) => {
        const payload = response.data as { data?: AdminHelpArticle };
        return payload.data as AdminHelpArticle;
    });
}

export function unpublishAdminHelpArticle(id: string): Promise<AdminHelpArticle> {
    return api.post(`/admin/help-center/articles/${id}/unpublish`).then((response) => {
        const payload = response.data as { data?: AdminHelpArticle };
        return payload.data as AdminHelpArticle;
    });
}
