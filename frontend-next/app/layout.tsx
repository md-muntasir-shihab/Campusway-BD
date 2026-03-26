import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CampusWay Next Hybrid',
  description: 'Incremental Next.js admin and student portals for CampusWay.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
