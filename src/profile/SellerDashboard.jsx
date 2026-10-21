

function SellerDashboard({ sellerStatsLoading, sellerStats }) {
  return (
    <div className="border-t border-border pt-4 mb-4 font-sans">
      <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight text-text mb-2">Seller dashboard</h2>
      {sellerStatsLoading && <p className="text-xs text-text-muted">Loading...</p>}
      {!sellerStatsLoading && sellerStats && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
            <span className="text-xs text-text-muted">Active listings</span>
            <span className="font-serif italic text-text">{sellerStats.activeListings}</span>
          </div>
          <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
            <span className="text-xs text-text-muted">Pending trade offers</span>
            <span className={`font-serif italic ${sellerStats.pendingOffers > 0 ? 'text-accent' : 'text-text'}`}>
              {sellerStats.pendingOffers}
            </span>
          </div>
          <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
            <span className="text-xs text-text-muted">Sales this month</span>
            <span className="font-serif italic text-text">{sellerStats.salesThisMonth}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SellerDashboard
