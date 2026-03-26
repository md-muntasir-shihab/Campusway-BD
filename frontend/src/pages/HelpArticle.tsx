import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ArrowLeft, ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  getPublicHelpArticle,
  submitHelpArticleFeedback,
} from '../api/helpCenterApi';

export default function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-help-article', slug],
    queryFn: () => getPublicHelpArticle(slug as string),
    enabled: Boolean(slug),
  });

  const feedbackMutation = useMutation({
    mutationFn: (helpful: boolean) => submitHelpArticleFeedback(slug as string, helpful),
  });

  const article = data?.article;
  const sanitizedHtml = useMemo(
    () => DOMPurify.sanitize(String(article?.fullContent ?? ''), { USE_PROFILES: { html: true } }),
    [article?.fullContent],
  );

  const category = typeof article?.categoryId === 'object' ? article.categoryId : null;
  const related = Array.isArray(article?.relatedArticleIds) ? article.relatedArticleIds : [];

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading article...</div>;
  }

  if (isError || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm text-red-500">Help article not found.</p>
        <Link to="/help-center" className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/help-center" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Help Center
      </Link>

      <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        {category?.name && (
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{category.name}</p>
        )}
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{article.title}</h1>
        {article.shortDescription && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{article.shortDescription}</p>
        )}

        <div className="prose prose-slate mt-6 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Was this article helpful?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => feedbackMutation.mutate(true)}
              disabled={feedbackMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              <ThumbsUp className="h-4 w-4" /> Helpful
            </button>
            <button
              type="button"
              onClick={() => feedbackMutation.mutate(false)}
              disabled={feedbackMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
            >
              <ThumbsDown className="h-4 w-4" /> Not Helpful
            </button>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Related Articles</h2>
          <div className="mt-3 space-y-2">
            {related.map((item) => (
              <Link
                key={item._id || item.slug}
                to={`/help-center/${item.slug}`}
                className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
