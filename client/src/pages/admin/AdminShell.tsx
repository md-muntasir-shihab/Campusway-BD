import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/__cw_admin__/settings/site-settings', label: 'Site Settings' },
  { to: '/__cw_admin__/settings/home-control', label: 'Home Control' },
  { to: '/__cw_admin__/settings/banner-manager', label: 'Banner Manager' },
  { to: '/__cw_admin__/settings/social-links', label: 'Social Links' },
  { to: '/__cw_admin__/settings/news-settings', label: 'News Settings' },
  { to: '/__cw_admin__/news/dashboard', label: 'News Dashboard' },
  { to: '/__cw_admin__/news/pending', label: 'Pending' },
  { to: '/__cw_admin__/news/duplicates', label: 'Duplicates' },
  { to: '/__cw_admin__/news/drafts', label: 'Drafts' },
  { to: '/__cw_admin__/news/published', label: 'Published' },
  { to: '/__cw_admin__/news/scheduled', label: 'Scheduled' },
  { to: '/__cw_admin__/news/rejected', label: 'Rejected' },
  { to: '/__cw_admin__/news/ai-selected', label: 'AI Selected' },
  { to: '/__cw_admin__/news/sources', label: 'RSS Sources' }
];

export const AdminShell = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-lg font-semibold">CampusWay Admin</h1>
          <button className="h-10 rounded-token border border-border px-3 lg:hidden" onClick={() => setOpen((prev) => !prev)}>
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[260px_1fr]">
        {open ? <button className="fixed inset-0 z-10 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-label="Close admin nav" /> : null}
        <aside className={`z-20 token-card p-4 ${open ? 'fixed inset-y-0 left-0 w-72 overflow-y-auto' : 'hidden'} lg:static lg:block lg:w-auto`}>
          <nav className="space-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} className="block rounded-lg px-2 py-1 hover:bg-surface" to={link.to} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="token-card min-w-0 p-4"><Outlet /></main>
      </div>
    </div>
  );
};

