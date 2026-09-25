import { supabase } from './supabaseClient'

// ---------- Identity & display ----------

export function displayNameFor(profile) {
  return profile?.display_name || profile?.email || 'Someone'
}

export function avatarPlaceholder(size = 40) {
  return `https://placehold.co/${size}x${size}/1c1a15/a8a29a?text=%20`
}

// ---------- Time ----------

export function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

// ---------- Album/title matching ----------

export function matchKey(title, artist) {
  return `${(title || '').toLowerCase().trim()}::${(artist || '').toLowerCase().trim()}`
}

export function fuzzyMatchKey(item) {
  return matchKey(item.title, item.artist)
}

export function getDecade(year) {
  if (!year) return null
  return `${Math.floor(year / 10) * 10}s`
}

// ---------- Collection similarity (Jaccard, weighted) ----------
// Single source of truth for "how similar are two collections" — used by
// StatsPage, TryNewWidget, and BandSection. Keeping this in one place means
// "least similar" and "most similar" always mean the same thing everywhere.

export function uniqueValues(albums, getValue) {
  const values = albums.map(getValue).filter(Boolean)
  return [...new Set(values)]
}

export function jaccardSimilarity(setA, setB) {
  const intersection = setA.filter((item) => setB.includes(item))
  const union = [...new Set([...setA, ...setB])]
  if (union.length === 0) return 0
  return intersection.length / union.length
}

export function computeSimilarity(myAlbums, theirAlbums) {
  const myArtists = uniqueValues(myAlbums, (a) => a.artist)
  const theirArtists = uniqueValues(theirAlbums, (a) => a.artist)
  const myGenres = uniqueValues(myAlbums, (a) => a.genre)
  const theirGenres = uniqueValues(theirAlbums, (a) => a.genre)
  const mySubgenres = uniqueValues(myAlbums, (a) => a.subgenre)
  const theirSubgenres = uniqueValues(theirAlbums, (a) => a.subgenre)
  const myDecades = uniqueValues(myAlbums, (a) => getDecade(a.year))
  const theirDecades = uniqueValues(theirAlbums, (a) => getDecade(a.year))
  const myCountries = uniqueValues(myAlbums, (a) => a.pressing_country)
  const theirCountries = uniqueValues(theirAlbums, (a) => a.pressing_country)
  const myLabels = uniqueValues(myAlbums, (a) => a.label)
  const theirLabels = uniqueValues(theirAlbums, (a) => a.label)

  const metrics = [
    { score: jaccardSimilarity(myArtists, theirArtists), weight: 0.30 },
    { score: jaccardSimilarity(myGenres, theirGenres), weight: 0.25 },
    { score: jaccardSimilarity(mySubgenres, theirSubgenres), weight: 0.15 },
    { score: jaccardSimilarity(myLabels, theirLabels), weight: 0.10 },
    { score: jaccardSimilarity(myDecades, theirDecades), weight: 0.10 },
    { score: jaccardSimilarity(myCountries, theirCountries), weight: 0.10 }
  ]

  return Math.round(metrics.reduce((sum, m) => sum + m.score * m.weight, 0) * 100)
}

// ---------- Marketplace listings ----------

export const LISTING_TYPE_LABELS = {
  fixed: 'For sale',
  fixed_or_trade: 'For sale or trade',
  trade: 'Trade only',
  auction: 'Auction'
}

export function rowToListing(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    artist: row.artist,
    year: row.year,
    genre: row.genre,
    imageUrl: row.image_url,
    sleeveCondition: row.sleeve_condition,
    mediaCondition: row.media_condition,
    label: row.label,
    pressingCountry: row.pressing_country,
    matrixNumber: row.matrix_number,
    deadwax: row.deadwax,
    price: row.price,
    listingType: row.listing_type,
    listingTypeLabel: LISTING_TYPE_LABELS[row.listing_type],
    tradePreference: row.trade_preference,
    startsAt: row.starts_at,
    shippingPrice: row.shipping_price,
    endsAt: row.ends_at,
    status: row.status,
    soldPrice: row.sold_price,
    soldAt: row.sold_at
  }
}

