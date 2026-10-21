import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// The listings a user is watching. Reads and writes the `watchlist` table;
// if that table doesn't exist yet (migration not run) `available` stays
// false and the hearts / watching strip simply don't render.
export function useWatchlist(userId) {
  const [watched, setWatched] = useState(() => new Set())
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.from('watchlist').select('listing_id').eq('user_id', userId)
      if (cancelled) return
      if (error) {
        setAvailable(false)
        return
      }
      setWatched(new Set((data || []).map((r) => r.listing_id)))
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  const toggle = useCallback(async (listingId) => {
    if (!userId) return
    const isWatched = watched.has(listingId)
    setWatched((current) => {
      const next = new Set(current)
      if (isWatched) next.delete(listingId)
      else next.add(listingId)
      return next
    })
    const { error } = isWatched
      ? await supabase.from('watchlist').delete().eq('user_id', userId).eq('listing_id', listingId)
      : await supabase.from('watchlist').insert({ user_id: userId, listing_id: listingId })
    if (error) {
      console.error('Error updating watchlist:', error.message)
      setWatched((current) => {
        const next = new Set(current)
        if (isWatched) next.add(listingId)
        else next.delete(listingId)
        return next
      })
    }
  }, [userId, watched])

  return { watched, toggle, available }
}
