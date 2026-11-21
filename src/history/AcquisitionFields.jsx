import { SOURCES } from './albumHistory'

const field = 'bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm'

// Where / when / how much. Everything is optional.
function AcquisitionFields({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  return (
    <fieldset className="border border-border rounded p-3 mb-2.5 font-sans">
      <legend className="px-1 text-[12px] text-text-muted">How did you get it? (optional)</legend>
      <div className="flex gap-2.5 items-center flex-wrap mb-2">
        <input type="date" aria-label="Date acquired" value={value.date} onChange={set('date')} className={field} />
        <select aria-label="How acquired" value={value.source} onChange={set('source')} className={field}>
          <option value="">How acquired…</option>
          {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input type="text" aria-label="Where acquired" placeholder="Where (e.g. Academy Records Annex, Brooklyn)" value={value.place} onChange={set('place')} className={`${field} flex-1 min-w-[200px]`} />
        <input type="number" min="0" step="0.01" aria-label="Price paid" placeholder="Price paid ($)" value={value.price} onChange={set('price')} className={`${field} w-36`} />
      </div>
      <input type="text" aria-label="History note" placeholder="Note (optional)" value={value.notes} onChange={set('notes')} className={`${field} w-full mb-2`} />
      <p className="m-0 text-[12px] text-text-muted">
        The price is private: only you can see it. If you leave the box below ticked, it may be included anonymously in market price statistics, never with your name or this copy.
      </p>
      <label className="flex items-center gap-2 mt-1.5 text-[12px] text-text cursor-pointer">
        <input type="checkbox" checked={value.priceInStats} onChange={set('priceInStats')} />
        Include my price in anonymous market statistics
      </label>
    </fieldset>
  )
}

export default AcquisitionFields
