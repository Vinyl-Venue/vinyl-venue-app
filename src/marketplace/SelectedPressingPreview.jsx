import { useEffect, useState } from 'react'
import { discogsPreview } from '../utils'

// One request per release, however many times the form re-renders.
const cache = new Map()

function load(id) {
  if (!cache.has(id)) cache.set(id, discogsPreview(id).then(({ preview, error }) => { if (!preview) cache.delete(id); return { preview, error } }))
  return cache.get(id)
}

const RUNOUT = /matrix|runout|etch|stamper/i

// Shown after a pressing has been chosen: its Discogs photos (click to enlarge), the
// runout text Discogs lists for it, and a link to the release. The point is for the
// user to hold their record next to it and confirm it is the same pressing.
function SelectedPressingPreview({ releaseId, details = {} }) {
  const [state, setState] = useState({ loading: true, preview: null, error: '' })
  const [open, setOpen] = useState(null) // index of the enlarged image

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, preview: null, error: '' })
    setOpen(null)
    load(releaseId).then(({ preview, error }) => { if (!cancelled) setState({ loading: false, preview, error: error || '' }) })
    return () => { cancelled = true }
  }, [releaseId])

  const images = state.preview?.images || []
  const runouts = (state.preview?.identifiers || []).filter((i) => RUNOUT.test(i.type || '') && i.value)

  useEffect(() => {
    if (open == null) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % images.length)
      if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, images.length])

  const summary = [details.year, details.country, details.label, details.catno].filter(Boolean).join(' · ')
  const traits = [details.format, details.vinylColor, details.edition].filter(Boolean).join(' · ')
  const fallback = (thumb) => (e) => {
    if (thumb && e.currentTarget.dataset.fb !== '1') { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = thumb }
  }

  return (
    <div className="mb-3 max-w-xl border border-border rounded bg-surface p-3 font-sans">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="m-0 font-mono text-[10px] tracking-wider uppercase text-text-faint">Your selected pressing</p>
          {summary && <p className="m-0 mt-0.5 text-[13px] font-semibold text-text">{summary}</p>}
          {traits && <p className="m-0 text-[12px] text-text-muted">{traits}</p>}
        </div>
        <a href={`https://www.discogs.com/release/${releaseId}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-[12px] text-accent underline">
          View on Discogs
        </a>
      </div>

      {state.loading && <p className="m-0 text-[12px] text-text-faint">Loading photos&hellip;</p>}
      {!state.loading && state.error && <p className="m-0 text-[12px] text-text-muted">{state.error}</p>}
      {!state.loading && !state.error && images.length === 0 && (
        <p className="m-0 text-[12px] text-text-muted">Discogs has no photos for this pressing, so it can&rsquo;t be compared visually. Check the label, catalogue number and runout instead.</p>
      )}

      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((im, i) => (
            <button key={i} type="button" onClick={() => setOpen(i)} aria-label={`Enlarge photo ${i + 1} of ${images.length}`} className="flex-shrink-0 p-0 border border-border rounded bg-bg cursor-pointer hover:border-accent">
              <img src={im.thumb} alt={`Photo ${i + 1} of this pressing`} className="block w-24 h-24 object-cover rounded" />
            </button>
          ))}
        </div>
      )}

      {runouts.length > 0 && (
        <div className="mt-2">
          <p className="m-0 text-[12px] text-text-muted">Runout text Discogs lists for this pressing:</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {runouts.slice(0, 6).map((r, i) => (
              <span key={i} title={r.description || r.type} className="text-[11px] font-mono border border-border-strong rounded px-1.5 py-0.5 bg-bg text-text">{r.value}</span>
            ))}
          </div>
        </div>
      )}

      {!state.loading && (
        <p className="m-0 mt-2 text-[11px] text-text-faint">Compare these photos with your sleeve and label. If they don&rsquo;t match, choose a different pressing.</p>
      )}

      {open != null && images[open] && (
        <div role="dialog" aria-modal="true" aria-label="Pressing photo" onClick={() => setOpen(null)} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-3xl w-full flex flex-col items-center gap-2">
            <img src={images[open].full || images[open].thumb} onError={fallback(images[open].thumb)} alt={`Photo ${open + 1} of ${images.length}`} className="max-h-[80vh] max-w-full object-contain rounded" />
            <div className="flex items-center gap-3 text-[13px] text-white">
              {images.length > 1 && <button type="button" onClick={() => setOpen((open - 1 + images.length) % images.length)} className="bg-transparent border border-white/60 text-white rounded px-3 py-1 cursor-pointer">Previous</button>}
              <span>{open + 1} / {images.length}</span>
              {images.length > 1 && <button type="button" onClick={() => setOpen((open + 1) % images.length)} className="bg-transparent border border-white/60 text-white rounded px-3 py-1 cursor-pointer">Next</button>}
              <button type="button" onClick={() => setOpen(null)} className="bg-white text-black border-0 rounded px-3 py-1 cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SelectedPressingPreview
