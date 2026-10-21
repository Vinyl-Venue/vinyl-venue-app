import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { fuzzyMatchKey } from '../utils'

const PLACEHOLDER = 'https://placehold.co/60x60/E4E2DC/E4E2DC'

// The right-hand panel's resting state: what collectors across the platform
// want most, with "You own this" on albums from your shelf and how many
// active listings each one has. Clicking an item filters the listings to it.
function MostWantedRail({ userId, ownedKeys, listings, onItemClick, variant = 'column' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.rpc('get_most_wanted_albums', { p_limit: 8 })
      if (cancelled) return
      if (error) console.error('Error loading most wanted:', error.message)
      setItems(data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  const listingCount = (item) => listings.filter((l) => fuzzyMatchKey(l) === fuzzyMatchKey(item)).length
  const ownedCount = items.filter((item) => ownedKeys.has(fuzzyMatchKey(item))).length

  if (variant === 'row') {
    if (!loading && items.length === 0) return null
    return (
      <div className="lg:hidden flex flex-col gap-2 font-sans">
        <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight text-text">Most wanted</h2>
        <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {items.map((item, i) => {
            const owned = ownedKeys.has(fuzzyMatchKey(item))
            const count = listingCount(item)
            return (
              <button
                key={`${item.title}-${item.artist}`}
                onClick={() => onItemClick?.(item)}
                className="flex-none w-[110px] bg-transparent border-0 p-0 text-left cursor-pointer"
              >
                <span className="relative block">
                  <img src={item.image_url || PLACEHOLDER} alt="" className="w-full aspect-square object-cover bg-border" />
                  <span className="absolute top-1 left-1 bg-text text-bg font-mono text-[10px] px-1.5 py-0.5">#{i + 1}</span>
                </span>
                <span className="block text-[11px] font-semibold truncate mt-1">{item.title}</span>
                <span className={`block text-[10px] ${owned ? 'text-text' : count > 0 ? 'text-accent' : 'text-text-faint'}`}>
                  {owned ? 'You own this' : count > 0 ? `${count} listed` : 'none listed'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5 bg-surface border border-border rounded-lg p-4 font-sans">
      <h2 className="self-start m-0 font-serif italic font-normal text-[28px] leading-tight text-text">Most wanted</h2>
      <p className="text-xs text-text-muted m-0 -mt-1">
        What collectors across the platform are hunting for. Click one to find its listings.
      </p>

      {loading && <p className="text-sm text-text-muted m-0">Loading...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-text-muted m-0">Nothing on any wishlist yet.</p>}

      <div className="flex flex-col gap-3">
        {items.map((item, i) => {
          const owned = ownedKeys.has(fuzzyMatchKey(item))
          const count = listingCount(item)
          return (
            <button
              key={`${item.title}-${item.artist}`}
              onClick={() => onItemClick?.(item)}
              className="flex items-center gap-2.5 bg-transparent border-0 p-0 text-left cursor-pointer"
            >
              <span className="font-mono text-[10px] text-text-faint w-5">#{i + 1}</span>
              <img src={item.image_url || PLACEHOLDER} alt="" className="w-9 h-9 object-cover flex-shrink-0 bg-border" />
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold truncate">{item.title}</span>
                <span className="block text-[11px] text-text-muted truncate">{item.artist}</span>
              </span>
              {owned ? (
                <span className="text-[10px] font-semibold bg-text text-bg px-1.5 py-0.5 whitespace-nowrap">You own this</span>
              ) : (
                <span className={`text-[11px] whitespace-nowrap ${count > 0 ? 'text-accent' : 'text-text-faint'}`}>
                  {count > 0 ? `${count} listed` : 'none listed'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {ownedCount > 0 && (
        <p className="text-xs text-accent m-0 border-t border-border pt-3">
          You own {ownedCount} of the top {items.length}. Your shelf has albums other collectors want.
        </p>
      )}
    </div>
  )
}

export default MostWantedRail
