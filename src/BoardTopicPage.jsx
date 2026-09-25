import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { timeAgo, displayNameFor, avatarPlaceholder } from './utils'

function BoardTopicPage() {
  const { postId } = useParams()
  const { user } = useAuth()
  const [topic, setTopic] = useState(null)
  const [replies, setReplies] = useState([])
  const [profilesById, setProfilesById] = useState({})
  const [loading, setLoading] = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    loadTopic()

    const channel = supabase
      .channel(`board-topic-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'board_posts', filter: `parent_post_id=eq.${postId}` },
        async (payload) => {
          const reply = payload.new
          await ensureProfileLoaded(reply.user_id)
          setReplies((current) => [...current, reply])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  async function ensureProfileLoaded(userId) {
    setProfilesById((current) => {
      if (current[userId]) return current
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle().then(({ data }) => {
        if (data) setProfilesById((c) => ({ ...c, [userId]: data }))
      })
      return current
    })
  }

  async function loadTopic() {
    setLoading(true)

    const { data: topicData, error: topicError } = await supabase
      .from('board_posts')
      .select('*')
      .eq('id', postId)
      .is('parent_post_id', null)
      .maybeSingle()

    if (topicError || !topicData) {
      console.error('Error loading topic:', topicError?.message)
      setLoading(false)
      return
    }

    const { data: replyData } = await supabase
      .from('board_posts')
      .select('*')
      .eq('parent_post_id', postId)
      .order('created_at', { ascending: true })

    const allUserIds = [...new Set([topicData.user_id, ...(replyData || []).map((r) => r.user_id)])]
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', allUserIds)
    const profileMap = {}
    for (const p of profiles || []) profileMap[p.id] = p

    setTopic(topicData)
    setReplies(replyData || [])
    setProfilesById(profileMap)
    setLoading(false)
  }

  async function handlePostReply() {
    if (!replyBody.trim()) return

    setPosting(true)
    setError('')

    const { error: insertError } = await supabase.from('board_posts').insert({
      user_id: user.id,
      parent_post_id: Number(postId),
      title: null,
      body: replyBody.trim()
    })

    if (insertError) {
      console.error('Error posting reply:', insertError.message)
      setError('Something went wrong — try again.')
      setPosting(false)
      return
    }

    setReplyBody('')
    setPosting(false)
    // The realtime subscription appends the new reply for us.
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handlePostReply()
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <section className="px-10 pb-10"><p className="font-sans text-sm text-text-muted">Loading...</p></section>
      </>
    )
  }

  if (!topic) {
    return (
      <>
        <Header />
        <section className="px-10 pb-10"><p className="font-sans text-sm text-text-muted">Topic not found.</p></section>
      </>
    )
  }

  return (
    <>
      <Header />
      <section className="px-10 pb-10">
        <Link to="/board" className="text-accent font-sans text-sm">← Back to board</Link>

        <div className="max-w-2xl mt-4">
          <div className="bg-surface border border-border rounded p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <img
                src={profilesById[topic.user_id]?.avatar_url || avatarPlaceholder(32)}
                alt=""
                className="w-8 h-8 object-cover rounded-full"
              />
              <div className="font-sans">
                <p className="m-0 text-sm font-bold">{displayNameFor(profilesById[topic.user_id])}</p>
                <p className="m-0 text-xs text-text-muted">{timeAgo(topic.created_at)}</p>
              </div>
            </div>
            <h2 className="text-xl font-serif m-0 mb-2">{topic.title}</h2>
            <p className="font-sans text-sm text-text m-0">{topic.body}</p>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {replies.map((reply) => (
              <div key={reply.id} className="bg-bg border border-border rounded px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={profilesById[reply.user_id]?.avatar_url || avatarPlaceholder(32)}
                    alt=""
                    className="w-6 h-6 object-cover rounded-full"
                  />
                  <span className="font-sans text-xs font-bold text-text">
                    {displayNameFor(profilesById[reply.user_id])}
                  </span>
                  <span className="font-sans text-xs text-text-muted">{timeAgo(reply.created_at)}</span>
                </div>
                <p className="font-sans text-sm text-text m-0">{reply.body}</p>
              </div>
            ))}
            {replies.length === 0 && (
              <p className="font-sans text-sm text-text-muted">No replies yet — be the first.</p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2">
            <textarea
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a reply..."
              rows={2}
              disabled={posting}
              className="flex-1 bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm resize-none"
            />
            <button
              onClick={handlePostReply}
              disabled={posting || !replyBody.trim()}
              className="bg-accent text-bg font-sans text-sm font-bold px-4 rounded cursor-pointer disabled:opacity-60"
            >
              Reply
            </button>
          </div>
          {error && <p className="text-sm text-[#c1666b] mt-2">{error}</p>}
        </div>
      </section>
    </>
  )
}

export default BoardTopicPage