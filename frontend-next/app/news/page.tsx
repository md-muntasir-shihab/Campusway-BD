import Link from 'next/link';
import { getNewsV2Appearance, getNewsV2List, getNewsV2Widgets } from '@/lib/api';

function imageUrl(item: { thumbnailImage?: string; coverImage?: string; featuredImage?: string }, fallback = '') {
  return item.thumbnailImage || item.coverImage || item.featuredImage || fallback || 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80';
}

export default async function NewsPage() {
  const [appearanceResponse, listResponse, widgetResponse] = await Promise.all([
    getNewsV2Appearance().catch(() => ({ appearance: {} })),
    getNewsV2List({ page: 1, limit: 12 }).catch(() => ({ items: [], total: 0, page: 1, pages: 1 })),
    getNewsV2Widgets().catch(() => ({ trending: [], categories: [] })),
  ]);

  const appearance = (appearanceResponse.appearance || {}) as {
    thumbnailFallbackUrl?: string;
    showTrendingWidget?: boolean;
    showCategoryWidget?: boolean;
  };
  const items = listResponse.items || [];
  const trending = widgetResponse.trending || [];
  const categories = widgetResponse.categories || [];
  const fallback = appearance.thumbnailFallbackUrl || '';

  return (
    <main className="container" style={{ padding: '1.2rem 0 2.2rem' }}>
      <section className="card" style={{ marginBottom: '1rem' }}>
        <p className="pill" style={{ marginBottom: '0.6rem' }}>CampusWay News</p>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Latest Updates</h1>
        <p style={{ opacity: 0.85, marginTop: '0.6rem' }}>
          Public News V2 feed rendered from the same backend configuration used by admin.
        </p>
      </section>

      <section className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="grid">
          {items.map((item) => (
            <article key={item._id} className="card" style={{ display: 'grid', gap: '0.75rem' }}>
              <img
                src={imageUrl(item, fallback)}
                alt={item.title}
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12 }}
              />
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', fontSize: 12, opacity: 0.85 }}>
                <span>{item.sourceName || item.sourceType || 'CampusWay'}</span>
                <span>•</span>
                <span>{new Date(item.publishDate).toLocaleDateString()}</span>
                <span>•</span>
                <span>{item.category}</span>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.35 }}>
                <Link href={`/news/${item.slug}`}>{item.title}</Link>
              </h2>
              <p style={{ margin: 0, opacity: 0.85 }}>{item.shortDescription}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                <Link className="btn" href={`/news/${item.slug}`}>Read</Link>
                {item.originalLink ? (
                  <a href={item.originalLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, opacity: 0.9 }}>
                    Source
                  </a>
                ) : null}
              </div>
            </article>
          ))}
          {items.length === 0 ? (
            <div className="card">
              <p style={{ margin: 0, opacity: 0.8 }}>No published news items found.</p>
            </div>
          ) : null}
        </div>

        <aside className="grid">
          {appearance.showTrendingWidget !== false ? (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Trending</h3>
              <div className="grid" style={{ gap: '0.6rem' }}>
                {trending.slice(0, 6).map((item, index) => (
                  <Link key={item._id} href={`/news/${item.slug}`} className="card" style={{ padding: '0.7rem' }}>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>#{index + 1}</p>
                    <p style={{ margin: '0.35rem 0 0', fontSize: 14 }}>{item.title}</p>
                  </Link>
                ))}
                {trending.length === 0 ? <p style={{ margin: 0, opacity: 0.75 }}>No trending records yet.</p> : null}
              </div>
            </div>
          ) : null}

          {appearance.showCategoryWidget !== false ? (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Categories</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {categories.map((cat) => (
                  <span key={cat._id} className="pill">
                    {cat._id} ({cat.count})
                  </span>
                ))}
                {categories.length === 0 ? <p style={{ margin: 0, opacity: 0.75 }}>No categories yet.</p> : null}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
