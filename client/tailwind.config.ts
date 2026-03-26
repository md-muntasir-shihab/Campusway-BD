import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        border: 'var(--color-border)'
      },
      borderRadius: {
        token: 'var(--radius-lg)'
      },
      boxShadow: {
        token: 'var(--shadow-card)'
      }
    }
  },
  darkMode: ['class', '[data-theme="dark"]']
} satisfies Config;
