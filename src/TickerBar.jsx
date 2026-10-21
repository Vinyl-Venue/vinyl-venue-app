import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { matchKey } from './utils'
import { loadPriceAverages, dealPercent } from './marketplace/priceStats'

const MAX_ITEMS = 15
const DEAL_THRESHOLD = 15 // % below the platform average before a PRICE event fires
const RARE_SHELF_MAX_RANK = 100 // a shelf addition is news if the album is in the top 100 by rarity
const RARE_MOVE_MAX_RANK = 25 // a rank change is news if it lands in (or leaves) the top 25
const ENDING_WINDOW_MS = 60 * 60 * 1000

const TAG_STYLES = {
  LISTED: 'bg-white/15 text-white',
  BID: 'bg-white/15 text-white',
  TOPIC: 'bg-white/15 text-white',
  SOLD: 'bg-accent text-white',
  ENDING: 'bg-accent text-white',
  RARE: 'bg-accent text-white',
  PRICE: 'bg-accent text-white'
}

function money(value) {
  return `$${Number(value).toFixed(2)}`
}

function listingLink(listingId, sellerId) {
  return sellerId ? `/profile/${sellerId}/marketplace?listing=${listingId}` : '/marketplace'
}

// The live activity ticker. Anywhere in the app it's a slim bar under the
// page top; on the marketplace pages it's pinned to the bottom of the
// screen (above the tab bar on phones) so it stays in view while you scroll.
// Every item is clickable.
function TickerBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const pinned = location.pathname === '/marketplace' || location.pathname.endsWith('/marketplace')

  const [items, setItems] = useState([])
  const listingCacheRef = useRef(new Map()) // listing_id -> { title, artist, sellerId }
  const averagesRef = useRef(new Map())
  const rankRef = useRef(new Map()) // composite_key -> { rank, title, artist }
  const announcedRef = useRef(new Set())
  const recentPushesRef = useRef([])

  // Keeps a burst of activity from flooding the bar: at most 8 new items
  // per 10 seconds, and an identical line is never shown twice.
  function pushItem(tag, text, to) {
    const now = Date.now()
    recentPushesRef.current = recentPushesRef.current.filter((t) => now - t < 10000)
    if (recentPushesRef.current.length >= 8) return
    recentPushesRef.current.push(now)

    setItems((current) => {
      if (current.some((item) => item.text === text && item.tag === tag)) return current
      return [{ id: `${now}-${Math.random()}`, tag, text, to }, ...current].slice(0, MAX_ITEMS)
    })
  }

  useEffect(() => {
    async function seedListingCache() {
      const { data } = await supabase
        .from('listings')
        .select('id, title, artist, user_id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50)

      for (const listing of data || []) {
        listingCacheRef.current.set(listing.id, { title: listing.title, artist: listing.artist, sellerId: listing.user_id })
      }
    }

    async function seedRanks() {
      const { data } = await supabase.from('rarity_scores').select('composite_key, title, artist, rank').lte('rank', 250)
      for (const row of data || []) {
        rankRef.current.set(row.composite_key, { rank: row.rank, title: row.title, artist: row.artist })
      }
    }

    // Shelf additions: row-level security means you only hear about
    // collectors you follow, and only when the album is genuinely rare.
    async function handleShelfAddition(album) {
      const known = rankRef.current.get(matchKey(album.title, album.artist))
      if (!known || known.rank > RARE_SHELF_MAX_RANK) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', album.user_id)
        .maybeSingle()
      if (profile && profile.show_in_ticker === false) return

      const name = profile?.display_name || profile?.email?.split('@')[0] || 'A collector'
      pushItem('RARE', `${name} added ${album.title} to their shelf · rarity #${known.rank}`, `/profile/${album.user_id}`)
    }

    async function checkEndingSoon() {
      const nowIso = new Date().toISOString()
      const soonIso = new Date(Date.now() + ENDING_WINDOW_MS).toISOString()
      const { data } = await supabase
        .from('listings')
        .select('id, title, artist, user_id')
        .eq('status', 'active')
        .eq('listing_type', 'auction')
        .gt('ends_at', nowIso)
        .lte('ends_at', soonIso)
        .limit(10)

      for (const listing of data || []) {
        if (announcedRef.current.has(listing.id)) continue
        announcedRef.current.add(listing.id)
        pushItem('ENDING', `Auction ends in 1 hour · ${listing.title} by ${listing.artist}`, listingLink(listing.id, listing.user_id))
      }
    }

    seedListingCache()
    seedRanks()
    loadPriceAverages().then((m) => { averagesRef.current = m })

    const channel = supabase
      .channel('marketplace-ticker')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, (payload) => {
        const listing = payload.new
        if (listing.status !== 'active') return
        listingCacheRef.current.set(listing.id, { title: listing.title, artist: listing.artist, sellerId: listing.user_id })
        const to = listingLink(listing.id, listing.user_id)
        pushItem('LISTED', `${listing.title} by ${listing.artist} listed · ${money(listing.price)}`, to)

        const pct = dealPercent(
          { title: listing.title, artist: listing.artist, price: listing.price, listingType: listing.listing_type },
          averagesRef.current
        )
        if (pct != null && pct >= DEAL_THRESHOLD) {
          pushItem('PRICE', `${listing.title} listed ${pct}% below average · ${money(listing.price)}`, to)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, (payload) => {
        const listing = payload.new
        if (listing.status === 'sold' && payload.old.status !== 'sold') {
          pushItem('SOLD', `${listing.title} by ${listing.artist} sold · ${money(listing.sold_price)}`, listingLink(listing.id, listing.user_id))
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, (payload) => {
        const bid = payload.new
        const cached = listingCacheRef.current.get(bid.listing_id)
        const label = cached ? `${cached.title} by ${cached.artist}` : 'a listing'
        pushItem('BID', `New bid on ${label} · ${money(bid.amount)}`, cached ? listingLink(bid.listing_id, cached.sellerId) : '/marketplace')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'board_posts' }, (payload) => {
        const post = payload.new
        if (post.parent_post_id === null) pushItem('TOPIC', `New topic on the board: ${post.title}`, `/board/${post.id}`)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'albums' }, (payload) => {
        handleShelfAddition(payload.new)
      })
      // Rarity rank moves. The old rank isn't in the payload, so it's
      // compared against the ranks seeded when the ticker mounted.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rarity_scores' }, (payload) => {
        const row = payload.new
        const before = rankRef.current.get(row.composite_key)
        rankRef.current.set(row.composite_key, { rank: row.rank, title: row.title, artist: row.artist })
        if (!before || before.rank === row.rank) return
        if (Math.min(before.rank, row.rank) > RARE_MOVE_MAX_RANK) return
        pushItem('RARE', `${row.title} moved #${before.rank} → #${row.rank} in rarity`, `/search?q=${encodeURIComponent(row.title)}`)
      })
      .subscribe()

    // Auctions entering their final hour: check once a minute.
    checkEndingSoon()
    const endingTimer = setInterval(checkEndingSoon, 60 * 1000)

    return () => {
      clearInterval(endingTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  const shell = pinned
    ? 'fixed left-0 right-0 bottom-14 lg:bottom-0 z-30 bg-[#1A1A1A] border-t border-black text-[#E9E7E0]'
    : 'bg-surface border-b border-border text-text-muted'

  if (items.length === 0) {
    return (
      <div className={`${shell} py-2 px-4 font-sans text-xs`}>
        {pinned && <span className="inline-block w-[7px] h-[7px] rounded-full bg-accent mr-2 align-middle animate-pulse" />}
        Watching the marketplace for activity...
      </div>
    )
  }

  const trackContent = items.map((item) => (
    <button
      key={item.id}
      onClick={() => item.to && navigate(item.to)}
      className="inline-flex items-center gap-2 mr-7 bg-transparent border-0 p-0 cursor-pointer text-inherit font-sans text-xs whitespace-nowrap hover:underline"
    >
      <span className={`font-mono text-[9px] tracking-wider px-1.5 py-0.5 ${pinned ? TAG_STYLES[item.tag] : 'bg-border text-text-muted'}`}>{item.tag}</span>
      <span>{item.text}</span>
    </button>
  ))

  return (
    <div className={`${shell} py-2 overflow-hidden whitespace-nowrap`} role="region" aria-label="Live marketplace activity">
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track { animation: ticker-scroll 60s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; overflow-x: auto; max-width: 100%; }
        }
      `}</style>
      <div className="flex items-center">
        {pinned && (
          <span className="flex-none inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-white pl-4 pr-3">
            <span className="w-[7px] h-[7px] rounded-full bg-accent animate-pulse" />LIVE
          </span>
        )}
        <div className="overflow-hidden flex-1">
          <div className="ticker-track inline-flex">
            <span className="inline-flex items-center pl-4">{trackContent}</span>
            <span className="inline-flex items-center pl-4">{trackContent}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TickerBar
