import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { discogsSearch, discogsFetchRelease, timeAgo } from './utils'

const PLACEHOLDER = "https://placehold.co/60x60/E4E2DC/E4E2DC"
const INITIAL_VISIBLE = 5

function matchesAlbum(rec, album) {
  return (
    (album.title || '').toLowerCase().trim() === (rec.title || '').toLowerCase().trim() &&
    (album.artist || '').toLowerCase().trim() === (rec.artist || '').toLowerCase().trim()
  )
}

function matchesArtist(rec, album) {
  return (album.artist || '').toLowerCase().trim() === (rec.artist || '').toLowerCase().trim()
}

// An ongoing log ("here's what I've been telling people to check out"),
// not a fixed curated list like Favorites — so this renders as a
// reverse-chronological feed rather than a small capped set. Gated
// behind isFollowing, same reasoning as Favorites/Crates: ownership
// matching needs real album data a non-follower isn't given.
function RecommendedListenSection({ userId, isOwnProfile, realAlbums, onOpenAlbum }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState('album')
  const [mode, setMode] = useState('search')
  const [titleInput, setTitleInput] = useState('')
  const [artistInput, setArtistInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [discogsResults, setDiscogsResults] = useState([])
  const [discogsBusy, setDiscogsBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRecommendations()
  }, [userId])

  async function fetchRecommendations() {
    setLoading(true)
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recommendations:', error.message)
      setLoading(false)
      return
    }

    setRecommendations(data || [])
    setLoading(false)
  }

  const uniqueShelfArtists = [...new Set(realAlbums.map((a) => a.artist).filter(Boolean))].sort()
  const visibleRecommendations = showAll ? recommendations : recommendations.slice(0, INITIAL_VISIBLE)

  function ownedAlbumFor(rec) {
    return realAlbums.find((a) => (rec.type === 'album' ? matchesAlbum(rec, a) : matchesArtist(rec, a)))
  }

  function openAddForm() {
    setAdding(true)
    setType('album')
    setMode('search')
    setTitleInput('')
    setArtistInput('')
    setReasonInput('')
    setImageUrl('')
    setDiscogsResults([])
  }

  function closeAddForm() {
    setAdding(false)
  }

  async function handleDiscogsSearch() {
    setDiscogsBusy(true)
    setDiscogsResults([])
    const { results } = await discogsSearch(titleInput, artistInput)
    setDiscogsBusy(false)
    setDiscogsResults(results || [])
  }

  async function handlePickDiscogsResult(result) {
    setDiscogsBusy(true)
    const { release } = await discogsFetchRelease(result.id)
    setDiscogsBusy(false)
    if (release) {
      setTitleInput(release.title || titleInput)
      setArtistInput(release.artist || artistInput)
      setImageUrl(release.coverImageUrl || '')
    }
    setDiscogsResults([])
  }

  function handlePickShelfAlbum(albumId) {
    const album = realAlbums.find((a) => String(a.id) === albumId)
    if (!album) return
    setTitleInput(album.title)
    setArtistInput(album.artist)
    setImageUrl(album.imageUrl || '')
  }

  function handlePickShelfArtist(artistName) {
    setArtistInput(artistName)
    const anyAlbumByArtist = realAlbums.find((a) => a.artist === artistName)
    setImageUrl(anyAlbumByArtist?.imageUrl || '')
  }

  async function handleSave() {
    const isAlbum = type === 'album'
    if (isAlbum && (!titleInput.trim() || !artistInput.trim())) return
    if (!isAlbum && !artistInput.trim()) return
    if (!reasonInput.trim()) return

    setSaving(true)

    const { error } = await supabase.from('recommendations').insert({
      user_id: userId,
      type,
      title: isAlbum ? titleInput.trim() : null,
      artist: artistInput.trim(),
      image_url: imageUrl || null,
      reason: reasonInput.trim()
    })

    setSaving(false)

    if (error) {
      console.error('Error saving recommendation:', error.message)
      return
    }

    closeAddForm()
    fetchRecommendations()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('recommendations').delete().eq('id', id)
    if (error) {
      console.error('Error deleting recommendation:', error.message)
      return
    }
    setRecommendations((current) => current.filter((r) => r.id !== id))
  }

  function renderAddForm() {
    const isAlbum = type === 'album'

    return (
      <div className="bg-surface border border-border rounded p-3 font-sans mb-4">
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <button
            onClick={() => { setType('album'); setMode('search'); setTitleInput(''); setArtistInput(''); setImageUrl(''); setDiscogsResults([]) }}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer ${
              type === 'album' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
            }`}
          >
            Album
          </button>
          <button
            onClick={() => { setType('artist'); setMode('search'); setTitleInput(''); setArtistInput(''); setImageUrl(''); setDiscogsResults([]) }}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer ${
              type === 'artist' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
            }`}
          >
            Artist
          </button>
          <span className="flex-1" />
          <button
            onClick={() => setMode('search')}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer ${
              mode === 'search' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
            }`}
          >
            {isAlbum ? 'Search any' : 'Any artist'}
          </button>
          <button
            onClick={() => setMode('shelf')}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer ${
              mode === 'shelf' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
            }`}
          >
            From my shelf
          </button>
        </div>

        {mode === 'shelf' ? (
          isAlbum ? (
            <select
              onChange={(e) => handlePickShelfAlbum(e.target.value)}
              defaultValue=""
              className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
            >
              <option value="" disabled>Choose an album from your shelf...</option>
              {realAlbums.map((a) => (
                <option key={a.id} value={a.id}>{a.title} — {a.artist}</option>
              ))}
            </select>
          ) : (
            <select
              onChange={(e) => handlePickShelfArtist(e.target.value)}
              defaultValue=""
              className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
            >
              <option value="" disabled>Choose an artist from your shelf...</option>
              {uniqueShelfArtists.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              {isAlbum && (
                <input
                  type="text"
                  placeholder="Album title"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="flex-1 bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm"
                />
              )}
              <input
                type="text"
                placeholder="Artist"
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                className="flex-1 bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm"
              />
              {isAlbum && (
                <button
                  onClick={handleDiscogsSearch}
                  disabled={discogsBusy || (!titleInput.trim() && !artistInput.trim())}
                  className="bg-transparent border border-border text-text-muted px-2.5 py-1.5 rounded text-xs cursor-pointer hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {discogsBusy ? '...' : 'Find cover'}
                </button>
              )}
            </div>
            {discogsResults.length > 0 && (
              <div className="flex flex-col gap-1 mb-2 max-h-40 overflow-y-auto">
                {discogsResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handlePickDiscogsResult(r)}
                    className="flex items-center gap-2 bg-bg border border-border rounded px-2 py-1.5 text-left cursor-pointer hover:border-accent"
                  >
                    <img src={r.thumb || PLACEHOLDER} alt="" className="w-6 h-6 object-cover rounded flex-shrink-0" />
                    <span className="text-xs text-text truncate">{r.title}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <textarea
          placeholder="Why should people listen? (required)"
          value={reasonInput}
          onChange={(e) => setReasonInput(e.target.value)}
          rows={2}
          className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2 resize-none"
        />

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !reasonInput.trim()}
            className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Posting...' : 'Post recommendation'}
          </button>
          <button
            onClick={closeAddForm}
            disabled={saving}
            className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (loading) return null
  if (recommendations.length === 0 && !isOwnProfile) return null

  return (
    <div className="mb-8 font-sans">
      <div className="flex items-center justify-between mb-1">
        <div className="bg-text inline-block px-2.5 py-1">
          <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Recommended Listen</span>
        </div>
        {isOwnProfile && !adding && (
          <button
            onClick={openAddForm}
            className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
          >
            + Recommend something
          </button>
        )}
      </div>
      <p className="text-xs text-text-faint mb-3">
        Something you just discovered and think your followers should hear.
      </p>

      <div className="bg-surface border border-border rounded-lg p-3 max-w-lg">
        {adding && renderAddForm()}

        {recommendations.length === 0 && !adding ? (
          <p className="text-xs text-text-faint">
            {isOwnProfile ? 'Nothing recommended yet.' : 'No recommendations yet.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleRecommendations.map((rec) => {
              const ownedAlbum = ownedAlbumFor(rec)
              const isOwned = !!ownedAlbum
              const displayImage = rec.image_url || ownedAlbum?.imageUrl || PLACEHOLDER

              return (
                <div key={rec.id} className="flex gap-3 bg-bg border border-border rounded p-2.5 w-96 max-w-full">
                  <img
                    src={displayImage}
                    alt={rec.title || rec.artist}
                    onClick={() => isOwned && rec.type === 'album' && onOpenAlbum(ownedAlbum)}
                    className={`w-14 h-14 object-cover rounded flex-shrink-0 border ${
                      isOwned ? 'border-accent cursor-pointer' : 'border-border'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm text-text font-bold">
                        {rec.title ? `${rec.title} — ${rec.artist}` : rec.artist}
                      </span>
                      {isOwned && (
                        <span className="bg-accent text-bg text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">
                          In your collection
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted m-0 mt-0.5">{rec.reason}</p>
                    <p className="text-[10px] text-text-faint font-mono m-0 mt-1">{timeAgo(rec.created_at)}</p>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="text-text-faint text-xs bg-transparent border-0 cursor-pointer flex-shrink-0 hover:text-accent self-start"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {recommendations.length > INITIAL_VISIBLE && (
          <button
            onClick={() => setShowAll((current) => !current)}
            className="text-[10px] uppercase tracking-wider text-text-faint bg-transparent border-0 cursor-pointer mt-2"
          >
            {showAll ? '− Show less' : `+ Show ${recommendations.length - INITIAL_VISIBLE} more`}
          </button>
        )}
      </div>
    </div>
  )
}

export default RecommendedListenSection