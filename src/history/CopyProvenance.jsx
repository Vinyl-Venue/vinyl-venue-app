import { useEffect, useState } from 'react'
import { eventTitle, fetchListingProvenance, formatEventDate } from './eventData'

// Shown on a listing: who owned this copy before, and what the seller chose to share.
function CopyProvenance({ listingId }) {
  const [items, setItems] = useState([])
  useEffect(() => {
    let off = false
    setItems([])
    fetchListingProvenance(listingId).then(({ items: list }) => { if (!off) setItems(list) })
    return () => { off = true }
  }, [listingId])

  if (items.length === 0) return null
  return (
    <section className="mt-4 font-sans" aria-label="Copy history">
      <p className="m-0 mb-1 text-[11px] font-mono tracking-wider uppercase text-text-faint">History of this copy</p>
      <ol className="list-none m-0 p-0 border-l border-border-strong ml-1.5">
        {items.map((it, i) => (
          <li key={i} className="relative pl-4 pb-2">
            <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-accent" />
            <p className="m-0 text-[11px] font-mono text-text-faint">{formatEventDate(it.occurred_on)}</p>
            {it.kind === 'owner' ? (
              <p className="m-0 text-[13px] text-text">Previous owner: <strong>{it.who}</strong> <span className="text-text-muted text-[12px]">({it.event_type === 'traded' ? 'traded it away' : 'sold it'})</span></p>
            ) : (
              <>
                <p className="m-0 text-[13px] text-text font-semibold">{eventTitle(it)}</p>
                {it.notes && <p className="m-0 text-[12px] text-text-muted">{it.notes}</p>}
              </>
            )}
          </li>
        ))}
      </ol>
      <p className="m-0 text-[11px] text-text-faint">Self-reported by sellers and recorded by Vinyl Venue. Prices are never shown.</p>
    </section>
  )
}

export default CopyProvenance
