import AlbumDetailContent from './AlbumDetailContent'

// The Shelf's reserved right-hand detail column. A normal in-layout element
// (position: sticky, no portal): it scrolls with the page until it reaches
// the top of the viewport, then holds there while the shelf scrolls past
// underneath, so the record you clicked stays in view.
//
// Only rendered at lg+ (hidden below that) — narrow screens use the
// SidePanel overlay instead, wired up in ProfilePage.
//
// Nothing is shown until an album is picked: the empty state says so. Once
// one is picked the panel shows the full record (AlbumDetailContent already
// carries condition editing and the listing form for the owner) plus a
// quick-action row: owner gets Edit and Move to crate, a visitor gets
// Add to my Most wanted.
function ShelfDetailPanel({ album, onClose, isOwnAlbum, onEdit, onMoveToCrate, onAddToMostWanted, addedToMostWanted }) {
  return (
    <div
      className="hidden lg:block bg-surface border border-border sticky top-4 overflow-y-auto self-start"
      style={{ maxHeight: 'calc(100vh - 32px)' }}
    >
      <div className="flex items-center justify-between h-14 px-5 border-b border-border font-mono text-[10px] tracking-wider uppercase text-text-muted">
        <span>Selected record</span>
        {album && (
          <button onClick={onClose} className="bg-transparent border-0 text-text-muted text-lg cursor-pointer hover:text-accent" aria-label="Clear selection">×</button>
        )}
      </div>

      {album ? (
        <>
          <AlbumDetailContent key={album.id} album={album} onClose={onClose} isOwnAlbum={isOwnAlbum} />
          <div className="border-t border-border p-5 flex flex-col gap-2 font-sans">
            {isOwnAlbum ? (
              <div className="flex gap-2">
                <button onClick={() => onEdit(album)} className="flex-1 min-h-11 bg-surface text-text border border-border-strong text-sm cursor-pointer">Edit album</button>
                <button onClick={() => onMoveToCrate(album)} className="flex-1 min-h-11 bg-surface text-text border border-border-strong text-sm cursor-pointer">Move to crate</button>
              </div>
            ) : (
              <button
                onClick={() => onAddToMostWanted(album)}
                disabled={addedToMostWanted}
                className="min-h-11 bg-text text-bg border-0 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                {addedToMostWanted ? 'Added to your Most wanted' : 'Add to my Most wanted'}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="px-5 py-16 text-center font-serif italic text-xl text-text-muted">Pick an album to see its details</div>
      )}
    </div>
  )
}

export default ShelfDetailPanel
