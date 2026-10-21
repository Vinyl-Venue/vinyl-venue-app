import { fuzzyMatchKey } from '../utils'

const norm = (v) => (v || '').toLowerCase().trim()

// Builds a taste profile from the user's shelf and wishlist.
export function buildTaste(albums, wishlist) {
  const artists = new Map()
  const genres = new Map()
  for (const a of albums || []) {
    const artist = norm(a.artist)
    if (artist) artists.set(artist, (artists.get(artist) || 0) + 1)
    const genre = norm(a.genre)
    if (genre) genres.set(genre, (genres.get(genre) || 0) + 1)
  }
  const styles = new Map()
  for (const a of albums || []) {
    for (const st of String(a.styles || '').split(',')) {
      const k = norm(st)
      if (k) styles.set(k, (styles.get(k) || 0) + 1)
    }
  }
  const wishArtists = new Set((wishlist || []).map((w) => norm(w.artist)).filter(Boolean))
  const topGenres = new Set([...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g))
  return { artists, genres, styles, wishArtists, topGenres }
}

// Scores active listings against the taste profile and returns the best
// matches, each with a short human reason.
export function suggestListings({ listings, taste, ownedKeys, followedIds, userId, limit = 14 }) {
  if (!taste || (taste.artists.size === 0 && taste.wishArtists.size === 0)) return []
  const now = Date.now()
  const scored = []
  for (const l of listings) {
    if (l.userId === userId || l.status === 'sold') continue
    if (ownedKeys.has(fuzzyMatchKey(l))) continue
    if (l.listingType === 'auction' && l.endsAt && new Date(l.endsAt).getTime() < now) continue
    const artist = norm(l.artist)
    const genre = norm(l.genre)
    let score = 0
    let reason = null
    const owned = taste.artists.get(artist)
    if (owned) {
      score += 3 + Math.min(owned, 3)
      reason = `You own ${owned} ${l.artist} record${owned === 1 ? '' : 's'}`
    } else if (taste.wishArtists.has(artist)) {
      score += 3
      reason = `${l.artist} is on your wishlist`
    }
    if (genre && taste.genres.has(genre)) {
      score += taste.topGenres.has(genre) ? 2 : 1
      if (!reason) reason = `Matches your ${l.genre} shelf`
    }
    // Discogs styles are finer than genre, so a match says more.
    if (taste.styles?.size) {
      const hit = String(l.styles || '').split(',').map(norm).filter((st) => st && taste.styles.has(st))
      if (hit.length) {
        score += Math.min(hit.length, 2)
        if (!reason) reason = `Matches the ${hit[0]} records on your shelf`
      }
    }
    if (followedIds?.has(l.userId)) score += 1
    if (score >= 2 && reason) scored.push({ listing: l, score, reason })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
