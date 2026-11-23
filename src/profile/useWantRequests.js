import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const REQUEST_DAYS = 90

const money = (n) => `$${Number(n).toFixed(2)}`

export function isExpired(request) {
  return request && new Date(request.expires_at) <= new Date()
}

// Whole days left on an active alert, or null when it has more than a week or has already lapsed.
export function daysLeft(request) {
  if (!request || isExpired(request)) return null
  const d = Math.ceil((new Date(request.expires_at) - new Date()) / 86400000)
  return d <= 7 ? Math.max(d, 1) : null
}

// Short status for a Most Wanted row: "Alert $38 · VG+ or better · 2 copies", "Alert paused", "Alert expired".
export function requestSummary(request, liveCount) {
  if (!request) return null
  if (isExpired(request)) return 'Alert expired'
  if (!request.active) return 'Alert paused'
  const grade = request.min_media ? ` · ${request.min_media} or better` : ''
  const left = daysLeft(request)
  const ending = left ? ` · ends in ${left}d` : ''
  return `Alert ${money(request.max_price).replace('.00', '')}${grade}${liveCount ? ` · ${liveCount} cop${liveCount === 1 ? 'y' : 'ies'}` : ''}${ending}`
}

// Standing requests on the owner's Most Wanted items, with the copies currently matching them.
// Requests are private (the database only returns your own), so this hook does nothing on
// someone else's profile. Matching itself happens in the database; this just reads and edits.
export function useWantRequests({ viewerId, enabled }) {
  const [requests, setRequests] = useState([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (!enabled || !viewerId) return
    const { data, error } = await supabase
      .from('want_requests')
      .select(`*, want_request_matches(id, listing_id, delivered_price, dismissed, created_at,
        listings(id, title, artist, price, shipping_price, media_condition, sleeve_condition, status, user_id))`)
      .eq('user_id', viewerId)
    if (error) {
      console.error('Error loading requests:', error.message)
      return
    }
    setRequests(data || [])
    setLoaded(true)
  }, [viewerId, enabled])

  useEffect(() => { load() }, [load])

  const byItemId = new Map(requests.map((r) => [r.wishlist_item_id, r]))

  // Copies you can act on: still listed, not dismissed. Sold or withdrawn listings come back
  // as null from the database (they're no longer public) and simply drop out.
  function liveMatches(request) {
    return (request?.want_request_matches || [])
      .filter((m) => !m.dismissed && m.listings && m.listings.status === 'active')
      .sort((a, b) => Number(a.delivered_price) - Number(b.delivered_price))
  }

  async function saveRequest(wishlistItemId, form) {
    const row = {
      wishlist_item_id: wishlistItemId,
      user_id: viewerId,
      max_price: Number(form.maxPrice),
      min_media: form.minMedia || null,
      min_sleeve: form.minSleeve || null,
      scope: form.scope === 'pressing' ? 'pressing' : 'any',
      discogs_release_id: form.scope === 'pressing' && form.discogsReleaseId ? Number(form.discogsReleaseId) : null,
      active: true,
      expires_at: new Date(Date.now() + REQUEST_DAYS * 86400000).toISOString()
    }
    const { error } = await supabase.from('want_requests').upsert(row, { onConflict: 'wishlist_item_id' })
    if (error) return error.message
    await load()
    return null
  }

  async function removeRequest(requestId) {
    const { error } = await supabase.from('want_requests').delete().eq('id', requestId)
    if (error) console.error('Error removing request:', error.message)
    await load()
  }

  async function setPaused(requestId, paused) {
    const { error } = await supabase.from('want_requests').update({ active: !paused }).eq('id', requestId)
    if (error) console.error('Error updating request:', error.message)
    await load()
  }

  async function dismissMatch(matchId) {
    const { error } = await supabase.from('want_request_matches').update({ dismissed: true }).eq('id', matchId)
    if (error) console.error('Error dismissing match:', error.message)
    await load()
  }

  return { loaded, requests, byItemId, liveMatches, saveRequest, removeRequest, setPaused, dismissMatch, reload: load }
}
