import { pressingSignature } from './pressings'

// Discogs-style identification block: highlight chips for the things that
// tell pressings apart, a labelled table of the details, then any notes.
// Works for both a listing and a shelf album.
function PressingDetails({ item, showCondition = true, notesLabel = 'Notes' }) {
  const chips = [
    item.vinylColor && `${item.vinylColor} vinyl`,
    item.edition,
    item.format,
    item.pressingCountry && (item.pressingYear ? `${item.pressingCountry} ${item.pressingYear}` : item.pressingCountry)
  ].filter(Boolean)
  const styles = String(item.styles || '').split(',').map((v) => v.trim()).filter(Boolean)

  const rows = [
    ['Label', item.label],
    ['Catalog #', item.catalogNumber],
    ['Format', item.format],
    ['Country', item.pressingCountry],
    ['Released', item.pressingYear || item.year],
    ['Vinyl', item.vinylColor],
    ['Edition', item.edition],
    ['Matrix / runout', item.matrixNumber],
    ['Deadwax', item.deadwax],
    ['Barcode', item.barcode]
  ].filter(([, v]) => v)

  const grades = showCondition && (item.sleeveCondition || item.mediaCondition)
  const hasStatus = item.pressingStatus === 'confirmed' || item.pressingStatus === 'unconfirmed'
  const hasDiscogs = item.discogsReleaseId || item.discogsHave || item.discogsWant
  if (chips.length === 0 && rows.length === 0 && styles.length === 0 && !hasDiscogs && !hasStatus && !grades && !item.notes) return null

  return (
    <div className="mt-4 pt-4 border-t border-border font-sans">
      <p className="m-0 mb-2 font-mono text-[10px] tracking-wider uppercase text-text-faint">Pressing</p>
      {item.pressingStatus === 'confirmed' && (
        <p className="m-0 mb-2 text-[12px] text-[#4f7a56]">&#10003; Pressing confirmed</p>
      )}
      {item.pressingStatus === 'unconfirmed' && (
        <p className="m-0 mb-2 text-[12px] text-text-muted">Pressing not confirmed. The seller couldn&rsquo;t tell which one this is, so check the details before you buy.</p>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((c) => (
            <span key={c} className="text-[11px] border border-border-strong text-text px-2 py-0.5 rounded-full bg-bg">{c}</span>
          ))}
        </div>
      )}
      {(grades || rows.length > 0) && (
        <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          {grades && item.mediaCondition && (<><dt className="text-text-muted">Media</dt><dd className="m-0 text-text">{item.mediaCondition}</dd></>)}
          {grades && item.sleeveCondition && (<><dt className="text-text-muted">Sleeve</dt><dd className="m-0 text-text">{item.sleeveCondition}</dd></>)}
          {rows.map(([k, v]) => (
            <><dt key={`k-${k}`} className="text-text-muted">{k}</dt><dd key={`v-${k}`} className="m-0 text-text break-words">{String(v)}</dd></>
          ))}
        </dl>
      )}
      {styles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {styles.map((st) => (
            <span key={st} className="text-[11px] text-text-muted border border-border px-2 py-0.5 rounded-full">{st}</span>
          ))}
        </div>
      )}
      {hasDiscogs && (
        <p className="m-0 mt-3 text-[12px] text-text-muted">
          {item.discogsHave || item.discogsWant ? `On Discogs: ${Number(item.discogsHave || 0).toLocaleString()} have \u00b7 ${Number(item.discogsWant || 0).toLocaleString()} want` : ''}
          {item.discogsReleaseId && (
            <>
              {item.discogsHave || item.discogsWant ? ' \u00b7 ' : ''}
              <a href={`https://www.discogs.com/release/${item.discogsReleaseId}`} target="_blank" rel="noreferrer" className="text-accent">View on Discogs</a>
            </>
          )}
        </p>
      )}
      {item.notes && (
        <div className="mt-3">
          <p className="m-0 mb-1 font-mono text-[10px] tracking-wider uppercase text-text-faint">{notesLabel}</p>
          <p className="m-0 text-[13px] text-text whitespace-pre-wrap">{item.notes}</p>
        </div>
      )}
    </div>
  )
}

export { pressingSignature }
export default PressingDetails
