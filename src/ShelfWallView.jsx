import { useState, useRef, useEffect } from 'react'

const PLACEHOLDER = "https://placehold.co/130x130/E4E2DC/E4E2DC"

const ROW_OPACITY = [1, 0.88, 0.75]

// Same convention as MarketplaceGrid.jsx's BADGE_COLORS, so a listed
// album reads consistently whether you're seeing it on someone's shelf
// or in the marketplace grid itself.
const LISTING_BADGES = {
  fixed: { label: 'For sale', color: '#b5453f' },
  trade: { label: 'Trade only', color: '#7c9885' },
  fixed_or_trade: { label: 'For sale or trade', color: '#b08d57' },
  auction: { label: 'Auction', color: '#c1666b' }
}

// Own shelf vs. someone else's needs different framing even though the
// click behavior is identical (both just open the same album detail) —
// on your own shelf "buy" makes no sense, and on someone else's shelf
// "manage" makes no sense.
function listingActionHint(listing, isOwnProfile) {
  if (isOwnProfile) return 'Tap to manage listing'
  if (listing.listingType === 'trade') return 'Tap to propose trade'
  if (listing.listingType === 'fixed_or_trade') return 'Tap to buy or trade'
  if (listing.listingType === 'auction') return 'Tap to view auction'
  return 'Tap to buy'
}

// Mobile-only swipeable deck — a mouse-hover interaction doesn't exist
// on touch at all, so instead of trying to adapt the desktop crate row,
// this is a genuinely different component for a genuinely different
// input: a small stack of cards, swipe up/down to flip forward/back
// through them, tap the top one to open it. Desktop's hover-crate row
// is untouched and lives in its own branch below.
// Picks a font size small enough that the whole title fits within the
// spine's usable vertical space, rather than truncating or letting long
// titles clip past the spine's edge. 0.62 approximates a monospace
// glyph's width as a fraction of its font-size — good enough for "does
// this roughly fit," not a real text-measurement API. Floored at 6.5px
// (below that it stops being legible at all) and capped at 10px (the
// size short titles already used) so short titles don't blow up huge.
function computeSpineFontSize(title) {
  const availableHeight = 110
  const charWidthFactor = 0.62
  const estimated = availableHeight / ((title?.length || 1) * charWidthFactor)
  return Math.max(6.5, Math.min(10, estimated))
}

