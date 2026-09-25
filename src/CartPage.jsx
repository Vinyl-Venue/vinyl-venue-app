import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { rowToListing } from './utils'

function CartPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCart()
  }, [])

  async function fetchCart() {
    setLoading(true)

    const { data, error } = await supabase
      .from('cart_items')
      .select('id, created_at, listings(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching cart:', error.message)
      setLoading(false)
      return
    }

    const mapped = (data || []).map((row) => ({
      cartItemId: row.id,
      listing: row.listings ? rowToListing(row.listings) : null,
      stillAvailable: row.listings ? row.listings.status === 'active' : false
    }))

    setCartItems(mapped)
    setLoading(false)
  }

  async function handleRemove(cartItemId) {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId)

    if (error) {
      console.error('Error removing cart item:', error.message)
      return
    }

    setCartItems((current) => current.filter((item) => item.cartItemId !== cartItemId))
  }

  const purchasableItems = cartItems.filter((item) => item.stillAvailable)
  const total = purchasableItems.reduce((sum, item) => sum + Number(item.listing.price), 0)

  if (loading) {
    return (
      <>
        <Header />
        <section className="px-10 pb-10"><p>Loading...</p></section>
      </>
    )
  }

  return (
    <>
      <Header />
      <section className="px-10 pb-10 max-w-2xl">
        <h2 className="text-2xl font-serif mb-4">Your cart</h2>

        {cartItems.length === 0 ? (
          <p className="text-text-muted font-sans text-sm">
            Your cart is empty — browse the <a href="/marketplace" className="text-accent">marketplace</a> to find something.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 mb-6">
              {cartItems.map((item) => (
                <div
                  key={item.cartItemId}
                  className={`flex items-center gap-3 bg-surface border border-border rounded-lg p-3 ${
                    !item.stillAvailable ? 'opacity-60' : ''
                  }`}
                >
                  <img
                    src={item.listing?.imageUrl || "https://placehold.co/80x80/1c1a15/a8a29a?text=%20"}
                    alt=""
                    className="w-16 h-16 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 font-sans">
                    <p className="text-sm font-bold text-text m-0 truncate">{item.listing?.title || 'Listing no longer exists'}</p>
                    {item.listing && <p className="text-xs text-text-muted m-0">{item.listing.artist}</p>}
                    {!item.stillAvailable && (
                      <p className="text-xs text-[#c1666b] m-0 mt-0.5">No longer available</p>
                    )}
                  </div>
                  {item.stillAvailable && (
                    <p className="text-accent font-bold text-sm font-mono flex-shrink-0">
                      ${Number(item.listing.price).toFixed(2)}
                    </p>
                  )}
                  <button
                    onClick={() => handleRemove(item.cartItemId)}
                    className="text-text-faint text-sm bg-transparent border-0 cursor-pointer hover:text-accent flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4 font-sans">
              <p className="text-text-muted text-sm m-0">
                {purchasableItems.length} item{purchasableItems.length === 1 ? '' : 's'} · <span className="text-text font-bold">${total.toFixed(2)}</span>
              </p>
              <button
                onClick={() => navigate('/checkout')}
                disabled={purchasableItems.length === 0}
                className="bg-accent text-bg font-bold text-sm px-5 py-2.5 rounded cursor-pointer disabled:opacity-50"
              >
                Proceed to checkout
              </button>
            </div>
          </>
        )}
      </section>
    </>
  )
}

export default CartPage