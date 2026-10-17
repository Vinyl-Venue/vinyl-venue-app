import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { avatarPlaceholder } from './utils'

// Same sanitising rules as the full results page: characters that are
// special inside a PostgREST filter string are stripped so a search
// like "AC/DC, Live" or "Sgt. Pepper's (Remastered)" can't break it.
function searchTerms(q) {
  return q
    .split(/\s+/)
    .map((term) => term.replace(/[%_,()"\\]/g, ''))
    .filter(Boolean)
    .slice(0, 5)
}

function matchAllTerms(builder, terms, columns) {
  let result = builder
  for (const term of terms) {
    result = result.or(columns.map((column) => `${column}.ilike.%${term}%`).join(','))
  }
  return result
}

const norm = (v) => (v || '').trim().toLowerCase()

// Shared by the desktop dropdown and the mobile search sheet: a few
// listings, shelf records and people for what's typed so far. Shelves
// are limited by RLS to your own and the ones you follow. Results wait
// 250ms after the last keystroke, and a slower, older request can never
// overwrite a newer one.
export default function useSearchSuggestions(query, user) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)
  const trimmed = query.trim()

  useEffect(() => {
    const terms = searchTerms(trimmed)
    if (!user || trimmed.length < 2 || terms.length === 0) {
      requestId.current += 1
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const myRequest = ++requestId.current
    const timer = setTimeout(async () => {
      const [listingsRes, peopleRes, shelfRes] = await Promise.all([
        matchAllTerms(
          supabase.from('listings').select('id, title, artist, image_url, user_id').eq('status', 'active').limit(4),
          terms, ['title', 'artist']
        ),
        matchAllTerms(
          supabase.from('profiles').select('id, display_name, avatar_url').neq('id', user.id).limit(3),
          terms, ['display_name']
        ),
        matchAllTerms(
          supabase.from('albums').select('id, title, artist, image_url, user_id').limit(8),
          terms, ['title', 'artist']
        )
      ])
      if (myRequest !== requestId.current) return

      const next = []
      for (const l of listingsRes.data || []) {
        next.push({
          key: `l${l.id}`, group: 'Listings', image: l.image_url,
          title: l.title, sub: l.artist, to: `/profile/${l.user_id}/marketplace?listing=${l.id}`
        })
      }
      // A record that is both on a shelf and listed would show twice, so
      // shelf rows that match a listing by title + artist are dropped.
      const listedKeys = new Set((listingsRes.data || []).map((l) => `${norm(l.title)}|${norm(l.artist)}`))
      const shelfRows = (shelfRes.data || [])
        .filter((a) => !listedKeys.has(`${norm(a.title)}|${norm(a.artist)}`))
        .slice(0, 3)
      for (const a of shelfRows) {
        next.push({
          key: `a${a.id}`, group: 'On shelves', image: a.image_url,
          title: a.title, sub: a.artist, to: `/profile/${a.user_id}`
        })
      }
      for (const p of peopleRes.data || []) {
        next.push({
          key: `p${p.id}`, group: 'People', image: p.avatar_url || avatarPlaceholder(32, p.display_name), round: true,
          title: p.display_name || 'Collector', sub: 'Profile', to: `/profile/${p.id}`
        })
      }
      setItems(next)
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [trimmed, user])

  return { items, loading }
}