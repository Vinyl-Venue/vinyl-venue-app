import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { discogsSearch, discogsFetchRelease } from './utils'

const PLACEHOLDER = "https://placehold.co/120x120/E4E2DC/E4E2DC"
const MAX_PER_TYPE = 3

function matchesAlbum(fav, album) {
  return (
    (album.title || '').toLowerCase().trim() === (fav.title || '').toLowerCase().trim() &&
    (album.artist || '').toLowerCase().trim() === (fav.artist || '').toLowerCase().trim()
  )
}

function matchesArtist(fav, album) {
  return (album.artist || '').toLowerCase().trim() === (fav.artist || '').toLowerCase().trim()
}

// Sits near the bio, not the collection-data sections lower down —
// favorites are a taste statement ("who I am"), not inventory. Gated
// behind isFollowing like the rest of the collection-aware content,
// since ownership matching needs real album data that a non-follower
// isn't given (see ProfilePage's loadProfile).
function FavoritesSection({ userId, isOwnProfile, realAlbums, onOpenAlbum, compact = false }) {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingType, setAddingType] = useState(null)
  const [mode, setMode] = useState('search')
  const [titleInput, setTitleInput] = useState('')
  const [artistInput, setArtistInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [discogsResults, setDiscogsResults] = useState([])
  const [discogsBusy, setDiscogsBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shelfAlbumForSong, setShelfAlbumForSong] = useState('')

  useEffect(() => {
    fetchFavorites()
  }, [userId])

  async function fetchFavorites() {
    setLoading(true)
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching favorites:', error.message)
      setLoading(false)
      return
    }

    setFavorites(data || [])
    setLoading(false)
  }

  const favoriteAlbums = favorites.filter((f) => f.type === 'album')
  const favoriteArtists = favorites.filter((f) => f.type === 'artist')
  const favoriteSongs = favorites.filter((f) => f.type === 'song')
  const uniqueShelfArtists = [...new Set(realAlbums.map((a) => a.artist).filter(Boolean))].sort()
  const shelfAlbumForSongObj = realAlbums.find((a) => String(a.id) === shelfAlbumForSong)

  function ownedAlbumFor(fav) {
    return realAlbums.find((a) =>
      fav.type === 'album' ? matchesAlbum(fav, a) : matchesArtist(fav, a)
    )
  }

  function openAddForm(type) {
    setAddingType(type)
    setMode('search')
    setTitleInput('')
    setArtistInput('')
    setNoteInput('')
    setImageUrl('')
    setDiscogsResults([])
    setShelfAlbumForSong('')
  }

  function closeAddForm() {
    setAddingType(null)
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

  function handlePickShelfAlbumForSong(albumId) {
    const album = realAlbums.find((a) => String(a.id) === albumId)
    if (!album) return
    setShelfAlbumForSong(albumId)
    setArtistInput(album.artist)
    setImageUrl(album.imageUrl || '')
    setTitleInput('')
  }

  function handlePickTrack(trackTitle) {
    setTitleInput(trackTitle)
  }

  async function handleSaveFavorite() {
    if ((addingType === 'album' || addingType === 'song') && (!titleInput.trim() || !artistInput.trim())) return
    if (addingType === 'artist' && !artistInput.trim()) return

    setSaving(true)

    const countForType = addingType === 'album' ? favoriteAlbums.length : addingType === 'song' ? favoriteSongs.length : favoriteArtists.length

    const { error } = await supabase.from('favorites').insert({
      user_id: userId,
      type: addingType,
      title: (addingType === 'album' || addingType === 'song') ? titleInput.trim() : null,
      artist: artistInput.trim(),
      image_url: imageUrl || null,
      note: noteInput.trim() || null,
      sort_order: countForType
    })

    setSaving(false)

    if (error) {
      console.error('Error saving favorite:', error.message)
      return
    }

    closeAddForm()
    fetchFavorites()
  }

  async function handleDeleteFavorite(id) {
    const { error } = await supabase.from('favorites').delete().eq('id', id)
    if (error) {
      console.error('Error deleting favorite:', error.message)
      return
    }
    setFavorites((current) => current.filter((f) => f.id !== id))
  }

  function renderFavoriteCard(fav) {
    const ownedAlbum = ownedAlbumFor(fav)
    const isOwned = !!ownedAlbum
    const displayImage = fav.image_url || ownedAlbum?.imageUrl || PLACEHOLDER

    return (
      <div
        key={fav.id}
        onClick={() => isOwned && fav.type === 'album' && onOpenAlbum(ownedAlbum)}
        className={`relative flex-shrink-0 w-28 rounded-lg overflow-hidden border ${
          isOwned ? 'border-accent' : 'border-dashed border-border'
        } ${isOwned && fav.type === 'album' ? 'cursor-pointer' : ''}`}
      >
        <img src={displayImage} alt={fav.title || fav.artist} className="w-28 h-28 object-cover" />
        {isOwned && (
          <span className="absolute top-1.5 left-1.5 bg-accent text-bg text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">
            In your collection
          </span>
        )}
        {isOwnProfile && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteFavorite(fav.id) }}
            className="absolute top-1.5 right-1.5 bg-bg/90 border border-border rounded-full w-5 h-5 flex items-center justify-center text-text-muted text-xs cursor-pointer hover:border-accent hover:text-accent"
          >
            ×
          </button>
        )}
        <div className="p-2 font-sans bg-surface">
          {fav.title && <p className="text-[11px] font-bold text-text m-0 truncate">{fav.title}</p>}
          <p className="text-[10px] text-text-muted m-0 truncate">{fav.artist}</p>
          {fav.note && <p className="text-[10px] text-text-faint italic m-0 mt-1 line-clamp-2">{fav.note}</p>}
        </div>
      </div>
    )
  }

  function renderAddForm() {
    const isAlbum = addingType === 'album'
    const isSong = addingType === 'song'

    return (
      <div className="bg-surface border border-border rounded p-3 font-sans mb-3 w-full">
        <div className="flex gap-1.5 mb-3">
          <button
            onClick={() => setMode('search')}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer ${
              mode === 'search' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
            }`}
          >
            {isAlbum ? 'Search any album' : isSong ? 'Any song' : 'Any artist'}
          </button>
          <button
            onClick={() => setMode('shelf')}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer ${
              mode === 'shelf' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
            }`}
          >
            Pick from my shelf
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
          ) : isSong ? (
            <>
              <select
                value={shelfAlbumForSong}
                onChange={(e) => handlePickShelfAlbumForSong(e.target.value)}
                className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
              >
                <option value="" disabled>Choose an album from your shelf...</option>
                {realAlbums.map((a) => (
                  <option key={a.id} value={a.id}>{a.title} — {a.artist}</option>
                ))}
              </select>
              {shelfAlbumForSongObj && (
                shelfAlbumForSongObj.tracklist && shelfAlbumForSongObj.tracklist.length > 0 ? (
                  <select
                    onChange={(e) => handlePickTrack(e.target.value)}
                    defaultValue=""
                    className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
                  >
                    <option value="" disabled>Choose a track...</option>
                    {shelfAlbumForSongObj.tracklist.map((t, i) => (
                      <option key={i} value={t.title}>{t.title}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="No tracklist saved for this album — type the song title"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
                  />
                )
              )}
            </>
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
              {(isAlbum || isSong) && (
                <input
                  type="text"
                  placeholder={isAlbum ? 'Album title' : 'Song title'}
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

        <input
          type="text"
          placeholder="A short note (optional) — why this one?"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
        />

        <div className="flex gap-2">
          <button
            onClick={handleSaveFavorite}
            disabled={saving}
            className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Add favorite'}
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
  if (favorites.length === 0 && !isOwnProfile) return null

  return (
    <div className="mb-8 font-sans">
      <div className="bg-text inline-block px-2.5 py-1 mb-1">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Favorites</span>
      </div>
      <p className="text-xs text-text-faint mb-3">
        Not the rarest or the most collected — just the ones that matter most.
      </p>

      <div className={`bg-surface border border-border rounded p-3 flex flex-col divide-y divide-border ${compact ? '' : 'md:flex-row md:flex-wrap md:divide-y-0 md:divide-x'}`}>
        <div className="pb-3 md:pb-0 md:px-3 md:first:pl-0 md:last:pr-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-text-faint m-0">Albums</p>
            {isOwnProfile && addingType !== 'album' && favoriteAlbums.length < MAX_PER_TYPE && (
              <button
                onClick={() => openAddForm('album')}
                className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
              >
                + Add
              </button>
            )}
          </div>
          {addingType === 'album' && renderAddForm()}
          <div className="flex flex-wrap gap-2.5">
            {favoriteAlbums.map(renderFavoriteCard)}
            {favoriteAlbums.length === 0 && addingType !== 'album' && (
              <p className="text-xs text-text-faint">
                {isOwnProfile ? 'Nothing added yet.' : 'No favorite albums yet.'}
              </p>
            )}
          </div>
        </div>

        <div className="pt-3 pb-3 md:pt-0 md:pb-0 md:px-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-text-faint m-0">Artists</p>
            {isOwnProfile && addingType !== 'artist' && favoriteArtists.length < MAX_PER_TYPE && (
              <button
                onClick={() => openAddForm('artist')}
                className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
              >
                + Add
              </button>
            )}
          </div>
          {addingType === 'artist' && renderAddForm()}
          <div className="flex flex-wrap gap-2.5">
            {favoriteArtists.map(renderFavoriteCard)}
            {favoriteArtists.length === 0 && addingType !== 'artist' && (
              <p className="text-xs text-text-faint">
                {isOwnProfile ? 'Nothing added yet.' : 'No favorite artists yet.'}
              </p>
            )}
          </div>
        </div>

        <div className="pt-3 md:pt-0 md:px-3 md:first:pl-0 md:last:pr-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-text-faint m-0">Songs</p>
            {isOwnProfile && addingType !== 'song' && favoriteSongs.length < MAX_PER_TYPE && (
              <button
                onClick={() => openAddForm('song')}
                className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
              >
                + Add
              </button>
            )}
          </div>
          {addingType === 'song' && renderAddForm()}
          <div className="flex flex-wrap gap-2.5">
            {favoriteSongs.map(renderFavoriteCard)}
            {favoriteSongs.length === 0 && addingType !== 'song' && (
              <p className="text-xs text-text-faint">
                {isOwnProfile ? 'Nothing added yet.' : 'No favorite songs yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FavoritesSection