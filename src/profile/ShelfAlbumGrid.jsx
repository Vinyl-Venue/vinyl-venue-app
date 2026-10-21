import { useState } from 'react'
import RecordCard from '../RecordCard'
import { fuzzyMatchKey } from '../utils'

// The "Grid" view: a four-across cover grid. Search / sort / filter live in
// the shelf toolbar above it, so this only draws what it is given.
//
// Several copies / pressings of the same album are stacked into one tile so
// they take one cell instead of several. Clicking a stack fans it out in
// place; clicking a fanned-out card opens that pressing.
function groupAlbums(albums) {
  const groups = new Map()
  for (const album of albums) {
    const key = `${album?.isInCollection === false ? 'w' : 'o'}|${fuzzyMatchKey(album || {})}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(album)
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }))
}

function ShelfAlbumGrid({ albums, isOwnProfile, onDelete, onEdit, onSelect }) {
  const [open, setOpen] = useState(() => new Set())

  function toggle(key) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function card(album, i, extra) {
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
        onClick={extra?.onClick || (() => onSelect(album))}
      />
    )
  }

  const pill = 'absolute left-2 top-10 z-10 bg-text text-bg font-mono text-[10px] tracking-wider px-2 py-0.5 border-0 cursor-pointer'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
      {groupAlbums(albums).flatMap((group) => {
        const n = group.items.length
        if (n === 1) return [card(group.items[0], 0)]

        if (open.has(group.key)) {
          return group.items.map((album, i) => (
            <div key={album?.id ?? `${group.key}-${i}`} className="relative">
              {card(album, i)}
              {i === 0 && (
                <button type="button" className={pill} onClick={() => toggle(group.key)}>
                  {n} PRESSINGS · COLLAPSE
                </button>
              )}
            </div>
          ))
        }

        const layers = Math.min(n - 1, 2)
        const pad = layers * 7
        return [
          <div key={group.key} className="relative" style={{ paddingRight: pad, paddingBottom: pad }}>
            {[2, 1].filter((k) => layers >= k).map((k) => (
              <div
                key={k}
                aria-hidden
                className="absolute bg-surface border border-border rounded"
                style={{ top: k * 7, left: k * 7, right: pad - k * 7, bottom: pad - k * 7 }}
              />
            ))}
            <div className="relative">
              {card(group.items[0], 0, { onClick: () => toggle(group.key) })}
              <span className={`${pill} pointer-events-none`}>{n} PRESSINGS</span>
            </div>
          </div>
        ]
      })}
    </div>
  )
}

export default ShelfAlbumGrid
