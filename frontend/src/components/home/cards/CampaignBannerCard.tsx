import { motion } from 'framer-motion';

interface CampaignBannerCardProps {
  banner: {
    _id: string;
    title?: string;
    subtitle?: string;
    imageUrl: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
  };
}

export default function CampaignBannerCard({ banner }: CampaignBannerCardProps) {
  const Wrapper = banner.linkUrl ? 'a' : 'div';
  const linkProps = banner.linkUrl
    ? { href: banner.linkUrl, target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.25 }}
      className="snap-start shrink-0 w-[85vw] sm:w-[75vw] md:w-[48%] lg:w-[32%]"
    >
      <Wrapper
        {...linkProps}
        className="block relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-card hover:shadow-card-hover transition-shadow group h-44 sm:h-48 md:h-52"
      >
        {/* Banner image */}
        <picture>
          {banner.mobileImageUrl && (
            <source media="(max-width: 640px)" srcSet={banner.mobileImageUrl} />
          )}
          <img
            src={banner.imageUrl}
            alt={banner.altText || banner.title || 'Campaign'}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
        </picture>

        {/* Gradient overlay with text */}
        {(banner.title || banner.subtitle) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-10">
            {banner.title && (
              <p className="text-white font-semibold text-sm md:text-base truncate drop-shadow-sm">
                {banner.title}
              </p>
            )}
            {banner.subtitle && (
              <p className="text-gray-200 text-xs mt-0.5 truncate drop-shadow-sm">
                {banner.subtitle}
              </p>
            )}
          </div>
        )}
      </Wrapper>
    </motion.div>
  );
}
