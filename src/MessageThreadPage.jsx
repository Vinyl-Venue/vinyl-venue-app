import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

function MessageThreadPage() {
  const { userId: otherId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [otherProfile, setOtherProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [bodyInput, setBodyInput] = useState(searchParams.get('text') || '')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadThread()

    const channel = supabase
      .channel(`thread-${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const message = payload.new
          const isThisThread =
            (message.sender_id === user.id && message.recipient_id === otherId) ||
            (message.sender_id === otherId && message.recipient_id === user.id)

          if (isThisThread) {
            setMessages((current) => [...current, message])
            if (message.recipient_id === user.id) {
              markAsRead([message.id])
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [otherId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadThread() {
    setLoading(true)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherId)
      .maybeSingle()

    setOtherProfile(profileData)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching thread:', error.message)
      setLoading(false)
      return
    }

    setMessages(data)
    setLoading(false)

    const unreadIds = data
      .filter((m) => m.recipient_id === user.id && !m.read)
      .map((m) => m.id)

    if (unreadIds.length > 0) {
      markAsRead(unreadIds)
    }
  }

  async function markAsRead(ids) {
    await supabase.from('messages').update({ read: true }).in('id', ids)
  }

  async function handleSend() {
    const trimmed = bodyInput.trim()
    if (!trimmed) return

    setSending(true)

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: otherId,
      body: trimmed
    })

    if (error) {
      console.error('Error sending message:', error.message)
      setSending(false)
      return
    }

    setBodyInput('')
    setSending(false)
    // The realtime subscription appends the new row for us — no local
    // state push here, so we don't end up with a duplicate entry.
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <Header />
      <section className="px-10 pb-10">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={otherProfile?.avatar_url || "https://placehold.co/40x40/1c1a15/a8a29a?text=%20"}
            alt=""
            className="w-10 h-10 object-cover rounded-full"
          />
          <h2 className="text-2xl font-serif m-0">{otherProfile?.display_name || otherProfile?.email || 'Unknown user'}</h2>
        </div>

        {loading && <p className="font-sans text-sm text-text-muted">Loading...</p>}

        {!loading && (
          <div className="max-w-2xl">
            <div className="flex flex-col gap-2 mb-4 max-h-[60vh] overflow-y-auto bg-surface border border-border rounded p-4">
              {messages.length === 0 && (
                <p className="font-sans text-sm text-text-muted">
                  No messages yet — say hello.
                </p>
              )}
              {messages.map((m) => {
                const isMine = m.sender_id === user.id
                return (
                  <div
                    key={m.id}
                    className={`font-sans text-sm px-3 py-2 rounded max-w-[75%] ${
                      isMine ? 'bg-accent text-bg self-end' : 'bg-bg text-text self-start'
                    }`}
                  >
                    {m.body}
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2">
              <textarea
                value={bodyInput}
                onChange={(event) => setBodyInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message..."
                rows={2}
                disabled={sending}
                className="flex-1 bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm resize-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || !bodyInput.trim()}
                className="bg-accent text-bg font-sans text-sm font-bold px-4 rounded cursor-pointer disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

export default MessageThreadPage