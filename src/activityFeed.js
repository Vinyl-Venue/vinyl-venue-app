import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'

// Shared by the compact strip on Profile and the full Activity page, so
// both read the same events the same way. Previously this lived inline in
// ProfilePage and produced one card per raw database row — a collector
// who added 20 records flooded the feed with 20 cards, and an album that
// was added and then listed showed up twice.

const GROUP_WINDOW_MS = 24 * 60 * 60 * 1000

export async function fetchActivityEvents(userId) {
  const { data: followRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  const followedIds = (followRows || []).map((row) => row.following_id)
  if (followedIds.length === 0) return { events: [], followingCount: 0 }

  const { data: profilesData } = await supabase.from('profiles').select('*').in('id', followedIds)
  const profileById = new Map((profilesData || []).map((p) => [p.id, p]))

  const [albumsRes, listingsRes, recsRes] = await Promise.all([
    supabase
      .from('albums')
      .select('id, title, artist, image_url, user_id, created_at')
      .in('user_id', followedIds)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('listings')
      .select('id, album_id, title, artist, image_url, user_id, price, listing_type, ends_at, starts_at, created_at')
      .in('user_id', followedIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('recommendations')
      .select('id, title, artist, image_url, reason, user_id, created_at')
      .in('user_id', followedIds)
      .order('created_at', { ascending: false })
      .limit(40)
  ])

  // Reviews left for people you follow (reviews are public), and what each
  // followed collector currently has on the turntable.
  const reviewsRes = await supabase
    .from('reviews')
    .select('id, seller_id, reviewer_id, rating, body, created_at')
    .in('seller_id', followedIds)
    .order('created_at', { ascending: false })
    .limit(30)
  const reviews = reviewsRes.data || []

  // Sold listings are hidden from other people by RLS, so recent sales
  // come from a limited database function: which record, who sold it and
  // when. It never returns the price or the buyer.
  const { data: salesData, error: salesError } = await supabase.rpc('recent_sales_from_followed', { p_days: 30 })
  if (salesError) console.error('Error loading recent sales:', salesError.message)
  const sales = salesData || []

  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))].filter((id) => !profileById.has(id))
  if (reviewerIds.length > 0) {
    const { data: reviewerProfiles } = await supabase.from('profiles').select('*').in('id', reviewerIds)
    for (const rp of reviewerProfiles || []) profileById.set(rp.id, rp)
  }

  const spinningProfiles = (profilesData || []).filter((p) => p.now_spinning_album_id && p.now_spinning_updated_at)
  let spinningAlbumById = new Map()
  if (spinningProfiles.length > 0) {
    const { data: spinAlbums } = await supabase
      .from('albums')
      .select('id, title, artist, image_url')
      .in('id', spinningProfiles.map((p) => p.now_spinning_album_id))
    spinningAlbumById = new Map((spinAlbums || []).map((a) => [a.id, a]))
  }

  const albums = albumsRes.data || []
  const listings = listingsRes.data || []
  const recs = recsRes.data || []

  // Current high bid for each live auction, in one query rather than one
  // per auction.
  const auctionIds = listings.filter((l) => l.listing_type === 'auction').map((l) => l.id)
  const topBidByListing = new Map()
  const bidCountByListing = new Map()
  if (auctionIds.length > 0) {
    const { data: bids } = await supabase.from('bids').select('listing_id, amount').in('listing_id', auctionIds)
    for (const bid of bids || []) {
      const amount = Number(bid.amount)
      if (!topBidByListing.has(bid.listing_id) || amount > topBidByListing.get(bid.listing_id)) {
        topBidByListing.set(bid.listing_id, amount)
      }
      bidCountByListing.set(bid.listing_id, (bidCountByListing.get(bid.listing_id) || 0) + 1)
    }
  }

  // An album that is also an active listing is one story ("listed"), not
  // two — drop the redundant "added" event.
  const listedAlbumIds = new Set(listings.map((l) => l.album_id).filter(Boolean))

  const events = []

  for (const a of albums) {
    if (listedAlbumIds.has(a.id)) continue
    events.push({
      key: `album-${a.id}`,
      kind: 'added',
      actorId: a.user_id,
      actor: profileById.get(a.user_id),
      title: a.title,
      artist: a.artist,
      imageUrl: a.image_url,
      createdAt: a.created_at
    })
  }

  for (const l of listings) {
    const isAuction = l.listing_type === 'auction'
    // An auction that hasn't opened yet, or has already passed its end
    // time but hasn't been closed by the cron job yet, isn't live news.
    if (isAuction && l.ends_at && new Date(l.ends_at) < new Date()) continue
    if (isAuction && l.starts_at && new Date(l.starts_at) > new Date()) continue
    events.push({
      key: `listing-${l.id}`,
      kind: isAuction ? 'auction' : 'listed',
      actorId: l.user_id,
      actor: profileById.get(l.user_id),
      listingId: l.id,
      title: l.title,
      artist: l.artist,
      imageUrl: l.image_url,
      price: l.price,
      listingType: l.listing_type,
      endsAt: l.ends_at,
      currentBid: topBidByListing.get(l.id) ?? null,
      bidCount: bidCountByListing.get(l.id) || 0,
      createdAt: l.created_at
    })
  }

  for (const r of recs) {
    events.push({
      key: `rec-${r.id}`,
      kind: 'recommended',
      actorId: r.user_id,
      actor: profileById.get(r.user_id),
      title: r.title,
      artist: r.artist,
      imageUrl: r.image_url,
      reason: r.reason,
      createdAt: r.created_at
    })
  }

  for (const s of sales) {
    events.push({
      key: `sold-${s.id}`,
      kind: 'sold',
      actorId: s.user_id,
      actor: profileById.get(s.user_id),
      title: s.title,
      artist: s.artist,
      imageUrl: s.image_url,
      listingType: s.listing_type,
      createdAt: s.sold_at
    })
  }

  for (const r of reviews) {
    events.push({
      key: `review-${r.id}`,
      kind: 'review',
      actorId: r.seller_id,
      actor: profileById.get(r.seller_id),
      reviewer: profileById.get(r.reviewer_id),
      rating: r.rating,
      body: r.body,
      imageUrl: null,
      createdAt: r.created_at
    })
  }

  for (const p of spinningProfiles) {
    const album = spinningAlbumById.get(p.now_spinning_album_id)
    if (!album) continue
    events.push({
      key: `spin-${p.id}-${p.now_spinning_updated_at}`,
      kind: 'spinning',
      actorId: p.id,
      actor: p,
      title: album.title,
      artist: album.artist,
      imageUrl: album.image_url,
      createdAt: p.now_spinning_updated_at
    })
  }

  events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return { events, followingCount: followedIds.length }
}

