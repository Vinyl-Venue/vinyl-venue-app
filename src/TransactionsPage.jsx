import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import AddToShelfPrompt from './AddToShelfPrompt'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { displayNameFor, avatarPlaceholder } from './utils'

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled'
}

function StarPicker({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          disabled={disabled}
          className={`bg-transparent border-0 text-xl cursor-pointer p-0 ${star <= value ? 'text-accent' : 'text-border'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function SaleRow({ listing, buyerEmail, cancellableOrderId, onCancelOrder }) {
  const [cancelling, setCancelling] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  async function handleCancelClick() {
    setCancelling(true)
    await onCancelOrder(cancellableOrderId)
    setCancelling(false)
  }

  return (
    <div className="bg-surface border border-border rounded px-4 py-3 font-sans">
      <div className="flex items-center gap-3">
        <img
          src={listing.image_url || "https://placehold.co/60x60/1c1a15/a8a29a?text=%20"}
          alt={listing.title}
          className="w-14 h-14 object-cover rounded flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="m-0 text-sm text-text"><strong>{listing.title}</strong> — {listing.artist}</p>
          <p className="m-0 text-xs text-text-muted mt-0.5">
            Sold{buyerEmail ? ` to ${buyerEmail}` : ''} for ${Number(listing.sold_price).toFixed(2)}
          </p>
        </div>
        {cancellableOrderId && !confirmingCancel && (
          <button
            onClick={() => setConfirmingCancel(true)}
            className="text-xs text-text-faint bg-transparent border-0 cursor-pointer hover:text-accent flex-shrink-0"
          >
            Cancel order
          </button>
        )}
      </div>

      {confirmingCancel && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-text-muted mb-2">
            This reverses the sale — the listing goes back to active and the album returns to your shelf. The buyer will be notified. Are you sure?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancelClick}
              disabled={cancelling}
              className="bg-[#c1666b] text-bg font-bold text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-60"
            >
              {cancelling ? 'Cancelling...' : 'Yes, cancel this order'}
            </button>
            <button
              onClick={() => setConfirmingCancel(false)}
              disabled={cancelling}
              className="bg-transparent border border-border text-text-muted text-xs px-3 py-1.5 rounded cursor-pointer"
            >
              Never mind
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PurchaseRow({ listing, sellerEmail, alreadyReviewed, onSubmitReview, cancellableOrderId, onCancelOrder }) {
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  async function handleSubmit() {
    if (rating === 0) {
      setError('Pick a star rating first.')
      return
    }

    setSubmitting(true)
    setError('')
    await onSubmitReview(listing, rating, body)
    setSubmitting(false)
  }

  async function handleCancelClick() {
    setCancelling(true)
    await onCancelOrder(cancellableOrderId)
    setCancelling(false)
  }

  return (
    <div className="bg-surface border border-border rounded px-4 py-3 font-sans">
      <div className="flex items-center gap-3">
        <img
          src={listing.image_url || "https://placehold.co/60x60/1c1a15/a8a29a?text=%20"}
          alt={listing.title}
          className="w-14 h-14 object-cover rounded flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="m-0 text-sm text-text"><strong>{listing.title}</strong> — {listing.artist}</p>
          {listing.source === 'trade' ? (
            <p className="m-0 text-xs text-text-muted mt-0.5">Traded with {sellerEmail}</p>
          ) : (
            <p className="m-0 text-xs text-text-muted mt-0.5">
              Bought from {sellerEmail} for ${Number(listing.sold_price).toFixed(2)}
            </p>
          )}
        </div>
        {cancellableOrderId && !confirmingCancel && (
          <button
            onClick={() => setConfirmingCancel(true)}
            className="text-xs text-text-faint bg-transparent border-0 cursor-pointer hover:text-accent flex-shrink-0"
          >
            Cancel order
          </button>
        )}
      </div>

      {confirmingCancel && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-text-muted mb-2">
            This reverses the sale — the listing goes back to active and the album returns to the seller's shelf. Are you sure?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancelClick}
              disabled={cancelling}
              className="bg-[#c1666b] text-bg font-bold text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-60"
            >
              {cancelling ? 'Cancelling...' : 'Yes, cancel this order'}
            </button>
            <button
              onClick={() => setConfirmingCancel(false)}
              disabled={cancelling}
              className="bg-transparent border border-border text-text-muted text-xs px-3 py-1.5 rounded cursor-pointer"
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {alreadyReviewed ? (
        <p className="text-xs text-accent mt-2 mb-0">You've reviewed this purchase.</p>
      ) : (
        <div className="mt-3 pt-3 border-t border-border">
          <StarPicker value={rating} onChange={setRating} disabled={submitting} />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Optional — how was the transaction?"
            rows={2}
            disabled={submitting}
            className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm resize-none mt-2"
          />
          {error && <p className="text-xs text-[#c1666b] m-0 mt-1">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-accent text-bg font-bold text-xs px-3 py-1.5 rounded cursor-pointer mt-2 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      )}
    </div>
  )
}

// Buy / sell / trade — everything to do with a transaction between two
// collectors lives on one page now instead of three separate ones
// (Orders, Purchases, Trade Offers). All three old routes still work —
// whichever one you land on just picks the matching tab below, so old
// links and bookmarks don't break.
function TransactionsPage() {
  const { user } = useAuth()
  const location = useLocation()

  const initialTab = location.pathname === '/purchases'
    ? 'buying'
    : location.pathname === '/trade-offers'
      ? 'trades'
      : 'selling'
  const [tab, setTab] = useState(initialTab)

  // Selling
  const [sales, setSales] = useState([])
  const [buyerEmails, setBuyerEmails] = useState({})
  const [sellingCancellableOrderIds, setSellingCancellableOrderIds] = useState({})
  const [sellingLoading, setSellingLoading] = useState(true)

  // Buying
  const [purchases, setPurchases] = useState([])
  const [reviewedListingIds, setReviewedListingIds] = useState(new Set())
  const [sellerEmails, setSellerEmails] = useState({})
  const [buyingCancellableOrderIds, setBuyingCancellableOrderIds] = useState({})
  const [buyingLoading, setBuyingLoading] = useState(true)

  // Trade offers
  const [tradesSubTab, setTradesSubTab] = useState('received')
  const [receivedOffers, setReceivedOffers] = useState([])
  const [sentOffers, setSentOffers] = useState([])
  const [tradesLoading, setTradesLoading] = useState(true)
  const [actingOnId, setActingOnId] = useState(null)
  const [activePrompt, setActivePrompt] = useState(null)

  useEffect(() => {
    loadSales()
    loadPurchases()
    loadOffers()
  }, [])

  async function loadSales() {
    setSellingLoading(true)

    const { data: listingsData, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })

    if (error) {
      console.error('Error fetching sales:', error.message)
      setSellingLoading(false)
      return
    }

    setSales(listingsData || [])

    const buyerIds = [...new Set((listingsData || []).map((l) => l.buyer_id).filter(Boolean))]
    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', buyerIds)
      const emailMap = {}
      for (const p of profiles || []) emailMap[p.id] = p.email
      setBuyerEmails(emailMap)
    }

    const listingIds = (listingsData || []).map((l) => l.id)
    if (listingIds.length > 0) {
      const { data: orderRows } = await supabase
        .from('orders')
        .select('id, listing_id')
        .eq('seller_id', user.id)
        .eq('status', 'completed')
        .in('listing_id', listingIds)

      const map = {}
      for (const row of orderRows || []) map[row.listing_id] = row.id
      setSellingCancellableOrderIds(map)
    } else {
      setSellingCancellableOrderIds({})
    }

    setSellingLoading(false)
  }

  async function handleCancelSaleOrder(orderId) {
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
    if (error) {
      console.error('Error cancelling order:', error.message)
      return
    }
    loadSales()
  }

  async function loadPurchases() {
    setBuyingLoading(true)

    const { data: listingsData, error } = await supabase
      .from('listings')
      .select('*')
      .eq('buyer_id', user.id)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchases:', error.message)
      setBuyingLoading(false)
      return
    }

    const boughtItems = (listingsData || []).map((listing) => ({ ...listing, source: 'purchase' }))

    // Trade-acquired items — a completed trade never sets listings.status
    // to 'sold' (there's no single "buyer" in a trade), so these have to
    // be fetched separately from trade_offers rather than showing up in
    // the query above.
    const { data: tradeData, error: tradeError } = await supabase
      .from('trade_offers')
      .select('*, listings(*)')
      .eq('offerer_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    if (tradeError) {
      console.error('Error fetching traded items:', tradeError.message)
    }

    const tradedItems = (tradeData || [])
      .filter((offer) => offer.listings)
      .map((offer) => ({ ...offer.listings, source: 'trade', tradeCreatedAt: offer.created_at }))

    const combined = [...boughtItems, ...tradedItems].sort((a, b) => {
      const aDate = a.sold_at || a.tradeCreatedAt
      const bDate = b.sold_at || b.tradeCreatedAt
      return new Date(bDate) - new Date(aDate)
    })

    setPurchases(combined)

    const sellerIds = [...new Set(combined.map((l) => l.user_id))]
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', sellerIds)
      const emailMap = {}
      for (const p of profiles || []) emailMap[p.id] = p.email
      setSellerEmails(emailMap)
    }

    const { data: myReviews } = await supabase.from('reviews').select('listing_id').eq('reviewer_id', user.id)
    setReviewedListingIds(new Set((myReviews || []).map((r) => r.listing_id)))

    // Only order-based purchases (checkout) can be cancelled here — a
    // self-reported sale already represents money that changed hands
    // outside the app, and there's no order row to reverse for those.
    const orderBasedListingIds = boughtItems.map((l) => l.id)
    if (orderBasedListingIds.length > 0) {
      const { data: orderRows } = await supabase
        .from('orders')
        .select('id, listing_id')
        .eq('buyer_id', user.id)
        .eq('status', 'completed')
        .in('listing_id', orderBasedListingIds)

      const map = {}
      for (const row of orderRows || []) map[row.listing_id] = row.id
      setBuyingCancellableOrderIds(map)
    } else {
      setBuyingCancellableOrderIds({})
    }

    setBuyingLoading(false)
  }

  async function handleSubmitReview(listing, rating, body) {
    const { error } = await supabase.from('reviews').insert({
      listing_id: listing.id,
      seller_id: listing.user_id,
      reviewer_id: user.id,
      rating,
      body: body.trim() || null
    })

    if (error) {
      console.error('Error submitting review:', error.message)
      return
    }

    setReviewedListingIds((current) => new Set([...current, listing.id]))
  }

  async function handleCancelPurchaseOrder(orderId) {
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
    if (error) {
      console.error('Error cancelling order:', error.message)
      return
    }
    loadPurchases()
  }

  async function loadOffers() {
    setTradesLoading(true)

    const { data: received, error: receivedError } = await supabase
      .from('trade_offers')
      .select('*, listings(*), trade_offer_items(*, albums(*)), offerer:profiles!trade_offers_offerer_id_fkey(*)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (receivedError) {
      console.error('Error loading received trade offers:', receivedError.message)
    } else {
      setReceivedOffers(received || [])
    }

    const { data: sent, error: sentError } = await supabase
      .from('trade_offers')
      .select('*, listings(*), trade_offer_items(*, albums(*)), seller:profiles!trade_offers_seller_id_fkey(*)')
      .eq('offerer_id', user.id)
      .order('created_at', { ascending: false })

    if (sentError) {
      console.error('Error loading sent trade offers:', sentError.message)
    } else {
      setSentOffers(sent || [])
    }

    setTradesLoading(false)
  }

  async function handleAccept(offer) {
    setActingOnId(offer.id)

    const { error } = await supabase.from('trade_offers').update({ status: 'accepted' }).eq('id', offer.id)

    setActingOnId(null)

    if (error) {
      console.error('Error accepting trade offer:', error.message)
      return
    }

    await loadOffers()

    if (offer.trade_offer_items?.length > 0) {
      setActivePrompt({ side: 'seller', offerId: offer.id, itemIndex: 0, items: offer.trade_offer_items })
    }
  }

  async function handleDecline(offerId) {
    setActingOnId(offerId)

    const { error } = await supabase.from('trade_offers').update({ status: 'declined' }).eq('id', offerId)

    setActingOnId(null)

    if (error) {
      console.error('Error declining trade offer:', error.message)
      return
    }

    await loadOffers()
  }

  async function handleSellerPromptDone() {
    if (!activePrompt) return

    const nextIndex = activePrompt.itemIndex + 1
    if (nextIndex < activePrompt.items.length) {
      setActivePrompt({ ...activePrompt, itemIndex: nextIndex })
      return
    }

    await supabase.from('trade_offers').update({ seller_shelf_prompt_shown: true }).eq('id', activePrompt.offerId)

    setActivePrompt(null)
    loadOffers()
  }

  async function handleOffererPromptDone(offerId) {
    await supabase.from('trade_offers').update({ offerer_shelf_prompt_shown: true }).eq('id', offerId)

    setActivePrompt(null)
    loadOffers()
  }

  const pendingReceivedCount = receivedOffers.filter((o) => o.status === 'pending').length

  return (
    <>
      <Header />
      <section className="px-5 lg:px-10 py-5 lg:py-7 pb-24 lg:pb-10 max-w-2xl">
        <h2 className="text-2xl font-serif mb-4">Buy, sell & trade</h2>

        <div className="flex gap-2 mb-6 font-sans flex-wrap">
          <button
            onClick={() => setTab('selling')}
            className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
              tab === 'selling' ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border'
            }`}
          >
            Selling
          </button>
          <button
            onClick={() => setTab('buying')}
            className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
              tab === 'buying' ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border'
            }`}
          >
            Buying
          </button>
          <button
            onClick={() => setTab('trades')}
            className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
              tab === 'trades' ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border'
            }`}
          >
            Trade offers{pendingReceivedCount > 0 ? ` (${pendingReceivedCount})` : ''}
          </button>
        </div>

        {tab === 'selling' && (
          <>
            <p className="text-text-muted font-sans text-sm mb-4">Items you've sold.</p>
            {sellingLoading && <p className="font-sans text-sm text-text-muted">Loading...</p>}
            {!sellingLoading && sales.length === 0 && (
              <p className="font-sans text-sm text-text-muted">
                No sales yet. When something you've listed sells, it'll show up here.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {sales.map((listing) => (
                <SaleRow
                  key={listing.id}
                  listing={listing}
                  buyerEmail={listing.buyer_id ? (buyerEmails[listing.buyer_id] || 'Unknown buyer') : null}
                  cancellableOrderId={sellingCancellableOrderIds[listing.id]}
                  onCancelOrder={handleCancelSaleOrder}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'buying' && (
          <>
            <p className="text-text-muted font-sans text-sm mb-4">
              Items you've bought or traded for — leave a review once you've received it.
            </p>
            {buyingLoading && <p className="font-sans text-sm text-text-muted">Loading...</p>}
            {!buyingLoading && purchases.length === 0 && (
              <p className="font-sans text-sm text-text-muted">
                No purchases yet. When you buy something, win an auction, or a trade is accepted, it'll show up here.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {purchases.map((listing) => (
                <PurchaseRow
                  key={`${listing.source}-${listing.id}`}
                  listing={listing}
                  sellerEmail={sellerEmails[listing.user_id] || 'Unknown seller'}
                  alreadyReviewed={reviewedListingIds.has(listing.id)}
                  onSubmitReview={handleSubmitReview}
                  cancellableOrderId={buyingCancellableOrderIds[listing.id]}
                  onCancelOrder={handleCancelPurchaseOrder}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'trades' && (
          <>
            <div className="flex gap-2 mb-5 font-sans">
              <button
                onClick={() => setTradesSubTab('received')}
                className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
                  tradesSubTab === 'received' ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border'
                }`}
              >
                Received{pendingReceivedCount > 0 ? ` (${pendingReceivedCount})` : ''}
              </button>
              <button
                onClick={() => setTradesSubTab('sent')}
                className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
                  tradesSubTab === 'sent' ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border'
                }`}
              >
                Sent
              </button>
            </div>

            {tradesLoading && <p className="font-sans text-sm text-text-muted">Loading...</p>}

            {!tradesLoading && tradesSubTab === 'received' ? (
              receivedOffers.length === 0 ? (
                <p className="text-text-muted font-sans text-sm">No trade offers yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {receivedOffers.map((offer) => {
                    const showSellerPrompt =
                      offer.status === 'accepted' &&
                      !offer.seller_shelf_prompt_shown &&
                      activePrompt?.side === 'seller' &&
                      activePrompt?.offerId === offer.id

                    return (
                      <div key={offer.id} className="bg-surface border border-border rounded-lg p-4 font-sans">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <p className="text-sm text-text m-0">
                            <strong>{displayNameFor(offer.offerer)}</strong> wants{' '}
                            <strong>{offer.listings?.title}</strong>
                          </p>
                          <span className="text-[10px] uppercase tracking-wider text-text-faint">
                            {STATUS_LABELS[offer.status]}
                          </span>
                        </div>

                        <p className="text-xs text-text-faint uppercase tracking-wider mb-1.5">Offering</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(offer.trade_offer_items || []).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 bg-bg border border-border rounded px-2 py-1.5">
                              <img
                                src={item.albums?.image_url || avatarPlaceholder(28)}
                                alt=""
                                className="w-7 h-7 object-cover rounded flex-shrink-0"
                              />
                              <span className="text-xs text-text">
                                {item.albums?.title} — {item.albums?.artist}
                              </span>
                            </div>
                          ))}
                        </div>

                        {offer.message && (
                          <p className="text-xs text-text-muted italic mb-2">"{offer.message}"</p>
                        )}

                        {offer.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAccept(offer)}
                              disabled={actingOnId === offer.id}
                              className="flex-1 bg-accent text-bg font-bold text-xs py-1.5 rounded cursor-pointer disabled:opacity-60"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(offer.id)}
                              disabled={actingOnId === offer.id}
                              className="flex-1 bg-transparent border border-border text-text-muted font-bold text-xs py-1.5 rounded cursor-pointer disabled:opacity-60"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {showSellerPrompt && (
                          <div className="mt-3">
                            <AddToShelfPrompt
                              item={{
                                title: activePrompt.items[activePrompt.itemIndex].albums.title,
                                artist: activePrompt.items[activePrompt.itemIndex].albums.artist,
                                imageUrl: activePrompt.items[activePrompt.itemIndex].albums.image_url
                              }}
                              userId={user.id}
                              onDone={handleSellerPromptDone}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : null}

            {!tradesLoading && tradesSubTab === 'sent' ? (
              sentOffers.length === 0 ? (
                <p className="text-text-muted font-sans text-sm">You haven't proposed any trades yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {sentOffers.map((offer) => {
                    const needsOffererPrompt = offer.status === 'accepted' && !offer.offerer_shelf_prompt_shown

                    return (
                      <div key={offer.id} className="bg-surface border border-border rounded-lg p-4 font-sans">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <p className="text-sm text-text m-0">
                            Your offer to <strong>{displayNameFor(offer.seller)}</strong> for{' '}
                            <strong>{offer.listings?.title}</strong>
                          </p>
                          <span className="text-[10px] uppercase tracking-wider text-text-faint">
                            {STATUS_LABELS[offer.status]}
                          </span>
                        </div>

                        <p className="text-xs text-text-faint uppercase tracking-wider mb-1.5">You offered</p>
                        <div className="flex flex-wrap gap-2">
                          {(offer.trade_offer_items || []).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 bg-bg border border-border rounded px-2 py-1.5">
                              <img
                                src={item.albums?.image_url || avatarPlaceholder(28)}
                                alt=""
                                className="w-7 h-7 object-cover rounded flex-shrink-0"
                              />
                              <span className="text-xs text-text">
                                {item.albums?.title} — {item.albums?.artist}
                              </span>
                            </div>
                          ))}
                        </div>

                        {needsOffererPrompt && (
                          <div className="mt-3">
                            <AddToShelfPrompt
                              item={{
                                title: offer.listings?.title,
                                artist: offer.listings?.artist,
                                year: offer.listings?.year,
                                genre: offer.listings?.genre,
                                imageUrl: offer.listings?.image_url,
                                sleeveCondition: offer.listings?.sleeve_condition,
                                mediaCondition: offer.listings?.media_condition,
                                label: offer.listings?.label,
                                pressingCountry: offer.listings?.pressing_country
                              }}
                              userId={user.id}
                              onDone={() => handleOffererPromptDone(offer.id)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : null}
          </>
        )}
      </section>
    </>
  )
}

export default TransactionsPage