import { useEffect, useMemo, useState } from 'react'
import { discogsPreview } from '../utils'
import { labelCandidates, bestQuestion, applyAnswer } from './narrowPressings'

const PLACEHOLDER = 'https://placehold.co/80x80/E4E2DC/E4E2DC'

function summary(c) {
  return [c.year, c.country].filter(Boolean).join(' \u00b7 ') || c.title
}
function detail(c) {
  return [c.label, c.catno, c.format].filter(Boolean).join(' \u00b7 ')
}

function Badges({ c, popular }) {
  return (
    <span className="flex flex-wrap gap-1 mt-1">
      {c.kind && <span className="text-[10px] font-mono tracking-wider uppercase border border-border-strong px-1.5 py-px text-text">{c.kind}</span>}
      {c.barcodeMatch && <span className="text-[10px] font-mono tracking-wider uppercase border border-accent text-accent px-1.5 py-px">Barcode match</span>}
      {popular && <span className="text-[10px] font-mono tracking-wider uppercase border border-border text-text-muted px-1.5 py-px">Most common</span>}
    </span>
  )
}

// Guided "which pressing do you have?" — asks one easy question at a time,
// then shows photos side by side once only a few candidates are left.
function PressingFinder({ candidates, onPick, onCantTell, loadingId }) {
  const all = useMemo(() => labelCandidates(candidates), [candidates])
  const [answers, setAnswers] = useState([])
  const [skipped, setSkipped] = useState(() => new Set())
  const [previews, setPreviews] = useState({})
  const [showAll, setShowAll] = useState(false)

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

  const compare = remaining.length > 0 && remaining.length <= 4

  useEffect(() => {
    if (!compare) return
    let cancelled = false
    remaining.forEach(async (c) => {
      if (previews[c.id]) return
      const { preview } = await discogsPreview(c.id)
      if (!cancelled && preview) setPreviews((p) => ({ ...p, [c.id]: preview }))
    })
    return () => { cancelled = true }
  }, [compare, remaining, previews])

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

      {compare ? (
        <div className={`grid gap-2 ${remaining.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {remaining.map((c) => {
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
                  <Badges c={c} popular={c.id === popularId} />
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
          {(showAll ? remaining : remaining.slice(0, 8)).map((c) => (
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
                <span className="block text-[12px] text-text-muted truncate">{detail(c)}</span>
                <Badges c={c} popular={c.id === popularId} />
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
