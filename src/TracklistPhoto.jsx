import { useRef, useState } from 'react'
import { readTracklistFromPhoto, cleanTracks } from './readTracklist'

// "Take a photo of the track list": read it off the sleeve or centre label, let the person
// fix anything the camera misread, then save. Nothing is saved until they confirm.
function TracklistPhoto({ onSave }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setError(''); setNote('')
    const { tracks, note: n, error: err } = await readTracklistFromPhoto(file)
    setBusy(false)
    if (err) { setError(err); return }
    if (tracks.length === 0) { setError(n || 'No track list could be read from that photo. Try again in better light, closer to the text.'); return }
    setRows(tracks); setNote(n || '')
  }

  const edit = (i, k) => (e) => setRows((list) => list.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)))

  async function save() {
    const tracks = cleanTracks(rows)
    if (tracks.length === 0) { setError('Add at least one track.'); return }
    setSaving(true); setError('')
    const result = await onSave(tracks)
    setSaving(false)
    if (result && result.ok === false) { setError(result.error || 'Could not save.'); return }
    setRows(null)
  }

  const field = 'bg-surface border border-border text-text px-2 py-1 rounded font-sans text-sm'

  if (rows) {
    return (
      <div className="font-sans mt-2">
        <p className="m-0 mb-1 text-sm text-text">Check the track list</p>
        <p className="m-0 mb-2 text-[12px] text-text-muted">Read from your photo. Fix anything that looks wrong before saving.</p>
        {note && <p className="m-0 mb-2 text-[12px] text-text-muted">Note: {note}</p>}
        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input aria-label={`Position ${i + 1}`} value={r.position} onChange={edit(i, 'position')} className={`${field} w-14`} />
              <input aria-label={`Title ${i + 1}`} value={r.title} onChange={edit(i, 'title')} className={`${field} flex-1 min-w-0`} />
              <input aria-label={`Duration ${i + 1}`} value={r.duration} onChange={edit(i, 'duration')} placeholder="m:ss" className={`${field} w-16`} />
              <button type="button" aria-label={`Remove track ${i + 1}`} onClick={() => setRows((l) => l.filter((_, j) => j !== i))} className="bg-transparent border-0 text-text-faint cursor-pointer text-lg leading-none">&times;</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows((l) => [...l, { position: '', title: '', duration: '' }])} className="mt-1.5 bg-transparent border-0 p-0 text-[12px] text-accent underline cursor-pointer">Add a track</button>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={save} disabled={saving} className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-sm cursor-pointer disabled:opacity-60">{saving ? 'Saving...' : 'Save track list'}</button>
          <button type="button" onClick={() => { setRows(null); setError('') }} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-sm cursor-pointer">Cancel</button>
        </div>
        {error && <p role="alert" className="m-0 mt-2 text-[12px] text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="font-sans mt-2">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" aria-label="Photo of the track list" />
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="w-full bg-transparent border border-border text-text-muted px-2 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent disabled:opacity-60">
        {busy ? 'Reading the photo...' : 'Take a photo of the track list (sleeve or centre label)'}
      </button>
      {error && <p role="alert" className="m-0 mt-2 text-[12px] text-text-muted">{error}</p>}
    </div>
  )
}

export default TracklistPhoto
