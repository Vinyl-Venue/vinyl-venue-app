import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { computeSimilarity, uniqueValues, displayNameFor } from './utils'

function TryNewWidget() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [leastSimilar, setLeastSimilar] = useState(null)
  const [discoveryArtists, setDiscoveryArtists] = useState([])

  useEffect(() => {
    loadDiscovery()
  }, [])

  async function loadDiscovery() {
    setLoading(true)

    const { data: myAlbums } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', user.id)

    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followRows || []).map((r) => r.following_id)

    if (!myAlbums || myAlbums.length === 0 || followingIds.length === 0) {
      setLoading(false)
      return
    }

    const { data: theirAlbumsAll } = await supabase
      .from('albums')
      .select('*')
      .in('user_id', followingIds)

    const albumsByUser = new Map()
    for (const album of theirAlbumsAll || []) {
      if (!albumsByUser.has(album.user_id)) albumsByUser.set(album.user_id, [])
      albumsByUser.get(album.user_id).push(album)
    }

    let lowestScore = null
    let lowestUserId = null
    for (const [candidateId, candidateAlbums] of albumsByUser.entries()) {
      if (candidateAlbums.length === 0) continue
      const score = computeSimilarity(myAlbums, candidateAlbums)
      if (lowestScore === null || score < lowestScore) {
        lowestScore = score
        lowestUserId = candidateId
      }
    }

    if (lowestUserId === null) {
      setLoading(false)
      return
    }

    const { data: candidateProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', lowestUserId)
      .maybeSingle()

    const myArtists = uniqueValues(myAlbums, (a) => a.artist)
    const myGenres = uniqueValues(myAlbums, (a) => a.genre)
    const theirAlbums = albumsByUser.get(lowestUserId)
    const theirArtists = uniqueValues(theirAlbums, (a) => a.artist)
    const theirGenres = uniqueValues(theirAlbums, (a) => a.genre)

    const discovery = theirArtists.filter(
      (artist) => !myArtists.includes(artist) && theirGenres.some((g) => myGenres.includes(g))
    )

    setLeastSimilar({ id: lowestUserId, profile: candidateProfile, score: lowestScore })
    setDiscoveryArtists(discovery.slice(0, 10))
    setLoading(false)
  }

  if (loading) return null

  if (!leastSimilar) {
    return (
      <div className="bg-surface border border-border rounded p-4 font-sans">
        <div className="bg-text inline-block px-2.5 py-1 mb-2">
          <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Try something new</span>
        </div>
        <p className="text-sm text-text-muted m-0">
          Follow a few more collectors to get discovery suggestions from tastes unlike yours.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded p-4 font-sans">
      <div className="bg-text inline-block px-2.5 py-1 mb-2">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Try something new</span>
      </div>
      <p className="text-xs text-text-muted m-0 mb-3">
        Inspired by{' '}
        <Link to={`/profile/${leastSimilar.id}`} className="text-accent no-underline hover:underline">
          {displayNameFor(leastSimilar.profile)}
        </Link>
        's shelf — only {leastSimilar.score}% similar to yours.
      </p>

      {discoveryArtists.length === 0 ? (
        <p className="text-sm text-text-muted m-0">
          No genre overlap to suggest from yet — their collection doesn't share a genre with yours.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {discoveryArtists.map((artist) => (
            <span
              key={artist}
              className="bg-bg border border-border rounded-full px-3 py-1.5 text-sm text-text"
            >
              {artist}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default TryNewWidget