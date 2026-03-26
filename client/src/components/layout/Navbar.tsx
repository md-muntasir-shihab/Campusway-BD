import { useState } from 'react';
import { SocialLink } from '../../types/home';

export const Navbar = ({ siteName, logoUrl, socialLinks }: { siteName: string; logoUrl: string; socialLinks: SocialLink[] }) => {
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          {logoUrl ? <img src={logoUrl} className="h-8 w-8 rounded-full object-cover" alt={siteName} /> : null}
          <strong>{siteName}</strong>
        </div>
        <nav className="hidden gap-4 text-sm md:flex"><a href="#">Universities</a><a href="#">Exams</a><a href="#">News</a></nav>
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-full border border-border" onClick={() => {
            const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); document.documentElement.setAttribute('data-theme', next);
          }}>◐</button>
          <button className="h-11 rounded-token bg-primary px-4 text-sm text-white">Login</button>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-3">
        {socialLinks.filter((s) => s.placement.includes('HOME')).map((link) => (
          <a key={link.id} href={link.targetUrl} className="rounded-full border border-border p-2" target="_blank" rel="noreferrer">
            <img src={link.iconUrl} alt={link.name} className="h-4 w-4" />
          </a>
        ))}
      </div>
    </header>
  );
};
