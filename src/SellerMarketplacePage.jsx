import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import Header from './Header'
import MarketplaceGrid from './MarketplaceGrid'
import MarketplaceWallView from './MarketplaceWallView'
import MarketplaceCrateGridView from './MarketplaceCrateGridView'
import MarketplaceDetailPanel from './MarketplaceDetailPanel'
import SidePanel from './SidePanel'
import ListingDetailContent from './ListingDetailContent'
import AuctionCountdown from './AuctionCountdown'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { rowToListing, attachHighestBids, LISTING_TYPE_LABELS } from './utils'

function StarDisplay({ rating }) {
  return (
    <span className="text-accent">
      {'★'.repeat(Math.round(rating))}
      <span className="text-border">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  )
}

function startsInLabel(startsAt) {
  const diffMs = new Date(startsAt).getTime() - Date.now()
  if (diffMs <= 0) return 'Starting soon'
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'Starts in less than an hour'
  if (hours < 24) return `Starts in ${hours}h`
  const days = Math.floor(hours / 24)
  return `Starts in ${days}d`
}

function UpcomingAuctionCard({ listing }) {
  return (
    <div className="bg-surface border border-border rounded overflow-hidden">
      <div className="relative">
        <img
          src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
          alt={listing.title}
          className="w-full aspect-square object-cover opacity-80"
        />
        <span className="absolute top-2 right-2 font-sans text-[0.7rem] font-bold px-2 py-1 rounded text-bg uppercase tracking-wide bg-[#c1666b]">
          Auction
        </span>
      </div>
      <p className="m-0 text-sm px-2.5 pt-2.5 text-text">{listing.title}</p>
      <div className="p-2.5 font-sans">
        <p className="text-text-muted text-sm m-0 mb-1">{listing.artist}</p>
        <p className="text-accent font-bold text-base m-0 mb-1">
          ${Number(listing.price).toFixed(2)}
          <span className="text-text-muted font-normal text-xs"> · Starting bid</span>
        </p>
        <p className="text-text-muted text-xs m-0 mb-1">{startsInLabel(listing.startsAt)}</p>
        <p className="text-text-faint text-xs m-0">
          + {listing.shippingPrice != null ? `$${Number(listing.shippingPrice).toFixed(2)} shipping` : 'shipping: contact seller'}
        </p>
      </div>
    </div>
  )
}

function ActiveAuctionCard({ listing, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="bg-surface border border-border rounded overflow-hidden cursor-pointer hover:border-accent transition-colors"
    >
      <img
        src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
        alt={listing.title}
        className="w-full aspect-square object-cover"
      />
      <div className="p-2.5 font-sans">
        <p className="m-0 text-sm font-bold truncate text-text">{listing.title}</p>
        <p className="m-0 text-xs text-text-muted truncate mb-1">{listing.artist}</p>
        <p className="m-0 text-sm text-accent font-bold">
          ${Number(listing.currentBid ?? listing.price).toFixed(2)}
          <span className="text-text-muted font-normal text-xs"> · {listing.bidCount} bid{listing.bidCount === 1 ? '' : 's'}</span>
        </p>
        {listing.endsAt && <AuctionCountdown endsAt={listing.endsAt} />}
        <p className="text-text-faint text-xs m-0 mt-1">
          + {listing.shippingPrice != null ? `$${Number(listing.shippingPrice).toFixed(2)} shipping` : 'shipping: contact seller'}
        </p>
      </div>
    </div>
  )
}

