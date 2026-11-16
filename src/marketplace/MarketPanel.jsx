import { useEffect, useState } from 'react'
import { loadMarket, suggestedPriceFor, money } from './marketData'
import { scoreRarity } from './rarity'

// What the panel shows once the data is in. Kept separate from the loading so it can be tested on its own.
export function MarketView({ item, market, showSuggestion = true }) {
  const rarity = scoreRarity(item, market)
  const suggestion = showSuggestion ? suggestedPriceFor(market, item.mediaCondition) : null
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4 pt-4 border-t border-border font-sans">
      <p className="m-0 mb-2 font-mono text-[10px] tracking-wider uppercase text-text-faint">Rarity &amp; market</p>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-[11px] font-mono tracking-wider uppercase px-2 py-0.5 border" style={{ color: rarity.tier.tone, borderColor: rarity.tier.tone }}>
          {rarity.tier.label}
        </span>
        <span className="text-[13px] text-text">{rarity.score}<span className="text-text-faint">/100</span></span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="ml-auto bg-transparent border-0 p-0 text-[12px] text-accent cursor-pointer">
          {open ? 'Hide breakdown' : 'How is this scored?'}
        </button>
      </div>
      {rarity.limited && (
        <p className="m-0 mb-2 text-[12px] text-text-muted">Based on edition and age only. No Discogs numbers were available for this pressing.</p>
      )}

      {open && (
        <ul className="m-0 mb-3 p-0 list-none flex flex-col gap-1.5">
          {rarity.parts.map((p) => (
            <li key={p.key} className="text-[12px]">
              <div className="flex justify-between text-text"><span>{p.label}</span><span className="text-text-muted">{p.points} / {p.max}</span></div>
              <div className="h-1 bg-border rounded mt-0.5"><div className="h-1 rounded bg-accent" style={{ width: `${(p.points / p.max) * 100}%` }} /></div>
              <div className="text-text-muted mt-0.5">{p.note}</div>
            </li>
          ))}
        </ul>
      )}

      {market && (market.lowest_price != null || market.num_for_sale != null || suggestion != null) && (
        <dl className="m-0 grid grid-cols-[150px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          {suggestion != null && (<><dt className="text-text-muted">Suggested price ({item.mediaCondition})</dt><dd className="m-0 text-text font-bold">{money(suggestion, market.currency)}</dd></>)}
          {market.lowest_price != null && (<><dt className="text-text-muted">Lowest ask on Discogs</dt><dd className="m-0 text-text">{money(market.lowest_price, market.currency)}</dd></>)}
          {market.num_for_sale != null && (<><dt className="text-text-muted">Copies for sale</dt><dd className="m-0 text-text">{market.num_for_sale}</dd></>)}
        </dl>
      )}
      {market && (
        <p className="m-0 mt-2 text-[11px] text-text-faint">Discogs data, refreshed daily. Prices are a guide, not a guarantee.</p>
      )}
    </div>
  )
}

// Fetches the market snapshot for the pressing, then renders it. Shows rarity
// from the item's own numbers while the market data loads (or if it never does).
function MarketPanel({ item, showSuggestion = true }) {
  const [market, setMarket] = useState(null)
  const id = item?.discogsReleaseId

  useEffect(() => {
    let cancelled = false
    setMarket(null)
    if (id) loadMarket(id).then((m) => { if (!cancelled) setMarket(m) })
    return () => { cancelled = true }
  }, [id])

  // Nothing identifies this pressing on Discogs, so there is nothing trustworthy to show.
  if (!id) return null
  return <MarketView item={item} market={market} showSuggestion={showSuggestion} />
}

export default MarketPanel

// Shown under the Price field when listing: a Discogs-based starting price the seller can accept with one tap.
export function PriceSuggestion({ item, onUse }) {
  const [market, setMarket] = useState(null)
  const id = item?.discogsReleaseId
  useEffect(() => {
    let cancelled = false
    setMarket(null)
    if (id) loadMarket(id).then((m) => { if (!cancelled) setMarket(m) })
    return () => { cancelled = true }
  }, [id])
  if (!id || !market) return null
  return <PriceSuggestionView item={item} market={market} onUse={onUse} />
}

export function PriceSuggestionView({ item, market, onUse }) {
  const suggested = suggestedPriceFor(market, item.mediaCondition)
  const value = suggested ?? market.lowest_price
  if (value == null) return null
  const label = suggested != null ? `Suggested: ${money(value, market.currency)} for ${item.mediaCondition} (Discogs)` : `Lowest ask on Discogs: ${money(value, market.currency)}`
  return (
    <div className="flex items-center gap-2 mb-2.5 text-[12px] text-text-muted">
      <span>{label}</span>
      <button type="button" onClick={() => onUse(Number(value).toFixed(2))} className="bg-transparent border border-border text-accent px-2 py-0.5 rounded text-[12px] cursor-pointer">Use</button>
    </div>
  )
}
