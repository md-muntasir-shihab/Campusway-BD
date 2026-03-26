import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNewsListQuery, useNewsSettingsQuery, useNewsSourcesQuery, useTrackNewsShare } from '../api/news';
import { NewsItem, NewsSettings } from '../types/news';

const DEFAULT_APPEARANCE: NewsSettings['appearance'] = {
  layoutMode: 'rss_reader',
  density: 'comfortable',
  showWidgets: {
    trending: true,
    latest: true,
    sourceSidebar: true,
    tagChips: true,
    previewPanel: true,
    breakingTicker: false
  },
  animationLevel: 'normal',
  paginationMode: 'pages'
};

const toTimeLabel = (value?: string | null) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const getHoverOffset = (animationLevel: NewsSettings['appearance']['animationLevel']) => {
  if (animationLevel === 'off') return undefined;
  if (animationLevel === 'minimal') return { y: -1 };
  return { y: -3 };
};

const NewsCard = ({
  item,
  fallbackBanner,
  onShare,
  onSelect,
  selected,
  showShareActions,
  density,
  animationLevel
}: {
  item: NewsItem;
  fallbackBanner: string;
  onShare: (item: NewsItem, channel: string) => void;
  onSelect: (item: NewsItem) => void;
  selected: boolean;
  showShareActions: boolean;
  density: NewsSettings['appearance']['density'];
  animationLevel: NewsSettings['appearance']['animationLevel'];
}) => {
  const image = item.coverImageUrl || fallbackBanner;
  const compact = density === 'compact';
  const hover = getHoverOffset(animationLevel);
  return (
    <motion.article
      layout={animationLevel !== 'off'}
      whileHover={hover}
      onClick={() => onSelect(item)}
      className={`cursor-pointer rounded-2xl border transition ${compact ? 'p-2' : 'p-3'} ${selected ? 'border-primary bg-card' : 'border-border bg-card hover:border-primary/60'}`}
    >
      <div className={`grid gap-3 ${compact ? 'sm:grid-cols-[120px_1fr]' : 'sm:grid-cols-[160px_1fr]'}`}>
        <img src={image} alt={item.title} className={`w-full rounded-xl object-cover ${compact ? 'h-24' : 'h-32'}`} />
        <div className="space-y-2">
          <h3 className={`line-clamp-2 font-semibold ${compact ? 'text-base' : 'text-lg'}`}>{item.title}</h3>
          <p className="line-clamp-2 text-sm text-muted">{item.shortSummary}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{item.sourceName || 'CampusWay'}</span>
            <span>|</span>
            <span>{toTimeLabel(item.publishedAt || item.createdAt)}</span>
            {item.category ? <span className="rounded-full border border-border px-2 py-0.5">{item.category}</span> : null}
          </div>
          {showShareActions ? (
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <Link className="rounded-lg bg-primary px-2 py-1 text-white" to={`/news/${item.slug}`}>Read</Link>
              <button className="rounded-lg border border-border px-2 py-1" onClick={(event) => { event.stopPropagation(); onShare(item, 'whatsapp'); }}>WhatsApp</button>
              <button className="rounded-lg border border-border px-2 py-1" onClick={(event) => { event.stopPropagation(); onShare(item, 'facebook'); }}>Facebook</button>
              <button className="rounded-lg border border-border px-2 py-1" onClick={(event) => { event.stopPropagation(); onShare(item, 'messenger'); }}>Messenger</button>
              <button className="rounded-lg border border-border px-2 py-1" onClick={(event) => { event.stopPropagation(); onShare(item, 'telegram'); }}>Telegram</button>
            </div>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
};

export const NewsPage = () => {
  const [page, setPage] = useState(1);
  const [sourceId, setSourceId] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [stackedItems, setStackedItems] = useState<NewsItem[]>([]);

  const settingsQuery = useNewsSettingsQuery();
  const sourcesQuery = useNewsSourcesQuery();
  const listQuery = useNewsListQuery({ sourceId, tag, q, page, limit: 12 });
  const shareTrackMutation = useTrackNewsShare();

  const appearance = settingsQuery.data?.appearance || DEFAULT_APPEARANCE;
  const fallbackBanner = settingsQuery.data?.defaultBannerUrl || settingsQuery.data?.defaultThumbUrl || 'https://placehold.co/1200x600';
  const pages = listQuery.data?.pages || 1;

  useEffect(() => {
    setPage(1);
    setStackedItems([]);
    setSelected(null);
  }, [sourceId, tag, q]);

  useEffect(() => {
    const incoming = listQuery.data?.items || [];
    if (appearance.paginationMode === 'infinite') {
      setStackedItems((prev) => {
        if (page <= 1) return incoming;
        const seen = new Set(prev.map((entry) => entry._id));
        return [...prev, ...incoming.filter((entry) => !seen.has(entry._id))];
      });
      return;
    }
    setStackedItems(incoming);
  }, [appearance.paginationMode, listQuery.data?.items, page]);

  const allItems = stackedItems;

  const tags = useMemo(() => {
    const all = new Set<string>();
    allItems.forEach((item) => item.tags.forEach((itemTag) => all.add(itemTag)));
    return Array.from(all).slice(0, 24);
  }, [allItems]);

  const categories = useMemo(() => {
    const all = new Set<string>();
    allItems.forEach((item) => {
      if (item.category) all.add(item.category);
    });
    return Array.from(all).slice(0, 24);
  }, [allItems]);

  const filteredSources = useMemo(() => {
    const sourceList = sourcesQuery.data || [];
    const needle = sourceSearch.trim().toLowerCase();
    if (!needle) return sourceList;
    return sourceList.filter((source) => source.name.toLowerCase().includes(needle));
  }, [sourceSearch, sourcesQuery.data]);

  const filteredItems = useMemo(
    () => allItems.filter((item) => (category ? item.category === category : true)),
    [allItems, category]
  );

  useEffect(() => {
    if (!appearance.showWidgets.previewPanel) {
      setSelected(null);
      return;
    }
    if (filteredItems.length === 0) {
      setSelected(null);
      return;
    }
    if (!selected || !filteredItems.some((item) => item._id === selected._id)) {
      setSelected(filteredItems[0]);
    }
  }, [appearance.showWidgets.previewPanel, filteredItems, selected]);

  const handleShare = async (item: NewsItem, channel: string) => {
    const channelKey = channel as 'whatsapp' | 'facebook' | 'messenger' | 'telegram';
    const shareText = item.shareText?.[channelKey] || `${item.title}\n${window.location.origin}/news/${item.slug}`;
    const shareLink = item.shareLinks?.[channelKey] || '';

    if (channel === 'facebook' || channel === 'messenger' || channel === 'telegram' || channel === 'whatsapp') {
      const fallbackLink = channel === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/news/${item.slug}`)}`
        : channel === 'messenger'
          ? `https://www.facebook.com/dialog/send?link=${encodeURIComponent(`${window.location.origin}/news/${item.slug}`)}`
          : channel === 'telegram'
            ? `https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/news/${item.slug}`)}&text=${encodeURIComponent(shareText)}`
            : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(shareLink || fallbackLink, '_blank', 'noopener,noreferrer');
    }

    shareTrackMutation.mutate({ slug: item.slug, channel });
  };

  const renderCards = (showShareActions: boolean) => {
    if (listQuery.isLoading && allItems.length === 0) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="token-card h-36 animate-pulse" />)}
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return <div className="token-card p-8 text-center text-sm text-muted">No news found.</div>;
    }

    if (appearance.layoutMode === 'grid') {
      return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <NewsCard
              key={item._id}
              item={item}
              fallbackBanner={fallbackBanner}
              onShare={handleShare}
              onSelect={(picked) => setSelected(picked)}
              selected={selected?._id === item._id}
              showShareActions={showShareActions}
              density={appearance.density}
              animationLevel={appearance.animationLevel}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <NewsCard
            key={item._id}
            item={item}
            fallbackBanner={fallbackBanner}
            onShare={handleShare}
            onSelect={(picked) => setSelected(picked)}
            selected={selected?._id === item._id}
            showShareActions={showShareActions}
            density={appearance.density}
            animationLevel={appearance.animationLevel}
          />
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (appearance.paginationMode === 'infinite') {
      return (
        <div className="flex items-center justify-center gap-2">
          <button
            className="h-10 rounded-token border border-border px-3"
            disabled={page >= pages || listQuery.isFetching}
            onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
          >
            {listQuery.isFetching ? 'Loading...' : (page >= pages ? 'No more items' : 'Load more')}
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-2">
        <button className="h-10 rounded-token border border-border px-3" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Previous</button>
        <span className="text-sm text-muted">{page} / {pages}</span>
        <button className="h-10 rounded-token border border-border px-3" disabled={page >= pages} onClick={() => setPage((prev) => Math.min(pages, prev + 1))}>Next</button>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-surface">
      <section className="border-b border-border bg-card px-4 py-8">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">CampusWay</p>
            <h1 className="text-3xl font-bold">{settingsQuery.data?.newsPageTitle || 'News'}</h1>
            <p className="mt-2 text-sm text-muted">{settingsQuery.data?.newsPageSubtitle || 'Latest updates from trusted sources.'}</p>
          </div>
          <button className="h-11 rounded-token border border-border px-4 lg:hidden" onClick={() => setMobileFilterOpen(true)}>Filters</button>
        </div>
      </section>

      {appearance.showWidgets.breakingTicker && filteredItems.length > 0 ? (
        <section className="border-b border-border bg-primary/10 px-4 py-2 text-sm">
          <div className="mx-auto max-w-7xl truncate">
            Breaking: {filteredItems.slice(0, 3).map((item) => item.title).join(' | ')}
          </div>
        </section>
      ) : null}

      <section className={`mx-auto max-w-7xl px-4 py-6 ${appearance.layoutMode === 'rss_reader' ? 'grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_320px]' : 'space-y-4'}`}>
        {appearance.layoutMode === 'rss_reader' && (appearance.showWidgets.sourceSidebar || appearance.showWidgets.tagChips) ? (
          <aside className="hidden space-y-4 lg:block">
            {appearance.showWidgets.sourceSidebar ? (
              <div className="token-card p-4">
                <h2 className="mb-2 text-sm font-semibold uppercase">Sources</h2>
                <input
                  className="mb-2 h-10 w-full rounded-token border border-border bg-transparent px-3 text-sm"
                  placeholder="Search source"
                  value={sourceSearch}
                  onChange={(event) => setSourceSearch(event.target.value)}
                />
                <button className={`mb-1 block w-full rounded-lg px-2 py-1 text-left text-sm ${sourceId ? '' : 'bg-primary/10 text-primary'}`} onClick={() => setSourceId('')}>All sources</button>
                {filteredSources.map((source) => (
                  <button key={source._id} className={`mb-1 block w-full rounded-lg px-2 py-1 text-left text-sm ${sourceId === source._id ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setSourceId(source._id)}>
                    {source.name}
                  </button>
                ))}
              </div>
            ) : null}

            {appearance.showWidgets.tagChips ? (
              <>
                <div className="token-card p-4">
                  <h2 className="mb-2 text-sm font-semibold uppercase">Tags</h2>
                  <button className={`mb-1 mr-1 rounded-full border px-2 py-1 text-xs ${tag ? '' : 'border-primary text-primary'}`} onClick={() => setTag('')}>All</button>
                  {tags.map((itemTag) => (
                    <button key={itemTag} className={`mb-1 mr-1 rounded-full border px-2 py-1 text-xs ${tag === itemTag ? 'border-primary text-primary' : ''}`} onClick={() => setTag(itemTag)}>
                      {itemTag}
                    </button>
                  ))}
                </div>
                <div className="token-card p-4">
                  <h2 className="mb-2 text-sm font-semibold uppercase">Categories</h2>
                  <button className={`mb-1 mr-1 rounded-full border px-2 py-1 text-xs ${category ? '' : 'border-primary text-primary'}`} onClick={() => setCategory('')}>All</button>
                  {categories.map((itemCategory) => (
                    <button key={itemCategory} className={`mb-1 mr-1 rounded-full border px-2 py-1 text-xs ${category === itemCategory ? 'border-primary text-primary' : ''}`} onClick={() => setCategory(itemCategory)}>
                      {itemCategory}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </aside>
        ) : null}

        <div className="space-y-3">
          <div className="token-card p-3">
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search news..." className="h-11 w-full rounded-token border border-border bg-transparent px-3" />
          </div>

          {appearance.showWidgets.latest && filteredItems.length > 0 ? (
            <div className="token-card p-3 text-sm text-muted">
              Latest: {filteredItems[0]?.title}
            </div>
          ) : null}

          {appearance.showWidgets.trending && filteredItems.length > 1 ? (
            <div className="token-card p-3 text-sm text-muted">
              Trending: {filteredItems.slice(0, 3).map((item) => item.title).join(' | ')}
            </div>
          ) : null}

          {renderCards(true)}
          {renderPagination()}
        </div>

        {appearance.layoutMode === 'rss_reader' && appearance.showWidgets.previewPanel ? (
          <aside className="hidden lg:block">
            <div className="token-card sticky top-20 p-4">
              {selected ? (
                <>
                  <img src={selected.coverImageUrl || fallbackBanner} alt={selected.title} className="h-44 w-full rounded-xl object-cover" />
                  <h3 className="mt-3 text-lg font-semibold">{selected.title}</h3>
                  <p className="mt-2 text-sm text-muted">{selected.shortSummary}</p>
                  <p className="mt-2 text-xs text-muted">{selected.sourceName} | {toTimeLabel(selected.publishedAt || selected.createdAt)}</p>
                  <Link to={`/news/${selected.slug}`} className="mt-3 inline-block h-10 rounded-token bg-primary px-4 py-2 text-white">Open article</Link>
                </>
              ) : (
                <p className="text-sm text-muted">Select a card to preview.</p>
              )}
            </div>
          </aside>
        ) : null}
      </section>

      {mobileFilterOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileFilterOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button className="h-9 rounded-token border border-border px-3" onClick={() => setMobileFilterOpen(false)}>Close</button>
            </div>
            <div className="space-y-3">
              <input
                className="h-11 w-full rounded-token border border-border bg-transparent px-3"
                placeholder="Search source"
                value={sourceSearch}
                onChange={(event) => setSourceSearch(event.target.value)}
              />
              <select className="h-11 w-full rounded-token border border-border bg-transparent px-3" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
                <option value="">All sources</option>
                {filteredSources.map((source) => <option key={source._id} value={source._id}>{source.name}</option>)}
              </select>
              <select className="h-11 w-full rounded-token border border-border bg-transparent px-3" value={tag} onChange={(event) => setTag(event.target.value)}>
                <option value="">All tags</option>
                {tags.map((itemTag) => <option key={itemTag} value={itemTag}>{itemTag}</option>)}
              </select>
              <select className="h-11 w-full rounded-token border border-border bg-transparent px-3" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((itemCategory) => <option key={itemCategory} value={itemCategory}>{itemCategory}</option>)}
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};