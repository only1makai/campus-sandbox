/** Loading skeleton for the masonry feeds (Marketplace / Thrift). */
const HEIGHTS = ["h-44", "h-60", "h-52", "h-64", "h-48", "h-56"];

export default function FeedSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <div className="h-9 w-56 animate-pulse rounded-chip bg-border-soft" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-border-soft/70" />
      <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mb-8 break-inside-avoid overflow-hidden rounded-card border-2 border-border-soft bg-card"
          >
            <div className={`animate-pulse bg-border-soft ${HEIGHTS[i % HEIGHTS.length]}`} />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-border-soft" />
              <div className="h-3 w-full animate-pulse rounded bg-border-soft/70" />
              <div className="mt-2 h-9 w-full animate-pulse rounded-btn bg-border-soft/70" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
