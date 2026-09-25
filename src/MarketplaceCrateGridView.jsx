import { useState } from 'react'
import AuctionCountdown from './AuctionCountdown'

const PLACEHOLDER = "https://placehold.co/300x300/E4E2DC/E4E2DC"

const LISTING_BADGES = {
  fixed: { label: 'For sale', color: '#b5453f' },
  trade: { label: 'Trade only', color: '#7c9885' },
  fixed_or_trade: { label: 'For sale or trade', color: '#b08d57' },
  auction: { label: 'Auction', color: '#c1666b' }
}

// Same lifted hover preview as the Shelf's Crates view, showing price
// and listing type instead of an owner-dependent action hint.
function PeekPreview({ listing }) {
  return (
    <div
      className="absolute rounded-lg overflow-hidden border border-border bg-surface z-50"
      style={{ width: 140, top: -96, left: -10, boxShadow: '0 6px 16px rgba(0,0,0,0.25)' }}
    >
      <img src={listing.imageUrl || PLACEHOLDER} alt={listing.title} className="w-full aspect-square object-cover" />
      <span
        className="absolute top-1.5 right-1.5 text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
        style={{ background: LISTING_BADGES[listing.listingType]?.color || '#1c1a15' }}
      >
        {listing.listingType === 'auction' ? 'Live Auction' : LISTING_BADGES[listing.listingType]?.label || 'Listed'}
      </span>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
        <p className="text-white text-[11px] font-bold m-0 truncate">{listing.title}</p>
        <p className="text-white/80 text-[10px] m-0 truncate">{listing.artist}</p>
        {listing.listingType === 'auction' ? (
          <p className="text-[10px] font-bold m-0 mt-0.5" style={{ color: '#f0b98c' }}>
            ${Number(listing.currentBid ?? listing.price).toFixed(2)}
            <span className="font-normal text-white/70"> · {listing.currentBid != null ? 'current bid' : 'starting bid'}</span>
            {listing.endsAt && (
              <span className="block font-normal text-white/70"><AuctionCountdown endsAt={listing.endsAt} /></span>
            )}
          </p>
        ) : (
          listing.listingType !== 'trade' && listing.price != null && (
            <p className="text-[10px] font-bold m-0 mt-0.5" style={{ color: '#f0b98c' }}>
              ${Number(listing.price).toFixed(2)}
            </p>
          )
        )}
      </div>
    </div>
  )
}

function PeekLayer({ depth, listing, style, opacity, hoveredPeek, setHoveredPeek, onJumpTo }) {
  return (
    <div
      className="absolute cursor-pointer"
      style={{ ...style, zIndex: 4 - depth }}
      onClick={onJumpTo}
      onMouseEnter={() => setHoveredPeek(depth)}
      onMouseLeave={() => setHoveredPeek((h) => (h === depth ? null : h))}
    >
      <div className="w-full h-full rounded-lg border border-border bg-surface overflow-hidden">
        <img src={listing.imageUrl || PLACEHOLDER} alt="" className="w-full h-full object-cover" style={{ opacity }} />
      </div>
      {hoveredPeek === depth && <PeekPreview listing={listing} />}
    </div>
  )
}

const PEEK_CONFIG = [
  { depth: 1, offset: 10, opacity: 0.8 },
  { depth: 2, offset: 5, opacity: 0.6 },
  { depth: 3, offset: 0, opacity: 0.42 },
  { depth: 4, offset: -5, opacity: 0.28 },
  { depth: 5, offset: -10, opacity: 0.16 }
]

