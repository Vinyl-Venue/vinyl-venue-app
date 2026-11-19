import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { sleeveFactor, conditionFactor, sleevePenaltyText } from './conditionFactors'
import { loadMarket, loadPressingPrice, loadVenueIndex, loadVenueBreakdown, checkIsAdmin, suggestedPriceFor, money, loadGradeStats, gradeRow, venueArgs } from './marketData'
import { scoreRarity } from './rarity'
import GradePriceTable from './GradePriceTable'

// What the panel shows once the data is in. Kept separate from the loading so it can be tested on its own.
const VENUE_TONES = { Hot: '#c1666b', Rising: '#b8863b', Steady: '#4f7a56', Quiet: '#8a8a8a' }

// Admin-only: every input and point behind the Venue Index. The data itself only comes back for admins.
function VenueBreakdown({ data }) {
  if (!data) return <p className="m-0 mt-2 text-[12px] text-text-muted">Breakdown unavailable.</p>
  const i = data.inputs || {}
  return (
    <div className="mt-2 p-3 border border-dashed border-border-strong rounded text-[12px]">
      <p className="m-0 mb-2 font-mono text-[10px] tracking-wider uppercase text-text-faint">Admin only &middot; how this is calculated</p>
      <ul className="m-0 mb-2 p-0 list-none flex flex-col gap-1.5">
        {(data.parts || []).map((p) => (
          <li key={p.key}>
            <div className="flex justify-between text-text"><span>{p.label}</span><span className="text-text-muted">{p.points == null ? 'not scored' : `${p.points} / ${p.max}`}</span></div>
            <div className="text-text-muted">{p.note}</div>
          </li>
        ))}
      </ul>
      <p className="m-0 mb-1 text-text-muted">
        Raw {i.raw_score} &rarr; score {data.score}. Each record is weighted by how much pressing detail it carries (average detail {i.avg_detail}, information factor {i.info_factor}). With thin detail the score is pulled toward a neutral 40: 40 + (raw &minus; 40) &times; factor. Confidence {data.confidence}.
      </p>
      <p className="m-0 text-text-muted">
        Compared against {i.pressings_compared} pressings &middot; owner percentile {i.owner_percentile} &middot; demand percentile {i.demand_percentile}.
      </p>
      <p className="m-0 text-text-muted">
        Community {i.community} &middot; owners {i.owners} (weighted {i.owners_weighted}) &middot; wants for album {i.wants_for_album}, matching this pressing {i.wants_matching_pressing} (weighted {i.weighted_wants}) &middot; sales 12m {i.sales_12m} &middot; Discogs lowest {i.discogs_lowest ?? 'n/a'}.
      </p>
    </div>
  )
}

export function MarketView({ item, market, showSuggestion = true, venue = null, isAdmin = false, breakdown = null, gradeStats = null }) {
  const rarity = scoreRarity(item, market)
  const suggestion = showSuggestion ? suggestedPriceFor(market, item.mediaCondition, item.sleeveCondition) : null
  const sleeveNote = sleevePenaltyText(item.sleeveCondition)
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
      {venue && (
        <div className="flex items-center gap-3 mb-2">
          {venue.enough ? (
            <>
              <span className="text-[11px] font-mono tracking-wider uppercase px-2 py-0.5 border" style={{ color: VENUE_TONES[venue.tier], borderColor: VENUE_TONES[venue.tier] }}>Venue: {venue.tier}</span>
              <span className="text-[13px] text-text">{venue.score}<span className="text-text-faint">/100</span></span>
              <span className="text-[12px] text-text-muted">based on member activity</span>
            </>
          ) : (
            <span className="text-[12px] text-text-muted">Venue Index: not enough member activity yet.</span>
          )}
        </div>
      )}
      {isAdmin && venue && <VenueBreakdown data={breakdown} />}
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
          {suggestion != null && (<><dt className="text-text-muted">Suggested price ({item.mediaCondition}{item.sleeveCondition ? `, sleeve ${item.sleeveCondition}` : ''})</dt><dd className="m-0 text-text font-bold">{money(suggestion, market.currency)}{sleeveNote && <span className="font-normal text-text-faint"> · sleeve {sleeveNote}</span>}</dd></>)}
          {market.lowest_price != null && (<><dt className="text-text-muted">Lowest ask on Discogs</dt><dd className="m-0 text-text">{money(market.lowest_price, market.currency)}</dd></>)}
          {market.num_for_sale != null && (<><dt className="text-text-muted">Copies for sale</dt><dd className="m-0 text-text">{market.num_for_sale}</dd></>)}
        </dl>
      )}
      {market && (
        <p className="m-0 mt-2 text-[11px] text-text-faint">Discogs data, refreshed daily. Prices are a guide, not a guarantee.</p>
      )}
      {gradeStats && <GradePriceTable stats={gradeStats} highlightGrade={item.mediaCondition} sleeveGrade={item.sleeveCondition} />}
    </div>
  )
}

