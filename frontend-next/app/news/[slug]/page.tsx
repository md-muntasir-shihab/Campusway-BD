import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNewsV2BySlug, getNewsV2Widgets } from '@/lib/api';

function imageUrl(item: { coverImage?: string; featuredImage?: string; thumbnailImage?: string }) {
  return item.coverImage || item.featuredImage || item.thumbnailImage || 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80';
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NewsDetailsPage({ params }: Props) {
  const { slug } = await params;

  const [detailsResponse, widgetsResponse] = await Promise.all([
    getNewsV2BySlug(slug).catch(() => null),
    getNewsV2Widgets().catch(() => ({ trending: [], categories: [] })),
  ]);

  if (!detailsResponse?.item) notFound();
  const item = detailsResponse.item;
  const trending = widgetsResponse.trending || [];

  return (
    <main className="container" style={{ padding: '1.2rem 0 2.2rem' }}>
      <Link href="/news" className="btn" style={{ marginBottom: '1rem' }}>Back to News</Link>
      <section className="grid grid-2" style={{ alignItems: 'start' }}>
        <article className="card">
          <img
            src={imageUrl(item)}
            alt={item.title}
            style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12, marginBottom: '1rem' }}
          />
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: 12, opacity: 0.85 }}>
            <span>{item.sourceName || item.sourceType || 'CampusWay'}</span>
            <span>•</span>
            <span>{new Date(item.publishDate).toLocaleDateString()}</span>
            <span>•</span>
            <span>{item.category}</span>
          </div>
          <h1 style={{ marginBottom: '0.75rem', lineHeight: 1.25 }}>{item.title}</h1>
          <p style={{ opacity: 0.9 }}>{item.shortDescription}</p>
          <div
            style={{ marginTop: '1rem', lineHeight: 1.75 }}
            dangerouslySetInnerHTML={{ __html: item.content || '<p>No content available.</p>' }}
          />
          {item.originalLink ? (
            <p style={{ marginTop: '1rem', fontSize: 13 }}>
              Original source:{' '}
              <a href={item.originalLink} target="_blank" rel="noreferrer">
                {item.originalLink}
              </a>
            </p>
          ) : null}
        </article>

        <aside className="card">
          <h2 style={{ marginTop: 0 }}>Trending</h2>
          <div className="grid" style={{ gap: '0.6rem' }}>
            {trending.slice(0, 6).map((news, index) => (
              <Link key={news._id} href={`/news/${news.slug}`} className="card" style={{ padding: '0.7rem' }}>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>#{index + 1}</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: 14 }}>{news.title}</p>
              </Link>
            ))}
            {trending.length === 0 ? <p style={{ margin: 0, opacity: 0.75 }}>No trending records.</p> : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
