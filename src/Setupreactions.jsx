import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { displayNameFor, avatarPlaceholder, timeAgo } from './utils'

// Likes and comments on My Setup — deliberately external signal (other
// collectors reacting) rather than a self-declared quality score, which
// would just be self-flattery with nothing to check it against. A like
// only means something if it's genuinely from someone else, so
// self-liking is blocked both here (button hidden for the owner) and at
// the database level.
function SetupReactions({ profileUserId, currentUserId, isOwnProfile }) {
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [likingBusy, setLikingBusy] = useState(false)

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => {
    fetchLikes()
    fetchComments()
  }, [profileUserId])

  async function fetchLikes() {
    const { count } = await supabase
      .from('setup_likes')
      .select('*', { count: 'exact', head: true })
      .eq('profile_user_id', profileUserId)

    setLikeCount(count || 0)

    if (!isOwnProfile) {
      const { data } = await supabase
        .from('setup_likes')
        .select('id')
        .eq('profile_user_id', profileUserId)
        .eq('liker_user_id', currentUserId)
        .maybeSingle()
      setIsLiked(!!data)
    }
  }

  async function fetchComments() {
    setCommentsLoading(true)
    const { data, error } = await supabase
      .from('setup_comments')
      .select('*, profiles!user_id(display_name, email, avatar_url)')
      .eq('profile_user_id', profileUserId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching setup comments:', error.message)
      setCommentsLoading(false)
      return
    }

    setComments(data || [])
    setCommentsLoading(false)
  }

  async function handleToggleLike() {
    setLikingBusy(true)

    if (isLiked) {
      const { error } = await supabase
        .from('setup_likes')
        .delete()
        .eq('profile_user_id', profileUserId)
        .eq('liker_user_id', currentUserId)

      if (!error) {
        setIsLiked(false)
        setLikeCount((c) => Math.max(0, c - 1))
      }
    } else {
      const { error } = await supabase
        .from('setup_likes')
        .insert({ profile_user_id: profileUserId, liker_user_id: currentUserId })

      if (!error) {
        setIsLiked(true)
        setLikeCount((c) => c + 1)
      }
    }

    setLikingBusy(false)
  }

  async function handlePostComment() {
    if (!newComment.trim()) return

    setPostingComment(true)
    const { error } = await supabase.from('setup_comments').insert({
      profile_user_id: profileUserId,
      user_id: currentUserId,
      content: newComment.trim()
    })
    setPostingComment(false)

    if (error) {
      console.error('Error posting comment:', error.message)
      return
    }

    setNewComment('')
    fetchComments()
  }

  async function handleDeleteComment(id) {
    const { error } = await supabase.from('setup_comments').delete().eq('id', id)
    if (error) {
      console.error('Error deleting comment:', error.message)
      return
    }
    setComments((current) => current.filter((c) => c.id !== id))
  }

  return (
    <div className="mt-4 pt-4 border-t border-border font-sans">
      <div className="flex items-center gap-2 mb-3">
        {!isOwnProfile ? (
          <button
            onClick={handleToggleLike}
            disabled={likingBusy}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border cursor-pointer disabled:opacity-60 ${
              isLiked ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted hover:border-accent hover:text-accent'
            }`}
          >
            {isLiked ? '♥' : '♡'} Nice setup
          </button>
        ) : null}
        <span className="text-xs text-text-muted">
          {likeCount === 0
            ? (isOwnProfile ? 'No one has liked this setup yet.' : '')
            : `${likeCount} collector${likeCount === 1 ? '' : 's'} like${likeCount === 1 ? 's' : ''} this setup`}
        </span>
      </div>

      {!commentsLoading && comments.length > 0 && (
        <div className="flex flex-col gap-2.5 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <img
                src={c.profiles?.avatar_url || avatarPlaceholder(28)}
                alt=""
                className="w-7 h-7 object-cover rounded-full flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text m-0">
                  <strong>{displayNameFor(c.profiles)}</strong>{' '}
                  <span className="text-text-faint font-mono">· {timeAgo(c.created_at)}</span>
                </p>
                <p className="text-xs text-text-muted m-0">{c.content}</p>
              </div>
              {(c.user_id === currentUserId || isOwnProfile) && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="text-text-faint text-xs bg-transparent border-0 cursor-pointer hover:text-accent flex-shrink-0"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Say something about this setup..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment() }}
          className="flex-1 bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm"
        />
        <button
          onClick={handlePostComment}
          disabled={postingComment || !newComment.trim()}
          className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60 flex-shrink-0"
        >
          Post
        </button>
      </div>
    </div>
  )
}

export default SetupReactions