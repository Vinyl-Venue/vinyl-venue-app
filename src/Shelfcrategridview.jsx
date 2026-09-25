import { useState } from 'react'

const PLACEHOLDER = "https://placehold.co/300x300/E4E2DC/E4E2DC"
const ROW_OPACITY = [1, 0.88, 0.75]

// Same convention as ShelfWallView's LISTING_BADGES and MarketplaceGrid's
// BADGE_COLORS, so a listed record reads the same everywhere it shows up.
const LISTING_BADGES = {
  fixed: { label: 'For sale', color: '#b5453f' },
  trade: { label: 'Trade only', color: '#7c9885' },
  fixed_or_trade: { label: 'For sale or trade', color: '#b08d57' },
  auction: { label: 'Auction', color: '#c1666b' }
}

// The lifted hover preview for a peeking record — same visual language
// as the spine view's preview card (badge top-right, gradient caption,
// price), just triggered by hovering a peek layer instead of a spine.
function PeekPreview({ record }) {
  return (
    <div
      className="absolute rounded-lg overflow-hidden border border-border bg-surface z-50"
      style={{ width: 140, top: -96, left: -10, boxShadow: '0 6px 16px rgba(0,0,0,0.25)' }}
    >
      <img src={record.imageUrl || PLACEHOLDER} alt={record.title} className="w-full aspect-square object-cover" />
      {record.listing && (
        <span
          className="absolute top-1.5 right-1.5 text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ background: LISTING_BADGES[record.listing.listingType]?.color || '#1c1a15' }}
        >
          {LISTING_BADGES[record.listing.listingType]?.label || 'Listed'}
        </span>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
        <p className="text-white text-[11px] font-bold m-0 truncate">{record.title}</p>
        <p className="text-white/80 text-[10px] m-0 truncate">{record.artist}</p>
        {record.listing && record.listing.listingType !== 'trade' && record.listing.price != null && (
          <p className="text-[10px] font-bold m-0 mt-0.5" style={{ color: '#f0b98c' }}>
            ${Number(record.listing.price).toFixed(2)}
          </p>
        )}
      </div>
    </div>
  )
}

// One crate: prev/next arrows flip through its records one at a time,
// click the cover itself to open the full detail. Unlike the Wall
// view's spine row (hover) or the mobile swipe stack (drag), this is
// pure click/tap — works identically on a mouse or a touchscreen, so
// it doesn't need any input-type branching at all.
// One peeking layer in the stack — depth 1 is nearest the front card,
// higher depths sit further back with a larger offset, smaller size,
// and lower opacity, so adding more layers reads as "further back in
// the stack" rather than just more clutter piled on top.
function PeekLayer({ depth, record, style, opacity, hoveredPeek, setHoveredPeek, onJumpTo }) {
  return (
    <div
      className="absolute cursor-pointer"
      style={{ ...style, zIndex: 4 - depth }}
      onClick={onJumpTo}
      onMouseEnter={() => setHoveredPeek(depth)}
      onMouseLeave={() => setHoveredPeek((h) => (h === depth ? null : h))}
    >
      <div className="w-full h-full rounded-lg border border-border bg-surface overflow-hidden">
        <img src={record.imageUrl || PLACEHOLDER} alt="" className="w-full h-full object-cover" style={{ opacity }} />
      </div>
      {hoveredPeek === depth && <PeekPreview record={record} />}
    </div>
  )
}

// Continues the same falloff pattern from the original version: each
// depth further back gets less offset from the corner and lower
// opacity, so depth 5 still reads as "further back in the stack." Size
// stays fixed across every layer (front and peeks alike) — depth is
// conveyed by offset and fade only, not by shrinking, so every album
// cover renders at the same size regardless of its position in the
// crate.
const PEEK_CONFIG = [
  { depth: 1, offset: 10, opacity: 0.8 },
  { depth: 2, offset: 5, opacity: 0.6 },
  { depth: 3, offset: 0, opacity: 0.42 },
  { depth: 4, offset: -5, opacity: 0.28 },
  { depth: 5, offset: -10, opacity: 0.16 }
]

function CrateFlipCard({ records, onSelectAlbum }) {
  const [index, setIndex] = useState(0)
  const [hoveredPeek, setHoveredPeek] = useState(null)
  const clampedIndex = Math.min(index, records.length - 1)
  const current = records[clampedIndex]

  function goPrev(e) {
    e.stopPropagation()
    setIndex((i) => (i - 1 + records.length) % records.length)
  }

  function goNext(e) {
    e.stopPropagation()
    setIndex((i) => (i + 1) % records.length)
  }

  if (!current) return null

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          disabled={records.length < 2}
          aria-label="Previous record in this crate"
          className="text-text-faint hover:text-accent bg-transparent border-0 cursor-pointer text-xl disabled:opacity-30 flex-shrink-0"
        >
          ‹
        </button>
        {/* Stack depth — same idea as Mini-Crates' fanned stack preview:
            a sliver of the next several covers peeks out behind the
            front one, so a crate reads as an actual stack with more in
            it rather than a single flat card. Purely visual — the peek
            always reflects what's coming up next as you flip through.
            Capped at 5 layers — beyond that the outer slivers stop
            being legible as "an album" and just become colored edges
            (tested up to 10 and it wasn't worth it).

            Fixed pixel size (not flex-1 + aspect-square) is
            deliberate: percentage-sized peek layers need an explicit
            height on their containing block to resolve reliably, and
            a flex-1 box's own size can vary with grid/content context
            — both were producing inconsistently-sized cards across
            different crates. Fixed dimensions sidestep both. */}
        <div className="relative flex-shrink-0" style={{ width: 166, height: 166, paddingTop: 26, paddingRight: 26 }}>
          {PEEK_CONFIG.slice().reverse().map(({ depth, offset, opacity }) =>
            records.length > depth ? (
              <PeekLayer
                key={depth}
                depth={depth}
                record={records[(clampedIndex + depth) % records.length]}
                style={{ top: offset, right: offset, width: 140, height: 140 }}
                opacity={opacity}
                hoveredPeek={hoveredPeek}
                setHoveredPeek={setHoveredPeek}
                onJumpTo={() => setIndex((clampedIndex + depth) % records.length)}
              />
            ) : null
          )}
          <div
            onClick={() => onSelectAlbum(current)}
            className="relative rounded-lg overflow-hidden cursor-pointer bg-surface border border-border hover:border-accent transition-colors"
            style={{ width: 140, height: 140, zIndex: 10 }}
          >
            <img src={current.imageUrl || PLACEHOLDER} alt={current.title} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
              <p className="text-white text-[11px] font-bold m-0 truncate">{current.title}</p>
              <p className="text-white/80 text-[10px] m-0 truncate">{current.artist}</p>
            </div>
          </div>
        </div>
        <button
          onClick={goNext}
          disabled={records.length < 2}
          aria-label="Next record in this crate"
          className="text-text-faint hover:text-accent bg-transparent border-0 cursor-pointer text-xl disabled:opacity-30 flex-shrink-0"
        >
          ›
        </button>
      </div>
      <p className="text-[10px] text-text-faint text-center mt-1.5 font-mono">{clampedIndex + 1} / {records.length}</p>

      {/* Filmstrip — lets you scan every cover in the crate at once
          (the thing a single flip-card can't do on its own), and jump
          straight to one instead of clicking ‹ › repeatedly to get
          there. Purely additive: the flip-card above still works the
          same way regardless of what's clicked down here. */}
      {records.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto mt-2 pb-1">
          {records.map((record, i) => (
            <button
              key={record.id}
              onClick={() => setIndex(i)}
              aria-label={`Jump to ${record.title}`}
              className={`flex-shrink-0 w-9 h-9 rounded overflow-hidden border cursor-pointer p-0 ${
                i === clampedIndex ? 'border-accent' : 'border-border opacity-60 hover:opacity-100'
              }`}
            >
              <img src={record.imageUrl || PLACEHOLDER} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ShelfCrateGridView({ albums, onSelectAlbum }) {
  const [searchText, setSearchText] = useState('')
  const [genreFilter, setGenreFilter] = useState('All')

  const rankedAlbums = albums
    .filter((a) => a.rarityRank)
    .sort((a, b) => a.rarityRank - b.rarityRank)
  const top15 = rankedAlbums.slice(0, 15)

  const availableGenres = [...new Set(albums.map((a) => a.genre).filter(Boolean))].sort()

  const normalizedSearch = searchText.trim().toLowerCase()
  const filtered = albums.filter((a) => {
    const matchesGenre = genreFilter === 'All' || a.genre === genreFilter
    const matchesSearch = !normalizedSearch ||
      a.title.toLowerCase().includes(normalizedSearch) ||
      a.artist.toLowerCase().includes(normalizedSearch)
    return matchesGenre && matchesSearch
  })

  const genreBucketsMap = new Map()
  for (const album of filtered) {
    const genreKey = album.genre || 'Other'
    if (!genreBucketsMap.has(genreKey)) genreBucketsMap.set(genreKey, [])
    genreBucketsMap.get(genreKey).push(album)
  }
  const genreBuckets = [...genreBucketsMap.entries()]
    .map(([genre, records]) => ({ genre, records }))
    .sort((a, b) => a.genre.localeCompare(b.genre))

  if (albums.length === 0) {
    return (
      <div className="max-w-4xl">
        <p className="text-sm text-text-muted font-sans py-5">Nothing on the shelf yet.</p>
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
                <img src={album.imageUrl || PLACEHOLDER} alt={album.title} className="w-full h-full object-cover" />
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

      <p className="font-serif italic text-base text-text mb-0.5">
        {top15.length > 0 ? 'The rest of the shelf, by crate' : 'Your shelf, by crate'}
      </p>
      <p className="font-sans text-[11px] text-text-muted mb-3">
        {filtered.length} album{filtered.length === 1 ? '' : 's'} · grouped by genre, one crate at a time
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
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

      {genreBuckets.length === 0 ? (
        <p className="text-sm text-text-muted font-sans py-5">No matches — try a different search or genre.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {genreBuckets.map((bucket) => (
            <div key={bucket.genre}>
              <div className="bg-text inline-block px-2 py-0.5 mb-2.5">
                <span className="font-mono text-[9px] tracking-wider uppercase font-bold text-bg">
                  {bucket.genre} · {bucket.records.length}
                </span>
              </div>
              <CrateFlipCard records={bucket.records} onSelectAlbum={onSelectAlbum} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ShelfCrateGridView