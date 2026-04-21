import api from '../services/api';

export interface AdminLegalPage {
    _id: string;
    slug: string;
    title: string;
    htmlContent: string;
    metaTitle: string;
    metaDescription: string;
    lastUpdatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AdminLegalPageListItem {
    _id: string;
    slug: string;
    title: string;
    updatedAt: string;
}

export interface LegalPageInput {
    slug: string;
    title: string;
    htmlContent: string;
    metaTitle: string;
    metaDescription: string;
}

export function getAdminLegalPages(): Promise<AdminLegalPageListItem[]> {
    return api.get('/admin/legal-pages').then((response) => {
        const payload = response.data as { pages?: AdminLegalPageListItem[] };
        return payload.pages ?? [];
    });
}

export function getAdminLegalPage(slug: string): Promise<AdminLegalPage> {
    return api.get(`/admin/legal-pages/${slug}`).then((response) => response.data as AdminLegalPage);
}

export function createAdminLegalPage(input: LegalPageInput): Promise<AdminLegalPage> {
    return api.post('/admin/legal-pages', input).then((response) => {
        const payload = response.data as { page?: AdminLegalPage };
        return payload.page as AdminLegalPage;
    });
}

export function updateAdminLegalPage(slug: string, input: Partial<LegalPageInput>): Promise<AdminLegalPage> {
    return api.put(`/admin/legal-pages/${slug}`, input).then((response) => {
        const payload = response.data as { page?: AdminLegalPage };
        return payload.page as AdminLegalPage;
    });
}

export function deleteAdminLegalPage(slug: string): Promise<void> {
    return api.delete(`/admin/legal-pages/${slug}`).then(() => undefined);
}
