import { useState } from 'react'
import { supabase } from './supabaseClient'
import { timeAgo } from './utils'

const PLACEHOLDER = "https://placehold.co/60x60/E4E2DC/E4E2DC"

// The one deliberately ephemeral piece of the profile — everything else
// (Favorites, Recommendations, the Shelf itself) is either permanent or
// an accumulating log. This is a live status: what's on the turntable
// right now, today, this hour. Only pickable from albums the user
// actually owns — unlike Favorites/Recommendations, "now spinning" has
// to be real, not aspirational.
function NowSpinningSection({ userId, isOwnProfile, realAlbums, albumId, updatedAt, onUpdated, onOpenAlbum }) {
  const [picking, setPicking] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [saving, setSaving] = useState(false)

  const currentAlbum = realAlbums.find((a) => a.id === albumId)

  const normalizedSearch = searchText.trim().toLowerCase()
  const filteredAlbums = normalizedSearch
    ? realAlbums.filter(
        (a) => a.title.toLowerCase().includes(normalizedSearch) || a.artist.toLowerCase().includes(normalizedSearch)
      )
    : realAlbums

  async function handlePick(pickedId) {
    setSaving(true)
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('profiles')
      .update({ now_spinning_album_id: pickedId, now_spinning_updated_at: nowIso })
      .eq('id', userId)

    setSaving(false)

    if (error) {
      console.error('Error setting now spinning:', error.message)
      return
    }

    setPicking(false)
    setSearchText('')
    onUpdated({ now_spinning_album_id: pickedId, now_spinning_updated_at: nowIso })
  }

  async function handleClear() {
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ now_spinning_album_id: null, now_spinning_updated_at: null })
      .eq('id', userId)

    setSaving(false)

    if (error) {
      console.error('Error clearing now spinning:', error.message)
      return
    }

    onUpdated({ now_spinning_album_id: null, now_spinning_updated_at: null })
  }

  if (!isOwnProfile && !currentAlbum) return null

  return (
    <div className="font-sans">
      {currentAlbum ? (
        <div className="inline-flex items-center gap-3 bg-surface border border-accent rounded p-3 max-w-md">
          <img
            src={currentAlbum.imageUrl || PLACEHOLDER}
            alt={currentAlbum.title}
            onClick={() => onOpenAlbum(currentAlbum)}
            className="w-12 h-12 object-cover rounded cursor-pointer flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="bg-text inline-block px-1.5 py-0.5 mb-1">
              <span className="font-mono text-[8px] tracking-wider uppercase font-bold text-bg">Now Spinning</span>
            </div>
            <p className="text-sm text-text font-bold m-0 truncate">{currentAlbum.title} — {currentAlbum.artist}</p>
            {updatedAt && <p className="text-[10px] text-text-faint font-mono m-0 mt-0.5">since {timeAgo(updatedAt)}</p>}
          </div>
          {isOwnProfile && (
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => setPicking(true)}
                className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
              >
                Change
              </button>
              <button
                onClick={handleClear}
                disabled={saving}
                className="text-[10px] uppercase tracking-wider text-text-muted bg-transparent border-0 cursor-pointer disabled:opacity-50"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      ) : (
        isOwnProfile && (
          <button
            onClick={() => setPicking(true)}
            className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
          >
            + Set what's spinning
          </button>
        )
      )}

      {picking && (
        <div className="mt-2 bg-surface border border-border rounded p-3">
          <input
            type="text"
            placeholder="Search your shelf..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
          />
          <div className="max-h-52 overflow-y-auto flex flex-col gap-1">
            {filteredAlbums.slice(0, 50).map((a) => (
              <button
                key={a.id}
                onClick={() => handlePick(a.id)}
                disabled={saving}
                className="flex items-center gap-2 bg-bg border border-border rounded px-2 py-1.5 text-left cursor-pointer hover:border-accent disabled:opacity-50"
              >
                <img src={a.imageUrl || PLACEHOLDER} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                <span className="text-xs text-text truncate">{a.title} — {a.artist}</span>
              </button>
            ))}
            {filteredAlbums.length === 0 && <p className="text-xs text-text-faint">No matches.</p>}
          </div>
          <button
            onClick={() => { setPicking(false); setSearchText('') }}
            disabled={saving}
            className="text-[10px] text-text-muted bg-transparent border-0 cursor-pointer mt-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default NowSpinningSection