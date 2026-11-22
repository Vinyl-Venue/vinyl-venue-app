import { useState } from 'react'
import { money } from './marketData'
import { sleevePenaltyText } from './conditionFactors'

const CONFIDENCE = {
  high: { label: 'High', tone: '#4f7a56' },
  medium: { label: 'Medium', tone: '#b8863b' },
  low: { label: 'Low', tone: '#c1666b' },
  none: { label: 'Discogs only', tone: '#8a8a8a' }
}

const DIRECTION = { up: 'trending up', down: 'trending down', flat: 'steady' }

// One line on what is pushing this pressing's price. Everyone sees the direction and size;
// only admins get the breakdown (the database sends it to them alone).
function SignalLine({ signal }) {
  if (!signal || signal.confidence === 'none') return null
  const pct = Number(signal.adjustment_pct) || 0
  const size = pct === 0 ? '' : ` (${pct > 0 ? '+' : ''}${pct}% on the estimates)`
  return (
    <p className="m-0 mb-1.5 text-[11px] text-text-muted">
      Demand and speed of sale: {DIRECTION[signal.direction] || 'steady'}{size}. Confidence: {signal.confidence}.
    </p>
  )
}

function SignalBreakdown({ signal }) {
  const b = signal?.breakdown
  if (!b) return null
  const row = (label, v) => <p className="m-0"><span className="text-text">{label}</span>: {v == null ? 'not enough data' : v}</p>
  return (
    <div className="mt-1.5 text-[11px] text-text-muted flex flex-col gap-1">
      <p className="m-0 font-mono text-[10px] tracking-wider uppercase text-text-faint">Price signal breakdown (admin)</p>
      {row('Demand against supply', b.demand_score)}
      {row('Speed of sale', b.speed_score)}
      {row('Sell-through', b.sell_through_score)}
      {row('Price cuts before sale', b.price_cut_score)}
      <p className="m-0">Blend {b.blend} on weights {b.weights_used}; capped at ±10%. Effective wanters {b.demand?.effective_wanters} (direct {b.demand?.direct}, shared {b.demand?.shared}), {b.speed?.active_listings} active listing(s), median {b.speed?.median_days_to_sell ?? 'n/a'} days to sell, sell-through {b.speed?.sell_through_pct ?? 'n/a'}%.</p>
    </div>
  )
}

const TREND = { faster: 'selling faster than it was six months ago', slower: 'selling slower than it was six months ago', steady: 'selling at about the same pace as six months ago' }

function days(n) {
  const v = Number(n)
  return v < 1 ? 'under a day' : `${Math.round(v)} day${Math.round(v) === 1 ? '' : 's'}`
}

// How fast this pressing sells here. Aggregates only, and nothing shows until it rests on 3 or more sales.
function SalesSpeed({ speed }) {
  if (!speed || !speed.enough) return null
  const lines = [
    `Median time to sell: ${days(speed.median_days_to_sell)}${speed.fastest_days != null ? ` (fastest ${days(speed.fastest_days)}${speed.slowest_days != null ? `, slowest ${days(speed.slowest_days)}` : ''})` : ''}.`,
    speed.sell_through_pct != null ? `${speed.sell_through_pct}% of listings end in a sale; the rest are withdrawn or cancelled.` : null,
    speed.speed_trend ? `Lately ${TREND[speed.speed_trend]}.` : null,
    speed.median_final_vs_first_ask_pct != null ? `Sells for ${Math.abs(speed.median_final_vs_first_ask_pct) < 0.5 ? 'the asking price' : `${Math.abs(speed.median_final_vs_first_ask_pct)}% ${speed.median_final_vs_first_ask_pct < 0 ? 'below' : 'above'} the first asking price`}, typically.` : null,
    speed.active_listings > 0 ? `${speed.active_listings} listed now${speed.median_active_age_days != null ? `, the typical one for ${days(speed.median_active_age_days)}` : ''}.` : 'None listed right now.'
  ].filter(Boolean)
  return (
    <div className="mt-3">
      <p className="m-0 mb-1.5 font-mono text-[10px] tracking-wider uppercase text-text-faint">How fast it sells</p>
      <div className="text-[12px] text-text-muted flex flex-col gap-0.5">
        {lines.map((l) => <p key={l} className="m-0">{l}</p>)}
        <p className="m-0 text-[11px] text-text-faint">Based on {speed.sold} sale{speed.sold === 1 ? '' : 's'} in the last 24 months. Trades excluded.</p>
      </div>
    </div>
  )
}