// Attaches the current highest bid to each auction listing in one batched
// query, so grid cards show live bid prices instead of the frozen starting
// price. Used by both MarketplacePage and SellerMarketplacePage.
export async function attachHighestBids(listingsArr) {
  const auctionIds = listingsArr.filter((l) => l.listingType === 'auction').map((l) => l.id)
  if (auctionIds.length === 0) return listingsArr

  const { data, error } = await supabase
    .from('bids')
    .select('listing_id, amount')
    .in('listing_id', auctionIds)

  if (error) {
    console.error('Error fetching bids for listings:', error.message)
    return listingsArr
  }

  const highestByListing = {}
  for (const bid of data) {
    if (!(bid.listing_id in highestByListing) || bid.amount > highestByListing[bid.listing_id]) {
      highestByListing[bid.listing_id] = bid.amount
    }
  }

  return listingsArr.map((listing) =>
    listing.listingType === 'auction'
      ? { ...listing, currentBid: highestByListing[listing.id] ?? null }
      : listing
  )
}

// ---------- Rarity ----------

// Attaches precomputed rarity rank/breakdown to a list of albums, matched by
// title+artist. Used by DashboardPage and ProfilePage.
export async function attachRarity(albums) {
  if (albums.length === 0) return albums

  const keys = albums.map((a) => matchKey(a.title, a.artist))
  const { data, error } = await supabase
    .from('rarity_scores')
    .select('*')
    .in('composite_key', keys)
    .lte('rank', 250)

  if (error) {
    console.error('Error fetching rarity scores:', error.message)
    return albums
  }

  const byKey = new Map((data || []).map((r) => [r.composite_key, r]))

  return albums.map((album) => {
    const r = byKey.get(matchKey(album.title, album.artist))
    if (!r) return album

    return {
      ...album,
      rarityRank: r.rank,
      rarityBreakdown: `Rarity #${r.rank} — scarcity: ${r.scarcity_raw} owner${r.scarcity_raw === 1 ? '' : 's'} platform-wide, demand: ${r.demand_raw}, best condition found: ${r.condition_raw}/6, tags: ${r.tags_raw}, active listings: ${r.availability_raw}`
    }
  })
}

// ---------- Discogs lookup ----------
// Wraps the discogs-lookup edge function call pattern, used by both
// AddAlbumForm (adding a new album) and AlbumModal (finding a tracklist for
// an existing one).

export async function discogsSearch(title, artist, extra = {}) {
  // extra: { label, year, country, format } — sent as real structured
  // Discogs search parameters rather than blended into one free-text
  // string. format is optional here — the discogs-lookup Edge Function
  // already defaults to "Vinyl" server-side when it's omitted, since
  // this is a vinyl-only platform. Pass format explicitly only when a
  // caller wants to override that default (e.g. an "All formats" toggle).
  const { label = '', year = '', country = '', format } = extra

  const params = new URLSearchParams()
  params.set('action', 'search')
  if (title) params.set('title', title)
  if (artist) params.set('artist', artist)
  if (label) params.set('label', label)
  if (year) params.set('year', String(year))
  if (country) params.set('country', country)
  if (format !== undefined) params.set('format', format)

  const query = `discogs-lookup?${params.toString()}`
  const { data, error } = await supabase.functions.invoke(query, { method: 'GET' })

  if (error) return { results: [], error: 'Discogs search failed — try again.' }
  if (data.error) return { results: [], error: data.error }
  return { results: data.results || [], error: null }
}

export async function discogsFetchRelease(id) {
  const query = `discogs-lookup?action=release&id=${id}`
  const { data, error } = await supabase.functions.invoke(query, { method: 'GET' })

  if (error) return { release: null, error: 'Could not load that release — try another result.' }
  if (data.error) return { release: null, error: data.error }
  return { release: data.release, error: null }
}

// Collection-size tier — shared between the "Total Albums" stat card and
// (formerly) the Badges section, since both describe the exact same
// number. Single source of truth so the two never drift apart.
export const COLLECTION_TIERS = [
  { min: 250, label: 'Vault Keeper', icon: '📦' },
  { min: 100, label: 'Deep Crates', icon: '📦' },
  { min: 50, label: 'Serious Collector', icon: '📦' },
  { min: 10, label: 'Getting Started', icon: '📦' }
]

export function getCollectionTier(count) {
  return COLLECTION_TIERS.find((t) => count >= t.min) || null
}