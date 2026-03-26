import { useRef, useEffect, useCallback, useState, type ReactNode, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PremiumCarouselProps {
  children: ReactNode;
  scrollRef?: RefObject<HTMLDivElement | null>;
  showArrows?: boolean;
  autoRotate?: boolean;
  autoRotateInterval?: number;
  gap?: string;
  className?: string;
  ariaLabel?: string;
}

function scrollCarousel(ref: RefObject<HTMLDivElement | null>, dir: 'left' | 'right') {
  if (!ref.current) return;
  const amount = ref.current.clientWidth * 0.82;
  ref.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
}

export default function PremiumCarousel({
  children,
  scrollRef: externalRef,
  showArrows = true,
  autoRotate = false,
  autoRotateInterval = 5000,
  gap = 'gap-4',
  className = '',
  ariaLabel,
}: PremiumCarouselProps) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const ref = externalRef ?? internalRef;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [ref, updateScrollState]);

  /* Auto-rotation */
  useEffect(() => {
    if (!autoRotate || !ref.current) return;
    let paused = false;
    const el = ref.current;

    const tick = setInterval(() => {
      if (paused || !el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollCarousel(ref, 'right');
      }
    }, autoRotateInterval);

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };

    el.addEventListener('pointerenter', pause);
    el.addEventListener('pointerleave', resume);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume);

    return () => {
      clearInterval(tick);
      el.removeEventListener('pointerenter', pause);
      el.removeEventListener('pointerleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
    };
  }, [autoRotate, autoRotateInterval, ref]);

  return (
    <div className="relative group/carousel" role="region" aria-label={ariaLabel || 'Content carousel'}>
      {/* Left arrow - enhanced with gradient glow */}
      {showArrows && canScrollLeft && (
        <button
          onClick={() => scrollCarousel(ref, 'left')}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg shadow-black/10 dark:shadow-black/30 border border-gray-200/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:scale-110 hover:shadow-xl transition-all duration-300 opacity-0 group-hover/carousel:opacity-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Track */}
      <div
        ref={ref}
        className={`flex ${gap} h-auto min-h-0 items-stretch overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide ${className}`}
      >
        {children}
      </div>

      {/* Right arrow - enhanced with gradient glow */}
      {showArrows && canScrollRight && (
        <button
          onClick={() => scrollCarousel(ref, 'right')}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg shadow-black/10 dark:shadow-black/30 border border-gray-200/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:scale-110 hover:shadow-xl transition-all duration-300 opacity-0 group-hover/carousel:opacity-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Fade edges - enhanced with wider, smoother gradient */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-gray-50 via-gray-50/60 dark:from-gray-950 dark:via-gray-950/60 to-transparent pointer-events-none z-[1]" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-gray-50 via-gray-50/60 dark:from-gray-950 dark:via-gray-950/60 to-transparent pointer-events-none z-[1]" />
      )}
    </div>
  );
}