function CrateFlipCard({ listings, onSelectListing }) {
  const [index, setIndex] = useState(0)
  const [hoveredPeek, setHoveredPeek] = useState(null)
  const clampedIndex = Math.min(index, listings.length - 1)
  const current = listings[clampedIndex]

  function goPrev(e) {
    e.stopPropagation()
    setIndex((i) => (i - 1 + listings.length) % listings.length)
  }

  function goNext(e) {
    e.stopPropagation()
    setIndex((i) => (i + 1) % listings.length)
  }

  if (!current) return null

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          disabled={listings.length < 2}
          aria-label="Previous listing in this crate"
          className="text-text-faint hover:text-accent bg-transparent border-0 cursor-pointer text-xl disabled:opacity-30 flex-shrink-0"
        >
          ‹
        </button>
        <div className="relative flex-shrink-0" style={{ width: 166, height: 166, paddingTop: 26, paddingRight: 26 }}>
          {PEEK_CONFIG.slice().reverse().map(({ depth, offset, opacity }) =>
            listings.length > depth ? (
              <PeekLayer
                key={depth}
                depth={depth}
                listing={listings[(clampedIndex + depth) % listings.length]}
                style={{ top: offset, right: offset, width: 140, height: 140 }}
                opacity={opacity}
                hoveredPeek={hoveredPeek}
                setHoveredPeek={setHoveredPeek}
                onJumpTo={() => setIndex((clampedIndex + depth) % listings.length)}
              />
            ) : null
          )}
          <div
            onClick={() => onSelectListing(current)}
            className="relative rounded-lg overflow-hidden cursor-pointer bg-surface border border-border hover:border-accent transition-colors"
            style={{ width: 140, height: 140, zIndex: 10 }}
          >
            <img src={current.imageUrl || PLACEHOLDER} alt={current.title} className="w-full h-full object-cover" />
            <span
              className="absolute top-1.5 right-1.5 text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: LISTING_BADGES[current.listingType]?.color || '#1c1a15' }}
            >
              {current.listingType === 'auction' ? 'Live Auction' : LISTING_BADGES[current.listingType]?.label || 'Listed'}
            </span>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
              <p className="text-white text-[11px] font-bold m-0 truncate">{current.title}</p>
              <p className="text-white/80 text-[10px] m-0 truncate">{current.artist}</p>
              {current.listingType === 'auction' ? (
                <p className="text-[10px] font-bold m-0 mt-0.5" style={{ color: '#f0b98c' }}>
                  ${Number(current.currentBid ?? current.price).toFixed(2)}
                  <span className="font-normal text-white/70"> · {current.currentBid != null ? 'current bid' : 'starting bid'}</span>
                  {current.endsAt && (
                    <span className="block font-normal text-white/70"><AuctionCountdown endsAt={current.endsAt} /></span>
                  )}
                </p>
              ) : (
                current.listingType !== 'trade' && current.price != null && (
                  <p className="text-[10px] font-bold m-0 mt-0.5" style={{ color: '#f0b98c' }}>
                    ${Number(current.price).toFixed(2)}
                  </p>
                )
              )}
            </div>
          </div>
        </div>
        <button
          onClick={goNext}
          disabled={listings.length < 2}
          aria-label="Next listing in this crate"
          className="text-text-faint hover:text-accent bg-transparent border-0 cursor-pointer text-xl disabled:opacity-30 flex-shrink-0"
        >
          ›
        </button>
      </div>
      <p className="text-[10px] text-text-faint text-center mt-1.5 font-mono">{clampedIndex + 1} / {listings.length}</p>

      {listings.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto mt-2 pb-1">
          {listings.map((listing, i) => (
            <button
              key={listing.id}
              onClick={() => setIndex(i)}
              aria-label={`Jump to ${listing.title}`}
              className={`flex-shrink-0 w-9 h-9 rounded overflow-hidden border cursor-pointer p-0 ${
                i === clampedIndex ? 'border-accent' : 'border-border opacity-60 hover:opacity-100'
              }`}
            >
              <img src={listing.imageUrl || PLACEHOLDER} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MarketplaceCrateGridView({ listings, onSelectListing }) {
  const genreBucketsMap = new Map()
  for (const listing of listings) {
    const genreKey = listing.genre || 'Other'
    if (!genreBucketsMap.has(genreKey)) genreBucketsMap.set(genreKey, [])
    genreBucketsMap.get(genreKey).push(listing)
  }
  const genreBuckets = [...genreBucketsMap.entries()]
    .map(([genre, records]) => ({ genre, records }))
    .sort((a, b) => a.genre.localeCompare(b.genre))

  if (listings.length === 0) {
    return <p className="font-sans text-sm text-text-muted py-5">No listings match your filters.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {genreBuckets.map((bucket) => (
        <div key={bucket.genre}>
          <div className="bg-text inline-block px-2 py-0.5 mb-2.5">
            <span className="font-mono text-[9px] tracking-wider uppercase font-bold text-bg">
              {bucket.genre} · {bucket.records.length}
            </span>
          </div>
          <CrateFlipCard listings={bucket.records} onSelectListing={onSelectListing} />
        </div>
      ))}
    </div>
  )
}

export default MarketplaceCrateGridView