import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from './Header'
import AddToShelfPrompt from './AddToShelfPrompt'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { rowToListing } from './utils'

function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const buyNowListingId = searchParams.get('listing')

  const [items, setItems] = useState([])
  const [sellerNames, setSellerNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [completedOrders, setCompletedOrders] = useState(null)
  const [failedTitles, setFailedTitles] = useState([])
  const [promptIndex, setPromptIndex] = useState(0)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    setLoading(true)

    let loadedItems = []

    if (buyNowListingId) {
      const { data, error } = await supabase.from('listings').select('*').eq('id', buyNowListingId).maybeSingle()
      if (error || !data) {
        setItems([])
        setLoading(false)
        return
      }
      loadedItems = [rowToListing(data)]
    } else {
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, listings(*)')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading cart for checkout:', error.message)
        setItems([])
        setLoading(false)
        return
      }

      loadedItems = (data || [])
        .filter((row) => row.listings && row.listings.status === 'active')
        .map((row) => ({ ...rowToListing(row.listings), cartItemId: row.id }))
    }

    setItems(loadedItems)
    await loadSellerNames(loadedItems)
    setLoading(false)
  }

  // Fetched with raw listing/profile columns (not through rowToListing,
  // whose exact output shape for seller identity isn't confirmed) so a
  // buyer can see who each item actually comes from before checking
  // out — useful any time a cart holds items from more than one seller.
  async function loadSellerNames(loadedItems) {
    if (loadedItems.length === 0) {
      setSellerNames({})
      return
    }

    const { data: listingRows, error: listingError } = await supabase
      .from('listings')
      .select('id, user_id')
      .in('id', loadedItems.map((item) => item.id))

    if (listingError) {
      console.error('Error loading seller info:', listingError.message)
      return
    }

    const sellerIdByListingId = new Map((listingRows || []).map((row) => [row.id, row.user_id]))
    const sellerIds = [...new Set((listingRows || []).map((row) => row.user_id))]

    const { data: profiles } = sellerIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, email').in('id', sellerIds)
      : { data: [] }
    const profileById = new Map((profiles || []).map((p) => [p.id, p]))

    const names = {}
    for (const [listingId, sellerId] of sellerIdByListingId.entries()) {
      const profile = profileById.get(sellerId)
      names[listingId] = profile?.display_name || profile?.email || 'Unknown seller'
    }
    setSellerNames(names)
  }

  const total = items.reduce((sum, item) => sum + Number(item.price), 0)
  const shippingTotal = items.reduce((sum, item) => sum + (item.shippingPrice != null ? Number(item.shippingPrice) : 0), 0)
  const hasUnknownShipping = items.some((item) => item.shippingPrice == null)
  const grandTotal = total + shippingTotal

  async function handlePlaceOrder() {
    setPlacing(true)

    const completed = []
    const failed = []

    for (const item of items) {
      // Stubbed payment step — no real provider is wired in yet, so
      // this simulates an immediate successful charge. This is exactly
      // where a real provider plugs in later: the order is created at
      // pending_payment below regardless, but it should only flip to
      // completed once the provider actually confirms payment, instead
      // of doing that unconditionally right here.
      const { data: orderRow, error: insertError } = await supabase
        .from('orders')
        .insert({ listing_id: item.id, buyer_id: user.id })
        .select()
        .maybeSingle()

      if (insertError) {
        console.error('Error placing order:', insertError.message)
        failed.push(item.title)
        continue
      }

      const { error: completeError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderRow.id)

      if (completeError) {
        console.error('Error completing order:', completeError.message)
        failed.push(item.title)
        continue
      }

      completed.push({ ...item, orderId: orderRow.id })

      if (item.cartItemId) {
        await supabase.from('cart_items').delete().eq('id', item.cartItemId)
      }
    }

    setFailedTitles(failed)
    setCompletedOrders(completed)
    setPlacing(false)
  }

  if (loading) {
    return (
      <>
        <Header />
        <section className="px-5 lg:px-10 pb-24 lg:pb-10"><p>Loading...</p></section>
      </>
    )
  }

  if (completedOrders) {
    if (completedOrders.length === 0) {
      return (
        <>
          <Header />
          <section className="px-5 lg:px-10 pb-24 lg:pb-10 max-w-md font-sans">
            <p className="text-text-muted text-sm">Nothing could be purchased — those listings may no longer be available.</p>
          </section>
        </>
      )
    }

    if (promptIndex >= completedOrders.length) {
      return (
        <>
          <Header />
          <section className="px-5 lg:px-10 pb-24 lg:pb-10 max-w-md font-sans">
            <p className="font-serif italic text-xl text-text mb-2">All set!</p>
            <p className="text-text-muted text-sm mb-4">
              {completedOrders.length} item{completedOrders.length === 1 ? '' : 's'} purchased.
              {failedTitles.length > 0 && ` (${failedTitles.length} could not be completed: ${failedTitles.join(', ')})`}
            </p>
            <button
              onClick={() => navigate('/marketplace')}
              className="bg-accent text-bg font-bold text-sm px-4 py-2 rounded cursor-pointer"
            >
              Back to Marketplace
            </button>
          </section>
        </>
      )
    }

    const current = completedOrders[promptIndex]
    return (
      <>
        <Header />
        <section className="px-5 lg:px-10 pb-24 lg:pb-10">
          <p className="font-serif italic text-lg text-text mb-4">Purchase complete!</p>
          <AddToShelfPrompt item={current} userId={user.id} onDone={() => setPromptIndex((i) => i + 1)} />
        </section>
      </>
    )
  }

  return (
    <>
      <Header />
      <section className="px-5 lg:px-10 py-5 lg:py-7 pb-24 lg:pb-10 max-w-md">
        <h2 className="text-2xl font-serif mb-4">Checkout</h2>

        {items.length === 0 ? (
          <p className="text-text-muted font-sans text-sm">Nothing to check out.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 mb-4 font-sans">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <span className="text-text">{item.title} — {item.artist}</span>
                    <p className="text-text-faint text-xs m-0">
                      Sold by {sellerNames[item.id] || '...'}
                    </p>
                    <p className="text-text-faint text-xs m-0">
                      + {item.shippingPrice != null ? `$${Number(item.shippingPrice).toFixed(2)} shipping` : 'shipping: contact seller'}
                    </p>
                  </div>
                  <span className="text-text-muted font-mono flex-shrink-0">${Number(item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 mb-1 font-sans">
              <span className="text-text font-bold text-sm">Total{hasUnknownShipping ? ' (+ shipping TBD)' : ' (incl. shipping)'}</span>
              <span className="text-accent font-bold text-base">${grandTotal.toFixed(2)}</span>
            </div>
            {hasUnknownShipping && (
              <p className="text-text-faint font-sans text-xs mb-4">
                One or more sellers haven't set a shipping price — you'll need to arrange that with them directly.
              </p>
            )}
            {!hasUnknownShipping && <div className="mb-4" />}

            <div className="bg-surface border border-dashed border-border rounded p-3 mb-5 font-sans">
              <div className="bg-text inline-block px-2 py-0.5 mb-1.5">
                <span className="font-mono text-[9px] tracking-wider uppercase font-bold text-bg">Payment (placeholder)</span>
              </div>
              <p className="text-xs text-text-muted m-0">
                Real payment processing isn't connected yet. Clicking below simulates a successful charge for testing.
              </p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="w-full bg-accent text-bg font-bold text-sm py-2.5 rounded cursor-pointer disabled:opacity-60"
            >
              {placing ? 'Processing...' : `Complete purchase — $${grandTotal.toFixed(2)}`}
            </button>
          </>
        )}
      </section>
    </>
  )
}

export default CheckoutPage