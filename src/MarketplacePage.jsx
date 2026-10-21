import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import MarketplaceGrid from './MarketplaceGrid'
import MarketplaceWallView from './MarketplaceWallView'
import MarketplaceCrateGridView from './MarketplaceCrateGridView'
import ListingDetailContent from './ListingDetailContent'
import MarketplaceDetailPanel from './MarketplaceDetailPanel'
import SidePanel from './SidePanel'
import MostWantedRail from './marketplace/MostWantedRail'
import { LiveAuctions, UpcomingAuctions } from './marketplace/AuctionSections'
import YourBidsStrip from './marketplace/YourBidsStrip'
import FollowedRow from './marketplace/FollowedRow'
import SuggestedRow from './marketplace/SuggestedRow'
import { buildTaste, suggestListings } from './marketplace/suggestions'
import { useWatchlist } from './marketplace/useWatchlist'
import { loadPriceAverages, dealPercent } from './marketplace/priceStats'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { rowToListing, attachHighestBids, LISTING_TYPE_LABELS, timeAgo, displayNameFor, avatarPlaceholder, fuzzyMatchKey } from './utils'
import { SkeletonGrid } from './Skeleton'

function MarketplacePage() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [followedListings, setFollowedListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState(null)

  const [searchText, setSearchText] = useState('')
  const [marketplaceView, setMarketplaceView] = useState('grid')
  const [sortOption, setSortOption] = useState('newest')
  const [genreFilter, setGenreFilter] = useState('')
  const [listingTypeFilter, setListingTypeFilter] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const listingsSectionRef = useRef(null)
  const watch = useWatchlist(user?.id)
  const [followedIds, setFollowedIds] = useState(new Set())
  const [followedLoaded, setFollowedLoaded] = useState(false)
  const [wishlistKeys, setWishlistKeys] = useState(new Set())
  const [ownedKeys, setOwnedKeys] = useState(new Set())
  const [taste, setTaste] = useState(null)
  const [averages, setAverages] = useState(new Map())
  const [quick, setQuick] = useState({ wishlist: false, following: false, trade: false, under25: false })
  const [visibleCount, setVisibleCount] = useState(24)
  const [boardOpen, setBoardOpen] = useState(() => {
    // Open by default only on wide screens, where there's room for the board,
    // the listings and the detail panel side by side.
    const wide = typeof window !== 'undefined' && window.innerWidth >= 1500
    try {
      const saved = localStorage.getItem('vv-board-open')
      return saved === null ? wide : saved === 'true'
    } catch { return wide }
  })

  function normalizeForMatch(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  }

  function handleMostWantedClick(item) {
    const targetTitle = normalizeForMatch(item.title)
    const targetArtist = normalizeForMatch(item.artist)

    const matchingListing = listings.find((listing) => {
      const listingTitle = normalizeForMatch(listing.title)
      const listingArtist = normalizeForMatch(listing.artist)
      const titlesMatch = listingTitle === targetTitle || listingTitle.includes(targetTitle) || targetTitle.includes(listingTitle)
      const artistsMatch = listingArtist === targetArtist || listingArtist.includes(targetArtist) || targetArtist.includes(listingArtist)
      return titlesMatch && artistsMatch
    })

    if (matchingListing) {
      clearFilters()
      setSelectedListing(matchingListing)
      return
    }

    clearFilters()
    setSearchText(item.title)
    listingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [auctionBidCounts, setAuctionBidCounts] = useState({})

  const [topics, setTopics] = useState([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [topicError, setTopicError] = useState('')

  useEffect(() => {
    fetchListings()
    loadTopics()
    loadFollowedListings()
    loadMyWishlistAndShelf()
    loadPriceAverages().then(setAverages)

    const channel = supabase
      .channel('board-topics-sidebar')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'board_posts' },
        () => loadTopics()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

    const mapped = data.map(rowToListing)
    const withBids = await attachHighestBids(mapped)

    // An auction whose end time has passed but hasn't been resolved
    // yet (the seller hasn't clicked "Mark sold" or "Cancel listing")
    // is still technically status='active' in the DB — but it
    // shouldn't keep showing up for browsing/bidding once time's up,
    // regardless of which of the two outcomes (sold to highest bidder,
    // or unsold) it's waiting to be resolved into.
    const now = new Date()
    const visible = withBids.filter((listing) => {
      if (listing.listingType !== 'auction' || !listing.endsAt) return true
      return new Date(listing.endsAt) > now
    })

    // Seller reputation on every card, not just followed sellers: the
    // moment you're deciding whether to trust a stranger is exactly when
    // an average rating and review count matter most.
    const sellerIds = [...new Set(visible.map((l) => l.userId).filter(Boolean))]
    const { data: reviewRows } = sellerIds.length > 0
      ? await supabase.from('reviews').select('seller_id, rating').in('seller_id', sellerIds)
      : { data: [] }

    const ratingStats = new Map()
    for (const row of reviewRows || []) {
      const stat = ratingStats.get(row.seller_id) || { sum: 0, count: 0 }
      stat.sum += row.rating
      stat.count += 1
      ratingStats.set(row.seller_id, stat)
    }

    setListings(
      visible.map((l) => {
        const stat = ratingStats.get(l.userId)
        return {
          ...l,
          sellerRating: stat ? stat.sum / stat.count : null,
          sellerReviewCount: stat ? stat.count : 0
        }
      })
    )
    setLoading(false)
    loadAuctionBidCounts(visible)
  }

  // A listing from someone you already follow converts better than a
  // stranger's — this surfaces those first, with a trust badge (average
  // review rating) right on the card, so the social signal that
  // normally lives buried in a seller's profile shows up at the moment
  // it's most useful: right before you'd consider buying. Queried with
  // raw column names directly (not through rowToListing) since this
  // only needs a handful of display fields, not the full listing shape.
  async function loadFollowedListings() {
    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followedIds = (followRows || []).map((row) => row.following_id)
    setFollowedIds(new Set(followedIds))
    setFollowedLoaded(true)

    if (followedIds.length === 0) {
      setFollowedListings([])
      return
    }

    const { data: listingRows, error } = await supabase
      .from('listings')
      .select('id, title, artist, image_url, price, listing_type, user_id, ends_at')
      .in('user_id', followedIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('Error loading followed-seller listings:', error.message)
      return
    }

    // Same reasoning as fetchListings — an ended-but-unresolved auction
    // shouldn't surface here either. Fetches a bit more headroom (15)
    // than the 5 actually shown, since filtering happens after the
    // query rather than in it, to reduce the odds of an under-filled
    // list when several recent listings happen to be ended auctions.
    const now = new Date()
    const activeRows = (listingRows || [])
      .filter((row) => row.listing_type !== 'auction' || !row.ends_at || new Date(row.ends_at) > now)
      .slice(0, 12)

    const sellerIds = [...new Set(activeRows.map((row) => row.user_id))]

    const { data: profiles } = sellerIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, email').in('id', sellerIds)
      : { data: [] }
    const profileById = new Map((profiles || []).map((p) => [p.id, p]))

    const { data: reviewRows } = sellerIds.length > 0
      ? await supabase.from('reviews').select('seller_id, rating').in('seller_id', sellerIds)
      : { data: [] }

    const ratingsBySeller = new Map()
    for (const row of reviewRows || []) {
      if (!ratingsBySeller.has(row.seller_id)) ratingsBySeller.set(row.seller_id, [])
      ratingsBySeller.get(row.seller_id).push(row.rating)
    }

    setFollowedListings(activeRows.map((row) => {
      const sellerRatings = ratingsBySeller.get(row.user_id) || []
      const avgRating = sellerRatings.length > 0
        ? sellerRatings.reduce((sum, r) => sum + r, 0) / sellerRatings.length
        : null
      const sellerProfile = profileById.get(row.user_id)

      return {
        id: row.id,
        title: row.title,
        artist: row.artist,
        imageUrl: row.image_url,
        price: row.price,
        listingType: row.listing_type,
        sellerName: sellerProfile?.display_name || sellerProfile?.email || 'Unknown seller',
        sellerRating: avgRating
      }
    }))
  }

  // Your own Most wanted list and shelf, as match keys: the first drives the
  // "Matches my Most wanted" filter, the second the "You own this" tags.
  async function loadMyWishlistAndShelf() {
    if (!user) return
    const [wishRes, albumRes] = await Promise.all([
      supabase.from('wishlist_items').select('title, artist').eq('user_id', user.id),
      supabase.from('albums').select('title, artist, genre').eq('user_id', user.id)
    ])
    setWishlistKeys(new Set((wishRes.data || []).map(fuzzyMatchKey)))
    setOwnedKeys(new Set((albumRes.data || []).map(fuzzyMatchKey)))
    setTaste(buildTaste(albumRes.data, wishRes.data))
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

  async function loadTopics() {
    const { data: topicRows, error: topicError } = await supabase
      .from('board_posts')
      .select('*')
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(8)

    if (topicError) {
      console.error('Error loading board topics:', topicError.message)
      setTopicsLoading(false)
      return
    }

    const topicIds = topicRows.map((t) => t.id)

    const { data: replyRows } = topicIds.length > 0
      ? await supabase.from('board_posts').select('parent_post_id').in('parent_post_id', topicIds)
      : { data: [] }

    const replyCounts = {}
    for (const reply of replyRows || []) {
      replyCounts[reply.parent_post_id] = (replyCounts[reply.parent_post_id] || 0) + 1
    }

    const authorIds = [...new Set(topicRows.map((t) => t.user_id))]
    const { data: profiles } = authorIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', authorIds)
      : { data: [] }
    const profileById = new Map((profiles || []).map((p) => [p.id, p]))

    setTopics(topicRows.map((t) => ({
      ...t,
      author: profileById.get(t.user_id),
      replyCount: replyCounts[t.id] || 0
    })))
    setTopicsLoading(false)
  }

  async function handlePostTopic() {
    if (!newTitle.trim() || !newBody.trim()) {
      setTopicError('Both a title and a message are required.')
      return
    }

    setPosting(true)
    setTopicError('')

    const { error: insertError } = await supabase.from('board_posts').insert({
      user_id: user.id,
      title: newTitle.trim(),
      body: newBody.trim(),
      parent_post_id: null
    })

    if (insertError) {
      console.error('Error posting topic:', insertError.message)
      setTopicError('Something went wrong — try again.')
      setPosting(false)
      return
    }

    setNewTitle('')
    setNewBody('')
    setShowNewTopic(false)
    setPosting(false)
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

  const nowMs = Date.now()
  const upcomingAuctions = listings.filter(
    (l) => l.listingType === 'auction' && l.startsAt && new Date(l.startsAt).getTime() > nowMs
  )
  const liveAuctions = listings
    .filter((l) => l.listingType === 'auction' && !(l.startsAt && new Date(l.startsAt).getTime() > nowMs))
    .map((l) => ({ ...l, bidCount: auctionBidCounts[l.id] || 0 }))

  // Auctions have their own sections above; "All listings" is everything
  // else, unless you filter to auctions on purpose.
  const browsableListings = listingTypeFilter === 'auction'
    ? listings.filter((l) => l.listingType === 'auction')
    : listings.filter((l) => l.listingType !== 'auction')

  const availableGenres = [...new Set(browsableListings.map((listing) => listing.genre).filter(Boolean))].sort()
  const availableConditions = [...new Set(browsableListings.map((listing) => listing.mediaCondition).filter(Boolean))].sort()

  const normalizedSearch = searchText.trim().toLowerCase()
  const parsedMin = minPrice === '' ? null : Number(minPrice)
  const parsedMax = maxPrice === '' ? null : Number(maxPrice)

  let filteredListings = browsableListings.filter((listing) => {
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

    if (quick.wishlist && !wishlistKeys.has(fuzzyMatchKey(listing))) return false
    if (quick.following && !followedIds.has(listing.userId)) return false
    if (quick.trade && listing.listingType !== 'trade' && listing.listingType !== 'fixed_or_trade') return false
    if (quick.under25 && !(Number(listing.price) < 25)) return false

    return true
  })

  if (sortOption === 'price_asc') {
    filteredListings = [...filteredListings].sort((a, b) => Number(a.price) - Number(b.price))
  } else if (sortOption === 'price_desc') {
    filteredListings = [...filteredListings].sort((a, b) => Number(b.price) - Number(a.price))
  } else if (sortOption === 'deal') {
    filteredListings = [...filteredListings].sort((a, b) => (dealPercent(b, averages) || 0) - (dealPercent(a, averages) || 0))
  }

  const quickActive = quick.wishlist || quick.following || quick.trade || quick.under25
  const filtersActive =
    normalizedSearch || genreFilter || listingTypeFilter || conditionFilter || minPrice !== '' || maxPrice !== '' || quickActive

  function clearFilters() {
    setSearchText('')
    setGenreFilter('')
    setListingTypeFilter('')
    setConditionFilter('')
    setMinPrice('')
    setMaxPrice('')
    setQuick({ wishlist: false, following: false, trade: false, under25: false })
  }

  function toggleBoard() {
    setBoardOpen((open) => {
      try { localStorage.setItem('vv-board-open', String(!open)) } catch { /* private mode */ }
      return !open
    })
  }

  const shownListings = filteredListings.slice(0, visibleCount)
  const dealFor = (listing) => dealPercent(listing, averages)
  const suggested = useMemo(
    () => suggestListings({ listings, taste, ownedKeys, followedIds, userId: user?.id }),
    [listings, taste, ownedKeys, followedIds, user?.id]
  )

  return (
    <>
      <Header />

      {/* overflow-x-clip as a safety net, same reasoning as ProfilePage —
          the real fix is the responsive grid below, this just guards
          against any future stray fixed-width element. */}
      <div className="flex flex-col lg:flex-row overflow-x-clip">
        {/* Board stays desktop-only for now — secondary content, not
            part of this pass. Worth a mobile treatment later if it turns
            out people want it on the go. */}
        <aside className="w-[280px] flex-shrink-0 border-r border-border px-5 py-7 hidden lg:block">
         <div className="sticky top-5 flex flex-col gap-6 max-h-[calc(100vh-40px)] overflow-y-auto">
          <MostWantedRail variant="column" userId={user?.id} ownedKeys={ownedKeys} listings={listings} onItemClick={handleMostWantedClick} />
          <div>
          <div className="flex items-center justify-between mb-1">
            <p className="font-serif italic text-lg text-text m-0">Board</p>
            <button onClick={toggleBoard} className="text-xs text-text-muted bg-transparent border-0 cursor-pointer ml-auto mr-3">{boardOpen ? '\u2039 Collapse' : 'Expand \u203a'}</button>
            {boardOpen && !showNewTopic && (
              <button
                onClick={() => setShowNewTopic(true)}
                className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
              >
                + New topic
              </button>
            )}
          </div>
          {boardOpen && (<>
          <p className="font-sans text-[10px] uppercase tracking-wider text-text-faint mb-4">Open discussion</p>

          {showNewTopic && (
            <div className="mb-4 bg-surface border border-border rounded p-3 font-sans">
              <input
                type="text"
                placeholder="Topic title"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                disabled={posting}
                className="w-full bg-bg border border-border text-text px-2 py-1.5 rounded text-xs mb-2"
              />
              <textarea
                placeholder="What's on your mind?"
                value={newBody}
                onChange={(event) => setNewBody(event.target.value)}
                rows={3}
                disabled={posting}
                className="w-full bg-bg border border-border text-text px-2 py-1.5 rounded text-xs resize-none mb-2"
              />
              {topicError && <p className="text-xs text-[#c1666b] mb-2">{topicError}</p>}
              <div className="flex gap-1.5">
                <button
                  onClick={handlePostTopic}
                  disabled={posting}
                  className="bg-accent text-bg font-bold text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-60"
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
                <button
                  onClick={() => { setShowNewTopic(false); setTopicError('') }}
                  disabled={posting}
                  className="bg-transparent border border-border text-text-muted text-xs px-3 py-1.5 rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {topicsLoading && <p className="text-xs text-text-muted font-sans">Loading...</p>}
          {!topicsLoading && topics.length === 0 && (
            <p className="text-xs text-text-muted font-sans">No topics yet — start the first one.</p>
          )}

          <div className="flex flex-col gap-3">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                to={`/board/${topic.id}`}
                className="flex items-center gap-2.5 no-underline text-text hover:text-accent"
              >
                <img
                  src={topic.author?.avatar_url || avatarPlaceholder(28)}
                  alt=""
                  className="w-7 h-7 object-cover rounded-full flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs m-0 font-bold truncate">{topic.title}</p>
                  <p className="text-[10px] text-text-faint font-mono m-0 mt-0.5">
                    {displayNameFor(topic.author)} · {timeAgo(topic.created_at)} · {topic.replyCount} repl{topic.replyCount === 1 ? 'y' : 'ies'}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {!topicsLoading && topics.length > 0 && (
            <Link to="/board" className="block text-[10px] uppercase tracking-wider text-accent no-underline mt-4">
              View all topics →
            </Link>
          )}
          </>)}
          </div>
         </div>
        </aside>

        {/* pb-24 clears the fixed mobile bottom tab bar in Header.jsx;
            lg:pb-7 restores the normal desktop bottom spacing. */}
        <section className="flex-1 min-w-0 px-5 lg:px-10 py-5 lg:py-7 pb-32 lg:pb-16">
          {/* Was a hardcoded inline style (`1fr 380px`) that never
              responded to viewport width at all — the real cause of the
              detail column crushing everything else on narrow screens.
              Now single-column below lg, same two-column layout at lg+. */}
          <div className="grid gap-7 grid-cols-1 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0">
              <h2 className="text-[34px] leading-tight font-serif italic font-normal mb-4">Marketplace</h2>

              <div className="flex flex-col gap-7 mb-7">
                <YourBidsStrip userId={user?.id} listings={listings} watch={watch} onSelect={setSelectedListing} />
                <LiveAuctions auctions={liveAuctions} onSelect={setSelectedListing} watch={watch} />
                <UpcomingAuctions auctions={upcomingAuctions} onSelect={setSelectedListing} watch={watch} />
                <MostWantedRail variant="row" userId={user?.id} ownedKeys={ownedKeys} listings={listings} onItemClick={handleMostWantedClick} />
                <SuggestedRow items={suggested} onSelect={setSelectedListing} />
                <FollowedRow
                  items={followedListings}
                  followsAnyone={followedIds.size > 0 || !followedLoaded}
                  showingOnly={quick.following}
                  onShowOnly={() => {
                    setQuick((q) => ({ ...q, following: !q.following }))
                    listingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  onSelect={(id) => {
                    const full = listings.find((l) => l.id === id)
                    if (full) setSelectedListing(full)
                  }}
                />
              </div>

              <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight text-text mb-3">All listings</h2>
              <div ref={listingsSectionRef} className="flex flex-wrap items-center gap-2.5 mb-4 font-sans">
                <input
                  type="text"
                  placeholder="Search title or artist..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  className="bg-surface border border-border text-text px-3 py-2 rounded text-sm w-full sm:w-64"
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
                  {averages.size > 0 && <option value="deal">Best deal</option>}
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

              <div className="flex flex-wrap items-center gap-2 mb-4 font-sans">
                <span className="text-xs text-text-muted">Quick filters:</span>
                {[
                  { key: 'wishlist', label: 'Matches my Most wanted' },
                  { key: 'following', label: 'From people I follow' },
                  { key: 'trade', label: 'Trade only' },
                  { key: 'under25', label: 'Under $25' }
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setQuick((q) => ({ ...q, [chip.key]: !q[chip.key] }))}
                    aria-pressed={quick[chip.key]}
                    className={`font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full cursor-pointer border ${
                      quick[chip.key] ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border hover:border-accent'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-text-muted">{filteredListings.length} listing{filteredListings.length === 1 ? '' : 's'}</span>
              </div>

              {/* Same three view options as the Shelf, for visual
                  continuity across the app. */}
              <div className="flex gap-1 mb-4 bg-surface border border-border rounded-full p-1 w-fit font-sans">
                <button
                  onClick={() => setMarketplaceView('wall')}
                  className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                    marketplaceView === 'wall' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                  }`}
                >
                  Wall
                </button>
                <button
                  onClick={() => setMarketplaceView('grid')}
                  className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                    marketplaceView === 'grid' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setMarketplaceView('crates')}
                  className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                    marketplaceView === 'crates' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                  }`}
                >
                  Crates
                </button>
              </div>

              <p className="text-[11px] text-text-faint font-sans mb-4 -mt-2">
                {marketplaceView === 'wall' && 'Browse listings on a virtual record shelf, grouped by genre.'}
                {marketplaceView === 'grid' && 'A compact grid of covers — fastest way to scan everything for sale.'}
                {marketplaceView === 'crates' && 'Flip through genre-grouped stacks with depth and a filmstrip.'}
              </p>

              {loading && <SkeletonGrid />}
              {!loading && filtersActive && filteredListings.length === 0 ? (
                <p className="text-text-muted font-sans text-sm">No listings match your filters.</p>
              ) : (
                !loading && (
                  marketplaceView === 'wall' ? (
                    <MarketplaceWallView listings={shownListings} onSelectListing={setSelectedListing} />
                  ) : marketplaceView === 'crates' ? (
                    <MarketplaceCrateGridView listings={shownListings} onSelectListing={setSelectedListing} />
                  ) : (
                    <MarketplaceGrid listings={shownListings} onSelectListing={setSelectedListing} watch={watch} dealFor={dealFor} />
                  )
                )
              )}
              {!loading && filteredListings.length > visibleCount && (
                <div className="flex items-center justify-center gap-3 mt-5 font-sans text-[13px] text-text-muted">
                  Showing {shownListings.length} of {filteredListings.length}
                  <button onClick={() => setVisibleCount((n) => n + 24)} className="text-accent bg-transparent border-0 cursor-pointer text-[13px]">Load more</button>
                </div>
              )}
            </div>

            <MarketplaceDetailPanel
              onSelectListing={setSelectedListing}
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
      </div>

      {selectedListing && (
        <SidePanel onClose={() => setSelectedListing(null)} width={420} overlayOnly>
          <ListingDetailContent
            key={selectedListing.id}
            onSelectListing={setSelectedListing}
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

export default MarketplacePage