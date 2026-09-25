import SidePanel from './SidePanel'
import ListingDetailContent from './ListingDetailContent'

// Floating panel: full-screen backdrop below lg, docked-right panel at
// lg+. Marketplace uses MarketplaceDetailPanel instead at lg+, and only
// falls back to this for the narrow-screen overlay — see MarketplacePage.jsx.
function ListingModal({ listing, currentUserId, onMarkSold, onCancelListing, onBidPlaced, onClose }) {
  return (
    <SidePanel onClose={onClose} width={420}>
      <ListingDetailContent
        listing={listing}
        currentUserId={currentUserId}
        onMarkSold={onMarkSold}
        onCancelListing={onCancelListing}
        onBidPlaced={onBidPlaced}
        onClose={onClose}
      />
    </SidePanel>
  )
}

export default ListingModal