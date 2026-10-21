import { useState } from 'react'
import { supabase } from '../supabaseClient'

const PLACEHOLDER = 'https://placehold.co/60x60/E4E2DC/E4E2DC'

// Compact "Now spinning" row that sits under the stats grid in the profile banner.
// Same data as the old NowSpinningSection (profiles.now_spinning_album_id),
// only the presentation changed. Visitors see it only when something is set.
function NowSpinningStrip({ userId, isOwnProfile, realAlbums, albumId, onUpdated, onOpenAlbum }) {
  const [picking, setPicking] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [saving, setSaving] = useState(false)

  const currentAlbum = realAlbums.find((a) => a.id === albumId)

  const normalizedSearch = searchText.trim().toLowerCase()
  const filteredAlbums = normalizedSearch
    ? realAlbums.filter((a) => a.title.toLowerCase().includes(normalizedSearch) || a.artist.toLowerCase().includes(normalizedSearch))
    : realAlbums

  async function save(patch) {
    setSaving(true)
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    setSaving(false)
    if (error) {
      console.error('Error saving now spinning:', error.message)
      return
    }
    setPicking(false)
    setSearchText('')
    onUpdated(patch)
  }

  const pick = (id) => save({ now_spinning_album_id: id, now_spinning_updated_at: new Date().toISOString() })
  const clear = () => save({ now_spinning_album_id: null, now_spinning_updated_at: null })

  if (!isOwnProfile && !currentAlbum) return null

  return (
    <div className="relative w-0 min-w-full font-sans">
      <div className={`flex items-center gap-2.5 bg-surface px-2.5 py-2 ${currentAlbum ? 'border border-border' : 'border border-dashed border-border-strong'}`}>
        {currentAlbum ? (
          <>
            <img
              src={currentAlbum.imageUrl || PLACEHOLDER}
              alt=""
              onClick={() => onOpenAlbum(currentAlbum)}
              className="w-10 h-10 object-cover flex-shrink-0 cursor-pointer"
            />
            <div className="min-w-0 flex-1 flex flex-col gap-0.5 cursor-pointer" onClick={() => onOpenAlbum(currentAlbum)}>
              <span className="font-mono text-[9px] tracking-wider uppercase text-text-muted">Now spinning</span>
              <span className="text-[13px] truncate">
                <b>{currentAlbum.title}</b> <span className="text-text-muted">· {currentAlbum.artist}</span>
              </span>
            </div>
            {isOwnProfile && (
              <span className="flex flex-col gap-0.5 items-end flex-shrink-0">
                <button onClick={() => setPicking(true)} className="text-xs text-accent bg-transparent border-0 cursor-pointer p-0">Change</button>
                <button onClick={clear} disabled={saving} className="text-xs text-text-muted bg-transparent border-0 cursor-pointer p-0">Stop</button>
              </span>
            )}
          </>
        ) : (
          <button onClick={() => setPicking(true)} className="flex items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer text-left min-w-0">
            <span className="w-10 h-10 border border-dashed border-border-strong flex-shrink-0" />
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="font-mono text-[9px] tracking-wider uppercase text-text-muted">Now spinning</span>
              <span className="text-[13px] text-accent truncate">Share what's spinning</span>
            </span>
          </button>
        )}
      </div>

      {picking && (
        <div className="absolute right-0 top-full mt-1 z-20 w-72 max-w-[calc(100vw-2.5rem)] bg-surface border border-border-strong p-3 shadow-lg">
          <input
            type="text"
            placeholder="Search your shelf..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-bg border border-border text-text px-2.5 py-1.5 text-sm mb-2"
          />
          <div className="max-h-52 overflow-y-auto flex flex-col gap-1">
            {filteredAlbums.slice(0, 50).map((a) => (
              <button
                key={a.id}
                onClick={() => pick(a.id)}
                disabled={saving}
                className="flex items-center gap-2 bg-bg border border-border px-2 py-1.5 text-left cursor-pointer hover:border-accent disabled:opacity-50"
              >
                <img src={a.imageUrl || PLACEHOLDER} alt="" className="w-8 h-8 object-cover flex-shrink-0" />
                <span className="text-xs truncate">{a.title} — {a.artist}</span>
              </button>
            ))}
            {filteredAlbums.length === 0 && <p className="text-xs text-text-faint m-0">No matches.</p>}
          </div>
          <button onClick={() => { setPicking(false); setSearchText('') }} className="text-xs text-text-muted bg-transparent border-0 cursor-pointer mt-2 p-0">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default NowSpinningStrip
