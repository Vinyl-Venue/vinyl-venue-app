import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { timeAgo, displayNameFor, avatarPlaceholder } from './utils'

function BoardPage() {
  const { user } = useAuth()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTopics()

    const channel = supabase
      .channel('board-topics')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'board_posts' },
        () => loadTopics()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadTopics() {
    const { data: topicRows, error: topicError } = await supabase
      .from('board_posts')
      .select('*')
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })

    if (topicError) {
      console.error('Error loading board topics:', topicError.message)
      setLoading(false)
      return
    }

    const topicIds = topicRows.map((t) => t.id)

    const { data: replyRows } = topicIds.length > 0
      ? await supabase
          .from('board_posts')
          .select('parent_post_id, created_at')
          .in('parent_post_id', topicIds)
      : { data: [] }

    const replyStats = {}
    for (const reply of replyRows || []) {
      const stats = replyStats[reply.parent_post_id] || { count: 0, lastActivity: null }
      stats.count += 1
      if (!stats.lastActivity || new Date(reply.created_at) > new Date(stats.lastActivity)) {
        stats.lastActivity = reply.created_at
      }
      replyStats[reply.parent_post_id] = stats
    }

    const authorIds = [...new Set(topicRows.map((t) => t.user_id))]
    const { data: profiles } = authorIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', authorIds)
      : { data: [] }
    const profileById = new Map((profiles || []).map((p) => [p.id, p]))

    const enriched = topicRows.map((t) => ({
      ...t,
      author: profileById.get(t.user_id),
      replyCount: replyStats[t.id]?.count || 0,
      lastActivity: replyStats[t.id]?.lastActivity || t.created_at
    })).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))

    setTopics(enriched)
    setLoading(false)
  }

  async function handlePostTopic() {
    if (!newTitle.trim() || !newBody.trim()) {
      setError('Both a title and a message are required.')
      return
    }

    setPosting(true)
    setError('')

    const { error: insertError } = await supabase.from('board_posts').insert({
      user_id: user.id,
      title: newTitle.trim(),
      body: newBody.trim(),
      parent_post_id: null
    })

    if (insertError) {
      console.error('Error posting topic:', insertError.message)
      setError('Something went wrong — try again.')
      setPosting(false)
      return
    }

    setNewTitle('')
    setNewBody('')
    setShowNewTopic(false)
    setPosting(false)
  }

  return (
    <>
      <Header />
      <section className="px-10 pb-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-serif m-0">Marketplace board</h2>
          {!showNewTopic && (
            <button
              onClick={() => setShowNewTopic(true)}
              className="bg-accent text-bg font-sans text-sm font-bold px-4 py-2 rounded cursor-pointer"
            >
              New topic
            </button>
          )}
        </div>
        <p className="text-text-muted font-sans text-sm mb-6">
          Open discussion for the whole marketplace — pressing questions, trade requests, general chat.
        </p>

        {showNewTopic && (
          <div className="mb-6 max-w-2xl bg-surface border border-border rounded p-4 font-sans">
            <input
              type="text"
              placeholder="Topic title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              disabled={posting}
              className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
            />
            <textarea
              placeholder="What's on your mind?"
              value={newBody}
              onChange={(event) => setNewBody(event.target.value)}
              rows={3}
              disabled={posting}
              className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm resize-none mb-2"
            />
            {error && <p className="text-sm text-[#c1666b] mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handlePostTopic}
                disabled={posting}
                className="bg-accent text-bg font-bold text-sm px-4 py-1.5 rounded cursor-pointer disabled:opacity-60"
              >
                {posting ? 'Posting...' : 'Post topic'}
              </button>
              <button
                onClick={() => { setShowNewTopic(false); setError('') }}
                disabled={posting}
                className="bg-transparent border border-border text-text-muted text-sm px-4 py-1.5 rounded cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && <p className="font-sans text-sm text-text-muted">Loading...</p>}

        {!loading && topics.length === 0 && (
          <p className="font-sans text-sm text-text-muted">No topics yet — start the first one.</p>
        )}

        <div className="flex flex-col gap-2 max-w-2xl">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/board/${topic.id}`}
              className="flex items-center gap-3 bg-surface border border-border rounded px-4 py-3 no-underline text-text hover:border-accent"
            >
              <img
                src={topic.author?.avatar_url || avatarPlaceholder(32)}
                alt=""
                className="w-9 h-9 object-cover rounded-full flex-shrink-0"
              />
              <div className="flex-1 font-sans min-w-0">
                <p className="m-0 text-sm font-bold truncate">{topic.title}</p>
                <p className="m-0 text-xs text-text-muted mt-0.5">
                  {displayNameFor(topic.author)} · {timeAgo(topic.created_at)}
                </p>
              </div>
              <span className="font-sans text-xs text-text-muted flex-shrink-0">
                {topic.replyCount} repl{topic.replyCount === 1 ? 'y' : 'ies'}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

export default BoardPage