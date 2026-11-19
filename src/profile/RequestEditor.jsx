import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isExpired } from './useWantRequests'

const GRADES = ['M', 'NM', 'VG+', 'VG', 'G+', 'G']

const money = (n) => `$${Number(n).toFixed(2)}`

// Set, edit, pause or remove the standing request on one Most Wanted item, and see the copies
// that match it right now. Private to the owner: sellers never see the max price, and the buyer
// pays the seller's asking price, not their max.
function RequestEditor({ item, request, matches, onSave, onRemove, onPause, onDismiss, onClose }) {
  const [maxPrice, setMaxPrice] = useState(request ? String(request.max_price) : '')
  const [minMedia, setMinMedia] = useState(request?.min_media || '')
  const [minSleeve, setMinSleeve] = useState(request?.min_sleeve || '')
  const [scope, setScope] = useState(request?.scope || 'any')
  const [discogsReleaseId, setDiscogsReleaseId] = useState(request?.discogs_release_id ? String(request.discogs_release_id) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const savedDetail = [item.label, item.pressingCountry, item.matrixNumber].filter(Boolean)
  const pressingHasNothing = scope === 'pressing' && !discogsReleaseId && savedDetail.length === 0

  async function handleSave() {
    const value = Number(maxPrice)
    if (!value || value <= 0) {
      setError('Enter the most you would pay, shipping included.')
      return
    }
    if (pressingHasNothing) {
      setError('Add a Discogs release ID, or switch to "Any copy". This item has no pressing details saved.')
      return
    }
    setSaving(true)
    setError('')
    const message = await onSave({ maxPrice: value, minMedia, minSleeve, scope, discogsReleaseId })
    setSaving(false)
    if (message) setError(message)
  }

  const inputClass = 'bg-bg border border-border text-text px-2 py-1.5 rounded text-sm'

  return (
    <div className="mt-1 mb-2 ml-7 p-3 border border-border rounded bg-bg font-sans">
      <div className="flex items-baseline justify-between mb-2">
        <p className="m-0 font-mono text-[10px] tracking-wider uppercase text-text-faint">Price alert</p>
        <button type="button" onClick={onClose} className="bg-transparent border-0 text-xs text-text-muted cursor-pointer">Close</button>
      </div>

      {request && isExpired(request) && (
        <p className="m-0 mb-2 text-xs text-[#c1666b]">This alert expired. Save to renew it for another 90 days.</p>
      )}

      <div className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 items-center text-sm">
        <label className="text-text-muted text-xs">Max, delivered</label>
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">$</span>
          <input type="number" min="1" step="1" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={`${inputClass} w-24`} />
          <span className="text-[11px] text-text-faint">price + shipping</span>
        </div>

        <label className="text-text-muted text-xs">Disc at least</label>
        <select value={minMedia} onChange={(e) => setMinMedia(e.target.value)} className={`${inputClass} w-32`}>
          <option value="">Any grade</option>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <label className="text-text-muted text-xs">Sleeve at least</label>
        <select value={minSleeve} onChange={(e) => setMinSleeve(e.target.value)} className={`${inputClass} w-32`}>
          <option value="">Any grade</option>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <label className="text-text-muted text-xs">Which copies</label>
        <div className="flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={scope === 'any'} onChange={() => setScope('any')} /> Any copy of the album</label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={scope === 'pressing'} onChange={() => setScope('pressing')} /> A specific pressing</label>
        </div>

        {scope === 'pressing' && (
          <>
            <label className="text-text-muted text-xs">Discogs release ID</label>
            <div>
              <input type="number" value={discogsReleaseId} onChange={(e) => setDiscogsReleaseId(e.target.value)} placeholder="optional" className={`${inputClass} w-32`} />
              <p className="m-0 mt-1 text-[11px] text-text-faint">
                {discogsReleaseId
                  ? 'Only copies listed as this exact release will match.'
                  : savedDetail.length
                    ? `Without one, copies must state the details saved on this item: ${savedDetail.join(' · ')}.`
                    : 'This item has no pressing details saved, so a release ID is needed.'}
              </p>
            </div>
          </>
        )}
      </div>

      {error && <p className="m-0 mt-2 text-xs text-[#c1666b]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button type="button" onClick={handleSave} disabled={saving} className="bg-text text-bg border-0 text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-60">
          {saving ? 'Saving...' : request ? 'Save alert' : 'Set alert'}
        </button>
        {request && !isExpired(request) && (
          <button type="button" onClick={() => onPause(request.active)} className="bg-transparent border border-border text-text-muted text-xs px-3 py-1.5 rounded cursor-pointer">
            {request.active ? 'Pause' : 'Resume'}
          </button>
        )}
        {request && (
          <button type="button" onClick={onRemove} className="bg-transparent border-0 text-text-faint text-xs cursor-pointer hover:text-accent">Remove alert</button>
        )}
      </div>
      <p className="m-0 mt-2 text-[11px] text-text-faint">
        Private to you. Sellers never see your max, and you pay the asking price, not your max. Alerts last 90 days.
      </p>

      {request && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="m-0 mb-1.5 text-xs text-text">
            {matches.length ? `Matching now (${matches.length})` : "Nothing matches right now. We'll notify you when a copy is listed."}
          </p>
          {matches.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-xs py-1">
              <span className="font-mono text-text">{m.listings.media_condition || '?'}/{m.listings.sleeve_condition || '?'}</span>
              <span className="text-text">{money(m.delivered_price)} delivered</span>
              <span className="text-text-faint">({money(m.listings.price)} + {m.listings.shipping_price != null ? money(m.listings.shipping_price) : '$0'} shipping)</span>
              <Link to={`/profile/${m.listings.user_id}/marketplace?listing=${m.listing_id}`} className="ml-auto text-accent no-underline">View</Link>
              <button type="button" onClick={() => onDismiss(m.id)} title="Not interested" className="bg-transparent border-0 text-text-faint cursor-pointer hover:text-accent">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RequestEditor
