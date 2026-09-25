import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

function MessagesLink() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Right after sign-in, this component can mount and fire before
      // the Supabase client has actually finished attaching the new
      // session to outgoing requests — the very first fetch went out
      // effectively unauthenticated and got a 401. Waiting on
      // getSession() resolving first guarantees the client is actually
      // ready to make an authenticated request.
      await supabase.auth.getSession()
      if (!cancelled) fetchUnreadCount()
    }

    init()

    const channel = supabase
      .channel('messages-badge-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        () => fetchUnreadCount()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchUnreadCount() {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('read', false)

    if (error) {
      console.error('Error fetching unread message count:', error.message)
      return
    }

    setUnreadCount(count || 0)
  }

  return (
    <Link
      to="/messages"
      className="relative w-[30px] h-[30px] rounded-full border border-border flex items-center justify-center text-text-muted no-underline text-sm hover:border-accent hover:text-accent transition-colors"
    >
      ✉
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-accent text-bg text-[0.6rem] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-bg">
          {unreadCount}
        </span>
      )}
    </Link>
  )
}

export default MessagesLink