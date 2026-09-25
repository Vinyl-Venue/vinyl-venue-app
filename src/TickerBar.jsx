import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

const MAX_ITEMS = 15

function TickerBar() {
  const [items, setItems] = useState([])
  const listingCacheRef = useRef(new Map()) // listing_id -> { title, artist }

  useEffect(() => {
    seedListingCache()

    const channel = supabase
      .channel('marketplace-ticker')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'listings' },
        (payload) => {
          const listing = payload.new
          if (listing.status !== 'active') return

          listingCacheRef.current.set(listing.id, { title: listing.title, artist: listing.artist })
          pushItem(`🆕 ${listing.title} by ${listing.artist} listed — $${Number(listing.price).toFixed(2)}`)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listings' },
        (payload) => {
          const listing = payload.new
          if (listing.status === 'sold' && payload.old.status !== 'sold') {
            pushItem(`💰 ${listing.title} by ${listing.artist} sold — $${Number(listing.sold_price).toFixed(2)}`)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload) => {
          const bid = payload.new
          const cached = listingCacheRef.current.get(bid.listing_id)
          const label = cached ? `${cached.title} by ${cached.artist}` : 'a listing'
          pushItem(`🔨 New bid on ${label} — $${Number(bid.amount).toFixed(2)}`)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'board_posts' },
        (payload) => {
          const post = payload.new
          if (post.parent_post_id === null) {
            pushItem(`💬 New topic on the board: ${post.title}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function seedListingCache() {
    const { data } = await supabase
      .from('listings')
      .select('id, title, artist')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)

    for (const listing of data || []) {
      listingCacheRef.current.set(listing.id, { title: listing.title, artist: listing.artist })
    }
  }

  function pushItem(text) {
    setItems((current) => [{ id: `${Date.now()}-${Math.random()}`, text }, ...current].slice(0, MAX_ITEMS))
  }

  if (items.length === 0) {
    return (
      <div className="bg-surface border-b border-border py-2 px-4 font-sans text-xs text-text-muted">
        Watching the marketplace for activity...
      </div>
    )
  }

  const trackContent = items.map((item, i) => (
    <span key={item.id} className="inline-flex items-center">
      {i > 0 && <span className="mx-6 text-border">•</span>}
      {item.text}
    </span>
  ))

  return (
    <div className="bg-surface border-b border-border py-2 overflow-hidden whitespace-nowrap">
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 40s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-track inline-flex font-sans text-xs text-text-muted">
        <span className="inline-flex items-center pl-4">{trackContent}</span>
        <span className="mx-6 text-border">•</span>
        <span className="inline-flex items-center">{trackContent}</span>
      </div>
    </div>
  )
}

export default TickerBar