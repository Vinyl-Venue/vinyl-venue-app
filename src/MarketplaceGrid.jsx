import { useState } from 'react'
import AuctionCountdown from './AuctionCountdown'
import { WatchHeart, GradeTag } from './marketplace/AuctionSections'
import TrustedBadge from './TrustedBadge'
import { isTrustedSeller } from './sellerTrust'
import { groupByAlbum, pressingSummary } from './marketplace/pressings'

const BADGE_COLORS = {
  fixed: 'bg-accent',
  trade: 'bg-[#7c9885]',
  fixed_or_trade: 'bg-[#b08d57]',
  auction: 'bg-[#c1666b]'
}

const arrow = 'absolute top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full border-0 bg-black/60 text-white text-lg leading-none cursor-pointer hover:bg-accent flex items-center justify-center'

// One album tile. With several pressings for sale, their covers peek out
// behind the front card (like the Crates view) and the arrows flip through
// them in place; clicking the cover opens the listing showing.
function ListingTile({ group, onSelectListing, watch, dealFor }) {
  const [idx, setIdx] = useState(0)
  const n = group.items.length
  const cur = idx % n
  const listing = group.items[cur]
  const extra = n - 1
  const layers = Math.min(extra, 3)
  const step = 9
  const pad = layers * step
  const opacities = [0.85, 0.65, 0.45]
  const isAuction = listing.listingType === 'auction'
  const displayPrice = isAuction && listing.currentBid != null ? listing.currentBid : listing.price
  const priceLabel = isAuction ? (listing.currentBid != null ? 'Current bid' : 'Starting bid') : null
  const deal = dealFor ? dealFor(listing) : null

  function flip(delta, e) {
    e.stopPropagation()
    setIdx((i) => (i + delta + n) % n)
  }

  return (
    <div className="relative" style={extra > 0 ? { paddingTop: pad, paddingRight: pad } : undefined}>
      {[3, 2, 1].filter((d) => layers >= d).map((d) => (
        <div
          key={d}
          aria-hidden
          className="absolute rounded border border-border bg-surface overflow-hidden"
          style={{ left: d * step, bottom: d * step, top: pad - d * step, right: pad - d * step }}
        >
          <img
            src={group.items[(cur + d) % n]?.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: opacities[d - 1] }}
          />
        </div>
      ))}
          <div
            className="relative bg-surface border border-border rounded overflow-hidden cursor-pointer hover:border-accent transition-colors"
            onClick={() => onSelectListing(listing)}
          >
            <div className="relative">
              <img
                src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
                alt={listing.title}
                className="w-full aspect-square object-cover"
              />
              <WatchHeart listingId={listing.id} watch={watch} />
              {extra > 0 && (
                <span className="absolute bottom-2 left-2 bg-text text-bg font-mono text-[10px] tracking-wider px-2 py-0.5">{cur + 1} / {n} PRESSINGS</span>
              )}
              {extra > 0 && (
                <>
                  <button type="button" aria-label="Previous pressing" className={`${arrow} left-1.5`} onClick={(e) => flip(-1, e)}>&lsaquo;</button>
                  <button type="button" aria-label="Next pressing" className={`${arrow} right-1.5`} onClick={(e) => flip(1, e)}>&rsaquo;</button>
                </>
              )}
              <span className={`absolute top-2 right-2 font-sans text-[0.7rem] font-bold px-2 py-1 rounded text-bg uppercase tracking-wide ${BADGE_COLORS[listing.listingType]}`}>
                {isAuction ? 'Live Auction' : listing.listingTypeLabel}
              </span>
            </div>
            <p className="m-0 text-sm px-2.5 pt-2.5 text-text truncate">{listing.title}</p>
            <div className="p-2.5 font-sans">
              <p className="text-text-muted text-sm m-0 mb-1 truncate">{listing.artist}</p>
              {(extra > 0 || listing.catalogNumber || listing.pressingYear || listing.vinylColor) && (
                <p className="text-text-faint text-[11px] m-0 mb-1 truncate">{extra > 0 ? `from $${Math.min(...group.items.map((l) => Number(l.listingType === 'auction' ? (l.currentBid ?? l.price) : l.price) || 0)).toFixed(2)} \u00b7 ` : ''}{pressingSummary(listing)}</p>
              )}
              {(listing.mediaCondition || listing.sleeveCondition || deal) && (
                <p className="m-0 mb-1 flex items-center gap-1.5 flex-wrap">
                  <GradeTag listing={listing} />
                  {deal && <span className="text-[10px] border border-accent text-accent px-1.5 py-px whitespace-nowrap">{deal}% below avg</span>}
                </p>
              )}
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
              {listing.sellerReviewCount !== undefined && (
                <p className="text-text-faint text-xs mt-1 mb-0">
                  {listing.sellerReviewCount > 0 ? (
                    <>
                      <span className="text-accent">&#9733;</span> {listing.sellerRating.toFixed(1)} ({listing.sellerReviewCount})
                      {isTrustedSeller(listing.sellerRating, listing.sellerReviewCount) && <TrustedBadge className="ml-1.5" />}
                    </>
                  ) : (
                    'New seller'
                  )}
                </p>
              )}
            </div>
          </div>
    </div>
  )
}

function MarketplaceGrid({ listings, onSelectListing, watch, dealFor }) {
  if (listings.length === 0) {
    return <p className="text-text-muted font-sans text-sm">No active listings yet.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
      {groupByAlbum(listings).map((group) => (
        <ListingTile key={group.key} group={group} onSelectListing={onSelectListing} watch={watch} dealFor={dealFor} />
      ))}
    </div>
  )
}

export default MarketplaceGrid
