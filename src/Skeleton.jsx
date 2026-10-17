// Placeholder shapes shown while data loads, so pages keep their layout and
// feel faster than a bare "Loading..." line. Uses Tailwind's animate-pulse.

export function SkeletonBlock({ className = '' }) {
  return <div className={`bg-border/60 rounded animate-pulse ${className}`} aria-hidden="true" />
}

// A grid of record-card placeholders, same column counts as MarketplaceGrid.
export function SkeletonGrid({ count = 8 }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-border rounded overflow-hidden">
          <SkeletonBlock className="w-full aspect-square rounded-none" />
          <div className="p-2.5 flex flex-col gap-2">
            <SkeletonBlock className="h-3 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// A row of activity-card placeholders, same size as the profile strip cards.
export function SkeletonStrip({ count = 4 }) {
  return (
    <div className="flex gap-3.5 overflow-hidden pb-1.5" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-none w-[236px] bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2">
            <SkeletonBlock className="w-[22px] h-[22px] rounded-full" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
          <div className="flex gap-1.5">
            <SkeletonBlock className="w-[46px] h-[46px]" />
            <SkeletonBlock className="w-[46px] h-[46px]" />
            <SkeletonBlock className="w-[46px] h-[46px]" />
          </div>
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

// List-row placeholders for the Activity page, Digest and search results.
export function SkeletonRows({ count = 5 }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-surface border border-border rounded-lg p-3">
          <SkeletonBlock className="w-11 h-11 flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}