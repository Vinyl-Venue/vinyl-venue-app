import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { SectionChip } from './AuctionSections'

const PLACEHOLDER = 'https://placehold.co/80x80/E4E2DC/E4E2DC'

function shortTimeLeft(iso) {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'ended'
  const h = Math.floor(ms / 3600000)
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m left`
  if (h < 24) return `${h}h left`
  return `${Math.floor(h / 24)}d left`
}

const STATUS_STYLE = {
  WINNING: 'bg-text text-bg border-text',
  OUTBID: 'bg-accent text-bg border-accent',
  WATCHING: 'bg-surface text-text-muted border-border-strong'
}

// Auctions you've bid on (winning / outbid) and listings you're watching.
// Hidden entirely until you have at least one.
function YourBidsStrip({ userId, listings, watch, onSelect }) {
  const [myBids, setMyBids] = useState({})

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.from('bids').select('listing_id, amount').eq('bidder_id', userId)
      if (cancelled || error) return
      const best = {}
      for (const row of data || []) {
        best[row.listing_id] = Math.max(best[row.listing_id] || 0, Number(row.amount))
      }
      setMyBids(best)
    }
    load()
    return () => { cancelled = true }
  }, [userId, listings.length])

  const items = []
  for (const listing of listings) {
    if (listing.listingType !== 'auction') continue
    const mine = myBids[listing.id]
    if (mine != null) {
      const winning = mine >= Number(listing.currentBid ?? 0)
      items.push({ listing, status: winning ? 'WINNING' : 'OUTBID', line: winning ? `You $${mine.toFixed(2)}` : `Now $${Number(listing.currentBid).toFixed(2)}` })
    } else if (watch?.watched?.has(listing.id)) {
      const notOpen = listing.startsAt && new Date(listing.startsAt) > new Date()
      items.push({ listing, status: 'WATCHING', line: `$${Number(listing.currentBid ?? listing.price).toFixed(2)}`, notOpen })
    }
  }
  // Listings (non-auction) being watched
  for (const listing of listings) {
    if (listing.listingType !== 'auction' && watch?.watched?.has(listing.id)) {
      items.push({ listing, status: 'WATCHING', line: `$${Number(listing.price).toFixed(2)}` })
    }
  }

  if (items.length === 0) return null
  const order = { OUTBID: 0, WINNING: 1, WATCHING: 2 }
  items.sort((a, b) => order[a.status] - order[b.status])
  const shown = items.slice(0, 6)

  return (
    <div className="flex flex-col gap-2 font-sans">
      <div className="flex items-center gap-3">
        <SectionChip>Your bids &amp; watchlist</SectionChip>
        <span className="text-xs text-text-muted">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2.5">
        {shown.map(({ listing, status, line, notOpen }) => (
          <div
            key={listing.id}
            onClick={() => onSelect(listing)}
            className="flex items-center gap-2.5 bg-surface border border-border rounded px-2.5 py-2 cursor-pointer hover:border-accent"
          >
            <img src={listing.imageUrl || PLACEHOLDER} alt="" className="w-11 h-11 object-cover flex-shrink-0 bg-border" />
            <div className="flex-1 min-w-0">
              <p className="m-0 text-xs font-bold truncate">{listing.title}</p>
              <p className="m-0 text-[11px] text-text-muted truncate">
                {line}{listing.endsAt && !notOpen ? ` · ${shortTimeLeft(listing.endsAt)}` : ''}{notOpen ? ' · not open yet' : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`font-mono text-[9px] tracking-wider px-1.5 py-0.5 border ${STATUS_STYLE[status]}`}>{status}</span>
              {status === 'OUTBID' && <span className="text-xs text-accent">Raise bid</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default YourBidsStrip
