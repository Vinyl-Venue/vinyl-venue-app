import ListingDetailContent from './ListingDetailContent'

// Marketplace's reserved right-hand detail column — same pattern as
// ShelfDetailPanel: position: sticky, no portal, always occupies its
// column whether or not a listing is selected. Covers both the Active
// Auctions strip and the main filtered grid, since both set the same
// selectedListing state in MarketplacePage.
//
// Only rendered at lg+ — narrow screens use the existing ListingModal
// overlay instead, wired up separately in MarketplacePage.
function MarketplaceDetailPanel({ listing, currentUserId, onMarkSold, onCancelListing, onBidPlaced, onListingUpdated, onClose }) {
  return (
    <div
      className="hidden lg:block bg-surface border border-border rounded-lg sticky top-5 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 40px)' }}
    >
      {listing ? (
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-bg border border-border rounded-full w-8 h-8 flex items-center justify-center text-text-muted text-lg cursor-pointer hover:border-accent hover:text-accent z-10"
          >
            ×
          </button>
          <ListingDetailContent
            listing={listing}
            currentUserId={currentUserId}
            onMarkSold={onMarkSold}
            onCancelListing={onCancelListing}
            onBidPlaced={onBidPlaced}
            onListingUpdated={onListingUpdated}
            onClose={onClose}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8" style={{ minHeight: 410 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3.5 opacity-50 text-text-faint">
            <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="20" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="font-serif italic text-base text-text-muted mb-1">Nothing selected</p>
          <p className="font-sans text-xs text-text-faint">Click a listing to see its details here</p>
        </div>
      )}
    </div>
  )
}

export default MarketplaceDetailPanel