import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

function MessagesInboxPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()

    const channel = supabase
      .channel('messages-inbox-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchConversations() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching messages:', error.message)
      setLoading(false)
      return
    }

    // Collapse the flat message list into one row per conversation partner —
    // the messages table has no conversation id, so "the other person's id"
    // is what actually identifies a thread.
    const byOtherUser = new Map()

    for (const message of data) {
      const otherId = message.sender_id === user.id ? message.recipient_id : message.sender_id

      if (!byOtherUser.has(otherId)) {
        byOtherUser.set(otherId, {
          otherId,
          lastBody: message.body,
          lastCreatedAt: message.created_at,
          unreadCount: 0
        })
      }

      const conversation = byOtherUser.get(otherId)
      if (message.recipient_id === user.id && !message.read) {
        conversation.unreadCount += 1
      }
    }

    const conversationList = Array.from(byOtherUser.values())
    const otherIds = conversationList.map((c) => c.otherId)

    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherIds)

      const profileById = new Map((profiles || []).map((p) => [p.id, p]))
      conversationList.forEach((c) => {
        const p = profileById.get(c.otherId)
        c.email = p?.email || 'Unknown user'
        c.displayName = p?.display_name || c.email
        c.avatarUrl = p?.avatar_url || ''
      })
    }

    setConversations(conversationList)
    setLoading(false)
  }

  return (
    <>
      <Header />
      <section className="px-10 pb-10">
        <h2 className="text-2xl font-serif mb-4">Messages</h2>

        {loading && <p className="font-sans text-sm text-text-muted">Loading...</p>}

        {!loading && conversations.length === 0 && (
          <p className="font-sans text-sm text-text-muted">
            No conversations yet. Visit someone's profile to start one.
          </p>
        )}

        <div className="flex flex-col gap-2 max-w-2xl">
          {conversations.map((c) => (
            <Link
              key={c.otherId}
              to={`/messages/${c.otherId}`}
              className="flex items-center justify-between bg-surface border border-border rounded px-4 py-3 no-underline text-text hover:border-accent"
            >
              <div className="flex items-center gap-3 font-sans">
                <img
                  src={c.avatarUrl || "https://placehold.co/36x36/1c1a15/a8a29a?text=%20"}
                  alt=""
                  className="w-9 h-9 object-cover rounded-full flex-shrink-0"
                />
                <div>
                  <p className={`m-0 text-sm ${c.unreadCount > 0 ? 'font-bold' : ''}`}>{c.displayName}</p>
                  <p className="m-0 text-xs text-text-muted mt-1 truncate max-w-md">{c.lastBody}</p>
                </div>
              </div>
              {c.unreadCount > 0 && (
                <span className="bg-accent text-bg text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {c.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

export default MessagesInboxPage