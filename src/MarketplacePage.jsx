import { useState, useEffect } from 'react'
import Header from './Header'
import AuctionCountdown from './AuctionCountdown'
import ListingModal from './ListingModal'
import { supabase } from './supabaseClient'

const LISTING_TYPE_LABELS = {
  fixed: 'For sale',
  fixed_or_trade: 'For sale or trade',
  trade: 'Trade only',
  auction: 'Auction'
}

function rowToListing(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    year: row.year,
    genre: row.genre,
    imageUrl: row.image_url,
    sleeveCondition: row.sleeve_condition,
    mediaCondition: row.media_condition,
    label: row.label,
    pressingCountry: row.pressing_country,
    matrixNumber: row.matrix_number,
    deadwax: row.deadwax,
    price: row.price,
    listingType: row.listing_type,
    listingTypeLabel: LISTING_TYPE_LABELS[row.listing_type],
    tradePreference: row.trade_preference,
    endsAt: row.ends_at
  }
}

function MarketplacePage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState(null)

  useEffect(() => {
    fetchListings()
  }, [])

  async function fetchListings() {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching listings:', error.message)
      setLoading(false)
      return
    }

    setListings(data.map(rowToListing))
    setLoading(false)
  }

  return (
    <>
      <Header />
      <section className="shelf">
        <h2>Marketplace</h2>

        {loading && <p>Loading listings...</p>}

        {!loading && listings.length === 0 && (
          <p className="wishlist-empty">No active listings yet.</p>
        )}

        <div className="record-grid">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="listing-card"
              onClick={() => setSelectedListing(listing)}
            >
              <div className="listing-cover-wrapper">
                <img
                  src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
                  alt={listing.title}
                  className="record-cover"
                />
                <span className={`listing-type-badge listing-type-${listing.listingType}`}>
                  {listing.listingTypeLabel}
                </span>
              </div>
              <p className="record-title">{listing.title}</p>
              <div className="listing-details">
                <p className="listing-artist">{listing.artist}</p>
                <p className="listing-price">${Number(listing.price).toFixed(2)}</p>
                {listing.listingType === 'auction' && listing.endsAt && (
                  <AuctionCountdown endsAt={listing.endsAt} />
                )}
                {listing.tradePreference && (
                  <p className="listing-trade">Wants: {listing.tradePreference}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedListing && (
        <ListingModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </>
  )
}

export default MarketplacePage