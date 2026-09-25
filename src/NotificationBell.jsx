import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const TYPE_ICONS = {
  wishlist_match: '💿',
  auction_won: '🏆',
  auction_ended_sold: '💰',
  auction_ended_no_bids: '❌',
  auction_ending_soon: '⏳',
  auction_outbid: '📉',
  order_placed: '💵',
  order_cancelled: '↩️',
  trade_offer_received: '🔄',
  trade_offer_accepted: '✅',
  trade_offer_declined: '✋'
}

function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Same race as MessagesLink: right after sign-in, this can mount
      // and fire before the Supabase client has actually finished
      // attaching the new session to outgoing requests, producing a
      // 401 on the very first fetch. Waiting on getSession() resolving
      // first guarantees the client is actually ready.
      await supabase.auth.getSession()
      if (!cancelled) fetchNotifications()
    }

    init()

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, profiles!notifications_from_user_id_fkey(email, display_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching notifications:', error.message)
      return
    }

    setNotifications(data || [])
  }

  async function markAsRead(notificationId) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    setNotifications(
      notifications.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Older wishlist-match rows predate the generic `message` column, so this
  // reconstructs the same text those rows always showed.
  function displayText(n) {
    if (n.message) return n.message
    return `${n.profiles?.display_name || n.profiles?.email || 'Someone'} added ${n.album_title} by ${n.album_artist} — on your wishlist!`
  }

  function NotificationRow({ n }) {
    const icon = TYPE_ICONS[n.type] || '💿'
    const rowClass = `block px-4 py-3 border-b border-border font-sans text-sm no-underline text-text hover:bg-bg ${
      n.is_read ? 'opacity-60' : ''
    }`
    const content = (
      <>
        <span className="mr-1.5">{icon}</span>
        {displayText(n)}
      </>
    )

    // Only auction_ending_soon points at a listing that's still active and
    // therefore still visible on the seller's marketplace page — the ended
    // states (won/sold/no bids) reference a listing that's no longer active
    // and won't render there, so those stay plain, non-clickable text.
    // auction_ending_soon and auction_outbid both point at listings that are
    // still active, so both are safe to deep-link to the seller's marketplace.
    if ((n.type === 'auction_ending_soon' || n.type === 'auction_outbid') && n.listing_id) {
      return (
        <Link
          to={`/profile/${n.from_user_id}/marketplace?listing=${n.listing_id}`}
          onClick={() => markAsRead(n.id)}
          className={rowClass}
        >
          {content}
        </Link>
      )
    }

    // Trade offer notifications all point to the same review page now
    // that it exists — received offers land on the "Received" tab
    // (where they can act on it), accepted/declined land on "Sent"
    // (where the offerer sees the outcome and, if accepted, the
    // shelf-add prompt for what they just received).
    if (n.type === 'trade_offer_received' || n.type === 'trade_offer_accepted' || n.type === 'trade_offer_declined') {
      return (
        <Link
          to="/trade-offers"
          onClick={() => markAsRead(n.id)}
          className={rowClass}
        >
          {content}
        </Link>
      )
    }

    // A sale (or its cancellation) — both are seller-facing events, so
    // both land on the new Orders page rather than staying plain text
    // with nowhere to actually go.
    if (n.type === 'order_placed' || n.type === 'order_cancelled') {
      return (
        <Link
          to="/orders"
          onClick={() => markAsRead(n.id)}
          className={rowClass}
        >
          {content}
        </Link>
      )
    }

    if (!n.type || n.type === 'wishlist_match') {
      return (
        <Link
          to={`/profile/${n.from_user_id}`}
          onClick={() => markAsRead(n.id)}
          className={rowClass}
        >
          {content}
        </Link>
      )
    }

    return (
      <div onClick={() => markAsRead(n.id)} className={`${rowClass} cursor-pointer`}>
        {content}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative w-[30px] h-[30px] rounded-full bg-transparent border border-border text-text-muted flex items-center justify-center font-sans text-sm cursor-pointer hover:border-accent hover:text-accent"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-accent text-bg text-[0.65rem] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 bg-surface border border-border rounded w-80 max-h-96 overflow-y-auto z-20">
          {notifications.length === 0 ? (
            <p className="text-text-muted font-sans text-sm p-4">No notifications yet.</p>
          ) : (
            notifications.map((n) => <NotificationRow key={n.id} n={n} />)
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell