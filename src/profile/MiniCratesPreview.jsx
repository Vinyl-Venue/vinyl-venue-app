import { useState, useEffect } from 'react'
import CrateViewer from './CrateViewer'
import { supabase } from '../supabaseClient'

// Read-only preview of a collector's Mini-crates: six crates, three covers
// each. The full crate manager (create, reorder, highlights) is CrateSection,
// reached through "View all".
function MiniCratesPreview({ userId, isOwnProfile, onViewAll, onOpenAlbum, reloadKey = 0 }) {
  const [crates, setCrates] = useState(null)
  const [openCrateId, setOpenCrateId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: crateRows, error } = await supabase
        .from('crates')
        .select('id, name')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Error loading crates:', error.message)
        if (!cancelled) setCrates([])
        return
      }

      const ids = (crateRows || []).map((c) => c.id)
      let albumRows = []
      if (ids.length > 0) {
        const { data } = await supabase
          .from('crate_albums')
          .select('crate_id, sort_order, albums(id, title, artist, year, image_url)')
          .in('crate_id', ids)
          .order('sort_order', { ascending: true })
        albumRows = data || []
      }

      const byCrate = {}
      for (const row of albumRows) {
        if (!byCrate[row.crate_id]) byCrate[row.crate_id] = []
        if (row.albums) byCrate[row.crate_id].push(row.albums)
      }

      if (!cancelled) {
        setCrates((crateRows || []).map((c) => ({ ...c, albums: byCrate[c.id] || [] })))
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, reloadKey])

  if (crates === null) return <div />

  const openCrate = openCrateId ? crates.find((c) => c.id === openCrateId) : null

  const heading = (
    <div className="flex flex-col gap-1 lg:col-start-2 lg:row-start-1">
      <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight">Mini-crates</h2>
      <div className="flex items-baseline gap-3 text-[13px] leading-snug">
        {openCrate ? (
          <>
            <button onClick={() => setOpenCrateId(null)} className="text-accent bg-transparent border-0 p-0 cursor-pointer text-[13px]">← All crates</button>
            <span className="text-text-muted truncate">{openCrate.name}</span>
          </>
        ) : (
          <>
            <span className="text-text-muted">
              {crates.length > 0 ? `${crates.length} crate${crates.length === 1 ? '' : 's'}` : 'Playlist-style crates from the shelf'}
            </span>
            {crates.length > 0 && (
              <button onClick={onViewAll} className="text-accent bg-transparent border-0 p-0 cursor-pointer text-[13px]">View all</button>
            )}
          </>
        )}
      </div>
    </div>
  )

  if (crates.length === 0) {
    return (
      <>
        {heading}
        <div className="lg:col-start-2 lg:row-start-2 border border-dashed border-border-strong flex flex-col items-center justify-center gap-2.5 p-6 text-center">
          {isOwnProfile ? (
            <>
              <div className="font-serif italic text-xl">No crates yet</div>
              <div className="text-sm text-text-muted">Group albums from your shelf into themes like Rainy day or Dinner party.</div>
              <button onClick={onViewAll} className="min-h-11 px-5 bg-surface text-text border border-border-strong text-sm cursor-pointer">Make a crate</button>
            </>
          ) : (
            <div className="text-sm text-text-muted">No crates shared yet.</div>
          )}
        </div>
      </>
    )
  }

  if (openCrate) {
    return (
      <>
        {heading}
        <CrateViewer
          key={openCrate.id}
          crate={openCrate}
          onOpenAlbum={onOpenAlbum}
          onManage={isOwnProfile ? onViewAll : undefined}
        />
      </>
    )
  }

  return (
    <>
      {heading}
      <div className="lg:col-start-2 lg:row-start-2 lg:self-start grid grid-cols-2 gap-x-3 gap-y-5 content-start">
        {crates.slice(0, 6).map((crate) => (
          <div key={crate.id} className="flex flex-col gap-2 min-w-0">
            <div className="flex gap-1 overflow-x-auto pb-1.5 [scrollbar-width:thin]">
              {crate.albums.length === 0 && <div className="w-full aspect-[3/1] bg-border" />}
              {crate.albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => onOpenAlbum && onOpenAlbum(album.id)}
                  title={`${album.title} — ${album.artist}`}
                  className="shrink-0 basis-[calc((100%-0.5rem)/3)] aspect-square bg-border bg-cover bg-center border-0 p-0 cursor-pointer"
                  style={{ backgroundImage: album.image_url ? `url(${album.image_url})` : undefined }}
                />
              ))}
            </div>
            <button
              onClick={() => setOpenCrateId(crate.id)}
              className="flex flex-col gap-0.5 bg-transparent border-0 p-0 text-left cursor-pointer min-w-0"
            >
              <span className="text-[13px] font-semibold truncate">{crate.name}</span>
              <span className="text-xs text-text-muted">{crate.albums.length} record{crate.albums.length === 1 ? '' : 's'}</span>
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

export default MiniCratesPreview
