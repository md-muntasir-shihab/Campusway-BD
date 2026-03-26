import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import type { ApiNews } from '../../../services/api';

interface NewsCardProps {
  item: ApiNews;
}

export default function NewsCard({ item }: NewsCardProps) {
  const img = item.featuredImage || item.coverImage || item.coverImageUrl || item.thumbnailImage;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="snap-start shrink-0 w-[280px] sm:w-[300px] md:w-[320px]"
    >
      <Link
        to={`/news/${item.slug}`}
        className="block rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-card hover:shadow-card-hover transition-shadow group h-full flex flex-col"
      >
        {/* Cover image */}
        <div className="h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
          {img ? (
            <img
              src={img}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Newspaper className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
          )}
          {/* Category badge */}
          {item.category && (
            <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-gray-900/90 text-[11px] font-semibold text-primary-600 dark:text-primary-400 backdrop-blur-sm shadow-sm">
              {item.category}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {item.title}
          </h3>
          {item.shortSummary && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 flex-1">
              {item.shortSummary}
            </p>
          )}

          {/* Source + date */}
          <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 mt-auto">
            {item.sourceIconUrl && (
              <img src={item.sourceIconUrl} alt="" className="w-4 h-4 rounded-full" />
            )}
            {item.sourceName && <span className="font-medium">{item.sourceName}</span>}
            {item.publishDate && (
              <span className="ml-auto">
                {new Date(item.publishDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
