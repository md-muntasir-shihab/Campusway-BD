import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container" style={{ padding: '2rem 0' }}>
      <section className="card">
        <h1 style={{ marginTop: 0 }}>CampusWay Next.js Hybrid Cutover</h1>
        <p style={{ opacity: 0.9, lineHeight: 1.6 }}>
          This app is the incremental migration target for <strong>/admin-dashboard</strong> and <strong>/student</strong> flows.
          It reuses your existing Express + Mongo API without breaking legacy Vite routes.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
          <Link className="btn" href="/admin-dashboard">Open Admin Dashboard</Link>
          <Link className="btn" href="/student">Open Student Portal</Link>
          <Link className="btn" href="/news">Open News V2</Link>
        </div>
      </section>
    </main>
  );
}
