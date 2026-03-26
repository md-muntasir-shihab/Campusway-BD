import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/index.css';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { NewsArticlePage } from './pages/NewsArticlePage';
import { AdminShell } from './pages/admin/AdminShell';
import { SiteSettingsPage } from './pages/admin/SiteSettingsPage';
import { HomeControlPage } from './pages/admin/HomeControlPage';
import { BannerManagerPage } from './pages/admin/BannerManagerPage';
import { SocialLinksPage } from './pages/admin/SocialLinksPage';
import { AdminNewsDashboardPage } from './pages/admin/news/AdminNewsDashboardPage';
import {
  AdminNewsAiSelectedPage,
  AdminNewsDraftsPage,
  AdminNewsDuplicatesPage,
  AdminNewsPendingPage,
  AdminNewsPublishedPage,
  AdminNewsRejectedPage,
  AdminNewsScheduledPage
} from './pages/admin/news/AdminNewsRoutePages';
import { AdminNewsEditorPage } from './pages/admin/news/AdminNewsEditorPage';
import { AdminNewsSourcesPage } from './pages/admin/news/AdminNewsSourcesPage';
import { AdminNewsSettingsPage } from './pages/admin/news/AdminNewsSettingsPage';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<NewsArticlePage />} />

          <Route path="/__cw_admin__" element={<AdminShell />}>
            <Route path="settings/site-settings" element={<SiteSettingsPage />} />
            <Route path="settings/home-control" element={<HomeControlPage />} />
            <Route path="settings/banner-manager" element={<BannerManagerPage />} />
            <Route path="settings/social-links" element={<SocialLinksPage />} />
            <Route path="settings/news-settings" element={<AdminNewsSettingsPage />} />

            <Route path="news/dashboard" element={<AdminNewsDashboardPage />} />
            <Route path="news/pending" element={<AdminNewsPendingPage />} />
            <Route path="news/duplicates" element={<AdminNewsDuplicatesPage />} />
            <Route path="news/drafts" element={<AdminNewsDraftsPage />} />
            <Route path="news/published" element={<AdminNewsPublishedPage />} />
            <Route path="news/scheduled" element={<AdminNewsScheduledPage />} />
            <Route path="news/rejected" element={<AdminNewsRejectedPage />} />
            <Route path="news/ai-selected" element={<AdminNewsAiSelectedPage />} />
            <Route path="news/sources" element={<AdminNewsSourcesPage />} />
            <Route path="news/editor/:id" element={<AdminNewsEditorPage />} />

            <Route index element={<Navigate to="news/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

