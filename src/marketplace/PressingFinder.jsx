import { useEffect, useMemo, useRef, useState } from 'react'
import { discogsPreview, musicbrainzByBarcode } from '../utils'
import { labelCandidates, bestQuestion, applyAnswer, lookAlikeCounts, crossCheck, matchEntered } from './narrowPressings'
import { compareMarkings } from './pressingMarkings'

// Only fetch runout data for this many candidates at once (one request each).
const RUNOUT_LIMIT = 12

const PLACEHOLDER = 'https://placehold.co/80x80/E4E2DC/E4E2DC'

function summary(c) {
  return [c.year, c.country].filter(Boolean).join(' \u00b7 ') || c.title
}
function detail(c) {
  return [c.label, c.catno].filter(Boolean).join(' \u00b7 ')
}

// The format words that tell look-alike pressings apart (Limited Edition, Stereo, Test Pressing…).
function Traits({ c }) {
  const t = [...c.tokens]
  if (!t.length) return null
  return <span className="block text-[12px] text-text mt-0.5">{t.join(' \u00b7 ')}</span>
}

function RunoutBadge({ r }) {
  if (!r) return null
  if (r.status === 'match') return <span title="Most of what you typed appears in this pressing's Discogs runout text" className="text-[10px] font-mono tracking-wider uppercase border border-[#4f7a56] text-[#4f7a56] px-1.5 py-px">Runout matches {r.matched.length}/{r.total}</span>
  if (r.status === 'partial') return <span className="text-[10px] font-mono tracking-wider uppercase border border-border-strong text-text px-1.5 py-px">Runout partly matches {r.matched.length}/{r.total}</span>
  if (r.status === 'mismatch') return <span className="text-[10px] font-mono tracking-wider uppercase border border-[#b7791f] text-[#b7791f] px-1.5 py-px">Runout doesn&rsquo;t match</span>
  if (r.status === 'no_data') return <span title="Discogs has no runout text for this pressing, so it can't be checked" className="text-[10px] font-mono tracking-wider uppercase border border-border text-text-muted px-1.5 py-px">No runout on Discogs</span>
  return null
}

function Badges({ c, popular, check, twins, runout }) {
  return (
    <span className="flex flex-wrap gap-1 mt-1">
      {c.entMatch?.fields.length > 0 && (
        <span title="Matches what you typed in the form" className="text-[10px] font-mono tracking-wider uppercase border border-accent text-accent px-1.5 py-px">Matches your entry: {c.entMatch.fields.join(', ')}</span>
      )}
      <RunoutBadge r={runout} />
      {check?.found && check.agree.length >= 2 && check.differ.length === 0 && (
        <span title={`MusicBrainz agrees on: ${check.agree.join(', ')}`} className="text-[10px] font-mono tracking-wider uppercase border border-[#4f7a56] text-[#4f7a56] px-1.5 py-px">2nd source agrees</span>
      )}
      {check?.found && check.differ.length > 0 && (
        <span title="Discogs and MusicBrainz disagree, so double-check these on your record" className="text-[10px] font-mono tracking-wider uppercase border border-[#b7791f] text-[#b7791f] px-1.5 py-px">2nd source differs: {check.differ.join(', ')}</span>
      )}
      {twins > 0 && (
        <span title="Same year, country, label, catalog number and edition. Only the runout etching tells them apart." className="text-[10px] font-mono tracking-wider uppercase border border-border-strong text-text-muted px-1.5 py-px">Looks identical to {twins} other{twins === 1 ? '' : 's'}</span>
      )}
      {c.kind && <span className="text-[10px] font-mono tracking-wider uppercase border border-border-strong px-1.5 py-px text-text">{c.kind}</span>}
      {c.barcodeMatch && <span className="text-[10px] font-mono tracking-wider uppercase border border-accent text-accent px-1.5 py-px">Barcode match</span>}
      {popular && <span className="text-[10px] font-mono tracking-wider uppercase border border-border text-text-muted px-1.5 py-px">Most common</span>}
    </span>
  )
}

