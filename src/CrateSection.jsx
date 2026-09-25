import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const PLACEHOLDER = "https://placehold.co/60x60/E4E2DC/E4E2DC"

// Lightweight, tracklist-only popup — deliberately not the full
// AlbumDetailContent panel (listing form, comments, condition, etc.).
// Browsing a crate is about "what's actually on this record," so the
// modal stays focused on that, with a link out to the full detail view
// for anyone who wants more.
function TracklistModal({ album, onClose, onViewFull, isOwnProfile, onHighlight, onClearHighlight }) {
  if (!album) return null
  const tracklist = album.tracklist || []
  const highlighted = album.highlightedTrack || null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-lg p-5 max-w-sm w-11/12 relative font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 bg-transparent border-0 text-text-muted text-xl cursor-pointer">×</button>
        <div className="flex gap-3 mb-3">
          <img src={album.imageUrl || PLACEHOLDER} alt="" className="w-16 h-16 object-cover rounded flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-serif italic text-base text-text m-0 truncate">{album.title}</p>
            <p className="text-xs text-text-muted m-0 truncate">{album.artist}</p>
          </div>
        </div>

        {tracklist.length === 0 ? (
          <p className="text-xs text-text-faint mb-3">No tracklist saved for this album.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto mb-3">
            {tracklist.map((t, i) => {
              const isHighlighted = highlighted && highlighted.position === t.position && highlighted.title === t.title
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-2 text-xs rounded px-1.5 py-1 ${isHighlighted ? 'bg-accent/10' : ''}`}
                >
                  <span className={`truncate flex items-center gap-1 ${isHighlighted ? 'text-text' : 'text-text-muted'}`}>
                    {isHighlighted && <span className="text-accent flex-shrink-0">★</span>}
                    <span className="text-text-faint font-mono mr-1">{t.position}</span>{t.title}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.duration && <span className="text-text-faint font-mono">{t.duration}</span>}
                    {isOwnProfile && (
                      isHighlighted ? (
                        <button onClick={onClearHighlight} className="text-[9px] uppercase tracking-wide text-text-faint bg-transparent border-0 cursor-pointer hover:text-accent">
                          Unpick
                        </button>
                      ) : (
                        <button onClick={() => onHighlight(t.position, t.title)} className="text-[9px] uppercase tracking-wide text-accent bg-transparent border-0 cursor-pointer">
                          Pick
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {onViewFull && (
          <button
            onClick={() => { onViewFull(album); onClose() }}
            className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
          >
            View full album details →
          </button>
        )}
      </div>
    </div>
  )
}

// The lifted hover preview for a peeking record — same idea as the
// Shelf's Crates view, scoped locally here since Mini-Crates records
// carry a slightly different shape (crateAlbumId, highlightedTrack)
// than the Shelf's album objects. Pops up on the left side, same as
// the Shelf's version.
function CratePeekPreview({ record }) {
  return (
    <div
      className="absolute rounded-lg overflow-hidden border border-border bg-surface z-50"
      style={{ width: 110, top: -80, left: -10, boxShadow: '0 6px 16px rgba(0,0,0,0.25)' }}
    >
      <img src={record.imageUrl || PLACEHOLDER} alt={record.title} className="w-full aspect-square object-cover" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1.5">
        <p className="text-white text-[10px] font-bold m-0 truncate">{record.title}</p>
        <p className="text-white/80 text-[9px] m-0 truncate">{record.artist}</p>
        {record.highlightedTrack && (
          <p className="text-[9px] italic m-0 mt-0.5 truncate" style={{ color: '#f0b98c' }}>
            featuring "{record.highlightedTrack.title}"
          </p>
        )}
      </div>
    </div>
  )
}

// One crate card: name/description, a fanned stack of covers that opens
// into a one-at-a-time "flip through" view — click, prev/next, counter —
// echoing the crate-flip pattern already used on the main Shelf, rather
// than a flat row that doesn't read as a crate at all. For the owner,
// per-album removal lives inside the flip view (one clearly-shown album
// at a time) rather than a tiny × floating over overlapping covers.
function CrateCard({ crate, isOwnProfile, realAlbums, onOpenAlbum, onDeleteCrate, onRemoveAlbum, onAddAlbum, onSetHighlight, onClearHighlight }) {
  const [viewIndex, setViewIndex] = useState(0)
  const [hoveredPeek, setHoveredPeek] = useState(null)
  const [addingAlbum, setAddingAlbum] = useState(false)
  const [pickAlbumId, setPickAlbumId] = useState('')
  const [viewMode, setViewMode] = useState('stack')
  const [trackModalAlbum, setTrackModalAlbum] = useState(null)

  const albumIdsInCrate = new Set(crate.albums.map((a) => a.id))
  const availableToAdd = realAlbums.filter((a) => !albumIdsInCrate.has(a.id))
  const clampedIndex = Math.min(viewIndex, crate.albums.length - 1)
  const activeAlbum = crate.albums[clampedIndex] || null

  function handleConfirmAdd() {
    if (!pickAlbumId) return
    onAddAlbum(crate.id, Number(pickAlbumId))
    setPickAlbumId('')
    setAddingAlbum(false)
  }

  // Crate rows only carry id/title/artist/cover — tracklist (and every
  // other field) lives on the full album record in realAlbums, since
  // it's the user's own shelf. Used both for the tracklist modal and
  // for "View full album details" inside it.
  function handleShowTracklist(crateAlbum) {
    const full = realAlbums.find((a) => a.id === crateAlbum.id)
    setTrackModalAlbum({ ...(full || crateAlbum), highlightedTrack: crateAlbum.highlightedTrack || null })
  }

  // Optimistically patches the open modal's highlightedTrack immediately
  // rather than waiting on the parent's refetch, so the star/pick state
  // feels instant — the actual write still goes through onSetHighlight/
  // onClearHighlight, and CrateSection's refetch keeps future modal
  // opens in sync regardless.
  async function handlePickTrack(position, title) {
    if (!trackModalAlbum) return
    await onSetHighlight(crate.id, trackModalAlbum.id, position, title)
    setTrackModalAlbum((current) => (current ? { ...current, highlightedTrack: { position, title } } : current))
  }

  async function handleUnpickTrack() {
    if (!trackModalAlbum) return
    await onClearHighlight(crate.id, trackModalAlbum.id)
    setTrackModalAlbum((current) => (current ? { ...current, highlightedTrack: null } : current))
  }

  function goPrev() {
    setViewIndex((i) => (i - 1 + crate.albums.length) % crate.albums.length)
  }

  function goNext() {
    setViewIndex((i) => (i + 1) % crate.albums.length)
  }

  return (
    <div className="bg-surface border border-border rounded p-2 font-sans w-44 flex-shrink-0">
      <div className="min-w-0 flex items-center gap-1.5 mb-1">
        <p className="font-serif italic text-sm text-text m-0 truncate">{crate.name}</p>
        {isOwnProfile && !addingAlbum && (
          <button
            onClick={() => setAddingAlbum(true)}
            title="Add album to crate"
            aria-label="Add album to crate"
            className="text-accent bg-transparent border-0 cursor-pointer text-sm leading-none flex-shrink-0"
          >
            +
          </button>
        )}
      </div>
      {crate.description && <p className="text-xs text-text-muted m-0 mb-1">{crate.description}</p>}
      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-2">
        {crate.albums.length} album{crate.albums.length === 1 ? '' : 's'}
      </p>

      {crate.albums.length > 0 && (
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setViewMode('stack')}
            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border cursor-pointer ${
              viewMode === 'stack' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
            }`}
          >
            Stack
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border cursor-pointer ${
              viewMode === 'list' ? 'bg-accent text-bg border-accent' : 'bg-transparent border-border text-text-muted'
            }`}
          >
            List
          </button>
        </div>
      )}

      {crate.albums.length === 0 ? (
        <p className="text-xs text-text-faint mb-2">No albums in this crate yet.</p>
      ) : viewMode === 'list' ? (
        // Scrollable, not paginated — fits roughly 5 rows before
        // scrolling kicks in via overflow, rather than a "show more"
        // click. No truncation — full artist/title always visible,
        // wrapping to further lines rather than being cut off.
        <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto mb-3 pr-1">
          {crate.albums.map((a) => (
            <button
              key={a.crateAlbumId}
              onClick={() => handleShowTracklist(a)}
              className="text-left bg-transparent border-0 cursor-pointer p-0 hover:text-accent"
            >
              <p className="text-[11px] text-text font-bold m-0 leading-snug">{a.artist}</p>
              <p className="text-[11px] text-text-muted m-0 leading-snug">{a.title}</p>
              {a.highlightedTrack && (
                <p className="text-[10px] text-accent italic m-0 mt-0.5">
                  featuring "{a.highlightedTrack.title}"
                </p>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-3">
          {/* Same depth-peek pattern as the Shelf's Crates view — capped
              at 2 layers instead of that view's 5, since this card is
              much narrower (w-44) and more layers would either get
              cramped or force the whole card wider than it should be
              in a wrapped grid of many crates. Peek layers are
              clickable (jump straight to that record), and the front
              cover still opens the tracklist modal like before —
              nothing about the click behavior changed, only the
              browsing visual. */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={goPrev}
              disabled={crate.albums.length < 2}
              className="text-text-muted hover:text-accent bg-transparent border-0 cursor-pointer text-lg disabled:opacity-30 flex-shrink-0"
            >
              ‹
            </button>
            <div className="flex-1 relative" style={{ paddingTop: 10, paddingRight: 10 }}>
              {crate.albums.length > 2 && (
                <div
                  className="absolute rounded border border-border bg-bg overflow-hidden cursor-pointer"
                  style={{ top: 0, right: 0, width: '88%', height: '88%' }}
                  onClick={() => setViewIndex((clampedIndex + 2) % crate.albums.length)}
                  onMouseEnter={() => setHoveredPeek(2)}
                  onMouseLeave={() => setHoveredPeek((h) => (h === 2 ? null : h))}
                >
                  <img
                    src={crate.albums[(clampedIndex + 2) % crate.albums.length].imageUrl || PLACEHOLDER}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.45 }}
                  />
                  {hoveredPeek === 2 && <CratePeekPreview record={crate.albums[(clampedIndex + 2) % crate.albums.length]} />}
                </div>
              )}
              {crate.albums.length > 1 && (
                <div
                  className="absolute rounded border border-border bg-bg overflow-hidden cursor-pointer"
                  style={{ top: 5, right: 5, width: '94%', height: '94%' }}
                  onClick={() => setViewIndex((clampedIndex + 1) % crate.albums.length)}
                  onMouseEnter={() => setHoveredPeek(1)}
                  onMouseLeave={() => setHoveredPeek((h) => (h === 1 ? null : h))}
                >
                  <img
                    src={crate.albums[(clampedIndex + 1) % crate.albums.length].imageUrl || PLACEHOLDER}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.7 }}
                  />
                  {hoveredPeek === 1 && <CratePeekPreview record={crate.albums[(clampedIndex + 1) % crate.albums.length]} />}
                </div>
              )}
              <div
                onClick={() => handleShowTracklist(activeAlbum)}
                className="relative rounded overflow-hidden cursor-pointer border border-accent aspect-square"
              >
                <img src={activeAlbum.imageUrl || PLACEHOLDER} alt={activeAlbum.title} className="w-full h-full object-cover" />
              </div>
            </div>
            <button
              onClick={goNext}
              disabled={crate.albums.length < 2}
              className="text-text-muted hover:text-accent bg-transparent border-0 cursor-pointer text-lg disabled:opacity-30 flex-shrink-0"
            >
              ›
            </button>
          </div>

          <p className="text-xs text-text font-bold text-center truncate mt-1.5">{activeAlbum.title}</p>
          <p className="text-[10px] text-text-muted text-center truncate">{activeAlbum.artist}</p>
          {activeAlbum.highlightedTrack && (
            <p className="text-[10px] text-accent italic text-center truncate mt-0.5">
              featuring "{activeAlbum.highlightedTrack.title}"
            </p>
          )}
          <p className="text-[10px] text-text-faint font-mono text-center mt-1">{clampedIndex + 1} / {crate.albums.length}</p>
          {isOwnProfile && (
            <button
              onClick={() => onRemoveAlbum(activeAlbum.crateAlbumId)}
              className="text-[10px] text-text-faint bg-transparent border-0 cursor-pointer hover:text-accent block mx-auto mt-1"
            >
              Remove from crate
            </button>
          )}

          {/* Filmstrip — scan every cover in the crate at once instead
              of clicking through one at a time to see what's here. */}
          {crate.albums.length > 1 && (
            <div className="flex gap-1 overflow-x-auto mt-2 pb-1">
              {crate.albums.map((a, i) => (
                <button
                  key={a.crateAlbumId}
                  onClick={() => setViewIndex(i)}
                  aria-label={`Jump to ${a.title}`}
                  className={`flex-shrink-0 w-7 h-7 rounded overflow-hidden border cursor-pointer p-0 ${
                    i === clampedIndex ? 'border-accent' : 'border-border opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={a.imageUrl || PLACEHOLDER} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isOwnProfile && addingAlbum && (
        <div className="flex gap-2 items-center mb-2">
          <select
            value={pickAlbumId}
            onChange={(e) => setPickAlbumId(e.target.value)}
            className="flex-1 min-w-0 bg-bg border border-border text-text px-2 py-1 rounded text-xs"
          >
            <option value="">Choose an album...</option>
            {availableToAdd.map((a) => (
              <option key={a.id} value={a.id}>{a.title} — {a.artist}</option>
            ))}
          </select>
          <button onClick={handleConfirmAdd} className="text-[10px] text-accent bg-transparent border-0 cursor-pointer flex-shrink-0">Add</button>
          <button onClick={() => setAddingAlbum(false)} className="text-[10px] text-text-muted bg-transparent border-0 cursor-pointer flex-shrink-0">Cancel</button>
        </div>
      )}

      {isOwnProfile && (
        <div className="flex justify-end">
          <button
            onClick={() => onDeleteCrate(crate.id)}
            className="text-[10px] text-text-faint bg-transparent border-0 cursor-pointer hover:text-accent"
          >
            Delete
          </button>
        </div>
      )}

      <TracklistModal
        album={trackModalAlbum}
        onClose={() => setTrackModalAlbum(null)}
        onViewFull={onOpenAlbum}
        isOwnProfile={isOwnProfile}
        onHighlight={handlePickTrack}
        onClearHighlight={handleUnpickTrack}
      />
    </div>
  )
}

// Sits alongside Favorites in the identity area of the page — curated,
// named groupings of the user's own shelf ("Sunday morning jazz"),
// closer to a playlist than inventory. Gated behind isFollowing, same
// reasoning as Favorites: needs real album data a non-follower isn't
// given.
function CrateSection({ userId, isOwnProfile, realAlbums, onOpenAlbum }) {
  const [crates, setCrates] = useState([])
  const [loading, setLoading] = useState(true)
  const [creatingCrate, setCreatingCrate] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [selectedAlbumIds, setSelectedAlbumIds] = useState([])
  const [albumSearchText, setAlbumSearchText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCrates()
  }, [userId])

  async function fetchCrates() {
    setLoading(true)

    const { data: cratesData, error: cratesError } = await supabase
      .from('crates')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (cratesError) {
      console.error('Error fetching crates:', cratesError.message)
      setLoading(false)
      return
    }

    const crateIds = (cratesData || []).map((c) => c.id)
    let crateAlbumRows = []
    let highlightRows = []

    if (crateIds.length > 0) {
      const [albumsResult, highlightsResult] = await Promise.all([
        supabase
          .from('crate_albums')
          .select('id, crate_id, sort_order, albums(id, title, artist, image_url)')
          .in('crate_id', crateIds)
          .order('sort_order', { ascending: true }),
        supabase
          .from('crate_album_highlights')
          .select('crate_id, album_id, track_position, track_title')
          .in('crate_id', crateIds)
      ])

      if (albumsResult.error) {
        console.error('Error fetching crate albums:', albumsResult.error.message)
      } else {
        crateAlbumRows = albumsResult.data || []
      }

      if (highlightsResult.error) {
        console.error('Error fetching crate highlights:', highlightsResult.error.message)
      } else {
        highlightRows = highlightsResult.data || []
      }
    }

    // Keyed by "crateId-albumId" — a highlight belongs to one specific
    // crate's inclusion of an album, not the album globally.
    const highlightByKey = {}
    for (const h of highlightRows) {
      highlightByKey[`${h.crate_id}-${h.album_id}`] = { position: h.track_position, title: h.track_title }
    }

    const albumsByCrate = {}
    for (const row of crateAlbumRows) {
      if (!row.albums) continue
      if (!albumsByCrate[row.crate_id]) albumsByCrate[row.crate_id] = []
      albumsByCrate[row.crate_id].push({
        crateAlbumId: row.id,
        id: row.albums.id,
        title: row.albums.title,
        artist: row.albums.artist,
        imageUrl: row.albums.image_url,
        highlightedTrack: highlightByKey[`${row.crate_id}-${row.albums.id}`] || null
      })
    }

    setCrates((cratesData || []).map((c) => ({ ...c, albums: albumsByCrate[c.id] || [] })))
    setLoading(false)
  }

  function openCreateForm() {
    setCreatingCrate(true)
    setNameInput('')
    setDescriptionInput('')
    setSelectedAlbumIds([])
    setAlbumSearchText('')
  }

  function toggleSelectedAlbum(id) {
    setSelectedAlbumIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )
  }

  const normalizedAlbumSearch = albumSearchText.trim().toLowerCase()
  const filteredShelfAlbums = normalizedAlbumSearch
    ? realAlbums.filter(
        (a) =>
          a.title.toLowerCase().includes(normalizedAlbumSearch) ||
          a.artist.toLowerCase().includes(normalizedAlbumSearch)
      )
    : realAlbums

  async function handleCreateCrate() {
    if (!nameInput.trim() || selectedAlbumIds.length === 0) return

    setSaving(true)

    const { data: crateData, error: crateError } = await supabase
      .from('crates')
      .insert({
        user_id: userId,
        name: nameInput.trim(),
        description: descriptionInput.trim() || null,
        sort_order: crates.length
      })
      .select()
      .single()

    if (crateError || !crateData) {
      console.error('Error creating crate:', crateError?.message)
      setSaving(false)
      return
    }

    const rowsToInsert = selectedAlbumIds.map((albumId, i) => ({
      crate_id: crateData.id,
      album_id: albumId,
      sort_order: i
    }))

    const { error: caError } = await supabase.from('crate_albums').insert(rowsToInsert)
    if (caError) {
      console.error('Error adding albums to crate:', caError.message)
    }

    setSaving(false)
    setCreatingCrate(false)
    fetchCrates()
  }

  async function handleDeleteCrate(crateId) {
    const { error } = await supabase.from('crates').delete().eq('id', crateId)
    if (error) {
      console.error('Error deleting crate:', error.message)
      return
    }
    setCrates((current) => current.filter((c) => c.id !== crateId))
  }

  async function handleRemoveAlbum(crateAlbumId) {
    const { error } = await supabase.from('crate_albums').delete().eq('id', crateAlbumId)
    if (error) {
      console.error('Error removing album from crate:', error.message)
      return
    }
    setCrates((current) =>
      current.map((c) => ({ ...c, albums: c.albums.filter((a) => a.crateAlbumId !== crateAlbumId) }))
    )
  }

  async function handleAddAlbum(crateId, albumId) {
    const crate = crates.find((c) => c.id === crateId)
    const { error } = await supabase.from('crate_albums').insert({
      crate_id: crateId,
      album_id: albumId,
      sort_order: crate ? crate.albums.length : 0
    })
    if (error) {
      console.error('Error adding album to crate:', error.message)
      return
    }
    fetchCrates()
  }

  async function handleSetHighlight(crateId, albumId, trackPosition, trackTitle) {
    const { error } = await supabase.from('crate_album_highlights').upsert(
      { crate_id: crateId, album_id: albumId, track_position: trackPosition, track_title: trackTitle },
      { onConflict: 'crate_id,album_id' }
    )
    if (error) {
      console.error('Error setting track highlight:', error.message)
      return
    }
    fetchCrates()
  }

  async function handleClearHighlight(crateId, albumId) {
    const { error } = await supabase
      .from('crate_album_highlights')
      .delete()
      .eq('crate_id', crateId)
      .eq('album_id', albumId)
    if (error) {
      console.error('Error clearing track highlight:', error.message)
      return
    }
    fetchCrates()
  }

  if (loading) return null
  if (crates.length === 0 && !isOwnProfile) return null

  return (
    <div className="mb-8 font-sans">
      <div className="flex items-center justify-between mb-1">
        <div className="bg-text inline-block px-2.5 py-1">
          <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Mini-Crates</span>
        </div>
        {isOwnProfile && !creatingCrate && (
          <button
            onClick={openCreateForm}
            className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
          >
            + New crate
          </button>
        )}
      </div>
      <p className="text-xs text-text-faint mb-3">
        Curated groupings from your own shelf — like a playlist, built from records you actually own.
      </p>

      {creatingCrate && (
        <div className="bg-surface border border-border rounded p-3 mb-4">
          <input
            type="text"
            placeholder="Crate name — e.g. Sunday morning jazz"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
          />
          <textarea
            placeholder="Short description (optional)"
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            rows={2}
            className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2 resize-none"
          />
          <input
            type="text"
            placeholder="Search your shelf..."
            value={albumSearchText}
            onChange={(e) => setAlbumSearchText(e.target.value)}
            className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
          />
          <div className="max-h-52 overflow-y-auto flex flex-col gap-1 mb-2 border border-border rounded p-2">
            {filteredShelfAlbums.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAlbumIds.includes(a.id)}
                  onChange={() => toggleSelectedAlbum(a.id)}
                />
                <img src={a.imageUrl || PLACEHOLDER} alt="" className="w-6 h-6 object-cover rounded flex-shrink-0" />
                <span className="truncate">{a.title} — {a.artist}</span>
              </label>
            ))}
            {filteredShelfAlbums.length === 0 && (
              <p className="text-xs text-text-faint">No matches.</p>
            )}
          </div>
          <p className="text-[10px] text-text-faint mb-2">{selectedAlbumIds.length} selected</p>
          <div className="flex gap-2">
            <button
              onClick={handleCreateCrate}
              disabled={saving || !nameInput.trim() || selectedAlbumIds.length === 0}
              className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create crate'}
            </button>
            <button
              onClick={() => setCreatingCrate(false)}
              disabled={saving}
              className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {crates.length === 0 && !creatingCrate && (
        <p className="text-xs text-text-faint">{isOwnProfile ? 'No crates yet.' : 'No crates shared yet.'}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {crates.map((crate) => (
          <CrateCard
            key={crate.id}
            crate={crate}
            isOwnProfile={isOwnProfile}
            realAlbums={realAlbums}
            onOpenAlbum={onOpenAlbum}
            onDeleteCrate={handleDeleteCrate}
            onRemoveAlbum={handleRemoveAlbum}
            onAddAlbum={handleAddAlbum}
            onSetHighlight={handleSetHighlight}
            onClearHighlight={handleClearHighlight}
          />
        ))}
      </div>
    </div>
  )
}

export default CrateSection