import { useState, useEffect } from 'react'

const PLACEHOLDER = 'https://placehold.co/400x400/E4E2DC/E4E2DC'

// Flip through a Mini-crate in place: it takes over the Mini-crates column
// (no popup, nothing navigates away). Arrow buttons / keyboard arrows move
// between albums, the thumbnail strip jumps, and "See details" sends the
// album to the details panel.
function CrateViewer({ crate, onOpenAlbum, onManage }) {
  const [index, setIndex] = useState(0)
  const albums = crate?.albums || []
  const count = albums.length
  const album = albums[index]

  const go = (delta) => setIndex((i) => (count ? (i + delta + count) % count : 0))

  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!crate) return null

  if (count === 0) {
    return (
      <div className="lg:col-start-2 lg:row-start-2 border border-dashed border-border-strong p-6 text-center text-sm text-text-muted font-sans">
        This crate is empty.
        {onManage && <div className="mt-3"><button onClick={onManage} className="min-h-11 px-4 bg-surface text-text border border-border-strong text-sm cursor-pointer">Manage crates</button></div>}
      </div>
    )
  }

  return (
    <div className="lg:col-start-2 lg:row-start-2 flex flex-col gap-2.5 font-sans min-w-0" aria-label={`${crate.name} crate`}>
      <div className="flex items-center gap-2">
        <button onClick={() => go(-1)} aria-label="Previous album" className="w-9 h-9 flex-shrink-0 bg-surface border border-border-strong text-lg cursor-pointer hover:border-accent hover:text-accent">‹</button>
        {/* Two offset layers behind the cover give the stacked-crate look. */}
        <div className="relative flex-1 min-w-0 px-2 pt-2">
          <div className="absolute top-0 left-4 right-0 h-full bg-border opacity-60" />
          <div className="absolute top-1 left-2 right-1 h-full bg-border opacity-80" />
          <div
            className="relative aspect-square max-h-56 mx-auto bg-border bg-cover bg-center border border-border"
            style={{ backgroundImage: `url(${album.image_url || PLACEHOLDER})` }}
            role="img"
            aria-label={`${album.title} cover`}
          />
        </div>
        <button onClick={() => go(1)} aria-label="Next album" className="w-9 h-9 flex-shrink-0 bg-surface border border-border-strong text-lg cursor-pointer hover:border-accent hover:text-accent">›</button>
      </div>

      <div className="text-center min-w-0">
        <div className="font-serif italic text-lg truncate">{album.title}</div>
        <div className="text-[13px] text-text-muted truncate">{album.artist}{album.year ? ` · ${album.year}` : ''}</div>
        <div className="font-mono text-[10px] tracking-wider uppercase text-text-faint">{index + 1} of {count}</div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {albums.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setIndex(i)}
            aria-label={a.title}
            className={`w-11 h-11 flex-shrink-0 p-0 bg-border bg-cover bg-center cursor-pointer ${i === index ? 'border-2 border-accent' : 'border border-border opacity-80 hover:opacity-100'}`}
            style={{ backgroundImage: `url(${a.image_url || PLACEHOLDER})` }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={() => onOpenAlbum?.(album.id)} className="flex-1 min-h-10 bg-text text-bg border-0 text-sm cursor-pointer">See details</button>
        {onManage && <button onClick={onManage} className="flex-1 min-h-10 bg-surface text-text border border-border-strong text-sm cursor-pointer">Manage crates</button>}
      </div>
    </div>
  )
}

export default CrateViewer
