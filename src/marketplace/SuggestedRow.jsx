import { SectionChip } from './AuctionSections'

const PLACEHOLDER = 'https://placehold.co/200x200/E4E2DC/E4E2DC'

// "Picked for your shelf": a single scrolling row of listings matched to
// the artists and genres the person already collects. Hidden when there is
// nothing to match.
function SuggestedRow({ items, onSelect }) {
  if (!items || items.length === 0) return null

  return (
    <div className="flex flex-col gap-2 font-sans">
      <div className="flex items-center gap-3">
        <SectionChip>Picked for your shelf</SectionChip>
        <span className="text-xs text-text-muted">Based on what you collect</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map(({ listing, reason }) => (
          <div
            key={listing.id}
            onClick={() => onSelect(listing)}
            className="flex-none w-[140px] bg-surface border border-border rounded overflow-hidden cursor-pointer hover:border-accent"
          >
            <img src={listing.imageUrl || PLACEHOLDER} alt={listing.title} className="w-full aspect-square object-cover bg-border" />
            <div className="px-2 py-1.5">
              <p className="m-0 text-[11px] font-bold truncate">{listing.title}</p>
              <p className="m-0 text-[10px] text-text-muted truncate">{listing.artist}</p>
              <p className="m-0 mt-0.5 text-[11px] font-mono text-accent">
                {listing.listingType === 'trade' ? 'Trade' : `$${Number(listing.currentBid ?? listing.price).toFixed(2)}`}
              </p>
              <p className="m-0 mt-1 text-[10px] text-text-faint leading-tight line-clamp-2">{reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SuggestedRow
