import { useRef, useState } from 'react'
import { readTracklistFromPhoto, cleanTracks, resolveSide, withSide, nextFreeSide, duplicateSides, flattenGroups, SIDES } from './readTracklist'

let groupSeq = 0

// "Add the track list from photos": one photo per sleeve back or centre label. Double albums,
// box sets and anything with several discs or sides just need one photo each. Every photo becomes
// a group with its own side, the person fixes anything misread, and nothing is saved until they confirm.
function TracklistPhoto({ onSave }) {
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const [busy, setBusy] = useState('')
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleFiles(e) {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (files.length === 0) return
    setError('')
    const problems = []
    let current = groups
    for (let i = 0; i < files.length; i += 1) {
      setBusy(files.length > 1 ? `Reading photo ${i + 1} of ${files.length}...` : 'Reading the photo...')
      const { tracks, side, disc, note, error: err } = await readTracklistFromPhoto(files[i])
      if (err) { problems.push(`Photo ${i + 1}: ${err}`); continue }
      if (tracks.length === 0) { problems.push(`Photo ${i + 1}: ${note || 'no track list could be read.'}`); continue }
      const resolved = resolveSide(side, disc) || nextFreeSide(current)
      current = [...current, { id: ++groupSeq, side: resolved, tracks: withSide(tracks, resolved), note: note || '' }]
      setGroups(current)
    }
    setBusy('')
    if (problems.length) setError(problems.join(' '))
  }

  const updateGroup = (id, fn) => setGroups((list) => list.map((g) => (g.id === id ? fn(g) : g)))
  const editRow = (id, i, k) => (e) => updateGroup(id, (g) => ({ ...g, tracks: g.tracks.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)) }))
  const changeSide = (id) => (e) => updateGroup(id, (g) => ({ ...g, side: e.target.value || null, tracks: withSide(g.tracks, e.target.value || null) }))

  async function save() {
    const tracks = cleanTracks(flattenGroups(groups))
    if (tracks.length === 0) { setError('Add at least one track.'); return }
    setSaving(true); setError('')
    const result = await onSave(tracks)
    setSaving(false)
    if (result && result.ok === false) { setError(result.error || 'Could not save.'); return }
    setGroups([])
  }

  const field = 'bg-surface border border-border text-text px-2 py-1 rounded font-sans text-sm'
  const dups = duplicateSides(groups)
  const total = groups.reduce((n, g) => n + g.tracks.length, 0)

  const pickers = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFiles} className="hidden" aria-label="Take a photo of the track list" />
      <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" aria-label="Choose photos of the track list" />
    </>
  )

  if (groups.length > 0) {
    return (
      <div className="font-sans mt-2">
        {pickers}
        <p className="m-0 mb-1 text-sm text-text">Check the track list ({total} tracks from {groups.length} {groups.length === 1 ? 'photo' : 'photos'})</p>
        <p className="m-0 mb-2 text-[12px] text-text-muted">Read from your photos. Check each side letter and fix anything that looks wrong. Add one photo for every other side or disc.</p>
        {dups.length > 0 && <p role="alert" className="m-0 mb-2 text-[12px] text-red-600">Side {dups.join(', ')} appears more than once. Change a side or remove the extra photo.</p>}
        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
          {groups.map((g, gi) => (
            <div key={g.id} className="border border-border rounded p-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] text-text-muted">Photo {gi + 1}</span>
                <label className="text-[12px] text-text-muted flex items-center gap-1">Side
                  <select aria-label={`Side for photo ${gi + 1}`} value={g.side || ''} onChange={changeSide(g.id)} className={`${field} py-0.5`}>
                    <option value="">?</option>
                    {SIDES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => setGroups((l) => l.filter((x) => x.id !== g.id))} className="ml-auto bg-transparent border-0 p-0 text-[12px] text-text-faint underline cursor-pointer">Remove photo</button>
              </div>
              {g.note && <p className="m-0 mb-1.5 text-[12px] text-text-muted">Note: {g.note}</p>}
              <div className="flex flex-col gap-1.5">
                {g.tracks.map((r, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <input aria-label={`Position ${gi + 1}.${i + 1}`} value={r.position} onChange={editRow(g.id, i, 'position')} className={`${field} w-14`} />
                    <input aria-label={`Title ${gi + 1}.${i + 1}`} value={r.title} onChange={editRow(g.id, i, 'title')} className={`${field} flex-1 min-w-0`} />
                    <input aria-label={`Duration ${gi + 1}.${i + 1}`} value={r.duration} onChange={editRow(g.id, i, 'duration')} placeholder="m:ss" className={`${field} w-16`} />
                    <button type="button" aria-label={`Remove track ${gi + 1}.${i + 1}`} onClick={() => updateGroup(g.id, (x) => ({ ...x, tracks: x.tracks.filter((_, j) => j !== i) }))} className="bg-transparent border-0 text-text-faint cursor-pointer text-lg leading-none">&times;</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => updateGroup(g.id, (x) => ({ ...x, tracks: [...x.tracks, { position: x.side ? `${x.side}${x.tracks.length + 1}` : '', title: '', duration: '' }] }))} className="mt-1.5 bg-transparent border-0 p-0 text-[12px] text-accent underline cursor-pointer">Add a track</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <button type="button" disabled={!!busy} onClick={() => cameraRef.current?.click()} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-sm cursor-pointer hover:border-accent hover:text-accent disabled:opacity-60">Take another photo</button>
          <button type="button" disabled={!!busy} onClick={() => galleryRef.current?.click()} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-sm cursor-pointer hover:border-accent hover:text-accent disabled:opacity-60">Choose more photos</button>
        </div>
        {busy && <p className="m-0 mt-2 text-[12px] text-text-muted">{busy}</p>}
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={save} disabled={saving || !!busy || dups.length > 0} className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-sm cursor-pointer disabled:opacity-60">{saving ? 'Saving...' : 'Save track list'}</button>
          <button type="button" onClick={() => { setGroups([]); setError('') }} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-sm cursor-pointer">Cancel</button>
        </div>
        {error && <p role="alert" className="m-0 mt-2 text-[12px] text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="font-sans mt-2">
      {pickers}
      <div className="flex gap-2">
        <button type="button" disabled={!!busy} onClick={() => cameraRef.current?.click()} className="flex-1 bg-transparent border border-border text-text-muted px-2 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent disabled:opacity-60">
          {busy || 'Take a photo of the track list'}
        </button>
        <button type="button" disabled={!!busy} onClick={() => galleryRef.current?.click()} className="flex-1 bg-transparent border border-border text-text-muted px-2 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent disabled:opacity-60">
          Choose photos
        </button>
      </div>
      <p className="m-0 mt-1 text-[11px] text-text-faint">Sleeve back or centre label. Double albums and box sets: add one photo per side or disc.</p>
      {error && <p role="alert" className="m-0 mt-2 text-[12px] text-text-muted">{error}</p>}
    </div>
  )
}

export default TracklistPhoto