// Guided "which pressing do you have?" — asks one easy question at a time,
// then shows photos side by side once only a few candidates are left.
function PressingFinder({ candidates, onPick, onCantTell, loadingId, barcode, entered = null, total = null, onLoadMore = null }) {
  // What the user already typed in the form (label, catalogue no., country, year, edition).
  // Pressings that fit it are ranked first and badged, but nothing is hidden.
  const enteredKey = JSON.stringify(entered || {})
  const hasEntered = !!entered && Object.values(entered).some((v) => String(v || '').trim())
  const all = useMemo(() => {
    const base = labelCandidates(candidates)
    if (!hasEntered) return base
    const scored = base.map((c, i) => ({ ...c, entMatch: matchEntered(c, entered), _i: i }))
    return scored.sort((a, b) => b.entMatch.score - a.entMatch.score || a._i - b._i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, enteredKey])
  const [answers, setAnswers] = useState([])
  const [skipped, setSkipped] = useState(() => new Set())
  const [previews, setPreviews] = useState({})
  const [showAll, setShowAll] = useState(false)
  const [mb, setMb] = useState([])
  const [runoutText, setRunoutText] = useState(entered?.runout || '')
  const requested = useRef(new Set())

  useEffect(() => {
    let cancelled = false
    if (!barcode) return undefined
    musicbrainzByBarcode(barcode).then(({ releases }) => { if (!cancelled) setMb(releases || []) })
    return () => { cancelled = true }
  }, [barcode])

  const remaining = useMemo(
    () => answers.reduce((list, a) => applyAnswer(list, a.question, a.value), all),
    [all, answers]
  )
  const question = useMemo(() => bestQuestion(remaining, skipped), [remaining, skipped])
  const popularId = useMemo(() => {
    const withHave = remaining.filter((c) => c.have != null)
    if (withHave.length < 2) return null
    return withHave.reduce((a, b) => ((b.have || 0) > (a.have || 0) ? b : a)).id
  }, [remaining])

  const bestEntered = useMemo(() => {
    const top = remaining[0]
    const second = remaining[1]
    if (!top?.entMatch || top.entMatch.score < 2) return false
    return !second || top.entMatch.score > (second.entMatch?.score || 0)
  }, [remaining])

  const compare = remaining.length > 0 && remaining.length <= 4
  const twinCounts = useMemo(() => lookAlikeCounts(remaining), [remaining])
  const checks = useMemo(() => new Map(remaining.map((c) => [c.id, crossCheck(c, mb)])), [remaining, mb])

  // Runout matching: the collector types what is etched near the label; each candidate's
  // Discogs runout text is compared with it. Indicative only, so it ranks and badges, never filters.
  const runoutOn = runoutText.trim().length >= 3 && remaining.length > 1 && remaining.length <= RUNOUT_LIMIT
  const runoutResults = useMemo(() => {
    const m = new Map()
    if (!runoutOn) return m
    for (const c of remaining) {
      const ids = previews[c.id]?.identifiers
      if (ids) m.set(c.id, compareMarkings({ matrixNumber: runoutText }, ids))
    }
    return m
  }, [runoutOn, runoutText, remaining, previews])
  const runoutLoading = runoutOn && remaining.some((c) => !previews[c.id])
  const shown = useMemo(() => {
    if (!runoutOn || runoutResults.size === 0) return remaining
    const score = (c) => {
      const r = runoutResults.get(c.id)
      if (!r) return -1
      return (r.status === 'match' ? 3 : r.status === 'partial' ? 2 : r.status === 'no_data' ? 1 : 0) * 100 + r.matched.length
    }
    return [...remaining].sort((a, b) => score(b) - score(a))
  }, [remaining, runoutOn, runoutResults])
  const bestRunout = useMemo(() => {
    const strong = shown.filter((c) => runoutResults.get(c.id)?.status === 'match')
    return strong.length === 1 ? strong[0].id : null
  }, [shown, runoutResults])
  const allIdentical = remaining.length > 1 && twinCounts.size === remaining.length && new Set(remaining.map((c) => twinCounts.get(c.id))).size === 1 && twinCounts.get(remaining[0].id) === remaining.length - 1

  useEffect(() => {
    if (!compare && !runoutOn) return
    remaining.forEach(async (c) => {
      if (previews[c.id] || requested.current.has(c.id)) return
      requested.current.add(c.id)
      const { preview } = await discogsPreview(c.id)
      if (preview) setPreviews((p) => ({ ...p, [c.id]: preview }))
      else requested.current.delete(c.id)
    })
  }, [compare, runoutOn, remaining, previews])

  function answer(value, label) {
    setAnswers((a) => [...a, { question, value, label }])
  }
  function undoTo(i) {
    setAnswers((a) => a.slice(0, i))
    setSkipped(new Set())
  }

  if (all.length === 0) return null

  return (
    <div className="mb-3 max-w-xl border border-border rounded bg-surface p-3 font-sans">
      <p className="m-0 mb-2 font-mono text-[10px] tracking-wider uppercase text-text-faint">
        {remaining.length === 1 ? 'One pressing left' : `${remaining.length} possible pressing${remaining.length === 1 ? '' : 's'}`}
      </p>

      {total != null && total > candidates.length && (
        <p className="m-0 mb-2 text-[12px] text-text-muted">
          Loaded {candidates.length} of the {total} pressings Discogs lists for this album.{' '}
          {onLoadMore && (
            <button type="button" onClick={onLoadMore} className="text-accent bg-transparent border-0 p-0 underline cursor-pointer text-[12px]">
              Look for ones matching what I typed
            </button>
          )}
        </p>
      )}

      {bestEntered && (
        <p className="m-0 mb-2 text-[12px] text-[#4f7a56]">The best match for what you typed is listed first. Check the photos before choosing.</p>
      )}

      {answers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {answers.map((a, i) => (
            <button key={i} type="button" onClick={() => undoTo(i)} className="text-[12px] border border-border-strong rounded-full px-2.5 py-0.5 bg-bg text-text cursor-pointer">
              {a.label} ×
            </button>
          ))}
        </div>
      )}

      {question && remaining.length > 1 && (
        <div className="mb-3">
          <p className="m-0 text-[14px] font-semibold text-text">{question.ask}</p>
          <p className="m-0 mb-2 text-[12px] text-text-muted">{question.hint}</p>
          <div className="flex flex-wrap gap-2">
            {question.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => answer(o.value, question.flag ? `${o.label} \u2013 ${question.flag}` : o.value)}
                className="text-[13px] border border-border rounded px-3 py-1.5 bg-bg text-text cursor-pointer hover:border-accent"
              >
                {o.label || o.value} <span className="text-text-faint">{o.count}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSkipped((s) => new Set([...s, question.key]))}
              className="text-[13px] border border-dashed border-border rounded px-3 py-1.5 bg-transparent text-text-muted cursor-pointer hover:border-accent"
            >
              Not sure
            </button>
          </div>
        </div>
      )}

      {allIdentical && (
        <div className="mb-3 border border-border-strong rounded p-2.5 bg-bg">
          <p className="m-0 text-[13px] font-semibold text-text">These can't be told apart from the outside</p>
          <p className="m-0 mt-1 text-[12px] text-text-muted">They share the same year, country, label, catalog number and edition. The difference is the matrix / runout text etched into the smooth ring of vinyl between the grooves and the label. Take the record out, tilt it in the light, and type what you see in the box below. If you can't read it, choose "I can't tell" and the listing will be marked as not confirmed.</p>
        </div>
      )}

      {remaining.length > 1 && remaining.length <= RUNOUT_LIMIT && (
        <div className="mb-3 border border-border rounded p-2.5 bg-bg">
          <label className="block text-[13px] font-semibold text-text" htmlFor="pf-runout">Read the runout (optional)</label>
          <p className="m-0 mb-1.5 text-[12px] text-text-muted">The text etched in the smooth ring between the last groove and the label, for example &ldquo;ST-A-694612 -1&rdquo;. Type the longer codes; short marks like &ldquo;A1&rdquo; are ignored. We compare it with each pressing&rsquo;s Discogs runout text.</p>
          <input
            id="pf-runout"
            type="text"
            value={runoutText}
            onChange={(e) => setRunoutText(e.target.value)}
            placeholder="Type what you see"
            autoComplete="off"
            className="w-full text-[13px] border border-border rounded px-2.5 py-1.5 bg-surface text-text"
          />
          {runoutOn && runoutLoading && <p className="m-0 mt-1.5 text-[12px] text-text-faint">Checking Discogs&hellip;</p>}
          {runoutOn && !runoutLoading && bestRunout && <p className="m-0 mt-1.5 text-[12px] text-[#4f7a56]">One pressing matches your runout. It&rsquo;s listed first. Check the photos before choosing.</p>}
          {runoutOn && !runoutLoading && !bestRunout && runoutResults.size > 0 && ![...runoutResults.values()].some((r) => r.status === 'match') && (
            <p className="m-0 mt-1.5 text-[12px] text-text-muted">No pressing matches clearly. Discogs may not list this runout, or a character was misread. You can still pick by photos.</p>
          )}
          {runoutOn && !runoutLoading && !bestRunout && [...runoutResults.values()].filter((r) => r.status === 'match').length > 1 && (
            <p className="m-0 mt-1.5 text-[12px] text-text-muted">Several pressings share this runout text. Use the photos and the other details to choose.</p>
          )}
        </div>
      )}

      {compare ? (
        <div className={`grid gap-2 ${shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {shown.map((c) => {
            const pv = previews[c.id]
            const imgs = (pv?.images || []).slice(0, 3)
            return (
              <div key={c.id} className="border border-border rounded p-2 bg-bg flex flex-col gap-2">
                <div className="flex gap-1">
                  {(imgs.length ? imgs : [{ thumb: c.thumb }]).map((im, i) => (
                    <img key={i} src={im.thumb || PLACEHOLDER} alt="" className="w-1/3 aspect-square object-cover rounded bg-border" style={imgs.length ? undefined : { width: 72, height: 72 }} />
                  ))}
                </div>
                <div>
                  <p className="m-0 text-[13px] font-semibold text-text">{summary(c)}</p>
                  <p className="m-0 text-[12px] text-text-muted">{detail(c)}</p>
                  <Traits c={c} />
                  <Badges c={c} popular={c.id === popularId} check={checks.get(c.id)} twins={twinCounts.get(c.id)} runout={runoutResults.get(c.id)} />
                </div>
                <button
                  type="button"
                  disabled={loadingId === c.id}
                  onClick={() => onPick(c)}
                  className="mt-auto text-[13px] bg-accent text-bg border-0 rounded px-3 py-1.5 cursor-pointer disabled:opacity-60"
                >
                  {loadingId === c.id ? 'Loading...' : 'This is mine'}
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
          {(showAll ? shown : shown.slice(0, 8)).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              disabled={loadingId === c.id}
              className="flex items-center gap-3 bg-bg border border-border rounded px-3 py-2 text-left cursor-pointer hover:border-accent disabled:opacity-60"
            >
              <img src={c.thumb || PLACEHOLDER} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] text-text">{summary(c)}</span>
                <span className="block text-[12px] text-text-muted">{detail(c)}</span>
                <Traits c={c} />
                <Badges c={c} popular={c.id === popularId} check={checks.get(c.id)} twins={twinCounts.get(c.id)} runout={runoutResults.get(c.id)} />
              </span>
            </button>
          ))}
          {remaining.length > 8 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[12px] text-accent bg-transparent border-0 p-0 text-left cursor-pointer">
              {showAll ? 'Show fewer' : `Show all ${remaining.length}`}
            </button>
          )}
        </div>
      )}

      {remaining.some((c) => c.barcodeMatch) && (
        <p className="m-0 mt-2 text-[11px] text-text-faint">Barcode match = this pressing lists the barcode you scanned. Other pressings of the album are shown too, since barcodes are often reused.</p>
      )}

      <button
        type="button"
        onClick={() => onCantTell(remaining.length ? remaining : all)}
        className="mt-3 text-[12px] text-text-muted bg-transparent border-0 p-0 underline cursor-pointer"
      >
        I can’t tell which one is mine
      </button>
    </div>
  )
}

export default PressingFinder
