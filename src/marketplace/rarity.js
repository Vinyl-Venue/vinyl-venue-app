// Pressing-level rarity score (0-100) built from what is known about one exact
// pressing: how many people own and want it (Discogs), how many copies are for
// sale, its edition traits and its age. Components with no data are left out
// and the rest are rescaled, so a pressing with thin data isn't unfairly
// scored as common. `confidence` says how much of the picture was available.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

export const RARITY_TIERS = [
  { min: 80, label: 'Grail', tone: '#7a1f1f' },
  { min: 65, label: 'Very rare', tone: '#a4342a' },
  { min: 50, label: 'Rare', tone: '#b7791f' },
  { min: 35, label: 'Scarce', tone: '#6b6a2a' },
  { min: 20, label: 'Uncommon', tone: '#4f7a56' },
  { min: 0, label: 'Common', tone: '#7b776c' }
]

export function tierFor(score) {
  return RARITY_TIERS.find((t) => score >= t.min) || RARITY_TIERS[RARITY_TIERS.length - 1]
}

// Edition words that make a pressing harder to find, and how much each is worth.
const TRAIT_POINTS = [
  [/test pressing/i, 12, 'Test pressing'],
  [/misprint|error/i, 8, 'Misprint'],
  [/numbered/i, 8, 'Numbered'],
  [/limited/i, 6, 'Limited edition'],
  [/promo/i, 5, 'Promo'],
  [/picture disc/i, 4, 'Picture disc'],
  [/unofficial/i, 4, 'Unofficial release'],
  [/club edition/i, 2, 'Club edition']
]

function traitScore(item) {
  const text = [item.edition, item.format, item.vinylColor ? 'coloured vinyl' : '', item.notes ? '' : ''].join(' ')
  const found = []
  let points = 0
  for (const [re, pts, label] of TRAIT_POINTS) {
    if (re.test(text)) { points += pts; found.push(label) }
  }
  const color = String(item.vinylColor || '').trim().toLowerCase()
  if (color && !/^(black|bk)$/.test(color)) { points += 4; found.push(`${item.vinylColor} vinyl`) }
  return { points: Math.min(12, points), found }
}

// item: { discogsHave, discogsWant, edition, format, vinylColor, pressingYear, year }
// market: { num_for_sale, have, want } (market values override the item's own copies)
export function scoreRarity(item, market = null) {
  const have = Number(market?.have ?? item.discogsHave)
  const want = Number(market?.want ?? item.discogsWant)
  const forSale = market?.num_for_sale ?? market?.numForSale
  const year = Number(item.pressingYear || item.year) || null
  const isReissue = /reissue|repress|remaster/i.test(`${item.edition || ''} ${item.format || ''}`)

  const parts = []

  if (Number.isFinite(have) && have >= 0) {
    const pts = 40 * (1 - clamp(Math.log10(have + 1) / 4.5, 0, 1))
    parts.push({ key: 'scarcity', label: 'Scarcity', points: pts, max: 40, note: `${have.toLocaleString()} collector${have === 1 ? '' : 's'} own it on Discogs` })
  }

  if (Number.isFinite(have) && Number.isFinite(want)) {
    const ratio = want / Math.max(have, 1)
    const pts = 25 * clamp(ratio / 0.6, 0, 1)
    parts.push({ key: 'demand', label: 'Demand', points: pts, max: 25, note: `${want.toLocaleString()} want it, ${ratio.toFixed(2)} wants per owner` })
  }

  if (forSale != null && Number.isFinite(Number(forSale))) {
    const n = Number(forSale)
    const pts = n === 0 ? 15 : n <= 2 ? 12 : n <= 9 ? 8 : n <= 29 ? 4 : 1
    parts.push({ key: 'availability', label: 'Availability', points: pts, max: 15, note: n === 0 ? 'None for sale on Discogs right now' : `${n} cop${n === 1 ? 'y' : 'ies'} for sale on Discogs` })
  }

  const traits = traitScore(item)
  parts.push({ key: 'edition', label: 'Edition', points: traits.points, max: 12, note: traits.found.length ? traits.found.join(', ') : 'Standard edition' })

  if (year) {
    const pts = isReissue ? 0 : year <= 1979 ? 8 : year <= 1989 ? 6 : year <= 1999 ? 4 : year <= 2009 ? 2 : 0
    parts.push({ key: 'age', label: 'Age', points: pts, max: 8, note: isReissue ? `${year} reissue` : `${year} original` })
  }

  const got = parts.reduce((s, p) => s + p.points, 0)
  const possible = parts.reduce((s, p) => s + p.max, 0)
  const confidence = possible / 100
  // Thin data pulls the score toward "common" instead of letting one factor (like age) swing it.
  const raw = possible > 0 ? (got / possible) * 100 : 0
  const score = Math.round(raw * Math.min(1, confidence) + 12 * (1 - Math.min(1, confidence)))
  const dataParts = parts.filter((p) => p.key === 'scarcity' || p.key === 'demand' || p.key === 'availability').length

  return {
    score,
    tier: tierFor(score),
    parts: parts.map((p) => ({ ...p, points: Math.round(p.points * 10) / 10 })),
    confidence,
    // Without any Discogs numbers the score rests on edition and age alone, so say so.
    limited: dataParts === 0
  }
}
