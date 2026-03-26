import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface EmptySectionProps {
  icon?: LucideIcon;
  message?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function EmptySection({
  icon: Icon = Inbox,
  message = 'Nothing to show right now',
  ctaLabel,
  ctaHref,
}: EmptySectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-500"
    >
      <div className="relative p-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800/60 dark:to-gray-800/30 mb-4 ring-1 ring-gray-200/50 dark:ring-gray-700/50">
        <Icon className="w-8 h-8 opacity-40" />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--primary)]/5 to-transparent" />
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)] bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10 rounded-full hover:bg-[var(--primary)]/10 dark:hover:bg-[var(--primary)]/20 transition-all duration-300"
        >
          {ctaLabel}
        </Link>
      )}
    </motion.div>
  );
}