function sourceNote(row) {
  if (row.source === 'discogs') return 'No sales here yet; Discogs suggestion only.'
  const sales = `${row.sales} sale${row.sales === 1 ? '' : 's'} here`
  const adjusted = (row.adjusted ? `, ${row.adjusted} re-graded for seller accuracy` : '') + (row.sleeve_adjusted ? `, ${row.sleeve_adjusted} priced up to a VG+ sleeve` : '')
  return row.source === 'blended' ? `${sales}${adjusted}, blended with Discogs` : `${sales}${adjusted}`
}

// What this pressing sells for, by disc grade, delivered. Honest about thin data: every row
// says how many sales it rests on and how much to trust it.
function GradePriceTable({ stats, highlightGrade, sleeveGrade = null }) {
  const [open, setOpen] = useState(false)
  if (!stats || !stats.grades || stats.grades.length === 0) {
    return <p className="m-0 mt-3 text-[12px] text-text-muted">No sales of this pressing on Vinyl Venue yet, so there's no price by grade to show.</p>
  }
  const hl = String(highlightGrade || '').trim().toUpperCase()
  const factors = (stats.sleeve_factors || []).filter((f) => f.factor < 1)
  const mine = sleevePenaltyText(sleeveGrade)
  const sleeveLine = factors.length
    ? ` A worn sleeve lowers the price: ${factors.map((f) => `${f.grade} −${Math.round((1 - f.factor) * 100)}%`).join(', ')}.${mine ? ` Your sleeve (${sleeveGrade}) is ${mine}.` : ''}`
    : ''

  return (
    <div className="mt-3">
      <p className="m-0 mb-1.5 font-mono text-[10px] tracking-wider uppercase text-text-faint">Price by disc grade, delivered</p>
      <p className="m-0 mb-1.5 text-[11px] text-text-muted">Estimates are for a sleeve at VG+ or better.{sleeveLine}</p>
      <SignalLine signal={stats.signal} />
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="text-text-faint text-left">
            <th className="font-normal py-1 pr-2">Disc</th>
            <th className="font-normal py-1 pr-2">Estimate</th>
            <th className="font-normal py-1 pr-2">Recent range</th>
            <th className="font-normal py-1">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {stats.grades.map((row) => {
            const c = CONFIDENCE[row.confidence] || CONFIDENCE.none
            const estimate = row.estimate_delivered ?? row.estimate_item
            return (
              <tr key={row.grade} className={`border-t border-border ${row.grade === hl ? 'bg-accent/10' : ''}`}>
                <td className="py-1.5 pr-2 font-mono text-text">{row.grade}</td>
                <td className="py-1.5 pr-2 text-text font-bold">
                  {estimate != null ? money(estimate) : '—'}
                  {row.estimate_delivered == null && estimate != null && <span className="font-normal text-text-faint"> + shipping</span>}
                </td>
                <td className="py-1.5 pr-2 text-text-muted">
                  {row.sales > 0 ? (row.low_delivered === row.high_delivered ? money(row.low_delivered) : `${money(row.low_delivered)}–${money(row.high_delivered)}`) : '—'}
                </td>
                <td className="py-1.5">
                  <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: c.tone }}>{c.label}</span>
                  <span className="text-text-faint"> · {row.sales} sale{row.sales === 1 ? '' : 's'}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <SalesSpeed speed={stats.speed} />
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1.5 bg-transparent border-0 p-0 text-[12px] text-accent cursor-pointer">
        {open ? 'Hide details' : 'How are these worked out?'}
      </button>
      {open && (
        <div className="mt-1.5 text-[11px] text-text-muted flex flex-col gap-1">
          {stats.grades.map((row) => (
            <p key={row.grade} className="m-0"><span className="font-mono text-text">{row.grade}</span>: {sourceNote(row)}.</p>
          ))}
          <SignalBreakdown signal={stats.signal} />
          <p className="m-0">
            Delivered means price plus shipping{stats.typical_shipping != null
              ? `; estimates add typical shipping of ${money(stats.typical_shipping)} (${stats.shipping_source === 'pressing' ? 'from this pressing’s sales' : 'platform-wide'})`
              : ''}. Sales from the last 24 months, trades excluded. A sale with a worn sleeve is priced up to what the same disc would fetch in a VG+ sleeve before it counts, so a scuffed sleeve doesn't drag a disc grade down. When a seller&apos;s buyers consistently report their grades as a full grade high, their sales count at the grade buyers actually got.
          </p>
        </div>
      )}
    </div>
  )
}

export default GradePriceTable