// Collapses runs of "added" / "listed" events from the same person within
// 24 hours into one group. Auctions and recommendations stay individual:
// each is a distinct, time-sensitive or opinionated thing worth its own
// card. Input must already be sorted newest-first.
export function groupEvents(events) {
  const groups = []

  for (const event of events) {
    const groupable = event.kind === 'added' || event.kind === 'listed'
    const open = groups.find(
      (g) =>
        groupable &&
        g.kind === event.kind &&
        g.actorId === event.actorId &&
        new Date(g.oldestAt) - new Date(event.createdAt) <= GROUP_WINDOW_MS
    )

    if (open) {
      open.items.push(event)
      open.oldestAt = event.createdAt
    } else {
      groups.push({
        key: event.key,
        kind: event.kind,
        actorId: event.actorId,
        actor: event.actor,
        items: [event],
        createdAt: event.createdAt,
        oldestAt: event.createdAt
      })
    }
  }

  return groups
}

export function useActivityFeed(userId) {
  const [state, setState] = useState({ loading: true, events: [], groups: [], followingCount: 0 })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    const { events, followingCount } = await fetchActivityEvents(userId)
    setState({ loading: false, events, groups: groupEvents(events), followingCount })
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'added', label: 'New records' },
  { key: 'listed', label: 'Listings' },
  { key: 'auction', label: 'Auctions' },
  { key: 'recommended', label: 'Recommendations' },
  { key: 'sold', label: 'Sales' },
  { key: 'spinning', label: 'Now spinning' },
  { key: 'review', label: 'Reviews' }
]

function displayLabel(profile) {
  return profile?.display_name || profile?.email || 'a collector'
}

function uniqueArtists(items) {
  return [...new Set(items.map((i) => i.artist))].slice(0, 3).join(', ')
}

// "From $12.00" only when at least one item has a real price; trade or
// unpriced listings would otherwise read "From $0.00".
function pricedFrom(items) {
  const prices = items.map((i) => Number(i.price)).filter((n) => n > 0)
  return prices.length > 0 ? `From $${Math.min(...prices).toFixed(2)}` : ''
}

