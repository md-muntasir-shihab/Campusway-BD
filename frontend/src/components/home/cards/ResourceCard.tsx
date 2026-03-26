import { motion } from 'framer-motion';
import { FileText, Globe, BookOpen, Video, Image as ImgIcon, ExternalLink, Download } from 'lucide-react';

interface ResourceItem {
  _id: string;
  title: string;
  description?: string;
  type?: string;
  fileUrl?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  category?: string;
  isFeatured?: boolean;
  publishDate?: string;
}

interface ResourceCardProps {
  resource: ResourceItem;
}

const typeConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  link: { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  video: { icon: Video, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  image: { icon: ImgIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  note: { icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
};

export default function ResourceCard({ resource: res }: ResourceCardProps) {
  const typeLower = (res.type || 'link').toLowerCase();
  const cfg = typeConfig[typeLower] || typeConfig.link;
  const Icon = cfg.icon;
  const url = res.fileUrl || res.externalUrl;
  const isExternal = Boolean(res.externalUrl);
  const isPdf = typeLower === 'pdf';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="snap-start shrink-0 w-[260px] sm:w-[280px] md:w-[300px]"
    >
      <div className="rounded-2xl p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-card hover:shadow-card-hover transition-shadow h-full flex flex-col">
        {/* Type badge + icon */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`p-2 rounded-xl ${cfg.bg} shrink-0`}>
            <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 tracking-wide">
            {res.type || 'Resource'}
          </span>
          {res.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium ml-auto">
              {res.category}
            </span>
          )}
        </div>

        {/* Title + description */}
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1.5 leading-snug">
          {res.title}
        </h4>
        {res.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
            {res.description}
          </p>
        )}

        {/* CTA */}
        {url && (
          <a
            href={url}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors group/link"
          >
            {isPdf ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
            {isPdf ? 'Download' : 'Open'}
            <span className="inline-block transition-transform group-hover/link:translate-x-0.5">→</span>
          </a>
        )}
      </div>
    </motion.div>
  );
}
