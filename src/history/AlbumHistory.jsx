import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import AcquisitionFields from './AcquisitionFields'
import { EMPTY_ACQUISITION, acquisitionToEvent, addEvent, deleteEvent, eventTitle, fetchEvents, formatEventDate, hasAcquisition, sortEvents } from './albumHistory'

// Life cycle of one physical copy. Shown to its owner only for now.
function AlbumHistory({ album }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(EMPTY_ACQUISITION)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let off = false
    setLoading(true)
    fetchEvents(album.copyId).then(({ events: list, error: err }) => { if (!off) { setEvents(list); setError(err); setLoading(false) } })
    return () => { off = true }
  }, [album.copyId])

  async function save() {
    if (!hasAcquisition(draft)) { setError('Add at least a date, place or price.'); return }
    setSaving(true); setError('')
    const { event, error: err } = await addEvent({ copyId: album.copyId, albumId: album.id, userId: user.id, event: acquisitionToEvent(draft, events.length ? 'other' : 'acquired') })
    setSaving(false)
    if (err) { setError(err); return }
    setEvents((list) => sortEvents([...list, event])); setDraft(EMPTY_ACQUISITION); setAdding(false)
  }

  async function remove(id) {
    const { error: err } = await deleteEvent(id)
    if (err) { setError(err); return }
    setEvents((list) => list.filter((e) => e.id !== id))
  }

  return (
    <section className="mt-5 font-sans" aria-label="Copy history">
      <div className="flex items-center justify-between mb-2">
        <h3 className="m-0 text-sm font-semibold text-text">History of this copy</h3>
        {!adding && <button type="button" onClick={() => setAdding(true)} className="text-[12px] text-accent bg-transparent border-0 underline cursor-pointer p-0">Add entry</button>}
      </div>
      {loading && <p className="m-0 text-[12px] text-text-faint">Loading&hellip;</p>}
      {!loading && events.length === 0 && !adding && (
        <p className="m-0 text-[12px] text-text-muted">No history yet. Record where and when you got it, and what you paid. Only you can see this.</p>
      )}
      {events.length > 0 && (
        <ol className="list-none m-0 p-0 border-l border-border-strong ml-1.5">
          {events.map((e) => (
            <li key={e.id} className="relative pl-4 pb-3">
              <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-accent" />
              <p className="m-0 text-[11px] font-mono text-text-faint">{formatEventDate(e.occurred_on)}</p>
              <p className="m-0 text-[13px] text-text font-semibold">{eventTitle(e)}</p>
              {e.price != null && <p className="m-0 text-[12px] text-text-muted">Paid ${Number(e.price).toFixed(2)} <span className="text-text-faint">(private{e.price_in_stats ? '; counted anonymously in market stats' : ''})</span></p>}
              {e.notes && <p className="m-0 text-[12px] text-text-muted">{e.notes}</p>}
              <button type="button" onClick={() => remove(e.id)} aria-label="Delete history entry" className="text-[11px] text-text-faint bg-transparent border-0 underline cursor-pointer p-0">Delete</button>
            </li>
          ))}
        </ol>
      )}
      {adding && (
        <div className="mt-2">
          <AcquisitionFields value={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-sm cursor-pointer disabled:opacity-60">{saving ? 'Saving...' : 'Save entry'}</button>
            <button type="button" onClick={() => { setAdding(false); setError('') }} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-sm cursor-pointer">Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="m-0 mt-2 text-[12px] text-red-600">{error}</p>}
    </section>
  )
}

export default AlbumHistory
