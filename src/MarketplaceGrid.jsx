import AuctionCountdown from './AuctionCountdown'

const BADGE_COLORS = {
  fixed: 'bg-accent',
  trade: 'bg-[#7c9885]',
  fixed_or_trade: 'bg-[#b08d57]',
  auction: 'bg-[#c1666b]'
}

function MarketplaceGrid({ listings, onSelectListing }) {
  if (listings.length === 0) {
    return <p className="text-text-muted font-sans text-sm">No active listings yet.</p>
  }

  return (
    // Was a hardcoded grid-cols-4 — the same fixed-column bug as every
    // other grid in this pass, and the reason listing titles were
    // wrapping 3-4 lines deep on a phone. Responsive column count,
    // matching the auction grids on Marketplace/SellerMarketplace.
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
      {listings.map((listing) => {
        const isAuction = listing.listingType === 'auction'
        const displayPrice = isAuction && listing.currentBid != null ? listing.currentBid : listing.price
        const priceLabel = isAuction ? (listing.currentBid != null ? 'Current bid' : 'Starting bid') : null

        return (
          <div
            key={listing.id}
            className="bg-surface border border-border rounded overflow-hidden cursor-pointer hover:border-accent transition-colors"
            onClick={() => onSelectListing(listing)}
          >
            <div className="relative">
              <img
                src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
                alt={listing.title}
                className="w-full aspect-square object-cover"
              />
              <span className={`absolute top-2 right-2 font-sans text-[0.7rem] font-bold px-2 py-1 rounded text-bg uppercase tracking-wide ${BADGE_COLORS[listing.listingType]}`}>
                {listing.listingTypeLabel}
              </span>
            </div>
            <p className="m-0 text-sm px-2.5 pt-2.5 text-text truncate">{listing.title}</p>
            <div className="p-2.5 font-sans">
              <p className="text-text-muted text-sm m-0 mb-1 truncate">{listing.artist}</p>
              <p className="text-accent font-bold text-base m-0 mb-1">
                ${Number(displayPrice).toFixed(2)}
                {priceLabel && <span className="text-text-muted font-normal text-xs"> · {priceLabel}</span>}
              </p>
              <p className="text-text-faint text-xs m-0 mb-1">
                + {listing.shippingPrice != null ? `$${Number(listing.shippingPrice).toFixed(2)} shipping` : 'shipping: contact seller'}
              </p>
              {listing.listingType === 'auction' && listing.endsAt && (
                <AuctionCountdown endsAt={listing.endsAt} />
              )}
              {listing.tradePreference && (
                <p className="text-text-muted text-xs mt-1 mb-0 truncate">Wants: {listing.tradePreference}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MarketplaceGrid