import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useNewsDetailQuery, useNewsSettingsQuery, useTrackNewsShare } from '../api/news';

const formatDate = (value?: string | null) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

export const NewsArticlePage = () => {
  const { slug = '' } = useParams();
  const detailQuery = useNewsDetailQuery(slug);
  const settingsQuery = useNewsSettingsQuery();
  const shareMutation = useTrackNewsShare();

  const item = detailQuery.data?.item;
  const related = detailQuery.data?.related || [];
  const fallbackBanner = settingsQuery.data?.defaultBannerUrl || settingsQuery.data?.defaultThumbUrl || 'https://placehold.co/1200x600';

  const displayContent = useMemo(() => item?.fullContent || '<p>No content available.</p>', [item?.fullContent]);

  const doShare = async (channel: 'whatsapp' | 'facebook' | 'messenger' | 'telegram' | 'copy_link' | 'copy_text') => {
    if (!item) return;
    const articleUrl = item.shareUrl || `${window.location.origin}/news/${item.slug}`;
    const textLookup = item.shareText || {
      whatsapp: `${item.title}\n${articleUrl}`,
      facebook: `${item.title} ${articleUrl}`,
      messenger: `${item.title} ${articleUrl}`,
      telegram: `${item.title}\n${articleUrl}`
    };
    const linkLookup = item.shareLinks || {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(textLookup.whatsapp)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
      messenger: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(articleUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(textLookup.telegram)}`
    };

    if (channel === 'copy_link') {
      await navigator.clipboard.writeText(articleUrl);
    } else if (channel === 'copy_text') {
      await navigator.clipboard.writeText(textLookup.whatsapp);
    } else {
      window.open(linkLookup[channel], '_blank', 'noopener,noreferrer');
    }

    shareMutation.mutate({ slug: item.slug, channel });
  };

  if (detailQuery.isLoading) {
    return <main className="mx-auto max-w-6xl p-4"><div className="token-card h-96 animate-pulse" /></main>;
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="text-3xl font-bold">News not found</h1>
        <Link className="mt-4 inline-block text-primary" to="/news">Back to news</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <Link to="/news" className="inline-block text-sm text-primary">&lt; Back to News</Link>

      <article className="token-card overflow-hidden">
        <img src={item.coverImageUrl || fallbackBanner} alt={item.title} className="h-64 w-full object-cover md:h-96" />
        <div className="space-y-4 p-4 md:p-6">
          <h1 className="text-3xl font-bold leading-tight">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{item.sourceName || 'CampusWay'}</span>
            <span>|</span>
            <span>{formatDate(item.publishedAt || item.createdAt)}</span>
            {item.category ? <span className="rounded-full border border-border px-2 py-1">{item.category}</span> : null}
          </div>
          <p className="text-muted">{item.shortSummary}</p>

          <div className="flex flex-wrap gap-2 text-xs">
            {item.originalArticleUrl ? (
              <a className="rounded-lg border border-border px-2 py-1" href={item.originalArticleUrl} target="_blank" rel="noreferrer">Original source</a>
            ) : null}
            <button className="rounded-lg border border-border px-2 py-1" onClick={() => doShare('whatsapp')}>WhatsApp</button>
            <button className="rounded-lg border border-border px-2 py-1" onClick={() => doShare('facebook')}>Facebook</button>
            <button className="rounded-lg border border-border px-2 py-1" onClick={() => doShare('messenger')}>Messenger</button>
            <button className="rounded-lg border border-border px-2 py-1" onClick={() => doShare('telegram')}>Telegram</button>
            <button className="rounded-lg border border-border px-2 py-1" onClick={() => doShare('copy_link')}>Copy link</button>
            <button className="rounded-lg border border-border px-2 py-1" onClick={() => doShare('copy_text')}>Copy text</button>
          </div>

          <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: displayContent }} />

          {item.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-2 py-1 text-xs">#{tag}</span>)}
            </div>
          ) : null}
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Related news</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {related.map((entry) => (
            <Link key={entry._id} to={`/news/${entry.slug}`} className="token-card overflow-hidden">
              <img src={entry.coverImageUrl || fallbackBanner} alt={entry.title} className="h-36 w-full object-cover" />
              <div className="p-3">
                <h3 className="line-clamp-2 font-semibold">{entry.title}</h3>
                <p className="mt-1 text-xs text-muted">{formatDate(entry.publishedAt || entry.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};