import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

function CartLink() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Same lesson as MessagesLink/NotificationBell: wait for the
      // session to actually be attached before firing the first fetch,
      // to avoid a 401 right after sign-in.
      await supabase.auth.getSession()
      if (!cancelled) fetchCount()
    }

    init()

    const channel = supabase
      .channel('cart-badge-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` },
        () => fetchCount()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchCount() {
    const { count: result, error } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching cart count:', error.message)
      return
    }

    setCount(result || 0)
  }

  return (
    <Link
      to="/cart"
      className="relative w-[30px] h-[30px] rounded-full border border-border flex items-center justify-center text-text-muted no-underline text-sm hover:border-accent hover:text-accent transition-colors"
    >
      🛒
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-accent text-bg text-[0.6rem] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-bg">
          {count}
        </span>
      )}
    </Link>
  )
}

export default CartLink