function ListingModal({ listing, onClose }) {
  const hasPressingDetails =
    listing.label || listing.pressingCountry || listing.matrixNumber ||
    listing.deadwax || listing.sleeveCondition || listing.mediaCondition

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <img
          src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
          alt={listing.title}
          className="modal-cover"
        />
        <h2>{listing.title}</h2>
        <p className="modal-artist">{listing.artist}</p>
        <p className="modal-meta">
          {listing.year || 'Year unknown'} · {listing.genre || 'Genre unknown'}
        </p>

        <div className="listing-price-block">
          <span className="modal-price">${Number(listing.price).toFixed(2)}</span>
          <span className="modal-listing-type">{listing.listingTypeLabel}</span>
        </div>

        {listing.tradePreference && (
          <p className="modal-trade-preference">
            <strong>Wants in trade:</strong> {listing.tradePreference}
          </p>
        )}

        {hasPressingDetails && (
          <div className="modal-pressing-details">
            {listing.sleeveCondition && <p><strong>Sleeve condition:</strong> {listing.sleeveCondition}</p>}
            {listing.mediaCondition && <p><strong>Media condition:</strong> {listing.mediaCondition}</p>}
            {listing.label && <p><strong>Label:</strong> {listing.label}</p>}
            {listing.pressingCountry && <p><strong>Pressing country:</strong> {listing.pressingCountry}</p>}
            {listing.matrixNumber && <p><strong>Matrix number:</strong> {listing.matrixNumber}</p>}
            {listing.deadwax && <p><strong>Deadwax / runout:</strong> {listing.deadwax}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ListingModal