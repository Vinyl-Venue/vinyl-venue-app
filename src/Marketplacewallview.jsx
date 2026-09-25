import { useState, useEffect, useRef } from 'react'
import AuctionCountdown from './AuctionCountdown'

const PLACEHOLDER = "https://placehold.co/300x300/E4E2DC/E4E2DC"

// Same convention as ShelfWallView's LISTING_BADGES, ShelfCrateGridView's
// LISTING_BADGES, and MarketplaceGrid's BADGE_COLORS.
const LISTING_BADGES = {
  fixed: { label: 'For sale', color: '#b5453f' },
  trade: { label: 'Trade only', color: '#7c9885' },
  fixed_or_trade: { label: 'For sale or trade', color: '#b08d57' },
  auction: { label: 'Auction', color: '#c1666b' }
}

function computeSpineFontSize(title) {
  const availableHeight = 110
  const charWidthFactor = 0.62
  const estimated = availableHeight / ((title?.length || 1) * charWidthFactor)
  return Math.max(6.5, Math.min(10, estimated))
}

// One spine — same fixed-footprint, lift-up-preview pattern as the
// Shelf's Wall view. No owner-vs-buyer distinction here (everything on
// this page is already someone else's listing from the viewer's
// perspective, even a seller's own), so the preview just shows price
// and listing type rather than an action hint.
function MarketplaceSpineItem({ listing, isHovered, onMouseEnter, onMouseLeave, onSelectListing }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => onSelectListing(listing)}
      className="flex-shrink-0 relative self-end cursor-pointer"
      style={{ flexBasis: 17, height: 130 }}
    >
      <div className="absolute inset-0 bg-surface rounded-sm overflow-hidden">
        <img
          src={listing.imageUrl || PLACEHOLDER}
          alt={listing.title}
          className="absolute top-0 left-0 object-cover"
          style={{
            width: 130,
            height: 130,
            objectPosition: 'left center',
            filter: 'blur(13px) saturate(1.5)',
            transform: 'scale(1.3)',
            transformOrigin: 'left center'
          }}
        />
        <div className="absolute inset-0 bg-black/45" />
        <span
          className="absolute bottom-2 left-1/2 whitespace-nowrap font-mono font-bold text-white"
          style={{
            fontSize: computeSpineFontSize(listing.title),
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            transformOrigin: 'center'
          }}
        >
          {listing.title}
        </span>
        <span
          className="absolute top-1.5 left-1/2 rounded-full"
          style={{
            width: 7,
            height: 7,
            transform: 'translateX(-50%)',
            background: LISTING_BADGES[listing.listingType]?.color || '#1c1a15',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.6)'
          }}
        />
      </div>

      <div
        onClick={(e) => { e.stopPropagation(); onSelectListing(listing) }}
        className="absolute left-1/2 z-30 rounded-sm overflow-hidden shadow-lg transition-all duration-300 ease-out"
        style={{
          bottom: '100%',
          width: 110,
          height: 150,
          transform: isHovered ? 'translate(-50%, -10px) scale(1)' : 'translate(-50%, 6px) scale(0.85)',
          opacity: isHovered ? 1 : 0,
          pointerEvents: isHovered ? 'auto' : 'none'
        }}
      >
        <img src={listing.imageUrl || PLACEHOLDER} alt={listing.title} className="w-full h-full object-cover" />
        <span
          className="absolute top-1.5 right-1.5 text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ background: LISTING_BADGES[listing.listingType]?.color || '#1c1a15' }}
        >
          {listing.listingType === 'auction' ? 'Live Auction' : LISTING_BADGES[listing.listingType]?.label || 'Listed'}
        </span>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
          <p className="text-white text-[11px] font-bold m-0">{listing.title}</p>
          <p className="text-white/80 text-[10px] m-0">{listing.artist}</p>
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
    </div>
  )
}

