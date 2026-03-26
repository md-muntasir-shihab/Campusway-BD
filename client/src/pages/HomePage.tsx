import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useHomeQuery } from '../api/queries';
import { ErrorState, SectionEmpty, SectionSkeleton } from '../components/common/States';
import { Navbar } from '../components/layout/Navbar';

const Card = ({ children }: { children: React.ReactNode }) => <article className="token-card p-4">{children}</article>;

export const HomePage = () => {
  const { data, isLoading, isError, refetch } = useHomeQuery();
  const [activeCategory, setActiveCategory] = useState<string>('All');

  if (isLoading) return <main className="space-y-4 p-4"><SectionSkeleton /><SectionSkeleton /><SectionSkeleton /></main>;
  if (isError || !data) return <main className="p-4"><ErrorState onRetry={refetch} /></main>;

  const hs = data.homeSettings;
  const categories = ['All', ...(hs.universityPreview.highlightedCategories ?? [])];
  const universities = useMemo(
    () => data.universitiesPreview.filter((u) => activeCategory === 'All' || u.category === activeCategory),
    [activeCategory, data.universitiesPreview]
  );

  return (
    <main className="overflow-x-hidden">
      <Navbar siteName={data.siteSettings?.siteName ?? 'CampusWay'} logoUrl={data.siteSettings?.logoUrl ?? ''} socialLinks={data.siteSettings?.socialLinks ?? []} />

      <section className="section-wrap mx-auto grid max-w-6xl items-center gap-6 px-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold">{hs.hero.title}</h1>
          <p className="mt-3 text-muted">{hs.hero.subtitle}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a className="h-11 rounded-token bg-primary px-4 py-3 text-center text-white" href={hs.hero.primaryCtaUrl}>{hs.hero.primaryCtaText}</a>
            <a className="h-11 rounded-token border border-border px-4 py-3 text-center" href={hs.hero.secondaryCtaUrl}>{hs.hero.secondaryCtaText}</a>
          </div>
        </motion.div>
        <img src={hs.hero.heroImageUrl} alt="Hero" className="max-h-[420px] w-full rounded-token object-cover" />
      </section>

      {hs.subscriptionBanner.enabled && <section className="section-wrap mx-auto max-w-6xl px-4"><h2 className="mb-3 text-xl font-semibold">{hs.subscriptionBanner.title}</h2><div className="grid gap-3 md:grid-cols-3">{data.subscriptionPlansPreview.slice(0, hs.subscriptionBanner.showPlansCount).map((p) => <Card key={p.id}><strong>{p.name}</strong><p>INR {p.price}</p><button className="mt-2 h-11 w-full rounded-token border">Login to subscribe</button></Card>)}</div></section>}

      {hs.stats.enabled && <section className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-2 md:grid-cols-4">{hs.stats.items.map((item) => <Card key={item.label}><p className="text-muted">{item.label}</p><p className="text-2xl font-bold">{item.valueType === 'dynamic' ? data.statsDynamic[item.sourceKey ?? ''] ?? '0' : item.value}</p></Card>)}</section>}

      {hs.whatsHappening.enabled && <section className="section-wrap mx-auto max-w-6xl px-4"><h2 className="mb-3 text-xl font-semibold">What&apos;s Happening Now</h2><div className="grid gap-4 md:grid-cols-2"><div className="space-y-3">{data.whatsHappening.closingSoon.length ? data.whatsHappening.closingSoon.slice(0, hs.whatsHappening.maxItems).map((u) => <Card key={u.id}><p className="font-semibold">{u.name}</p><p className="text-sm text-muted">{u.category} · {u.deadline}</p></Card>) : <SectionEmpty label="closing soon universities" />}</div><div className="space-y-3">{data.whatsHappening.examSoon.length ? data.whatsHappening.examSoon.slice(0, hs.whatsHappening.maxItems).map((e) => <Card key={e.id}><p className="font-semibold">{e.title}</p><p className="text-sm text-muted">{e.date}</p></Card>) : <SectionEmpty label="exam alerts" />}</div></div></section>}

      {hs.universityPreview.enabled && <section className="section-wrap mx-auto max-w-6xl px-4"><h2 className="mb-3 text-xl font-semibold">University Dashboard Preview</h2><div className="mb-4 flex flex-wrap gap-2">{categories.map((c) => <button key={c} className={`rounded-full border px-3 py-1 text-sm ${activeCategory === c ? 'border-primary text-primary' : 'border-border'}`} onClick={() => setActiveCategory(c)}>{c}</button>)}</div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">{universities.length ? universities.slice(0, hs.universityPreview.maxItems).map((u) => <Card key={u.id}><p className="font-semibold">{u.name}</p><p className="text-sm text-muted">{u.category}</p></Card>) : <SectionEmpty label="universities" />}</div></section>}

      {hs.examPreview.enabled && <section className="section-wrap mx-auto max-w-6xl px-4"><h2 className="mb-3 text-xl font-semibold">Live &amp; Upcoming Online Exams</h2><div className="grid gap-3 md:grid-cols-2">{data.examsPreview.slice(0, hs.examPreview.maxItems).map((e) => <Card key={e.id}><p className="font-semibold">{e.title}</p><p className="text-sm text-muted">{e.date}</p><span className="mt-2 inline-block rounded-full bg-surface px-2 py-1 text-xs">Locked: login/subscription/profile/payment required</span></Card>)}</div><a href="/exams" className="mt-4 inline-block text-primary">Explore all exams -&gt;</a></section>}

      {hs.newsPreview.enabled && <section className="section-wrap mx-auto max-w-6xl px-4"><h2 className="mb-3 text-xl font-semibold">Latest News</h2><div className="grid gap-3 md:grid-cols-3">{data.newsPreview.length ? data.newsPreview.slice(0, hs.newsPreview.maxItems).map((n) => <Card key={n.id}><img src={n.bannerUrl || 'https://placehold.co/600x240'} alt={n.title} className="mb-2 rounded-token" /><p>{n.title}</p></Card>) : <SectionEmpty label="news" />}</div></section>}

      {hs.resourcesPreview.enabled && <section className="section-wrap mx-auto max-w-6xl px-4"><h2 className="mb-3 text-xl font-semibold">Resources</h2><div className="grid gap-3 md:grid-cols-3">{data.resourcesPreview.length ? data.resourcesPreview.slice(0, hs.resourcesPreview.maxItems).map((r) => <Card key={r.id}><p>{r.title}</p><p className="text-sm text-muted">{r.type}</p></Card>) : <SectionEmpty label="resources" />}</div><a href="/resources" className="mt-4 inline-block text-primary">Browse resources -&gt;</a></section>}

      {hs.socialStrip.enabled && <section className="section-wrap mx-auto max-w-6xl px-4"><h2>{hs.socialStrip.title}</h2><p className="mb-3 text-muted">{hs.socialStrip.subtitle}</p><div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">{data.siteSettings.socialLinks.filter((s) => s.placement.includes('HOME')).map((s) => <a key={s.id} href={s.targetUrl} className="token-card p-4" target="_blank" rel="noreferrer">{s.name}</a>)}</div></section>}

      <footer className="border-t border-border px-4 py-8"><div className="mx-auto max-w-6xl"><p>{data.siteSettings.footer.aboutText}</p></div></footer>
    </main>
  );
};