// Plain-language summary line and destination for a group, shared so the
// strip card and the full-page row never drift apart.
export function describeGroup(group) {
  const first = group.items[0]
  const count = group.items.length

  if (group.kind === 'added') {
    return {
      headline: count === 1 ? `added ${first.title}` : `added ${count} records`,
      sub: count === 1 ? first.artist : uniqueArtists(group.items),
      cta: count === 1 ? 'View shelf' : 'View shelf',
      to: `/profile/${group.actorId}`
    }
  }

  if (group.kind === 'listed') {
    const fixedPrice = first.price != null && first.listingType !== 'trade'
    return {
      headline:
        count === 1
          ? `listed ${first.title}${fixedPrice ? ` — $${Number(first.price).toFixed(2)}` : ''}`
          : `listed ${count} records`,
      sub:
        count === 1
          ? first.artist
          : pricedFrom(group.items) || uniqueArtists(group.items),
      cta: count === 1 ? 'View listing' : 'View listings',
      to:
        count === 1
          ? `/profile/${group.actorId}/marketplace?listing=${first.listingId}`
          : `/profile/${group.actorId}/marketplace`
    }
  }

  if (group.kind === 'auction') {
    const bid = first.currentBid != null ? first.currentBid : Number(first.price)
    return {
      headline: `${first.title} — ${first.artist}`,
      sub:
        first.bidCount > 0
          ? `Current bid $${bid.toFixed(2)} · ${first.bidCount} bid${first.bidCount === 1 ? '' : 's'}`
          : `Starting bid $${bid.toFixed(2)}`,
      cta: 'Place a bid',
      to: `/profile/${group.actorId}/marketplace?listing=${first.listingId}`
    }
  }

  if (group.kind === 'sold') {
    return {
      headline: `sold ${first.title}`,
      sub: first.artist,
      cta: 'View marketplace',
      to: `/profile/${group.actorId}/marketplace`
    }
  }

  if (group.kind === 'spinning') {
    return {
      headline: `is spinning ${first.title}`,
      sub: first.artist,
      cta: 'View shelf',
      to: `/profile/${group.actorId}`
    }
  }

  if (group.kind === 'review') {
    const stars = '\u2605'.repeat(Math.max(0, Math.min(5, Number(first.rating) || 0)))
    return {
      headline: `received a ${stars} review`,
      sub: first.body ? `\u201c${first.body}\u201d` : first.reviewer ? `from ${displayLabel(first.reviewer)}` : '',
      cta: 'View reviews',
      to: `/profile/${group.actorId}`
    }
  }

  return {
    headline: `recommends ${first.title || first.artist}`,
    sub: first.reason ? `“${first.reason}”` : first.artist,
    cta: 'View profile',
    to: `/profile/${group.actorId}`
  }
}

// ---------------------------------------------------------------------
// Crate Digest
// ---------------------------------------------------------------------

export const DIGEST_OPTIONS = [
  { key: 'daily', label: 'Every day', days: 1 },
  { key: 'weekly', label: 'Weekly', days: 7 },
  { key: 'biweekly', label: 'Every other week', days: 14 },
  { key: 'monthly', label: 'Monthly', days: 30 },
  { key: 'off', label: 'Off', days: 7 }
]

export function digestDays(frequency) {
  return (DIGEST_OPTIONS.find((o) => o.key === frequency) || DIGEST_OPTIONS[1]).days
}

export function digestIsDue(frequency, lastSeenAt) {
  if (frequency === 'off') return false
  if (!lastSeenAt) return true
  return Date.now() - new Date(lastSeenAt).getTime() >= digestDays(frequency) * 86400000
}

const keyFor = (artist, title) => `${(artist || '').trim().toLowerCase()}|${(title || '').trim().toLowerCase()}`

export async function fetchDigestContext(userId) {
  const [wishRes, rarityRes] = await Promise.all([
    supabase.from('wishlist_items').select('title, artist').eq('user_id', userId),
    supabase.from('rarity_scores').select('title, artist, score').order('score', { ascending: false }).limit(300)
  ])
  return {
    wishlistKeys: new Set((wishRes.data || []).map((w) => keyFor(w.artist, w.title))),
    rareKeys: new Set((rarityRes.data || []).map((r) => keyFor(r.artist, r.title)))
  }
}

// Turns raw events into the digest's sections for a lookback window.
// Auctions are judged on what is closing soon rather than when they were
// posted, so they ignore the window.
export function buildDigest(events, context, days) {
  const since = Date.now() - days * 86400000
  const inWindow = events.filter((e) => new Date(e.createdAt).getTime() >= since)
  const forSale = events.filter((e) => e.kind === 'listed' || e.kind === 'auction')

  const closingSoon = events
    .filter((e) => e.kind === 'auction' && e.endsAt && new Date(e.endsAt) - Date.now() < 72 * 3600000)
    .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))
    .slice(0, 5)

  const wishlist = forSale.filter((e) => context.wishlistKeys.has(keyFor(e.artist, e.title))).slice(0, 5)
  const rare = inWindow
    .filter((e) => ['added', 'listed', 'auction'].includes(e.kind) && context.rareKeys.has(keyFor(e.artist, e.title)))
    .slice(0, 5)
  const listen = inWindow.filter((e) => e.kind === 'recommended').slice(0, 5)

  const collectors = new Set(inWindow.map((e) => e.actorId))
  const stats = {
    added: inWindow.filter((e) => e.kind === 'added').length,
    listed: inWindow.filter((e) => e.kind === 'listed' || e.kind === 'auction').length,
    recommended: listen.length,
    collectors: collectors.size
  }

  const highlights = closingSoon.length + wishlist.length + rare.length + listen.length
  return { closingSoon, wishlist, rare, listen, stats, highlights }
}