// Mobile — same swipe-stack pattern as the Shelf's Wall view, one stack
// per genre.
function SwipeableListingStack({ listings, onSelectListing }) {
  const [index, setIndex] = useState(0)
  const [dragY, setDragY] = useState(0)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const startYRef = useRef(0)

  useEffect(() => {
    setIndex(0)
  }, [listings])

  function handleStart(clientY) {
    draggingRef.current = true
    movedRef.current = false
    startYRef.current = clientY
  }

  function handleMove(clientY) {
    if (!draggingRef.current) return
    const delta = clientY - startYRef.current
    if (Math.abs(delta) > 5) movedRef.current = true
    setDragY(delta)
  }

  function handleEnd() {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (dragY < -40) {
      setIndex((i) => (i + 1) % listings.length)
    } else if (dragY > 40) {
      setIndex((i) => (i - 1 + listings.length) % listings.length)
    }
    setDragY(0)
  }

  function handleCardTap(listing) {
    if (!movedRef.current) onSelectListing(listing)
  }

  const visibleCards = [0, 1, 2].map((offset) => {
    const i = (index + offset) % listings.length
    return { listing: listings[i], offset }
  })

  return (
    <div
      className="relative"
      style={{ height: 190 }}
      onTouchStart={(e) => handleStart(e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientY)}
      onMouseMove={(e) => { if (draggingRef.current) handleMove(e.clientY) }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {visibleCards.map((item, i) => {
        const isTop = i === 0
        return (
          <div
            key={item.offset}
            onClick={() => isTop && handleCardTap(item.listing)}
            className="absolute inset-0 rounded-lg overflow-hidden bg-surface border border-border"
            style={{
              transform: isTop
                ? `translateY(${dragY}px)`
                : `translateY(${i * 8}px) scale(${1 - i * 0.04})`,
              zIndex: 10 - i,
              opacity: isTop ? 1 : 1 - i * 0.15,
              transition: isTop && draggingRef.current ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out'
            }}
          >
            <img
              src={item.listing.imageUrl || PLACEHOLDER}
              alt={item.listing.title}
              className="w-full h-full object-cover"
            />
            {isTop && (
              <>
                <span
                  className="absolute top-2 right-2 text-white text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded"
                  style={{ background: LISTING_BADGES[item.listing.listingType]?.color || '#1c1a15' }}
                >
                  {item.listing.listingType === 'auction' ? 'Live Auction' : LISTING_BADGES[item.listing.listingType]?.label || 'Listed'}
                </span>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2.5">
                  <p className="text-white text-sm font-bold m-0">{item.listing.title}</p>
                  <p className="text-white/80 text-xs m-0">{item.listing.artist}</p>
                  {item.listing.listingType === 'auction' ? (
                    <p className="text-sm font-bold m-0 mt-1" style={{ color: '#f0b98c' }}>
                      ${Number(item.listing.currentBid ?? item.listing.price).toFixed(2)}
                      <span className="font-normal text-white/70 text-xs"> · {item.listing.currentBid != null ? 'current bid' : 'starting bid'}</span>
                      {item.listing.endsAt && (
                        <span className="block font-normal text-white/70 text-xs"><AuctionCountdown endsAt={item.listing.endsAt} /></span>
                      )}
                    </p>
                  ) : (
                    item.listing.listingType !== 'trade' && item.listing.price != null && (
                      <p className="text-sm font-bold m-0 mt-1" style={{ color: '#f0b98c' }}>
                        ${Number(item.listing.price).toFixed(2)}
                      </p>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MarketplaceWallView({ listings, onSelectListing }) {
  const [hoveredId, setHoveredId] = useState(null)

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
    <div>
      {/* Desktop — one row per genre, artist sub-dividers within each,
          same as the Shelf's Wall view. */}
      <div className="hidden [@media(hover:hover)_and_(pointer:fine)]:flex flex-col gap-y-5">
        {genreBuckets.map((bucket) => {
          const sortedByArtist = [...bucket.records].sort((a, b) =>
            (a.artist || '').localeCompare(b.artist || '')
          )
          const withArtistDividers = []
          let lastArtist = null
          for (const listing of sortedByArtist) {
            if (listing.artist && listing.artist !== lastArtist) {
              lastArtist = listing.artist
              withArtistDividers.push({ type: 'artist-divider', artist: listing.artist, key: `artist-${bucket.genre}-${listing.artist}` })
            }
            withArtistDividers.push({ type: 'record', key: listing.id, listing })
          }

          return (
            <div key={bucket.genre} className="flex flex-wrap items-end gap-[3px]">
              <div
                className="flex-shrink-0 bg-text rounded-t-sm self-end flex items-end justify-center pb-2"
                style={{ flexBasis: 26, height: 140 }}
              >
                <span
                  className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {bucket.genre}
                </span>
              </div>
              {withArtistDividers.map((item) =>
                item.type === 'artist-divider' ? (
                  <div
                    key={item.key}
                    className="flex-shrink-0 rounded-t-sm self-end flex items-end justify-center pb-2"
                    style={{ flexBasis: 21, height: 135, background: '#8a887e' }}
                  >
                    <span
                      className="font-mono text-[9px] tracking-wider uppercase font-bold text-white"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {item.artist}
                    </span>
                  </div>
                ) : (
                  <MarketplaceSpineItem
                    key={item.key}
                    listing={item.listing}
                    isHovered={hoveredId === item.listing.id}
                    onMouseEnter={() => setHoveredId(item.listing.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onSelectListing={onSelectListing}
                  />
                )
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile — one swipe stack per genre. */}
      <div className="[@media(hover:hover)_and_(pointer:fine)]:hidden grid grid-cols-2 gap-4">
        {genreBuckets.map((bucket) => (
          <div key={bucket.genre}>
            <div className="bg-text inline-block px-2 py-0.5 mb-2">
              <span className="font-mono text-[9px] tracking-wider uppercase font-bold text-bg">
                {bucket.genre} · {bucket.records.length}
              </span>
            </div>
            <SwipeableListingStack listings={bucket.records} onSelectListing={onSelectListing} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default MarketplaceWallView