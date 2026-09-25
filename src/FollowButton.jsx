import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

function FollowButton({ profileUserId, onFollowChange }) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkFollowStatus()
  }, [profileUserId])

  async function checkFollowStatus() {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', profileUserId)
      .maybeSingle()

    if (error) {
      console.error('Error checking follow status:', error.message)
    }

    setIsFollowing(!!data)
    setLoading(false)
  }

  async function handleFollow() {
    const { error } = await supabase.from('follows').insert({
      follower_id: user.id,
      following_id: profileUserId
    })

    if (error) {
      console.error('Error following:', error.message)
      return
    }

    setIsFollowing(true)
    if (onFollowChange) onFollowChange(true)
  }

  async function handleUnfollow() {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profileUserId)

    if (error) {
      console.error('Error unfollowing:', error.message)
      return
    }

    setIsFollowing(false)
    if (onFollowChange) onFollowChange(false)
  }

  if (loading || user.id === profileUserId) return null

  return isFollowing ? (
    <button
      onClick={handleUnfollow}
      className="bg-transparent border border-border text-text-muted px-4 py-2 rounded font-sans text-sm cursor-pointer hover:border-accent hover:text-accent"
    >
      Following
    </button>
  ) : (
    <button
      onClick={handleFollow}
      className="bg-accent text-bg border-0 px-4 py-2 rounded font-sans text-sm cursor-pointer"
    >
      Follow
    </button>
  )
}

export default FollowButton