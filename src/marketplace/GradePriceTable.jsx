import { useState } from 'react'
import { money } from './marketData'
import { sleevePenaltyText } from './conditionFactors'

const CONFIDENCE = {
  high: { label: 'High', tone: '#4f7a56' },
  medium: { label: 'Medium', tone: '#b8863b' },
  low: { label: 'Low', tone: '#c1666b' },
  none: { label: 'Discogs only', tone: '#8a8a8a' }
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
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1.5 bg-transparent border-0 p-0 text-[12px] text-accent cursor-pointer">
        {open ? 'Hide details' : 'How are these worked out?'}
      </button>
      {open && (
        <div className="mt-1.5 text-[11px] text-text-muted flex flex-col gap-1">
          {stats.grades.map((row) => (
            <p key={row.grade} className="m-0"><span className="font-mono text-text">{row.grade}</span>: {sourceNote(row)}.</p>
          ))}
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
