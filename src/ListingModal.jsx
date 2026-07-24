function ListingModal({ listing, onClose }) {
  const hasPressingDetails =
    listing.label || listing.pressingCountry || listing.matrixNumber ||
    listing.deadwax || listing.sleeveCondition || listing.mediaCondition

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-lg p-6 max-w-sm w-11/12 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 bg-transparent border-0 text-text-muted text-2xl cursor-pointer">×</button>
        <img
          src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
          alt={listing.title}
          className="w-full aspect-square object-cover rounded mb-4"
        />
        <h2 className="text-2xl m-0">{listing.title}</h2>
        <p className="font-sans text-text-muted -mt-1">{listing.artist}</p>
        <p className="font-sans text-sm text-text-muted">
          {listing.year || 'Year unknown'} · {listing.genre || 'Genre unknown'}
        </p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-accent font-serif text-2xl font-bold">${Number(listing.price).toFixed(2)}</span>
          <span className="font-sans text-sm text-text-muted">{listing.listingTypeLabel}</span>
        </div>

        {listing.tradePreference && (
          <p className="font-sans text-sm text-text-muted mt-2">
            <strong className="text-text">Wants in trade:</strong> {listing.tradePreference}
          </p>
        )}

        {hasPressingDetails && (
          <div className="mt-4 pt-4 border-t border-border font-sans text-sm text-text-muted">
            {listing.sleeveCondition && <p className="my-1"><strong className="text-text">Sleeve condition:</strong> {listing.sleeveCondition}</p>}
            {listing.mediaCondition && <p className="my-1"><strong className="text-text">Media condition:</strong> {listing.mediaCondition}</p>}
            {listing.label && <p className="my-1"><strong className="text-text">Label:</strong> {listing.label}</p>}
            {listing.pressingCountry && <p className="my-1"><strong className="text-text">Pressing country:</strong> {listing.pressingCountry}</p>}
            {listing.matrixNumber && <p className="my-1"><strong className="text-text">Matrix number:</strong> {listing.matrixNumber}</p>}
            {listing.deadwax && <p className="my-1"><strong className="text-text">Deadwax / runout:</strong> {listing.deadwax}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ListingModal