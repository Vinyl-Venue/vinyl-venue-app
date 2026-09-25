// Same convention as ShelfWallView's LISTING_BADGES, ShelfCrateGridView's
// LISTING_BADGES, and MarketplaceGrid's BADGE_COLORS, so a listed record
// reads the same everywhere it appears — including the plain Grid view,
// which previously showed no listing status at all while Wall and
// Crates both did.
const LISTING_BADGES = {
  fixed: { label: 'For sale', color: '#b5453f' },
  trade: { label: 'Trade only', color: '#7c9885' },
  fixed_or_trade: { label: 'For sale or trade', color: '#b08d57' },
  auction: { label: 'Auction', color: '#c1666b' }
}

function RecordCard({ title, artist, year, genre, imageUrl, isInCollection, listing, onDelete, onClick, onEdit }) {
  function handleDeleteClick(event) {
    event.stopPropagation()
    onDelete()
  }

  return (
    <div
      className="aspect-square bg-surface border border-border rounded relative cursor-pointer transition-all hover:border-accent hover:-translate-y-0.5"
      onClick={onClick}
    >
      <img
        src={imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
        alt={title}
        className="w-full h-full object-cover rounded"
      />
      <p className="absolute top-2 left-2 m-0 text-sm bg-black/50 px-2 py-0.5 rounded text-text">
        {title}
      </p>
      <p className="text-xs text-text-muted font-sans mt-1 absolute bottom-2 left-2">
        {artist}{year ? ` · ${year}` : ''}{genre ? ` · ${genre}` : ''}
        {listing && listing.listingType !== 'trade' && listing.price != null && (
          <span className="text-accent font-bold"> · ${Number(listing.price).toFixed(2)}</span>
        )}
      </p>
      {/* Wishlist and listing status are mutually exclusive — a
          wishlist item isn't something you own yet, so it can't also
          be something you're selling or trading — which is why they
          safely share this one badge slot instead of needing two. */}
      {isInCollection === false ? (
        <span className="absolute bottom-2 right-2 text-xs text-accent bg-black/60 px-2 py-0.5 rounded">
          Wishlist
        </span>
      ) : listing ? (
        <span
          className="absolute bottom-2 right-2 text-xs font-bold text-white px-2 py-0.5 rounded"
          style={{ background: LISTING_BADGES[listing.listingType]?.color || '#1c1a15' }}
        >
          {LISTING_BADGES[listing.listingType]?.label || 'Listed'}
        </span>
      ) : null}
      <div className="absolute top-2 right-2 flex gap-1.5">
        <button
          onClick={onEdit}
          className="w-6 h-6 rounded-full border-0 bg-black/60 text-text-muted text-sm leading-none cursor-pointer hover:bg-accent hover:text-bg"
        >
          ✎
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-6 h-6 rounded-full border-0 bg-black/60 text-text-muted text-base leading-none cursor-pointer hover:bg-accent hover:text-bg"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default RecordCard