function SellerMarketplacePage() {
  const { userId } = useParams()
  const [searchParams] = useSearchParams()
  const highlightedListingId = searchParams.get('listing')
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [isAllowed, setIsAllowed] = useState(false)
  const [isOwnMarketplace, setIsOwnMarketplace] = useState(false)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState(null)
  const [listingNotFound, setListingNotFound] = useState(false)
  const [reviewStats, setReviewStats] = useState(null)
  const [soldCount, setSoldCount] = useState(0)
  const [pendingSaleListings, setPendingSaleListings] = useState([])
  const [auctionBidCounts, setAuctionBidCounts] = useState({})

  const [searchText, setSearchText] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [listingTypeFilter, setListingTypeFilter] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortOption, setSortOption] = useState('newest')
  const [sellerMarketplaceView, setSellerMarketplaceView] = useState('grid')
  const [auctionSearch, setAuctionSearch] = useState('')

  useEffect(() => {
    loadSellerMarketplace()
  }, [userId])

  async function loadSellerMarketplace() {
    setLoading(true)
    setListingNotFound(false)
    setPendingSaleListings([])

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    setProfile(profileData)

    const { data: followData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle()

    const ownMarketplace = user.id === userId
    const allowed = !!followData || ownMarketplace
    setIsOwnMarketplace(ownMarketplace)
    setIsAllowed(allowed)

    if (allowed) {
      const { data: reviewRows, error: reviewError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('seller_id', userId)

      if (!reviewError && reviewRows && reviewRows.length > 0) {
        const avg = reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length
        setReviewStats({ average: avg, count: reviewRows.length })
      } else {
        setReviewStats(null)
      }

      const { count: soldCountResult } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['sold', 'traded'])

      setSoldCount(soldCountResult || 0)

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching seller listings:', error.message)
      } else {
        const mapped = data.map(rowToListing)
        const withBids = await attachHighestBids(mapped)

        // Same reasoning as the main Marketplace page — an ended but
        // unresolved auction shouldn't keep showing in browsing. Kept
        // separate from the highlight lookup below: a direct link to a
        // specific listing (e.g. from search) should still open it
        // even if it's an ended auction waiting to be resolved.
        const now = new Date()
        const visible = withBids.filter((listing) => {
          if (listing.listingType !== 'auction' || !listing.endsAt) return true
          return new Date(listing.endsAt) > now
        })

        setListings(visible)
        loadAuctionBidCounts(visible)

        if (highlightedListingId) {
          const match = withBids.find((l) => String(l.id) === highlightedListingId)
          if (match) {
            setSelectedListing(match)
          } else {
            setListingNotFound(true)
          }
        }
      }

      if (ownMarketplace) {
        const { data: pendingData, error: pendingError } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending_sale')
          .order('created_at', { ascending: false })

        if (pendingError) {
          console.error('Error fetching pending-sale listings:', pendingError.message)
        } else {
          setPendingSaleListings((pendingData || []).map(rowToListing))
        }
      }
    }

    setLoading(false)
  }

  async function loadAuctionBidCounts(listingsArr) {
    const auctionIds = listingsArr.filter((l) => l.listingType === 'auction').map((l) => l.id)
    if (auctionIds.length === 0) {
      setAuctionBidCounts({})
      return
    }

    const { data, error } = await supabase.from('bids').select('listing_id').in('listing_id', auctionIds)

    if (error) {
      console.error('Error loading auction bid counts:', error.message)
      return
    }

    const counts = {}
    for (const bid of data) {
      counts[bid.listing_id] = (counts[bid.listing_id] || 0) + 1
    }
    setAuctionBidCounts(counts)
  }

  function handleBidPlaced(listingId, amount) {
    setListings((current) =>
      current.map((listing) => (listing.id === listingId ? { ...listing, currentBid: amount } : listing))
    )
  }

  function handleListingUpdated(listingId, updates) {
    setListings((current) =>
      current.map((listing) => (listing.id === listingId ? { ...listing, ...updates } : listing))
    )
    setSelectedListing((current) =>
      current && current.id === listingId ? { ...current, ...updates } : current
    )
  }

  async function handleMarkSold(listingId, soldPrice, buyerId) {
    const { error } = await supabase
      .from('listings')
      .update({
        status: 'sold',
        sold_price: soldPrice,
        sold_at: new Date().toISOString(),
        buyer_id: buyerId || null
      })
      .eq('id', listingId)

    if (error) {
      console.error('Error marking listing sold:', error.message)
      throw error
    }

    setListings((current) => current.filter((listing) => listing.id !== listingId))
    setSelectedListing(null)
  }

  async function handleCancelListing(listingId) {
    const { error } = await supabase
      .from('listings')
      .update({ status: 'cancelled' })
      .eq('id', listingId)

    if (error) {
      console.error('Error cancelling listing:', error.message)
      throw error
    }

    setListings((current) => current.filter((listing) => listing.id !== listingId))
    setSelectedListing(null)
  }

  function clearFilters() {
    setSearchText('')
    setGenreFilter('')
    setListingTypeFilter('')
    setConditionFilter('')
    setMinPrice('')
    setMaxPrice('')
  }

  if (loading) {
    return (
      <>
        <Header />
        <section className="px-5 lg:px-10 pb-10"><p>Loading...</p></section>
      </>
    )
  }

  const now = Date.now()

  const auctionSearchLower = auctionSearch.trim().toLowerCase()
  function matchesAuctionSearch(l) {
    if (!auctionSearchLower) return true
    return l.title.toLowerCase().includes(auctionSearchLower) || l.artist.toLowerCase().includes(auctionSearchLower)
  }

  const allUpcomingAuctions = listings.filter(
    (l) => l.listingType === 'auction' && l.startsAt && new Date(l.startsAt).getTime() > now
  )
  const allActiveAuctionsRaw = listings.filter(
    (l) =>
      l.listingType === 'auction' &&
      (!l.startsAt || new Date(l.startsAt).getTime() <= now) &&
      (!l.endsAt || new Date(l.endsAt).getTime() > now)
  )

  const upcomingAuctions = allUpcomingAuctions.filter(matchesAuctionSearch)
  const activeAuctions = allActiveAuctionsRaw
    .filter(matchesAuctionSearch)
    .map((l) => ({ ...l, bidCount: auctionBidCounts[l.id] || 0 }))
    .sort((a, b) => b.bidCount - a.bidCount)

  const upcomingIds = new Set(allUpcomingAuctions.map((l) => l.id))
  const activeAuctionIds = new Set(allActiveAuctionsRaw.map((l) => l.id))
  const remainingListings = listings.filter((l) => !upcomingIds.has(l.id) && !activeAuctionIds.has(l.id))

  const availableGenres = [...new Set(remainingListings.map((l) => l.genre).filter(Boolean))].sort()
  const availableConditions = [...new Set(remainingListings.map((l) => l.mediaCondition).filter(Boolean))].sort()

  const normalizedSearch = searchText.trim().toLowerCase()
  const parsedMin = minPrice === '' ? null : Number(minPrice)
  const parsedMax = maxPrice === '' ? null : Number(maxPrice)

  let filteredRemainingListings = remainingListings.filter((listing) => {
    if (normalizedSearch) {
      const matchesText =
        listing.title.toLowerCase().includes(normalizedSearch) ||
        listing.artist.toLowerCase().includes(normalizedSearch)
      if (!matchesText) return false
    }
    if (genreFilter && listing.genre !== genreFilter) return false
    if (listingTypeFilter && listing.listingType !== listingTypeFilter) return false
    if (conditionFilter && listing.mediaCondition !== conditionFilter) return false
    if (parsedMin !== null && Number(listing.price) < parsedMin) return false
    if (parsedMax !== null && Number(listing.price) > parsedMax) return false
    return true
  })

  if (sortOption === 'price_asc') {
    filteredRemainingListings = [...filteredRemainingListings].sort((a, b) => Number(a.price) - Number(b.price))
  } else if (sortOption === 'price_desc') {
    filteredRemainingListings = [...filteredRemainingListings].sort((a, b) => Number(b.price) - Number(a.price))
  }

  const filtersActive =
    normalizedSearch || genreFilter || listingTypeFilter || conditionFilter || minPrice !== '' || maxPrice !== ''

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null

  return (
    <>
      <Header />

      {/* pb-24 clears the fixed mobile bottom tab bar in Header.jsx;
          lg:pb-7 restores the normal desktop bottom spacing. */}
      <section className="px-5 lg:px-10 py-5 lg:py-7 pb-24 lg:pb-7 overflow-x-hidden">
        {/* Was a hardcoded inline style (`1fr 380px`) that never
            responded to viewport width — the same bug as the Shelf grid
            on ProfilePage and the grid on MarketplacePage. Single-column
            below lg, same two-column layout at lg+. */}
        <div className="grid gap-7 grid-cols-1 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0">
            <h2 className="text-2xl font-serif mb-1">
              {isOwnMarketplace ? 'My marketplace' : `${profile ? (profile.display_name || profile.email) : 'Seller'}'s marketplace`}
            </h2>

            {isAllowed && (
              <div className="flex items-center gap-4 flex-wrap mb-3 font-sans">
                <Link to={`/profile/${userId}`} className="inline-flex items-center gap-2 no-underline hover:opacity-80">
                  {reviewStats ? (
                    <>
                      <StarDisplay rating={reviewStats.average} />
                      <span className="text-text-muted text-xs">
                        {reviewStats.average.toFixed(1)} ({reviewStats.count} review{reviewStats.count === 1 ? '' : 's'})
                      </span>
                    </>
                  ) : (
                    <span className="text-text-muted text-xs">No reviews yet</span>
                  )}
                </Link>
                {soldCount > 0 && (
                  <span className="text-text-muted text-xs">{soldCount} sale{soldCount === 1 ? '' : 's'} completed</span>
                )}
                {memberSince && (
                  <span className="text-text-muted text-xs">Member since {memberSince}</span>
                )}
                {!isOwnMarketplace && (
                  <Link to={`/messages/${userId}`} className="text-accent text-xs no-underline">
                    Message seller
                  </Link>
                )}
              </div>
            )}

            {isOwnMarketplace && isAllowed && (
              <div className="flex items-center gap-3 flex-wrap mb-5 font-sans">
                <Link
                  to={`/profile/${userId}`}
                  className="text-[10px] uppercase tracking-wider text-accent no-underline bg-transparent border border-border rounded-full px-3 py-1.5 hover:border-accent"
                >
                  + List from your shelf
                </Link>
                <Link
                  to="/orders"
                  className="text-[10px] uppercase tracking-wider text-text-muted no-underline bg-transparent border border-border rounded-full px-3 py-1.5 hover:border-accent hover:text-accent"
                >
                  View orders
                </Link>
                <Link
                  to="/trade-offers"
                  className="text-[10px] uppercase tracking-wider text-text-muted no-underline bg-transparent border border-border rounded-full px-3 py-1.5 hover:border-accent hover:text-accent"
                >
                  View trade offers
                </Link>
              </div>
            )}

            {isAllowed && listingNotFound && (
              <p className="text-text-muted font-sans text-sm bg-surface border border-border rounded px-3 py-2 mb-4 inline-block">
                That listing is no longer available.
              </p>
            )}

            {!isAllowed ? (
              <p className="text-text-muted font-sans text-sm">Follow this user to view their marketplace.</p>
            ) : (
              <>
                {(allActiveAuctionsRaw.length + allUpcomingAuctions.length > 4) && (
                  <input
                    type="text"
                    placeholder="Search auctions by title or artist..."
                    value={auctionSearch}
                    onChange={(event) => setAuctionSearch(event.target.value)}
                    className="bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm w-full sm:w-64 mb-4"
                  />
                )}

                {auctionSearch.trim() && activeAuctions.length === 0 && upcomingAuctions.length === 0 && (
                  <p className="text-text-muted font-sans text-sm mb-4">No auctions match "{auctionSearch}".</p>
                )}

                {activeAuctions.length > 0 && (
                  <div className="mb-8">
                    <div className="bg-text inline-block px-2.5 py-1 mb-3">
                      <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Active auctions</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {activeAuctions.map((listing) => (
                        <ActiveAuctionCard key={listing.id} listing={listing} onSelect={() => setSelectedListing(listing)} />
                      ))}
                    </div>
                  </div>
                )}

                {upcomingAuctions.length > 0 && (
                  <div className="mb-8">
                    <div className="bg-text inline-block px-2.5 py-1 mb-3">
                      <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Upcoming auctions</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {upcomingAuctions.map((listing) => (
                        <UpcomingAuctionCard key={listing.id} listing={listing} />
                      ))}
                    </div>
                  </div>
                )}

                {isOwnMarketplace && pendingSaleListings.length > 0 && (
                  <div className="mb-8">
                    <div className="bg-text inline-block px-2.5 py-1 mb-3">
                      <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Pending sale</span>
                    </div>
                    <p className="text-xs text-text-faint mb-3">
                      Someone's bought this — it'll move to Sold once payment is confirmed.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {pendingSaleListings.map((listing) => (
                        <div key={listing.id} className="bg-surface border border-border rounded overflow-hidden opacity-70">
                          <img
                            src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
                            alt={listing.title}
                            className="w-full aspect-square object-cover"
                          />
                          <div className="p-2.5 font-sans">
                            <p className="m-0 text-sm font-bold truncate text-text">{listing.title}</p>
                            <p className="m-0 text-xs text-text-muted truncate">{listing.artist}</p>
                            <p className="m-0 text-[10px] uppercase tracking-wider text-accent mt-1">Pending</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {listings.length === 0 ? (
                  isOwnMarketplace ? (
                    <p className="text-text-muted font-sans text-sm">
                      Nothing listed yet.{' '}
                      <Link to={`/profile/${userId}`} className="text-accent">List an album from your shelf</Link> to see it here.
                    </p>
                  ) : (
                    <p className="text-text-muted font-sans text-sm">Nothing listed for sale, trade, or auction yet.</p>
                  )
                ) : remainingListings.length > 0 ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-4 font-sans">
                      <input
                        type="text"
                        placeholder="Search title or artist..."
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        className="bg-surface border border-border text-text px-3 py-2 rounded text-sm w-full sm:w-56"
                      />
                      <select
                        value={genreFilter}
                        onChange={(event) => setGenreFilter(event.target.value)}
                        className="bg-surface border border-border text-text px-2.5 py-2 rounded text-sm"
                      >
                        <option value="">All genres</option>
                        {availableGenres.map((genre) => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                      <select
                        value={listingTypeFilter}
                        onChange={(event) => setListingTypeFilter(event.target.value)}
                        className="bg-surface border border-border text-text px-2.5 py-2 rounded text-sm"
                      >
                        <option value="">All listing types</option>
                        {Object.entries(LISTING_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <select
                        value={conditionFilter}
                        onChange={(event) => setConditionFilter(event.target.value)}
                        className="bg-surface border border-border text-text px-2.5 py-2 rounded text-sm"
                      >
                        <option value="">All conditions</option>
                        {availableConditions.map((condition) => (
                          <option key={condition} value={condition}>{condition}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Min $"
                        value={minPrice}
                        onChange={(event) => setMinPrice(event.target.value)}
                        className="bg-surface border border-border text-text px-2.5 py-2 rounded text-sm w-24"
                      />
                      <span className="text-text-muted text-sm">–</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Max $"
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(event.target.value)}
                        className="bg-surface border border-border text-text px-2.5 py-2 rounded text-sm w-24"
                      />
                      <select
                        value={sortOption}
                        onChange={(event) => setSortOption(event.target.value)}
                        className="bg-surface border border-border text-text px-2.5 py-2 rounded text-sm"
                      >
                        <option value="newest">Newest first</option>
                        <option value="price_asc">Price: low to high</option>
                        <option value="price_desc">Price: high to low</option>
                      </select>
                      {filtersActive && (
                        <button
                          onClick={clearFilters}
                          className="bg-transparent border border-border text-text-muted px-3 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>

                    <p className="text-text-muted font-sans text-xs mb-2">
                      {filteredRemainingListings.length} listing{filteredRemainingListings.length === 1 ? '' : 's'}
                    </p>

                    {/* Same three view options as the Shelf and the
                        main Marketplace, for visual continuity across
                        the app. */}
                    <div className="flex gap-1 mb-4 bg-surface border border-border rounded-full p-1 w-fit font-sans">
                      <button
                        onClick={() => setSellerMarketplaceView('wall')}
                        className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                          sellerMarketplaceView === 'wall' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                        }`}
                      >
                        Wall
                      </button>
                      <button
                        onClick={() => setSellerMarketplaceView('grid')}
                        className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                          sellerMarketplaceView === 'grid' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                        }`}
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => setSellerMarketplaceView('crates')}
                        className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                          sellerMarketplaceView === 'crates' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                        }`}
                      >
                        Crates
                      </button>
                    </div>

                    {filtersActive && filteredRemainingListings.length === 0 ? (
                      <p className="text-text-muted font-sans text-sm">No listings match your filters.</p>
                    ) : (
                      sellerMarketplaceView === 'wall' ? (
                        <MarketplaceWallView listings={filteredRemainingListings} onSelectListing={setSelectedListing} />
                      ) : sellerMarketplaceView === 'crates' ? (
                        <MarketplaceCrateGridView listings={filteredRemainingListings} onSelectListing={setSelectedListing} />
                      ) : (
                        <MarketplaceGrid listings={filteredRemainingListings} onSelectListing={setSelectedListing} />
                      )
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <MarketplaceDetailPanel
            listing={selectedListing}
            currentUserId={user?.id}
            onMarkSold={handleMarkSold}
            onCancelListing={handleCancelListing}
            onBidPlaced={handleBidPlaced}
            onListingUpdated={handleListingUpdated}
            onClose={() => setSelectedListing(null)}
          />
        </div>
      </section>

      {selectedListing && (
        <SidePanel onClose={() => setSelectedListing(null)} width={420} overlayOnly>
          <ListingDetailContent
            listing={selectedListing}
            currentUserId={user?.id}
            onMarkSold={handleMarkSold}
            onCancelListing={handleCancelListing}
            onBidPlaced={handleBidPlaced}
            onListingUpdated={handleListingUpdated}
            onClose={() => setSelectedListing(null)}
          />
        </SidePanel>
      )}
    </>
  )
}

export default SellerMarketplacePage