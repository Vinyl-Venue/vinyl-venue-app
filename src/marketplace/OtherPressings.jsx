import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { rowToListing, attachHighestBids } from '../utils'
import { pressingSummary, pressingSignature } from './pressings'

const escapeLike = (v) => String(v || '').trim().replace(/[\\%_]/g, (c) => `\\${c}`)
const PLACEHOLDER = 'https://placehold.co/80x80/E4E2DC/E4E2DC'

// Other active listings of the same album, so you can hop between pressings
// without going back to the grid. Each row says which pressing it is.
function OtherPressings({ listing, onSelect }) {
  const [rows, setRows] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .ilike('title', escapeLike(listing.title))
        .ilike('artist', escapeLike(listing.artist))
        .neq('id', listing.id)
        .limit(20)
      if (cancelled) return
      if (error) { console.error('Error loading other pressings:', error.message); setRows([]); return }
      const withBids = await attachHighestBids((data || []).map(rowToListing))
      if (!cancelled) setRows(withBids)
    }
    load()
    return () => { cancelled = true }
  }, [listing.id, listing.title, listing.artist])

  if (rows === null) return null
  const here = pressingSignature(listing)

  return (
    <div className="mt-4 pt-4 border-t border-border font-sans">
      <p className="m-0 mb-2 font-mono text-[10px] tracking-wider uppercase text-text-faint">
        Other pressings for sale{rows.length > 0 ? ` · ${rows.length}` : ''}
      </p>
      {rows.length === 0 ? (
        <p className="m-0 text-[13px] text-text-muted">No other copies of this album are listed right now.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {(showAll ? rows : rows.slice(0, 4)).map((r) => {
            const same = pressingSignature(r) === here
            const price = r.listingType === 'auction' ? (r.currentBid ?? r.price) : r.price
            return (
              <button
                key={r.id}
                onClick={() => onSelect?.(r)}
                className="flex items-center gap-2.5 text-left bg-surface border border-border rounded px-2 py-2 cursor-pointer hover:border-accent"
              >
                <img src={r.imageUrl || PLACEHOLDER} alt="" className="w-11 h-11 object-cover flex-shrink-0 bg-border" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold truncate">{pressingSummary(r)}</span>
                  <span className="block text-[11px] text-text-muted truncate">
                    {[r.mediaCondition && `${r.mediaCondition}/${r.sleeveCondition || '?'}`, same ? 'Same pressing, different copy' : null].filter(Boolean).join(' · ') || (r.listingTypeLabel || '')}
                  </span>
                </span>
                <span className="text-[13px] font-mono text-accent whitespace-nowrap">
                  {r.listingType === 'trade' ? 'Trade' : `$${Number(price).toFixed(2)}`}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {rows.length > 4 && (
        <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-[12px] text-accent bg-transparent border-0 p-0 cursor-pointer">
          {showAll ? 'Show fewer' : `Show ${rows.length - 4} more`}
        </button>
      )}
    </div>
  )
}

export default OtherPressings
