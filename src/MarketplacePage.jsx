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

const BADGE_COLORS = {
  fixed: 'bg-accent',
  trade: 'bg-[#7c9885]',
  fixed_or_trade: 'bg-[#b08d57]',
  auction: 'bg-[#c1666b]'
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
      <section className="px-10 pb-10">
        <h2 className="text-2xl font-serif mb-2">Marketplace</h2>

        {loading && <p>Loading listings...</p>}

        {!loading && listings.length === 0 && (
          <p className="text-text-muted font-sans text-sm">No active listings yet.</p>
        )}

        <div className="grid grid-cols-4 gap-3 mt-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-surface border border-border rounded overflow-hidden cursor-pointer hover:border-accent transition-colors"
              onClick={() => setSelectedListing(listing)}
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
              <p className="m-0 text-sm px-2.5 pt-2.5 text-text">{listing.title}</p>
              <div className="p-2.5 font-sans">
                <p className="text-text-muted text-sm m-0 mb-1">{listing.artist}</p>
                <p className="text-accent font-bold text-base m-0 mb-1">${Number(listing.price).toFixed(2)}</p>
                {listing.listingType === 'auction' && listing.endsAt && (
                  <AuctionCountdown endsAt={listing.endsAt} />
                )}
                {listing.tradePreference && (
                  <p className="text-text-muted text-xs mt-1 mb-0">Wants: {listing.tradePreference}</p>
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