// One spine: fixed footprint, never grows sideways (so it never covers
// a neighboring spine), with a hover preview that lifts straight up out
// of the row instead. Pulled out to its own component so it can be
// rendered either in one flat row (search/single-genre results) or
// once per genre bucket (each genre now gets its own row — see
// ShelfWallView below) without duplicating this markup twice.
function SpineItem({ album, isHovered, onMouseEnter, onMouseLeave, onSelectAlbum, isOwnProfile }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => onSelectAlbum(album)}
      className="flex-shrink-0 relative self-end cursor-pointer"
      style={{ flexBasis: 17, height: 130 }}
    >
      {/* Collapsed spine — a darkening overlay sits between the cropped
          cover art and the title text so the text stays legible
          regardless of how light, dark, or busy that particular sliver
          of art happens to be — reading dark app text directly on raw
          album art was the actual readability problem, not the font
          size. Font size itself is computed per-title so long titles
          shrink to fit rather than clipping. */}
      <div className="absolute inset-0 bg-surface rounded-sm overflow-hidden">
        {/* Real spine photography doesn't exist in the data — only the
            front cover (imageUrl) is stored — so this can't show the
            literal physical spine. What it does instead: blurs and
            saturates a crop of the cover's left edge into a smooth
            color swatch, which reads as a solid spine tone rather than
            the sharp, arbitrary image fragment a plain crop produced
            (often just a stray sliver of a face or logo, nothing
            spine-like about it). Oversized + centered on the crop
            origin so the blur's soft edges don't reveal empty space at
            the frame's boundary. */}
        <img
          src={album.imageUrl || PLACEHOLDER}
          alt={album.title}
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
          className="absolute whitespace-nowrap font-mono font-bold text-white"
          style={{
            fontSize: computeSpineFontSize(album.title),
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            transformOrigin: 'center'
          }}
        >
          {album.title}
        </span>
        {album.listing && (
          <span
            className="absolute top-1.5 left-1/2 rounded-full"
            style={{
              width: 7,
              height: 7,
              transform: 'translateX(-50%)',
              background: LISTING_BADGES[album.listing.listingType]?.color || '#1c1a15',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.6)'
            }}
          />
        )}
      </div>

      {/* Preview — lifts straight up out of the row, like pulling the
          record out of the crate to look at its cover, instead of
          growing sideways into whatever's next to it. */}
      <div
        onClick={(e) => { e.stopPropagation(); onSelectAlbum(album) }}
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
        <img
          src={album.imageUrl || PLACEHOLDER}
          alt={album.title}
          className="w-full h-full object-cover"
        />
        {/* Listing status — shown here so browsing the shelf already
            tells you what's available, rather than needing a separate
            trip to the marketplace to find out. Clicking still opens
            the same album detail as always; the actual buy/trade
            controls live there. */}
        {album.listing && (
          <span
            className="absolute top-1.5 right-1.5 text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: LISTING_BADGES[album.listing.listingType]?.color || '#1c1a15' }}
          >
            {LISTING_BADGES[album.listing.listingType]?.label || 'Listed'}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
          <p className="text-white text-[11px] font-bold m-0">{album.title}</p>
          <p className="text-white/80 text-[10px] m-0">{album.artist}</p>
          {album.listing && album.listing.listingType !== 'trade' && album.listing.price != null && (
            <p className="text-[10px] font-bold m-0 mt-0.5" style={{ color: '#f0b98c' }}>
              ${Number(album.listing.price).toFixed(2)}
            </p>
          )}
          {album.listing && (
            <p className="text-[8px] uppercase tracking-wide m-0 mt-0.5" style={{ color: '#cfcdc5' }}>
              {listingActionHint(album.listing, isOwnProfile)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SwipeableCrateStack({ recordItems, onSelectAlbum, isOwnProfile }) {
  const [index, setIndex] = useState(0)
  const [dragY, setDragY] = useState(0)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const startYRef = useRef(0)

  // Reset to the first record whenever the underlying list changes —
  // e.g. the search box or genre filter narrows it down to a different
  // set, so the stack shouldn't stay parked on an index that may no
  // longer make sense for the new list.
  useEffect(() => {
    setIndex(0)
  }, [recordItems])

  function clampIndex(i) {
    return Math.max(0, Math.min(recordItems.length - 1, i))
  }

  function handlePointerDown(e) {
    draggingRef.current = true
    movedRef.current = false
    startYRef.current = e.clientY
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return
    const delta = e.clientY - startYRef.current
    if (Math.abs(delta) > 6) movedRef.current = true
    setDragY(delta)
  }

  function handlePointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    const threshold = 55
    // Swipe up (negative delta) advances forward through the crate;
    // swipe down (positive delta) goes back to the previous record —
    // matching how you'd flip forward or backward through a physical
    // stack of records with your thumb.
    if (dragY < -threshold) {
      setIndex((i) => clampIndex(i + 1))
    } else if (dragY > threshold) {
      setIndex((i) => clampIndex(i - 1))
    }
    setDragY(0)
  }

  function handleCardTap(album) {
    // A drag that didn't cross the flip threshold still counts as a
    // "moved" pointer — without this check, releasing a small drag
    // right where it started would also fire a click and open the
    // album, which isn't what a half-hearted swipe should do.
    if (movedRef.current) return
    onSelectAlbum(album)
  }

  if (recordItems.length === 0) return null

  const visibleCards = recordItems.slice(index, index + 3)

  return (
    <div className="[@media(hover:hover)_and_(pointer:fine)]:hidden">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative mx-auto touch-none select-none"
        style={{ width: '100%', maxWidth: 170, aspectRatio: '190 / 230' }}
      >
        {visibleCards.map((item, i) => {
          const isTop = i === 0
          const restingOffset = i * 10
          const scale = 1 - i * 0.06
          const translateY = isTop ? dragY : restingOffset
          return (
            <div
              key={item.key}
              onClick={() => isTop && handleCardTap(item.album)}
              className="absolute inset-0 rounded-lg overflow-hidden shadow-lg bg-surface border border-border"
              style={{
                zIndex: 10 - i,
                cursor: isTop ? 'pointer' : 'default',
                transform: `translateY(${translateY}px) scale(${scale})`,
                opacity: 1 - i * 0.18,
                transition: isTop && draggingRef.current ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out'
              }}
            >
              <img
                src={item.album.imageUrl || PLACEHOLDER}
                alt={item.album.title}
                className="w-full h-full object-cover"
              />
              {isTop && item.album.listing && (
                <span
                  className="absolute top-2 right-2 text-white text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded"
                  style={{ background: LISTING_BADGES[item.album.listing.listingType]?.color || '#1c1a15' }}
                >
                  {LISTING_BADGES[item.album.listing.listingType]?.label || 'Listed'}
                </span>
              )}
              {isTop && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2.5">
                  <p className="text-white text-sm font-bold m-0">{item.album.title}</p>
                  <p className="text-white/80 text-xs m-0">{item.album.artist}</p>
                  {item.album.listing && (
                    <>
                      {item.album.listing.listingType !== 'trade' && item.album.listing.price != null && (
                        <p className="text-sm font-bold m-0 mt-1" style={{ color: '#f0b98c' }}>
                          ${Number(item.album.listing.price).toFixed(2)}
                        </p>
                      )}
                      <p className="text-[10px] uppercase tracking-wide m-0 mt-0.5" style={{ color: '#cfcdc5' }}>
                        {listingActionHint(item.album.listing, isOwnProfile)}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-center font-mono text-[9px] text-text-faint mt-2">
        {index + 1} / {recordItems.length} — swipe / tap
      </p>
    </div>
  )
}

function ShelfWallView({ albums, onSelectAlbum, isOwnProfile }) {
  const [searchText, setSearchText] = useState('')
  const [genreFilter, setGenreFilter] = useState('All')
  const [hoveredId, setHoveredId] = useState(null)

  const rankedAlbums = albums
    .filter((a) => a.rarityRank)
    .sort((a, b) => a.rarityRank - b.rarityRank)

  const top15 = rankedAlbums.slice(0, 15)
  const topIds = new Set(top15.map((a) => a.id))
  const rest = albums.filter((a) => !topIds.has(a.id))

  const availableGenres = [...new Set(rest.map((a) => a.genre).filter(Boolean))].sort()

  const normalizedSearch = searchText.trim().toLowerCase()
  const filteredRest = rest.filter((a) => {
    const matchesGenre = genreFilter === 'All' || a.genre === genreFilter
    const matchesSearch = !normalizedSearch ||
      a.title.toLowerCase().includes(normalizedSearch) ||
      a.artist.toLowerCase().includes(normalizedSearch)
    return matchesGenre && matchesSearch
  })

  const groupByGenre = genreFilter === 'All' && !normalizedSearch

  // One bucket per genre for the mobile view — each becomes its own
  // independent swipeable crate (own index, own drag state) instead of
  // everything being flattened into a single continuous deck. If a
  // specific genre is selected in the filter row, this naturally comes
  // out to just one bucket, since filteredRest already only contains
  // that genre's albums.
  const genreBucketsMap = new Map()
  for (const album of filteredRest) {
    const genreKey = album.genre || 'Other'
    if (!genreBucketsMap.has(genreKey)) genreBucketsMap.set(genreKey, [])
    genreBucketsMap.get(genreKey).push({ key: album.id, album })
  }
  const genreBuckets = [...genreBucketsMap.entries()]
    .map(([genre, records]) => ({ genre, records }))
    .sort((a, b) => a.genre.localeCompare(b.genre))

  // A genuinely empty shelf isn't the same situation as "your search
  // matched nothing" — showing the same message for both is misleading
  // on a brand-new profile, since there's nothing to search yet at all.
  if (albums.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="bg-surface border border-dashed border-border rounded-lg p-10 text-center font-sans">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3.5 opacity-50 text-text-faint">
            <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="20" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="font-serif italic text-xl text-text mb-2">
            {isOwnProfile ? 'Your shelf is empty' : "This shelf is empty"}
          </p>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            {isOwnProfile
              ? "Add your first record to start building your collection — every album you add becomes part of your shelf, ready to browse, list for sale, or trade."
              : "They haven't added any albums yet."}
          </p>
          {isOwnProfile && (
            <p className="text-xs text-text-faint mt-4">
              Use <strong className="text-text-muted">+ Add album</strong> above to add one by hand, or <strong className="text-text-muted">Scan Crate</strong> to add several at once.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {top15.length > 0 && (
        <div className="mb-6">
          <p className="font-sans text-[10px] uppercase tracking-wider text-text-faint mb-2">Top 15 by rarity</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {top15.map((album, i) => (
              <div
                key={album.id}
                onClick={() => onSelectAlbum(album)}
                style={{ opacity: ROW_OPACITY[Math.floor(i / 5)] ?? 0.7 }}
                className="aspect-square rounded-lg relative overflow-hidden cursor-pointer bg-surface border border-border hover:border-accent transition-colors"
              >
                <img
                  src={album.imageUrl || PLACEHOLDER}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 bg-accent text-bg text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                  #{i + 1}
                </span>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
                  <p className="text-white text-[11px] font-bold truncate m-0">{album.title}</p>
                  <p className="text-white/80 text-[10px] truncate m-0">{album.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={top15.length > 0 ? 'pt-5 border-t border-border' : ''}>
        <p className="font-serif italic text-base text-text mb-0.5">
          {top15.length > 0 ? 'The rest of the shelf' : 'Your shelf'}
        </p>
        <p className="font-sans text-[11px] text-text-muted mb-3">
          {filteredRest.length} album{filteredRest.length === 1 ? '' : 's'}
          {groupByGenre ? ' · grouped by genre, like a real crate' : ' matching'}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="Search by title or artist..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-surface border border-border text-text px-3 py-1.5 rounded text-sm w-full sm:w-64 font-sans"
          />
          <button
            onClick={() => setGenreFilter('All')}
            className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer font-sans ${
              genreFilter === 'All' ? 'bg-accent text-bg border-accent' : 'bg-surface border-border text-text-muted'
            }`}
          >
            All
          </button>
          {availableGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setGenreFilter(genre)}
              className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer font-sans ${
                genreFilter === genre ? 'bg-accent text-bg border-accent' : 'bg-surface border-border text-text-muted'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {filteredRest.length === 0 ? (
          <p className="font-sans text-sm text-text-muted py-5">No matches — try a different search or genre.</p>
        ) : (
          <>
            {/* Desktop — the "lift straight up out of the crate" hover
                preview. Each genre gets its own row now (grouped via
                the same genreBuckets the mobile view already uses)
                instead of one continuous flex-wrap row where a genre
                with a short tail could end up sharing a row with the
                next genre's divider. When a search or a single-genre
                filter is active there's nothing to group by genre, so
                it falls back to one flat row with no dividers. */}
            <div className="hidden [@media(hover:hover)_and_(pointer:fine)]:block">
              {groupByGenre ? (
                <div className="flex flex-col gap-y-5">
                  {genreBuckets.map((bucket) => {
                    // Sorting by artist within the genre (rather than
                    // whatever order the shelf query returned) is what
                    // makes the sub-dividers meaningful — without it,
                    // the same artist could reappear non-contiguously
                    // and get a new divider every time instead of
                    // sitting together as one group.
                    const sortedByArtist = [...bucket.records].sort((a, b) =>
                      (a.album.artist || '').localeCompare(b.album.artist || '')
                    )
                    const withArtistDividers = []
                    let lastArtist = null
                    for (const rec of sortedByArtist) {
                      if (rec.album.artist && rec.album.artist !== lastArtist) {
                        lastArtist = rec.album.artist
                        withArtistDividers.push({
                          type: 'artist-divider',
                          artist: rec.album.artist,
                          key: `artist-${bucket.genre}-${rec.album.artist}`
                        })
                      }
                      withArtistDividers.push({ type: 'record', key: rec.key, album: rec.album })
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
                            <SpineItem
                              key={item.key}
                              album={item.album}
                              isHovered={hoveredId === item.album.id}
                              onMouseEnter={() => setHoveredId(item.album.id)}
                              onMouseLeave={() => setHoveredId(null)}
                              onSelectAlbum={onSelectAlbum}
                              isOwnProfile={isOwnProfile}
                            />
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-[3px]">
                  {filteredRest.map((album) => (
                    <SpineItem
                      key={album.id}
                      album={album}
                      isHovered={hoveredId === album.id}
                      onMouseEnter={() => setHoveredId(album.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onSelectAlbum={onSelectAlbum}
                      isOwnProfile={isOwnProfile}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile — one independent swipeable crate per genre,
                stacked down the page, instead of one flat deck across
                the whole shelf. Scrolling moves between crates the same
                way walking down a row of labeled crates at a record
                store does; swiping flips through whichever crate you're
                currently at. */}
            <div className="[@media(hover:hover)_and_(pointer:fine)]:hidden grid grid-cols-2 gap-x-4 gap-y-10">
              {genreBuckets.map((bucket) => (
                <div key={bucket.genre}>
                  <div className="bg-text px-2 py-1 mb-3">
                    <span className="font-mono text-[9px] tracking-wider uppercase font-bold text-bg leading-tight block">
                      {bucket.genre} · {bucket.records.length}
                    </span>
                  </div>
                  <SwipeableCrateStack recordItems={bucket.records} onSelectAlbum={onSelectAlbum} isOwnProfile={isOwnProfile} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ShelfWallView