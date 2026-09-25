const PLACEHOLDER = "https://placehold.co/56x56/1c1a15/1c1a15"

const CONDITIONS = ['', 'M', 'NM', 'VG+', 'VG', 'G+', 'G', 'P']

const fieldClass = "bg-bg border border-border text-text px-2 py-1 rounded text-xs"

// One row in the optional "add more details" step that follows the main
// Scan Crate review. By this point every row has already been resolved
// (matched or manually confirmed) — this step is purely additive: sleeve/
// media condition and, optionally, listing it for sale/trade/both. Photos
// of the actual copy aren't captured here on purpose — that stays a
// per-listing action via ListingPhotoUploader once the album is confirmed
// and has a real listing id, rather than bolting a second multi-file
// upload flow onto an already-dense bulk table.
function ScanCrateDetailRow({ item, onFieldChange }) {
  const wantsTradeInfo = item.listingType === 'trade' || item.listingType === 'fixed_or_trade'
  const wantsPrice = item.listingType === 'fixed' || item.listingType === 'fixed_or_trade'

  return (
    <div className="bg-surface border border-border rounded p-3 font-sans">
      <div className="flex gap-3 mb-2">
        <img
          src={item.enriched?.coverImageUrl || PLACEHOLDER}
          alt=""
          className="w-14 h-14 object-cover rounded flex-shrink-0 bg-bg"
        />
        <div className="min-w-0">
          <p className="text-sm text-text font-bold m-0 truncate">{item.title}</p>
          <p className="text-xs text-text-muted m-0 truncate">{item.artist}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wide text-text-faint block mb-0.5">Sleeve</label>
          <select
            value={item.sleeveCondition}
            onChange={(e) => onFieldChange(item.key, 'sleeveCondition', e.target.value)}
            className={`${fieldClass} w-full`}
          >
            {CONDITIONS.map((c) => <option key={c} value={c}>{c || '—'}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wide text-text-faint block mb-0.5">Media</label>
          <select
            value={item.mediaCondition}
            onChange={(e) => onFieldChange(item.key, 'mediaCondition', e.target.value)}
            className={`${fieldClass} w-full`}
          >
            {CONDITIONS.map((c) => <option key={c} value={c}>{c || '—'}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wide text-text-faint block mb-0.5">List as</label>
          <select
            value={item.listingType}
            onChange={(e) => onFieldChange(item.key, 'listingType', e.target.value)}
            className={`${fieldClass} w-full`}
          >
            <option value="none">Not listed</option>
            <option value="fixed">For sale</option>
            <option value="trade">Trade only</option>
            <option value="fixed_or_trade">Sale or trade</option>
          </select>
        </div>
      </div>

      {wantsPrice && (
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Price ($)"
          value={item.price}
          onChange={(e) => onFieldChange(item.key, 'price', e.target.value)}
          className={`${fieldClass} w-full mb-2`}
        />
      )}

      {wantsTradeInfo && (
        <input
          type="text"
          placeholder="What would you accept in trade?"
          value={item.tradePreference}
          onChange={(e) => onFieldChange(item.key, 'tradePreference', e.target.value)}
          className={`${fieldClass} w-full`}
        />
      )}
    </div>
  )
}

export default ScanCrateDetailRow