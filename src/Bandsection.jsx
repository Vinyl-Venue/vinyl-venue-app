import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { computeSimilarity, displayNameFor, avatarPlaceholder } from './utils'

const ROLES = ['Guitarist', 'Drums', 'Bassist', 'Keyboard']

function BandSection({ bandName }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bandmates, setBandmates] = useState([])

  useEffect(() => {
    loadBandmates()
  }, [])

  async function loadBandmates() {
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

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followingIds)
    const profileById = new Map((profiles || []).map((p) => [p.id, p]))

    const albumsByUser = new Map()
    for (const album of theirAlbumsAll || []) {
      if (!albumsByUser.has(album.user_id)) albumsByUser.set(album.user_id, [])
      albumsByUser.get(album.user_id).push(album)
    }

    const scored = []
    for (const [candidateId, candidateAlbums] of albumsByUser.entries()) {
      if (candidateAlbums.length === 0) continue
      scored.push({
        id: candidateId,
        profile: profileById.get(candidateId),
        score: computeSimilarity(myAlbums, candidateAlbums)
      })
    }

    scored.sort((a, b) => b.score - a.score)
    setBandmates(scored.slice(0, 4))
    setLoading(false)
  }

  if (loading) return null

  return (
    <div className="bg-surface border border-border rounded p-4 font-sans">
      <div className="bg-text inline-block px-2.5 py-1 mb-1">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">{bandName || 'The Band'}</span>
      </div>
      <p className="text-xs text-text-muted m-0 mb-3">
        Your bandmates, matched by how closely your collections overlap.
      </p>

      <div className="flex items-center gap-3 mb-2 bg-bg border border-border rounded px-3 py-2">
        <span className="text-accent font-bold text-xs w-20 flex-shrink-0">Lead Singer</span>
        <span className="text-sm text-text">You</span>
      </div>

      {bandmates.length === 0 ? (
        <p className="text-sm text-text-muted mt-2">
          Follow a few collectors with overlapping taste to fill out the band.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {bandmates.map((mate, i) => (
            <div
              key={mate.id}
              className="flex items-center gap-2 bg-bg border border-border rounded px-3 py-2 hover:border-accent"
            >
              <Link
                to={`/profile/${mate.id}`}
                className="flex items-center gap-3 flex-1 min-w-0 no-underline"
              >
                <span className="text-accent font-bold text-xs w-20 flex-shrink-0">{ROLES[i]}</span>
                <img
                  src={mate.profile?.avatar_url || avatarPlaceholder(56)}
                  alt=""
                  className="w-8 h-8 object-cover rounded-full flex-shrink-0"
                />
                {/* min-w-0 lets this flex item actually shrink below its
                    content's natural width (flex items default to
                    min-width: auto, which is what let a long email push
                    the score off-screen instead of the name truncating). */}
                <span className="text-sm text-text flex-1 min-w-0 truncate">{displayNameFor(mate.profile)}</span>
                <span className="text-xs text-text-muted flex-shrink-0">{mate.score}% overlap</span>
              </Link>
              {/* A suggestion should lead somewhere besides just "here's
                  a name" — Message is a real next action right from the
                  card, not something that only becomes available after
                  navigating to their profile first. */}
              <Link
                to={`/messages/${mate.id}`}
                className="text-[10px] uppercase tracking-wider text-accent no-underline bg-transparent border border-border rounded-full px-2.5 py-1 hover:border-accent flex-shrink-0"
              >
                Message
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BandSection