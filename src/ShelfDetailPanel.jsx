import AlbumDetailContent from './AlbumDetailContent'

// The Shelf's reserved right-hand detail column (Wall + Grid views only).
// Unlike SidePanel, this is a normal in-layout element — position: sticky,
// not fixed, no portal — so it scrolls with the page until it reaches the
// top of the viewport, then holds there while the crate/grid scrolls past
// underneath. It always occupies its column, whether or not an album is
// selected, so nothing on the page shifts when you open or close one.
//
// Only rendered at lg+ (hidden below that) — narrow screens use the
// existing SidePanel overlay instead, wired up separately in ProfilePage.
//
// When nothing has actually been clicked, this defaults to showing the
// #1 album by rarity (or just the first album on the shelf, if rarity
// hasn't been computed yet) rather than sitting blank — but it's shown
// with a label instead of the close button, so it reads as "here's a
// highlight" rather than "you clicked this and don't remember why."
function ShelfDetailPanel({ album, albums = [], onClose, isOwnAlbum }) {
  const isExplicitSelection = !!album

  const rankedAlbums = albums.filter((a) => a.rarityRank).sort((a, b) => a.rarityRank - b.rarityRank)
  const defaultAlbum = rankedAlbums[0] || albums[0] || null
  const defaultIsRanked = rankedAlbums.length > 0

  const displayAlbum = album || defaultAlbum

  return (
    <div
      className="hidden lg:block bg-surface border border-border rounded-lg sticky top-5 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 40px)' }}
    >
      {displayAlbum ? (
        <div className="relative">
          {isExplicitSelection ? (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 bg-bg border border-border rounded-full w-8 h-8 flex items-center justify-center text-text-muted text-lg cursor-pointer hover:border-accent hover:text-accent z-10"
            >
              ×
            </button>
          ) : (
            <div className="bg-bg border-b border-border px-4 py-2 font-sans">
              <p className="text-[10px] uppercase tracking-wider text-text-faint m-0">
                {defaultIsRanked ? 'Your rarest record' : 'From your shelf'} — click any album to see it here instead
              </p>
            </div>
          )}
          <AlbumDetailContent key={displayAlbum.id} album={displayAlbum} onClose={onClose} isOwnAlbum={isOwnAlbum} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8" style={{ minHeight: 410 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3.5 opacity-50 text-text-faint">
            <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="20" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="font-serif italic text-base text-text-muted mb-1">Nothing here yet</p>
          <p className="font-sans text-xs text-text-faint">Add your first album to get started</p>
        </div>
      )}
    </div>
  )
}

export default ShelfDetailPanel