import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

function SellerOrdersPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [buyerEmails, setBuyerEmails] = useState({})
  const [cancellableOrderIds, setCancellableOrderIds] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSales()
  }, [])

  async function loadSales() {
    setLoading(true)

    const { data: listingsData, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })

    if (error) {
      console.error('Error fetching sales:', error.message)
      setLoading(false)
      return
    }

    setSales(listingsData || [])

    const buyerIds = [...new Set((listingsData || []).map((l) => l.buyer_id).filter(Boolean))]
    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', buyerIds)

      const emailMap = {}
      for (const p of profiles || []) {
        emailMap[p.id] = p.email
      }
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
      for (const row of orderRows || []) {
        map[row.listing_id] = row.id
      }
      setCancellableOrderIds(map)
    } else {
      setCancellableOrderIds({})
    }

    setLoading(false)
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

    loadSales()
  }

  return (
    <>
      <Header />
      {/* pb-24 clears the fixed mobile bottom tab bar; lg:pb-10 restores
          normal desktop spacing. */}
      <section className="px-5 lg:px-10 pb-24 lg:pb-10">
        <h2 className="text-2xl font-serif mb-2">Your orders</h2>
        <p className="text-text-muted font-sans text-sm mb-4">
          Items you've sold.
        </p>

        {/* Selling/Buying toggle — Orders and Purchases are separate
            pages/routes, but the bottom tab bar only has room for one
            "Orders" destination, so this makes the pair read as a single
            merged section with two views rather than two disconnected
            pages. Same pill pattern as the Received/Sent toggle on
            Trade Offers. */}
        <div className="flex gap-2 mb-6 font-sans">
          <span className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border bg-accent text-bg border-accent">
            Selling
          </span>
          <Link
            to="/purchases"
            className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border bg-transparent text-text-muted border-border no-underline hover:border-accent hover:text-accent"
          >
            Buying
          </Link>
        </div>

        {loading && <p className="font-sans text-sm text-text-muted">Loading...</p>}

        {!loading && sales.length === 0 && (
          <p className="font-sans text-sm text-text-muted">
            No sales yet. When something you've listed sells, it'll show up here.
          </p>
        )}

        <div className="flex flex-col gap-3 max-w-2xl">
          {sales.map((listing) => (
            <SaleRow
              key={listing.id}
              listing={listing}
              buyerEmail={listing.buyer_id ? (buyerEmails[listing.buyer_id] || 'Unknown buyer') : null}
              cancellableOrderId={cancellableOrderIds[listing.id]}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </div>
      </section>
    </>
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

export default SellerOrdersPage