// Fetches the market snapshot for the pressing, then renders it. Shows rarity
// from the item's own numbers while the market data loads (or if it never does).
function MarketPanel({ item, showSuggestion = true }) {
  const { user } = useAuth()
  const [market, setMarket] = useState(null)
  const [venue, setVenue] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [breakdown, setBreakdown] = useState(null)
  const [gradeStats, setGradeStats] = useState(null)
  const id = item?.discogsReleaseId

  useEffect(() => {
    let cancelled = false
    setMarket(null); setVenue(null); setBreakdown(null); setGradeStats(null)
    if (id) {
      // Grade stats read the Discogs cache, so load them after the market call has refreshed it.
      loadMarket(id).then((m) => {
        if (cancelled) return
        setMarket(m)
        loadGradeStats(id).then((g) => { if (!cancelled) setGradeStats(g) })
      })
    }
    loadVenueIndex(item).then((v) => { if (!cancelled) setVenue(v) })
    return () => { cancelled = true }
  }, [id, item?.title, item?.artist, item?.catalogNumber])

  // The breakdown is only requested for admins, and the database refuses everyone else regardless.
  useEffect(() => {
    let cancelled = false
    setIsAdmin(false)
    checkIsAdmin(user?.id).then((ok) => {
      if (cancelled || !ok) return
      setIsAdmin(true)
      loadVenueBreakdown(item).then((b) => { if (!cancelled) setBreakdown(b) })
    })
    return () => { cancelled = true }
  }, [user?.id, id, item?.title, item?.artist, item?.catalogNumber])

  // Without a Discogs release there is no market or rarity to show, but a pressing identified by
  // its catalogue number still gets a Venue Index (member activity only).
  if (!id) {
    if (!venueArgs(item) || !venue) return null
    return (
      <div className="mt-4 pt-4 border-t border-border font-sans">
        <p className="m-0 mb-2 font-mono text-[10px] tracking-wider uppercase text-text-faint">Venue Index</p>
        <div className="flex items-center gap-3 mb-2">
          {venue.enough ? (
            <>
              <span className="text-[11px] font-mono tracking-wider uppercase px-2 py-0.5 border" style={{ color: VENUE_TONES[venue.tier], borderColor: VENUE_TONES[venue.tier] }}>Venue: {venue.tier}</span>
              <span className="text-[13px] text-text">{venue.score}<span className="text-text-faint">/100</span></span>
              <span className="text-[12px] text-text-muted">based on member activity</span>
            </>
          ) : (
            <span className="text-[12px] text-text-muted">Venue Index: not enough member activity yet.</span>
          )}
        </div>
        {isAdmin && <VenueBreakdown data={breakdown} />}
      </div>
    )
  }
  return <MarketView item={item} market={market} showSuggestion={showSuggestion} venue={venue} isAdmin={isAdmin} breakdown={breakdown} gradeStats={gradeStats} />
}

export default MarketPanel

// Shown under the Price field when listing: a Discogs-based starting price the seller can accept with one tap.
export function PriceSuggestion({ item, onUse }) {
  const [market, setMarket] = useState(null)
  const [platform, setPlatform] = useState(null)
  const [gradeStats, setGradeStats] = useState(null)
  const id = item?.discogsReleaseId
  useEffect(() => {
    let cancelled = false
    setMarket(null); setPlatform(null); setGradeStats(null)
    if (id) {
      loadMarket(id).then((m) => { if (!cancelled) setMarket(m) })
      loadPressingPrice(id).then((p) => { if (!cancelled) setPlatform(p) })
      loadGradeStats(id).then((g) => { if (!cancelled) setGradeStats(g) })
    }
    return () => { cancelled = true }
  }, [id])
  if (!id || (!market && !gradeStats)) return null
  return <PriceSuggestionView item={item} market={market} platform={platform} gradeStats={gradeStats} onUse={onUse} />
}

export function PriceSuggestionView({ item, market, platform = null, gradeStats = null, onUse }) {
  // Best anchor first: this pressing at this grade here (item price, so shipping is set separately),
  // then the all-grades average here, then Discogs' grade suggestion, then the lowest ask.
  const suggested = suggestedPriceFor(market, item.mediaCondition, item.sleeveCondition)
  const row = gradeRow(gradeStats, item.mediaCondition)
  const sf = sleeveFactor(item.sleeveCondition)
  const sleeveNote = sleevePenaltyText(item.sleeveCondition)
  let value = null
  let label = ''
  if (row && row.sales > 0 && row.estimate_item != null) {
    value = row.estimate_item * sf
    label = `Suggested: ${money(value, 'USD')} for ${row.grade}${sleeveNote ? ` with a ${item.sleeveCondition} sleeve (${sleeveNote})` : ''} (${row.sales} sale${row.sales === 1 ? '' : 's'} at this grade here, ${row.confidence} confidence; before shipping)`
  } else if (platform?.avg_sold != null) {
    value = platform.avg_sold * conditionFactor(item.mediaCondition, item.sleeveCondition)
    label = `Suggested: ${money(value, 'USD')} (avg of ${platform.sales} sales of this pressing here, adjusted to this copy's disc and sleeve grades)`
  } else if (suggested != null) {
    value = suggested
    label = `Suggested: ${money(value, market?.currency)} for ${item.mediaCondition}${sleeveNote ? ` with a ${item.sleeveCondition} sleeve (${sleeveNote})` : ''} (Discogs)`
  } else if (market?.lowest_price != null) {
    value = market.lowest_price
    label = `Lowest ask on Discogs: ${money(value, market.currency)}`
  }
  if (value == null) return null
  return (
    <div className="flex items-center gap-2 mb-2.5 text-[12px] text-text-muted">
      <span>{label}</span>
      <button type="button" onClick={() => onUse(Number(value).toFixed(2))} className="bg-transparent border border-border text-accent px-2 py-0.5 rounded text-[12px] cursor-pointer">Use</button>
    </div>
  )
}
