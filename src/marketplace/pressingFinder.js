// Narrows a list of candidate pressings (Discogs versions of one album) by
// asking the single most useful question at a time. Pure functions only.

const FLAG_TOKENS_SKIP = new Set(['Vinyl', 'LP', 'Album', '12"', '7"', '10"', '45 RPM', '33 ⅓ RPM'])

export function parseCandidate(c) {
  const tokens = String(c.format || '').split(',').map((t) => t.trim()).filter(Boolean)
  const year = parseInt(String(c.year || '').slice(0, 4), 10) || null
  return {
    ...c,
    yearNum: year,
    tokens: new Set(tokens.filter((t) => !FLAG_TOKENS_SKIP.has(t))),
    isReissue: tokens.some((t) => /reissue|repress|remaster/i.test(t))
  }
}

// Tags the earliest pressing "Original", later ones "Reissue".
export function labelCandidates(list) {
  const parsed = list.map(parseCandidate)
  const earliest = Math.min(...parsed.map((p) => p.yearNum || 9999))
  return parsed.map((p) => ({
    ...p,
    kind: p.isReissue ? 'Reissue' : p.yearNum && p.yearNum === earliest ? 'Original' : null
  }))
}

// How easy each kind of question is for someone holding the record.
const ATTRS = [
  { key: 'country', weight: 1.0, ask: 'Which country is your record from?', hint: 'Look for "Made in…" on the back cover or the centre label.', get: (c) => c.country },
  { key: 'year', weight: 0.95, ask: 'What year is printed on it?', hint: 'Check the ℗ / © year on the back cover or the centre label.', get: (c) => c.yearNum && String(c.yearNum) },
  { key: 'label', weight: 0.7, ask: 'Which label is it on?', hint: 'Printed on the centre label, and usually on the spine.', get: (c) => c.label },
  { key: 'catno', weight: 0.6, ask: 'What is the catalog number?', hint: 'On the spine and the centre label.', get: (c) => c.catno }
]

function entropy(counts, total) {
  let h = 0
  for (const n of counts) { const p = n / total; h -= p * Math.log2(p) }
  return h
}

function groups(cands, get) {
  const m = new Map()
  for (const c of cands) {
    const v = get(c)
    if (!v) continue
    m.set(v, (m.get(v) || 0) + 1)
  }
  return m
}

// Picks the question that splits the remaining candidates most evenly,
// weighted by how easy it is to answer from the sleeve.
export function bestQuestion(cands, skipped = new Set()) {
  if (cands.length < 2) return null
  let best = null
  const consider = (key, weight, ask, hint, options, extra = {}) => {
    if (skipped.has(key) || options.length < 2 || options.length > 10) return
    const total = options.reduce((s, o) => s + o.count, 0)
    const score = entropy(options.map((o) => o.count), total) * weight
    if (!best || score > best.score) best = { key, ask, hint, options, score, ...extra }
  }
  for (const a of ATTRS) {
    const g = groups(cands, a.get)
    const options = [...g.entries()].map(([value, count]) => ({ value, count })).sort((x, y) => y.count - x.count)
    consider(a.key, a.weight, a.ask, a.hint, options)
  }
  // Edition words (Reissue, Stereo, Limited Edition, Gatefold…) as yes/no questions.
  const allTokens = new Set()
  for (const c of cands) for (const t of c.tokens) allTokens.add(t)
  for (const t of allTokens) {
    const yes = cands.filter((c) => c.tokens.has(t)).length
    if (yes === 0 || yes === cands.length) continue
    consider(`flag:${t}`, 0.85, `Does your record say or have “${t}”?`, 'Look for a sticker, text on the cover, or the centre label.', [
      { value: 'yes', label: 'Yes', count: yes },
      { value: 'no', label: 'No', count: cands.length - yes }
    ], { flag: t })
  }
  return best
}

export function applyAnswer(cands, question, value) {
  if (question.flag) {
    return cands.filter((c) => (value === 'yes') === c.tokens.has(question.flag))
  }
  const a = ATTRS.find((x) => x.key === question.key)
  return cands.filter((c) => a.get(c) === value)
}
