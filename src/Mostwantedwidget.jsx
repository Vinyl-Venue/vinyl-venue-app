import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

// Text color matches background so placehold.co's dimension label can't
// leak through visibly regardless of whether it honors the blank-text
// param — same fix as ShelfWallView's cover placeholders.
const PLACEHOLDER = "https://placehold.co/60x60/1c1a15/1c1a15"

// Row opacity falloff for the grid layout — row 1 (ranks 1-5) full
// strength, dimming toward row 3 (ranks 11-15), same as ShelfWallView's
// top-15 wall, to visually reinforce descending rank.
const ROW_OPACITY = [1, 0.88, 0.75]

function MostWantedWidget({ title = 'Most Wanted', limit = 10, defaultMode = 'global', allowToggle = true, layout = 'list', onItemClick }) {
  const { user } = useAuth()
  const [mode, setMode] = useState(defaultMode)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [mode])

  async function loadItems() {
    setLoading(true)

    if (mode === 'global') {
      const { data, error } = await supabase.rpc('get_most_wanted_albums', { p_limit: limit })

      if (error) {
        console.error('Error loading most wanted:', error.message)
        setLoading(false)
        return
      }

      setItems(data || [])
    } else {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', user.id)
        .lte('rank', 10)
        .order('rank', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('Error loading your wishlist:', error.message)
        setLoading(false)
        return
      }

      setItems((data || []).map((row) => ({
        title: row.title,
        artist: row.artist,
        genre: row.genre,
        image_url: row.image_url,
        rank: row.rank
      })))
    }

    setLoading(false)
  }

  return (
    <div className="bg-surface border border-border rounded p-4 font-sans">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="bg-text inline-block px-2.5 py-1 mb-1">
            <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">{title}</span>
          </div>
          <p className="text-xs text-text-muted m-0 mt-0.5">
            {mode === 'global'
              ? 'Weighted by wishlist rank across everyone on the platform.'
              : 'Your top-ranked wishlist items.'}
          </p>
        </div>
        {allowToggle && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => setMode('global')}
              className={`text-xs px-2.5 py-1 rounded border cursor-pointer ${
                mode === 'global' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setMode('self')}
              className={`text-xs px-2.5 py-1 rounded border cursor-pointer ${
                mode === 'self' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
              }`}
            >
              My Wishlist
            </button>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-text-muted">Loading...</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm text-text-muted">
          {mode === 'global' ? 'Nothing on any wishlist yet.' : 'Your wishlist is empty.'}
        </p>
      )}

      {/* List layout matches ProfilePage's wishlist list rows exactly.
          Grid layout matches ShelfWallView's "Top 15 by rarity" tiles —
          same responsive column counts, same badge, same gradient
          caption — so this reads as the same visual pattern as the
          Shelf's rarity wall on every screen size, not just desktop.
          Was hardcoded to 5 equal columns, which is why titles were
          truncating to "Nev...", "Led..." on a phone. */}
      {layout === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {items.map((item, i) => (
            <div
              key={`${item.title}-${item.artist}`}
              onClick={() => onItemClick?.(item)}
              style={{ opacity: ROW_OPACITY[Math.floor(i / 5)] ?? 0.7 }}
              className={`rounded-lg relative overflow-hidden bg-surface border border-border aspect-square transition-colors ${
                onItemClick ? 'cursor-pointer hover:border-accent' : ''
              }`}
            >
              <img
                src={item.image_url || PLACEHOLDER}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1.5 left-1.5 bg-accent text-bg text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                #{mode === 'self' ? item.rank : i + 1}
              </span>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
                <p className="text-white text-[11px] font-bold truncate m-0">{item.title}</p>
                <p className="text-white/80 text-[10px] truncate m-0">{item.artist}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <div key={`${item.title}-${item.artist}`} className="flex items-center gap-2.5 rounded px-2 py-1.5">
              <span className="text-accent font-bold text-xs w-5 flex-shrink-0">
                #{mode === 'self' ? item.rank : i + 1}
              </span>
              <img
                src={item.image_url || PLACEHOLDER}
                alt={item.title}
                className="w-8 h-8 object-cover rounded flex-shrink-0"
              />
              <span className="flex-1 text-sm min-w-0 truncate">
                <strong>{item.title}</strong> — {item.artist}
              </span>
              {mode === 'global' && (
                <span className="text-[10px] text-text-faint flex-shrink-0">
                  {item.demand_count} wishlist{item.demand_count === 1 ? '' : 's'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MostWantedWidget