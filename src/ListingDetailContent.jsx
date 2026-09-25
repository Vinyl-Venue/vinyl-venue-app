import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import ListingPhotoGallery from './ListingPhotoGallery'
import TradeOfferModal from './TradeOfferModal'

function ListingDetailContent({ listing, currentUserId, onMarkSold, onCancelListing, onBidPlaced, onListingUpdated, onClose }) {
  const navigate = useNavigate()
  const [addingToCart, setAddingToCart] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [tradeOfferSent, setTradeOfferSent] = useState(false)
  const [markingSold, setMarkingSold] = useState(false)
  const [soldPriceInput, setSoldPriceInput] = useState(listing.price)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Editable fields kept as local state, separate from the `listing`
  // prop — the prop only refreshes once the parent's own state catches
  // up via onListingUpdated, and the display needs to reflect a save
  // immediately regardless of that round-trip. Scoped to price/shipping/
  // trade preference only: changing listing_type itself would also mean
  // regenerating listing.listingTypeLabel client-side and changes which
  // actions buyers even see, which is a bigger change than "adjust my
  // price" — cancel-and-relist still covers actually recategorizing one.
  const [isEditingListing, setIsEditingListing] = useState(false)
  const [editPrice, setEditPrice] = useState('')
  const [editShippingPrice, setEditShippingPrice] = useState('')
  const [editTradePreference, setEditTradePreference] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const [localPrice, setLocalPrice] = useState(listing.price)
  const [localShippingPrice, setLocalShippingPrice] = useState(listing.shippingPrice)
  const [localTradePreference, setLocalTradePreference] = useState(listing.tradePreference)

  const [bids, setBids] = useState([])
  const [bidsLoading, setBidsLoading] = useState(false)
  const [bidAmountInput, setBidAmountInput] = useState('')
  const [bidSubmitting, setBidSubmitting] = useState(false)
  const [bidError, setBidError] = useState('')
  const [endingAuction, setEndingAuction] = useState(false)

  const hasPressingDetails =
    listing.label || listing.pressingCountry || listing.matrixNumber ||
    listing.deadwax || listing.sleeveCondition || listing.mediaCondition

  const isOwner = currentUserId && listing.userId === currentUserId
  const isSold = listing.status === 'sold'
  const isAuction = listing.listingType === 'auction'
  const auctionEnded = isAuction && listing.endsAt && new Date(listing.endsAt) < new Date()
  const auctionNotStarted = isAuction && listing.startsAt && new Date(listing.startsAt) > new Date()
  const wantsTradeInfo = listing.listingType === 'trade' || listing.listingType === 'fixed_or_trade'

  useEffect(() => {
    // Same lesson as AlbumDetailContent: this component can be reused
    // across different listings without unmounting (e.g. clicking
    // straight from one Marketplace tile to another in the sticky
    // detail panel), so everything seeded from the *previous* listing's
    // props needs an explicit reset here, keyed on listing.id.
    setMarkingSold(false)
    setSoldPriceInput(listing.price)
    setSubmitting(false)
    setErrorMsg('')

    setIsEditingListing(false)
    setEditSubmitting(false)
    setEditError('')
    setLocalPrice(listing.price)
    setLocalShippingPrice(listing.shippingPrice)
    setLocalTradePreference(listing.tradePreference)

    setBids([])
    setBidAmountInput('')
    setBidSubmitting(false)
    setBidError('')
    setEndingAuction(false)

    if (isAuction) {
      fetchBids()
    }
  }, [listing.id])

  async function handleAddToCart() {
    setAddingToCart(true)
    const { error } = await supabase
      .from('cart_items')
      .insert({ user_id: currentUserId, listing_id: listing.id })

    setAddingToCart(false)

    // The unique(user_id, listing_id) constraint means "already in
    // cart" surfaces as an insert error — treat that the same as
    // success rather than showing a confusing failure for something
    // that's already true.
    if (error && !error.message.includes('duplicate')) {
      console.error('Error adding to cart:', error.message)
      return
    }

    setAddedToCart(true)
  }

  function handleBuyNow() {
    navigate(`/checkout?listing=${listing.id}`)
  }

  async function fetchBids() {
    setBidsLoading(true)
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('listing_id', listing.id)
      .order('amount', { ascending: false })

    if (error) {
      console.error('Error fetching bids:', error.message)
    } else {
      setBids(data)
    }
    setBidsLoading(false)
  }

  const highestBid = bids.length > 0 ? bids[0] : null
  const currentAuctionPrice = highestBid ? highestBid.amount : listing.price
  const userIsTopBidder = highestBid && currentUserId && highestBid.bidder_id === currentUserId

  async function handleConfirmSold() {
    const parsedPrice = Number(soldPriceInput)

    if (!soldPriceInput || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Enter a valid sale price.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      await onMarkSold(listing.id, parsedPrice)
      // On success, MarketplacePage removes this listing and closes the modal.
    } catch (err) {
      setErrorMsg('Something went wrong — try again.')
      setSubmitting(false)
    }
  }

  function handleStartEdit() {
    setEditPrice(String(localPrice))
    setEditShippingPrice(localShippingPrice != null ? String(localShippingPrice) : '')
    setEditTradePreference(localTradePreference || '')
    setEditError('')
    setIsEditingListing(true)
  }

  async function handleSaveEdit() {
    const parsedPrice = Number(editPrice)

    if (!editPrice || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setEditError('Enter a valid price.')
      return
    }

    if (wantsTradeInfo && editTradePreference.trim() === '') {
      setEditError("Please describe what you'd accept in trade.")
      return
    }

    setEditSubmitting(true)
    setEditError('')

    const updates = {
      price: parsedPrice,
      shipping_price: editShippingPrice.trim() === '' ? null : Number(editShippingPrice),
      trade_preference: wantsTradeInfo ? editTradePreference.trim() : null
    }

    const { error } = await supabase.from('listings').update(updates).eq('id', listing.id)

    setEditSubmitting(false)

    if (error) {
      console.error('Error updating listing:', error.message)
      setEditError('Something went wrong — try again.')
      return
    }

    setLocalPrice(updates.price)
    setLocalShippingPrice(updates.shipping_price)
    setLocalTradePreference(updates.trade_preference)
    setIsEditingListing(false)

    onListingUpdated?.(listing.id, {
      price: updates.price,
      shippingPrice: updates.shipping_price,
      tradePreference: updates.trade_preference
    })
  }

  async function handlePlaceBid() {
    const parsedAmount = Number(bidAmountInput)
    const minimumRequired = highestBid ? highestBid.amount : listing.price
    const minimumLabel = highestBid ? 'higher than the current highest bid' : 'at least the starting price'

    if (!bidAmountInput || Number.isNaN(parsedAmount)) {
      setBidError('Enter a valid amount.')
      return
    }

    if ((highestBid && parsedAmount <= minimumRequired) || (!highestBid && parsedAmount < minimumRequired)) {
      setBidError(`Bid must be ${minimumLabel} ($${Number(minimumRequired).toFixed(2)}).`)
      return
    }

    setBidSubmitting(true)
    setBidError('')

    const { error } = await supabase
      .from('bids')
      .insert({
        listing_id: listing.id,
        bidder_id: currentUserId,
        amount: parsedAmount
      })

    if (error) {
      // The DB trigger is the real authority (handles race conditions the
      // client-side check above can't catch), so surface its message.
      setBidError(error.message.replace(/^.*?: /, ''))
      setBidSubmitting(false)
      return
    }

    setBidAmountInput('')
    setBidSubmitting(false)
    onBidPlaced?.(listing.id, parsedAmount)
    fetchBids()
  }

  async function handleEndAuction() {
    setEndingAuction(true)
    setErrorMsg('')

    try {
      if (highestBid) {
        await onMarkSold(listing.id, highestBid.amount)
      } else {
        await onCancelListing(listing.id)
      }
    } catch (err) {
      setErrorMsg('Something went wrong — try again.')
      setEndingAuction(false)
    }
  }

  return (
    <>
      <div className="p-6">
        <img
          src={listing.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
          alt={listing.title}
          className="w-full aspect-square object-cover rounded mb-4"
        />
        <h2 className="text-2xl m-0">{listing.title}</h2>
        <p className="font-sans text-text-muted -mt-1">{listing.artist}</p>
        <p className="font-sans text-sm text-text-muted">
          {listing.year || 'Year unknown'} · {listing.genre || 'Genre unknown'}
        </p>

        {isSold ? (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-accent font-serif text-2xl font-bold">
              Sold — ${Number(listing.soldPrice).toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-accent font-serif text-2xl font-bold">
              ${Number(isAuction ? currentAuctionPrice : localPrice).toFixed(2)}
            </span>
            <span className="font-sans text-sm text-text-muted">
              {isAuction ? (highestBid ? 'Current bid' : 'Starting bid') : listing.listingTypeLabel}
            </span>
          </div>
        )}

        {!isSold && (
          <p className="font-sans text-xs text-text-faint mt-1">
            + {localShippingPrice != null ? `$${Number(localShippingPrice).toFixed(2)} shipping` : 'shipping: contact seller'}
          </p>
        )}

        {localTradePreference && (
          <p className="font-sans text-sm text-text-muted mt-2">
            <strong className="text-text">Wants in trade:</strong> {localTradePreference}
          </p>
        )}

        {hasPressingDetails && (
          <div className="mt-4 pt-4 border-t border-border font-sans text-sm text-text-muted">
            {listing.sleeveCondition && <p className="my-1"><strong className="text-text">Sleeve condition:</strong> {listing.sleeveCondition}</p>}
            {listing.mediaCondition && <p className="my-1"><strong className="text-text">Media condition:</strong> {listing.mediaCondition}</p>}
            {listing.label && <p className="my-1"><strong className="text-text">Label:</strong> {listing.label}</p>}
            {listing.pressingCountry && <p className="my-1"><strong className="text-text">Pressing country:</strong> {listing.pressingCountry}</p>}
            {listing.matrixNumber && <p className="my-1"><strong className="text-text">Matrix number:</strong> {listing.matrixNumber}</p>}
            {listing.deadwax && <p className="my-1"><strong className="text-text">Deadwax / runout:</strong> {listing.deadwax}</p>}
          </div>
        )}

        <ListingPhotoGallery listingId={listing.id} />

        {/* Auction bidding — non-owners bid while it's active */}
        {isAuction && !isSold && !isOwner && (
          <div className="mt-4 pt-4 border-t border-border font-sans">
            {auctionNotStarted ? (
              <p className="text-sm text-text-muted">
                Bidding opens {new Date(listing.startsAt).toLocaleString()}.
              </p>
            ) : auctionEnded ? (
              <p className="text-sm text-text-muted">
                {userIsTopBidder ? 'Auction ended — you won!' : 'This auction has ended.'}
              </p>
            ) : (
              <>
                <label className="text-sm text-text-muted block mb-1">Your bid</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={highestBid ? `More than $${Number(highestBid.amount).toFixed(2)}` : `At least $${Number(listing.price).toFixed(2)}`}
                    value={bidAmountInput}
                    onChange={(event) => setBidAmountInput(event.target.value)}
                    disabled={bidSubmitting}
                    className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-text"
                  />
                  <button
                    onClick={handlePlaceBid}
                    disabled={bidSubmitting}
                    className="bg-accent text-bg font-sans text-sm font-bold px-4 py-1.5 rounded cursor-pointer disabled:opacity-60"
                  >
                    {bidSubmitting ? 'Placing...' : 'Bid'}
                  </button>
                </div>
                {bidError && <p className="text-sm text-[#c1666b] mt-2">{bidError}</p>}
              </>
            )}
            {!bidsLoading && bids.length > 0 && (
              <p className="text-xs text-text-muted mt-2">{bids.length} bid{bids.length === 1 ? '' : 's'} so far</p>
            )}
          </div>
        )}

        {/* Auction owner — end the auction once time's up */}
        {isAuction && !isSold && isOwner && (
          <div className="mt-4 pt-4 border-t border-border font-sans">
            {auctionNotStarted ? (
              <p className="text-sm text-text-muted">
                Scheduled to start {new Date(listing.startsAt).toLocaleString()}.
              </p>
            ) : !auctionEnded ? (
              <p className="text-sm text-text-muted">
                {highestBid ? `Highest bid so far: $${Number(highestBid.amount).toFixed(2)} (${bids.length} bid${bids.length === 1 ? '' : 's'})` : 'No bids yet.'}
              </p>
            ) : (
              <>
                <p className="text-sm text-text-muted mb-2">
                  {highestBid
                    ? `Auction ended — winning bid: $${Number(highestBid.amount).toFixed(2)}`
                    : 'Auction ended with no bids.'}
                </p>
                {errorMsg && <p className="text-sm text-[#c1666b] mb-2">{errorMsg}</p>}
                <button
                  onClick={handleEndAuction}
                  disabled={endingAuction}
                  className="w-full bg-accent text-bg font-sans text-sm font-bold py-2 rounded cursor-pointer disabled:opacity-60"
                >
                  {endingAuction ? 'Saving...' : highestBid ? 'Mark sold to highest bidder' : 'Cancel listing (no bids)'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Fixed-price / trade — non-owners get real actions here now:
            Add to Cart / Buy Now create actual orders (see CheckoutPage),
            and Propose a Trade opens a real picker of the offerer's own
            shelf items (see TradeOfferModal) rather than just a
            pre-filled message. A plain "message the seller" link stays
            available separately below for questions that aren't a
            purchase or trade action. */}
        {!isAuction && !isOwner && !isSold && (
          <div className="mt-4 pt-4 border-t border-border font-sans">
            <div className="flex gap-2 mb-2">
              {(listing.listingType === 'fixed' || listing.listingType === 'fixed_or_trade') && (
                <>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 bg-accent text-bg font-bold text-sm py-2 rounded cursor-pointer"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart || addedToCart}
                    className="flex-1 bg-transparent border border-border text-text-muted font-bold text-sm py-2 rounded cursor-pointer hover:border-accent hover:text-accent disabled:opacity-60"
                  >
                    {addedToCart ? 'Added ✓' : addingToCart ? 'Adding...' : 'Add to Cart'}
                  </button>
                </>
              )}
              {(listing.listingType === 'trade' || listing.listingType === 'fixed_or_trade') && !tradeOfferSent && (
                <button
                  onClick={() => setShowTradeModal(true)}
                  className={`flex-1 font-bold text-sm py-2 rounded cursor-pointer ${
                    listing.listingType === 'trade'
                      ? 'bg-accent text-bg'
                      : 'bg-transparent border border-border text-text-muted hover:border-accent hover:text-accent'
                  }`}
                >
                  Propose a Trade
                </button>
              )}
              {tradeOfferSent && (
                <p className="flex-1 text-accent text-sm text-center py-2 m-0">Trade offer sent!</p>
              )}
            </div>
            <Link
              to={`/messages/${listing.userId}`}
              className="text-xs text-text-faint no-underline hover:text-accent"
            >
              Message the seller with a question
            </Link>
          </div>
        )}

        {showTradeModal && (
          <TradeOfferModal
            listing={listing}
            currentUserId={currentUserId}
            onClose={() => setShowTradeModal(false)}
            onSubmitted={() => { setShowTradeModal(false); setTradeOfferSent(true) }}
          />
        )}

        {/* Fixed-price / trade — owner self-reports the sale, and can
            now edit price/shipping/trade terms without cancelling and
            recreating the whole listing. */}
        {!isAuction && isOwner && !isSold && (
          <div className="mt-4 pt-4 border-t border-border">
            {isEditingListing ? (
              <div className="font-sans">
                <label className="text-sm text-text-muted block mb-1">Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrice}
                  onChange={(event) => setEditPrice(event.target.value)}
                  disabled={editSubmitting}
                  className="w-full bg-bg border border-border rounded px-2 py-1.5 text-text mb-2"
                />
                <label className="text-sm text-text-muted block mb-1">Shipping ($) — leave blank for "contact seller"</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editShippingPrice}
                  onChange={(event) => setEditShippingPrice(event.target.value)}
                  disabled={editSubmitting}
                  className="w-full bg-bg border border-border rounded px-2 py-1.5 text-text mb-2"
                />
                {wantsTradeInfo && (
                  <>
                    <label className="text-sm text-text-muted block mb-1">What you'd accept in trade</label>
                    <input
                      type="text"
                      value={editTradePreference}
                      onChange={(event) => setEditTradePreference(event.target.value)}
                      disabled={editSubmitting}
                      className="w-full bg-bg border border-border rounded px-2 py-1.5 text-text mb-2"
                    />
                  </>
                )}
                {editError && <p className="text-sm text-[#c1666b] mb-2">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSubmitting}
                    className="flex-1 bg-accent text-bg font-sans text-sm font-bold py-2 rounded cursor-pointer disabled:opacity-60"
                  >
                    {editSubmitting ? 'Saving...' : 'Save changes'}
                  </button>
                  <button
                    onClick={() => { setIsEditingListing(false); setEditError('') }}
                    disabled={editSubmitting}
                    className="flex-1 bg-transparent border border-border text-text-muted font-sans text-sm py-2 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : !markingSold ? (
              <div className="flex gap-2">
                <button
                  onClick={handleStartEdit}
                  className="flex-1 bg-transparent border border-border text-text-muted font-sans text-sm font-bold py-2 rounded cursor-pointer hover:border-accent hover:text-accent"
                >
                  Edit listing
                </button>
                <button
                  onClick={() => setMarkingSold(true)}
                  className="flex-1 bg-accent text-bg font-sans text-sm font-bold py-2 rounded cursor-pointer"
                >
                  Mark as Sold
                </button>
              </div>
            ) : (
              <div className="font-sans">
                <label className="text-sm text-text-muted block mb-1">Final sale price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={soldPriceInput}
                  onChange={(event) => setSoldPriceInput(event.target.value)}
                  className="w-full bg-bg border border-border rounded px-2 py-1.5 text-text mb-2"
                  disabled={submitting}
                />
                {errorMsg && <p className="text-sm text-[#c1666b] mb-2">{errorMsg}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmSold}
                    disabled={submitting}
                    className="flex-1 bg-accent text-bg font-sans text-sm font-bold py-2 rounded cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Saving...' : 'Confirm sold'}
                  </button>
                  <button
                    onClick={() => { setMarkingSold(false); setErrorMsg('') }}
                    disabled={submitting}
                    className="flex-1 bg-transparent border border-border text-text-muted font-sans text-sm py-2 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default ListingDetailContent