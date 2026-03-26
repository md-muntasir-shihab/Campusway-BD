const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent';
const base = `rounded-2xl bg-gray-200/70 dark:bg-gray-800/70 ${shimmer}`;

export function SearchSkeleton() {
  return <div className={`${base} h-14 max-w-2xl mx-auto rounded-full`} />;
}

export function HeroSkeleton() {
  return <div className={`${base} h-60 md:h-80 mx-4 md:mx-0`} />;
}

export function CarouselSkeleton({ count = 3, height = 'h-52' }: { count?: number; height?: string }) {
  return (
    <div className="flex gap-4 overflow-hidden px-4 md:px-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${base} ${height} shrink-0 w-[80vw] sm:w-[60vw] md:w-[45%] lg:w-[32%]`}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 4, height = 'h-44' }: { count?: number; height?: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${base} ${height}`}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

export function ChipsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2.5 overflow-hidden px-4 md:px-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${shimmer} bg-gray-200/70 dark:bg-gray-800/70 rounded-full h-10 shrink-0`}
          style={{ width: `${80 + Math.random() * 40}px`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

/** Full-page home skeleton used while initial data loads */
export default function HomeSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 animate-in fade-in duration-500">
      <SearchSkeleton />
      <HeroSkeleton />
      <div className="space-y-3 px-4 md:px-0">
        <div className={`${base} h-7 w-48`} />
        <div className={`${base} h-4 w-32 opacity-60`} />
      </div>
      <CarouselSkeleton count={3} height="h-48" />
      <ChipsSkeleton />
      <CarouselSkeleton count={3} height="h-64" />
      <CarouselSkeleton count={3} height="h-52" />
      <CarouselSkeleton count={4} height="h-48" />
      <CarouselSkeleton count={4} height="h-56" />
      <CarouselSkeleton count={4} height="h-36" />
      <GridSkeleton />
    </div>
  );
}
