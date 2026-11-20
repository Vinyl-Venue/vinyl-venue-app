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
  // Only call something "Original" when exactly one pressing carries the earliest
  // year; several same-year pressings can't be told apart by year alone.
  const atEarliest = parsed.filter((p) => !p.isReissue && p.yearNum === earliest).length
  const labelled = parsed.map((p) => ({
    ...p,
    kind: p.isReissue ? 'Reissue' : p.yearNum && p.yearNum === earliest && atEarliest === 1 ? 'Original' : null
  }))
  // Pressings sharing the scanned barcode first, then oldest first.
  return labelled.sort((a, b) => (b.barcodeMatch ? 1 : 0) - (a.barcodeMatch ? 1 : 0) || (a.yearNum || 9999) - (b.yearNum || 9999))
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

// ---------- Look-alikes ----------

function outwardKey(c) {
  return [c.yearNum || '', (c.country || '').toLowerCase(), (c.label || '').toLowerCase(), (c.catno || '').toLowerCase(), [...c.tokens].sort().join('|').toLowerCase()].join('~')
}

// Pressings that look the same from the outside (same year, country, label,
// catalog number and edition words). Only the matrix / runout etched in the vinyl
// can separate them. Returns a Map of candidate id -> how many others look identical.
export function lookAlikeCounts(cands) {
  const byKey = new Map()
  for (const c of cands) {
    const k = outwardKey(c)
    byKey.set(k, [...(byKey.get(k) || []), c.id])
  }
  const out = new Map()
  for (const ids of byKey.values()) if (ids.length > 1) for (const id of ids) out.set(id, ids.length - 1)
  return out
}

// ---------- MusicBrainz cross-check ----------

// Discogs country names -> MusicBrainz ISO codes.
const COUNTRY_CODES = {
  us: 'US', usa: 'US', uk: 'GB', 'uk & europe': 'GB', europe: 'XE', worldwide: 'XW', japan: 'JP', canada: 'CA',
  australia: 'AU', germany: 'DE', france: 'FR', italy: 'IT', netherlands: 'NL', brazil: 'BR', mexico: 'MX',
  spain: 'ES', sweden: 'SE', russia: 'RU', ireland: 'IE', 'new zealand': 'NZ', argentina: 'AR', 'south korea': 'KR'
}
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Which fields MusicBrainz agrees with for one Discogs candidate. Returns
// { found, agree: [...], differ: [...] } using the closest MusicBrainz release
// that carries the same barcode.
export function crossCheck(candidate, mbReleases) {
  if (!mbReleases || mbReleases.length === 0) return { found: false, agree: [], differ: [] }
  const code = COUNTRY_CODES[String(candidate.country || '').toLowerCase()]
  let best = null
  for (const r of mbReleases) {
    const agree = []
    const differ = []
    const rYear = parseInt(String(r.date || '').slice(0, 4), 10) || null
    if (candidate.yearNum && rYear) (candidate.yearNum === rYear ? agree : differ).push('year')
    if (code && r.country) (code === r.country ? agree : differ).push('country')
    const cl = norm(candidate.label)
    if (cl && r.labels?.length) (r.labels.some((l) => norm(l).includes(cl) || cl.includes(norm(l))) ? agree : differ).push('label')
    const cn = norm(candidate.catno)
    if (cn && r.catnos?.length) (r.catnos.some((x) => norm(x) === cn) ? agree : differ).push('catalog no.')
    if (!best || agree.length - differ.length > best.agree.length - best.differ.length) best = { found: true, agree, differ }
  }
  return best
}

// ---------- Match against what the user already typed ----------

const nz = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Catalogue numbers are typed many ways ("MFSL-017", "MFSL 1-017"). Exact after
// stripping punctuation counts as a match. Same letters with digits that line up at the
// end (017 vs 1-017) counts as similar.
function catnoMatch(entered, candidate) {
  const e = nz(entered)
  if (!e || !candidate) return null
  const parts = String(candidate).split(/[,/]/).map(nz).filter(Boolean)
  let best = null
  for (const c of parts) {
    if (c === e || (Math.min(c.length, e.length) >= 5 && (c.includes(e) || e.includes(c)))) return 'exact'
    const ea = (e.match(/^[a-z]+/) || [''])[0]
    const ca = (c.match(/^[a-z]+/) || [''])[0]
    const ed = e.slice(ea.length)
    const cd = c.slice(ca.length)
    if (ea.length >= 2 && ea === ca && Math.min(ed.length, cd.length) >= 3 && (cd.endsWith(ed) || ed.endsWith(cd))) best = 'similar'
  }
  return best
}

// How well one pressing fits what was typed in the form. entered: { label, catno,
// country, year, edition }. Returns { score, fields: [...] }.
export function matchEntered(c, entered) {
  const fields = []
  let score = 0
  if (!entered) return { score, fields }
  const cat = catnoMatch(entered.catno, c.catno)
  if (cat === 'exact') { score += 4; fields.push('catalogue no.') }
  else if (cat === 'similar') { score += 2.5; fields.push('catalogue no. (similar)') }
  const el = nz(entered.label)
  const cl = nz(c.label)
  if (el.length >= 3 && cl && (cl.includes(el) || el.includes(cl))) { score += 2; fields.push('label') }
  const ec = nz(entered.country)
  if (ec && nz(c.country) === ec) { score += 1; fields.push('country') }
  const ey = parseInt(String(entered.year || '').slice(0, 4), 10)
  if (ey && c.yearNum === ey) { score += 1; fields.push('year') }
  const words = String(entered.edition || '').toLowerCase().split(/[\s,/]+/).filter((w) => w.length >= 4)
  if (words.length) {
    const hay = [...c.tokens].join(' ').toLowerCase()
    const hit = words.filter((w) => hay.includes(w)).length
    if (hit) { score += Math.min(hit, 2); fields.push('edition') }
  }
  return { score, fields }
}
