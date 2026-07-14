export function NewsCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-card-slate border border-brand-orange-muted/20 rounded-none overflow-hidden"
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="skeleton-shimmer h-4 w-16" />
        <div className="skeleton-shimmer h-3 w-12" />
      </div>

      <div className="px-4 pb-2">
        <div className="skeleton-shimmer h-5 w-full mb-1" />
        <div className="skeleton-shimmer h-5 w-3/4" />
      </div>

      <div className="skeleton-shimmer aspect-video w-full" />

      <div className="px-4 py-3 space-y-1">
        <div className="skeleton-shimmer h-3 w-full" />
        <div className="skeleton-shimmer h-3 w-5/6" />
        <div className="skeleton-shimmer h-3 w-2/3" />
      </div>

      <div className="px-4 py-3 border-t border-brand-orange-muted/10 flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-6 w-12" />
        ))}
      </div>
    </div>
  );
}
