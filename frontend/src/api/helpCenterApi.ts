import api from '../services/api';

export interface PublicHelpCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

export interface PublicHelpArticleSummary {
  _id: string;
  title: string;
  slug: string;
  categoryId?: string;
  shortDescription?: string;
  tags?: string[];
  isFeatured?: boolean;
  viewsCount?: number;
  createdAt?: string;
}

export interface PublicHelpArticleDetail {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  tags?: string[];
  isFeatured?: boolean;
  viewsCount?: number;
  createdAt?: string;
  fullContent?: string;
  helpfulCount?: number;
  notHelpfulCount?: number;
  categoryId?: { _id?: string; name?: string; slug?: string } | string;
  relatedArticleIds?: Array<{ _id?: string; title?: string; slug?: string; shortDescription?: string }>;
}

export const getPublicHelpCenter = () =>
  api.get<{ categories: PublicHelpCategory[]; articles: PublicHelpArticleSummary[] }>('/help-center').then(r => r.data);

export const searchPublicHelpArticles = (q: string) =>
  api.get<{ articles: PublicHelpArticleSummary[] }>('/help-center/search', { params: { q } }).then(r => r.data);

export const getPublicHelpArticle = (slug: string) =>
  api.get<{ article: PublicHelpArticleDetail }>(`/help-center/${slug}`).then(r => r.data);

export const submitHelpArticleFeedback = (slug: string, helpful: boolean) =>
  api.post<{ message: string }>(`/help-center/${slug}/feedback`, { helpful }).then(r => r.data);
