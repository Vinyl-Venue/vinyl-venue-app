// Reads what a collector typed in the matrix / runout / deadwax / notes fields.
// Two jobs: check it against the identifiers Discogs lists for the pressing,
// and spot markings that make a copy more collectible. Both are indicative,
// not authoritative, and the UI says so.

const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const tokens = (s) => String(s || '').split(/[\s,;|/]+/).map(norm).filter((t) => t.length >= 3)

// Which Discogs identifiers describe the runout area.
const RUNOUT_TYPE = /matrix|runout|etch|stamper/i

// item: { matrixNumber, deadwax }, identifiers: [{ type, value, description }]
// status: 'match' (most of what was typed appears on Discogs), 'partial', 'mismatch',
// 'no_data' (Discogs lists no runout text), or 'nothing_entered'.
export function compareMarkings(item, identifiers = []) {
  const typed = [item?.matrixNumber, item?.deadwax].filter(Boolean).join(' ')
  const mine = [...new Set(tokens(typed))]
  if (mine.length === 0) return { status: 'nothing_entered', matched: [], total: 0 }

  const theirs = identifiers
    .filter((i) => RUNOUT_TYPE.test(i.type || ''))
    .flatMap((i) => [norm(i.value), ...tokens(`${i.value} ${i.description || ''}`)])
    .filter((t) => t.length >= 3)
  if (theirs.length === 0) return { status: 'no_data', matched: [], total: mine.length }

  const matched = mine.filter((u) => theirs.some((r) => r.includes(u) || u.includes(r)))
  const ratio = matched.length / mine.length
  const status = ratio >= 0.6 ? 'match' : matched.length > 0 ? 'partial' : 'mismatch'
  return { status, matched, total: mine.length }
}

// Markings worth rarity points. Deliberately short: only ones that are widely
// recognised. Points are capped by the caller.
const MARKINGS = [
  [/hand[\s-]?etched|etched (message|text|note)|scratched (message|text)|handwritten|hand[\s-]?scratched/i, 3, 'Hand-etched message'],
  [/\bRL\b|robert ludwig|\bsterling\b|masterdisk|\bporky\b|pecko duck|kendun|bernie grundman|\bBG\b/i, 3, 'Mastering engineer mark']
]

export function detectMarkings(item) {
  const text = [item?.matrixNumber, item?.deadwax, item?.notes].filter(Boolean).join(' ')
  const found = []
  let points = 0
  for (const [re, pts, label] of MARKINGS) {
    if (re.test(text)) { points += pts; found.push(label) }
  }
  return { points, found, hasText: text.trim().length > 0 }
}
