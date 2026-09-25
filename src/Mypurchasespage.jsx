import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

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

function MyPurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [reviewedListingIds, setReviewedListingIds] = useState(new Set())
  const [sellerEmails, setSellerEmails] = useState({})
  const [cancellableOrderIds, setCancellableOrderIds] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPurchases()
  }, [])

  async function loadPurchases() {
    setLoading(true)

    const { data: listingsData, error } = await supabase
      .from('listings')
      .select('*')
      .eq('buyer_id', user.id)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchases:', error.message)
      setLoading(false)
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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', sellerIds)

      const emailMap = {}
      for (const p of profiles || []) {
        emailMap[p.id] = p.email
      }
      setSellerEmails(emailMap)
    }

    const { data: myReviews } = await supabase
      .from('reviews')
      .select('listing_id')
      .eq('reviewer_id', user.id)

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
      for (const row of orderRows || []) {
        map[row.listing_id] = row.id
      }
      setCancellableOrderIds(map)
    } else {
      setCancellableOrderIds({})
    }

    setLoading(false)
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

  async function handleCancelOrder(orderId) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)

    if (error) {
      console.error('Error cancelling order:', error.message)
      return
    }

    loadPurchases()
  }

  return (
    <>
      <Header />
      {/* pb-24 clears the fixed mobile bottom tab bar; lg:pb-10 restores
          normal desktop spacing. */}
      <section className="px-5 lg:px-10 pb-24 lg:pb-10">
        <h2 className="text-2xl font-serif mb-2">Your purchases</h2>
        <p className="text-text-muted font-sans text-sm mb-4">
          Items you've bought or traded for — leave a review once you've received it.
        </p>

        {/* Selling/Buying toggle — mirrors SellerOrdersPage so the two
            separate routes read as one merged Orders section reachable
            from the bottom tab bar. */}
        <div className="flex gap-2 mb-6 font-sans">
          <Link
            to="/orders"
            className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border bg-transparent text-text-muted border-border no-underline hover:border-accent hover:text-accent"
          >
            Selling
          </Link>
          <span className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border bg-accent text-bg border-accent">
            Buying
          </span>
        </div>

        {loading && <p className="font-sans text-sm text-text-muted">Loading...</p>}

        {!loading && purchases.length === 0 && (
          <p className="font-sans text-sm text-text-muted">
            No purchases yet. When you buy something, win an auction, or a trade is accepted, it'll show up here.
          </p>
        )}

        <div className="flex flex-col gap-3 max-w-2xl">
          {purchases.map((listing) => (
            <PurchaseRow
              key={`${listing.source}-${listing.id}`}
              listing={listing}
              sellerEmail={sellerEmails[listing.user_id] || 'Unknown seller'}
              alreadyReviewed={reviewedListingIds.has(listing.id)}
              onSubmitReview={handleSubmitReview}
              cancellableOrderId={cancellableOrderIds[listing.id]}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </div>
      </section>
    </>
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

export default MyPurchasesPage