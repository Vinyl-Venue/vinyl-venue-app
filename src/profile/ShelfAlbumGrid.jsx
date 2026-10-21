import { useState } from 'react'
import RecordCard from '../RecordCard'
import { groupByAlbum } from '../marketplace/pressings'

// The "Grid" view: a four-across cover grid. Search / sort / filter live in
// the shelf toolbar above it, so this only draws what it is given.
//
// Several copies / pressings of the same album are stacked into one tile so
// they take one cell instead of several. The arrows flip through them in
// place (same idea as the Crates view); clicking the cover opens the one showing.
function groupAlbums(albums) {
  // Wishlist items never stack with owned copies.
  const owned = groupByAlbum(albums.filter((a) => a?.isInCollection !== false)).map((g) => ({ ...g, key: `o|${g.key}` }))
  const wished = groupByAlbum(albums.filter((a) => a?.isInCollection === false)).map((g) => ({ ...g, key: `w|${g.key}` }))
  // Keep the order the shelf is sorted in: place each group where its first album sits.
  const all = [...owned, ...wished]
  const pos = new Map(albums.map((a, i) => [a, i]))
  return all.sort((x, y) => pos.get(x.items[0]) - pos.get(y.items[0]))
}

const pill = 'absolute left-2 top-10 z-10 bg-text text-bg font-mono text-[10px] tracking-wider px-2 py-0.5 pointer-events-none'
const arrow = 'absolute top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full border-0 bg-black/60 text-white text-lg leading-none cursor-pointer hover:bg-accent flex items-center justify-center'

// One stacked tile: the other pressings' covers peek out behind the front
// card toward the top-right, fading with depth, like the Crates view.
function PressingStack({ items, renderCard }) {
  const [idx, setIdx] = useState(0)
  const n = items.length
  const cur = idx % n
  const layers = Math.min(n - 1, 3)
  const step = 9
  const pad = layers * step
  const opacities = [0.85, 0.65, 0.45]

  function flip(delta, e) {
    e.stopPropagation()
    setIdx((i) => (i + delta + n) % n)
  }

  return (
    <div className="relative" style={{ paddingTop: pad, paddingRight: pad }}>
      {[3, 2, 1].filter((d) => layers >= d).map((d) => (
        <div
          key={d}
          aria-hidden
          className="absolute rounded border border-border bg-surface overflow-hidden"
          style={{ left: d * step, bottom: d * step, top: pad - d * step, right: pad - d * step }}
        >
          <img
            src={items[(cur + d) % n]?.imageUrl || 'https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet'}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: opacities[d - 1] }}
          />
        </div>
      ))}
      <div className="relative">
        {renderCard(items[cur])}
        <span className={pill}>{cur + 1} / {n} PRESSINGS</span>
        <button type="button" aria-label="Previous pressing" className={`${arrow} left-1.5`} onClick={(e) => flip(-1, e)}>&lsaquo;</button>
        <button type="button" aria-label="Next pressing" className={`${arrow} right-1.5`} onClick={(e) => flip(1, e)}>&rsaquo;</button>
      </div>
    </div>
  )
}

function ShelfAlbumGrid({ albums, isOwnProfile, onDelete, onEdit, onSelect }) {
  function card(album, i) {
    return (
      <RecordCard
        key={album?.id ?? i}
        title={album?.title}
        artist={album?.artist}
        year={album?.year}
        genre={album?.genre}
        imageUrl={album?.imageUrl}
        isInCollection={album?.isInCollection}
        listing={album?.listing}
        rarityRank={album?.rarityRank}
        rarityBreakdown={album?.rarityBreakdown}
        onDelete={isOwnProfile ? () => onDelete(album.id) : undefined}
        onEdit={isOwnProfile ? (e) => { e.stopPropagation(); onEdit(album) } : undefined}
        onClick={() => onSelect(album)}
      />
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
      {groupAlbums(albums).map((group) =>
        group.items.length === 1
          ? card(group.items[0], 0)
          : <PressingStack key={group.key} items={group.items} renderCard={card} />
      )}
    </div>
  )
}

export default ShelfAlbumGrid
